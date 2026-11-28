import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Post from '../models/Post.js';
import { optionalString, parseStrictDate } from '../utils/validation.js';

// Resolve paths from this file (not process.cwd()) so the backend works when
// started from either the project root or backend/
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const venvPython = path.resolve(rootDir, 'analytics/venv/bin/python');
const pythonExec = fs.existsSync(venvPython) ? venvPython : 'python3';
const bridgeScript = path.resolve(rootDir, 'analytics/run_analytics_bridge.py');
const insightsScript = path.resolve(rootDir, 'analytics/insights.py');

/**
 * Convert MongoDB post documents to the snake_case records the Python engine expects
 */
const toAnalyticsRecords = (posts) =>
  posts.map((p) => ({
    post_id: p.postId || String(p._id),
    date: p.date ? new Date(p.date).toISOString().split('T')[0] : '',
    platform: p.platform,
    content_type: p.contentType,
    category: p.category,
    caption_length: p.captionLength || 0,
    hashtags_count: p.hashtagsCount || 0,
    duration_seconds: p.durationSeconds || 0,
    posting_hour: typeof p.postingHour === 'number' ? p.postingHour : 12,
    views: Number(p.views) || 0,
    likes: Number(p.likes) || 0,
    comments: Number(p.comments) || 0,
    shares: Number(p.shares) || 0,
    saves: Number(p.saves) || 0,
    // No views fallback: engagement rate is undefined without reach (data dictionary),
    // and the stored Post.engagementRate is already 0 in that case — keep them consistent
    reach: Number(p.reach) || 0,
    engagement_rate: Number(p.engagementRate) || 0,
  }));

/**
 * Run a Python script with JSON on stdin; resolves with parsed JSON stdout
 */
