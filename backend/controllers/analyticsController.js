import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Post from '../models/Post.js';

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
    reach: Number(p.reach) || Number(p.views) || 0,
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

/**
 * Controller to fetch and calculate real-time social media analytics
 * GET /api/analytics
 */
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform, contentType, category, startDate, endDate } = req.query;

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
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // 1. Fetch filtered posts
    const posts = await Post.find(query).sort({ date: 1 }).lean();

    // 2. Fetch distinct filter options across all posts for this user
    const userMetaPosts = await Post.find({ userId }, 'platform contentType category').lean();
    const platforms = Array.from(new Set(userMetaPosts.map((p) => p.platform).filter(Boolean)));
    const contentTypes = Array.from(new Set(userMetaPosts.map((p) => p.contentType).filter(Boolean)));
    const categories = Array.from(new Set(userMetaPosts.map((p) => p.category).filter(Boolean)));

    const filterOptions = {
      platforms: platforms.length > 0 ? platforms : ['Instagram', 'YouTube', 'LinkedIn'],
      contentTypes: contentTypes.length > 0 ? contentTypes : ['Reel', 'Carousel', 'Video', 'Image'],
      categories: categories.length > 0 ? categories : ['Travel', 'Tech', 'Education', 'Community', 'Lifestyle'],
    };

    // If no posts found, return standard clean empty payload
    if (posts.length === 0) {
      return res.json({
        totalPosts: 0,
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
        overviewKpiCards: [
          { label: 'TOTAL POSTS', value: '0', delta: '0.0%', icon: 'layers', isPositive: true },
          { label: 'TOTAL VIEWS', value: '0', delta: '0.0%', icon: 'visibility', isPositive: true },
          { label: 'TOTAL LIKES', value: '0', delta: '0.0%', icon: 'favorite', isPositive: true },
          { label: 'ENGAGEMENT RATE', value: '0.0%', delta: '0.0%', icon: 'bolt', isPositive: true },
        ],
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
        return res.status(500).json({
          error: 'Failed to compute analytics on dataset',
          details: errorData || `Process exited with code ${code}`,
        });
      }

      try {
        const analyticsResult = JSON.parse(outputData);
        analyticsResult.filterOptions = filterOptions;
        return res.json(analyticsResult);
      } catch (parseErr) {
        console.error('[Analytics Bridge JSON Parse Error]', parseErr, outputData);
        return res.status(500).json({
          error: 'Invalid response from analytics engine',
          details: parseErr.message,
        });
      }
    });

    // Write input JSON to stdin and end stream
    pyProcess.stdin.write(JSON.stringify(transformedPosts));
    pyProcess.stdin.end();
  } catch (err) {
    console.error('[Analytics Controller Error]', err);
    return res.status(500).json({ error: 'Server error processing analytics', message: err.message });
  }
};