const runPythonJson = (script, input) =>
  new Promise((resolve, reject) => {
    const pyProcess = spawn(pythonExec, [script], { cwd: path.dirname(script) });
    let outputData = '';
    let errorData = '';

    pyProcess.stdout.on('data', (chunk) => {
      outputData += chunk.toString();
    });
    pyProcess.stderr.on('data', (chunk) => {
      errorData += chunk.toString();
    });
    pyProcess.on('error', reject);
    pyProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python exited with code ${code}: ${errorData}`));
      }
      try {
        resolve(JSON.parse(outputData));
      } catch (parseErr) {
        reject(parseErr);
      }
    });

    pyProcess.stdin.write(JSON.stringify(input));
    pyProcess.stdin.end();
  });

/**
 * Rule-based insights for the authenticated user's posts
 * GET /api/analytics/insights
 */
export const getInsights = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.id }).sort({ date: 1 }).lean();
    const result = await runPythonJson(insightsScript, toAnalyticsRecords(posts));
    return res.json(result);
  } catch (err) {
    // Log details server-side only
    console.error('[Insights Error]', err);
    return res.status(500).json({ error: 'Failed to generate insights' });
  }
};

const compareScript = path.resolve(rootDir, 'analytics/compare.py');

// Comparison type -> Post field (date is handled as calendar months)
const COMPARE_FIELDS = {
  platform: 'platform',
  contentType: 'contentType',
  category: 'category',
};
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
};

/**
 * Selector options with post counts, built from the user's own posts
 */
const buildCompareOptions = (posts) => {
  const count = (getKey) => {
    const counts = new Map();
    for (const p of posts) {
      const key = getKey(p);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  };
  const toList = (counts, label = (v) => v) =>
    Array.from(counts, ([value, postCount]) => ({ value, label: label(value), posts: postCount }));

  const months = toList(count((p) => (p.date ? monthKey(p.date) : null)), monthLabel)
    .sort((x, y) => y.value.localeCompare(x.value)); // newest first
  const byCount = (list) => list.sort((x, y) => y.posts - x.posts || x.value.localeCompare(y.value));

  return {
    date: months,
    platform: byCount(toList(count((p) => p.platform))),
    contentType: byCount(toList(count((p) => p.contentType))),
    category: byCount(toList(count((p) => p.category))),
  };
};

const segmentPosts = (posts, type, value) => {
  if (type === 'date') return posts.filter((p) => p.date && monthKey(p.date) === value);
  return posts.filter((p) => p[COMPARE_FIELDS[type]] === value);
};

/**
 * Compare two segments of the authenticated user's posts
 * GET /api/analytics/compare?type=date|platform|contentType|category&a=...&b=...
 * Without a/b, returns only the selector options.
 */
export const getCompare = async (req, res) => {
  try {
    const type = optionalString(req.query.type) ?? 'date';
    const a = optionalString(req.query.a);
    const b = optionalString(req.query.b);
    // Arrays/objects (e.g. ?a[]=x) are rejected before any string logic runs
    if ([type, a, b].includes(null)) {
      return res.status(400).json({ error: 'Query parameters must be single text values' });
    }

    if (type !== 'date' && !COMPARE_FIELDS[type]) {
      return res.status(400).json({ error: 'type must be one of: date, platform, contentType, category' });
    }

    const posts = await Post.find({ userId: req.user.id }).sort({ date: 1 }).lean();
    const options = buildCompareOptions(posts);

    if (!a && !b) {
      return res.json({ type, options, comparison: null });
    }
    if (!a || !b) {
      return res.status(400).json({ error: 'Select both segment A and segment B' });
    }
    if (type === 'date' && (!MONTH_PATTERN.test(a) || !MONTH_PATTERN.test(b))) {
      return res.status(400).json({ error: 'Date segments must be months in YYYY-MM format' });
    }
    if (a === b) {
      return res.status(400).json({ error: 'Choose two different segments to compare' });
    }

    const label = (value) => (type === 'date' ? monthLabel(value) : value);
    const comparison = await runPythonJson(compareScript, {
      a: { label: label(a), posts: toAnalyticsRecords(segmentPosts(posts, type, a)) },
      b: { label: label(b), posts: toAnalyticsRecords(segmentPosts(posts, type, b)) },
      benchmark: toAnalyticsRecords(posts),
    });

    return res.json({ type, options, comparison });
  } catch (err) {
    console.error('[Compare Error]', err);
    return res.status(500).json({ error: 'Failed to compare segments' });
  }
};

/**
 * Controller to fetch and calculate real-time social media analytics
 * GET /api/analytics
 */
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const platform = optionalString(req.query.platform);
    const contentType = optionalString(req.query.contentType);
    const category = optionalString(req.query.category);
    const startDate = optionalString(req.query.startDate);
    const endDate = optionalString(req.query.endDate);
    // Arrays/objects (e.g. ?platform[$ne]=x) must never reach the MongoDB filter
    if ([platform, contentType, category, startDate, endDate].includes(null)) {
      return res.status(400).json({ error: 'Query parameters must be single text values' });
    }

    // Build filter query for user posts
    const query = { userId };

    if (platform && platform !== 'All') {
      query.platform = platform;
    }
    if (contentType && contentType !== 'All') {
      query.contentType = contentType;
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    if (startDate || endDate) {
      const start = startDate ? parseStrictDate(startDate) : null;
      const end = endDate ? parseStrictDate(endDate) : null;
      if ((startDate && !start) || (endDate && !end)) {
        return res.status(400).json({ error: 'startDate and endDate must be valid dates (YYYY-MM-DD)' });
      }
      if (start && end && start > end) {
        return res.status(400).json({ error: 'startDate must be on or before endDate' });
      }
      query.date = {};
      if (start) query.date.$gte = start;
      // endDate is inclusive: include every post up to the end of that day
      if (end) query.date.$lt = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    // 1. Fetch filtered posts
    const posts = await Post.find(query).sort({ date: 1 }).lean();

    // 2. Fetch distinct filter options across all posts for this user
    const userMetaPosts = await Post.find({ userId }, 'platform contentType category').lean();
    const platforms = Array.from(new Set(userMetaPosts.map((p) => p.platform).filter(Boolean)));
    const contentTypes = Array.from(new Set(userMetaPosts.map((p) => p.contentType).filter(Boolean)));
    const categories = Array.from(new Set(userMetaPosts.map((p) => p.category).filter(Boolean)));

    // Only values that exist in the user's data
    const filterOptions = { platforms, contentTypes, categories };
    // Lets the UI tell "no data at all" apart from "filters matched nothing"
    const datasetPosts = userMetaPosts.length;

    // If no posts found, return standard clean empty payload
    if (posts.length === 0) {
      return res.json({
        totalPosts: 0,
        datasetPosts,
        isEmpty: true,
        filterOptions,
        kpis: {
          total_posts: 0,
          total_views: 0,
          total_likes: 0,
          average_engagement_rate: 0.0,
          total_reach: 0,
          total_comments: 0,
          total_shares: 0,
          total_saves: 0,
          average_views: 0.0,
        },
        overviewKpiCards: [],
        timeSeries: [],
        formatPerformance: [],
        topPosts: [],
        quickInsights: [],
        descriptiveStats: [],
        contentAnalysis: [],
        categoryAnalysis: [],
        platformAnalysis: [],
        dayAnalysis: [],
        heatmapMatrix: [
          [0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0],
        ],
        correlationMatrix: [],
      });
    }

    // Transform MongoDB documents to analytics format
    const transformedPosts = toAnalyticsRecords(posts);

    // Spawn Python analytics bridge
    const pyProcess = spawn(pythonExec, [bridgeScript], {
      cwd: rootDir,
    });

    let outputData = '';
    let errorData = '';

    pyProcess.stdout.on('data', (chunk) => {
      outputData += chunk.toString();
    });

    pyProcess.stderr.on('data', (chunk) => {
      errorData += chunk.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Analytics Bridge Error] Code: ${code}, Stderr: ${errorData}`);
        return res.status(500).json({ error: 'Failed to compute analytics on dataset' });
      }

      try {
        const analyticsResult = JSON.parse(outputData);
        analyticsResult.filterOptions = filterOptions;
        analyticsResult.datasetPosts = datasetPosts;
        return res.json(analyticsResult);
      } catch (parseErr) {
        console.error('[Analytics Bridge JSON Parse Error]', parseErr, outputData);
        return res.status(500).json({ error: 'Invalid response from analytics engine' });
      }
    });

    // Write input JSON to stdin and end stream
    pyProcess.stdin.write(JSON.stringify(transformedPosts));
    pyProcess.stdin.end();
  } catch (err) {
    console.error('[Analytics Controller Error]', err);
    return res.status(500).json({ error: 'Server error processing analytics' });
  }
};
