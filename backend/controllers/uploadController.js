import Post, { VALID_PLATFORMS, VALID_CONTENT_TYPES } from '../models/Post.js';
import { parseCSV } from '../utils/csvParser.js';
import {
  MAX_CATEGORY_LENGTH,
  MAX_POST_ID_LENGTH,
  parsePostingHour,
  parseStrictDate,
} from '../utils/validation.js';

// Upper bounds so a single upload cannot exhaust memory or produce a huge response
const MAX_CSV_ROWS = 10000;
const MAX_REPORTED_ERRORS = 200;

const REQUIRED_CSV_COLUMNS = [
  'post_id',
  'date',
  'platform',
  'content_type',
  'category',
  'caption_length',
  'hashtags_count',
  'duration_seconds',
  'posting_hour',
  'views',
  'likes',
  'comments',
  'shares',
  'saves',
  'reach',
];

/**
 * @desc    Upload & process CSV dataset
 * @route   POST /api/upload/csv
 * @access  Private
 */
export const uploadCSV = async (req, res) => {
  try {
    // 1. Validate file exists
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a CSV file' });
    }

    // 2. Validate .csv extension
    const filename = req.file.originalname || '';
    if (!filename.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({ error: 'Invalid file format. Only .csv files are supported' });
    }

    // 3. Read & parse CSV buffer
    // Strip a UTF-8 byte-order mark (Excel adds one), which would otherwise break the first header
    const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    // NUL bytes mean this is a binary file renamed to .csv
    if (csvContent.includes('\u0000')) {
      return res.status(400).json({ error: 'The uploaded file is not a text CSV file' });
    }
    const { headers, rows } = parseCSV(csvContent);

    if (!headers || headers.length === 0 || !rows || rows.length === 0) {
      return res.status(400).json({ error: 'The uploaded CSV file is empty or corrupted' });
    }

    if (rows.length > MAX_CSV_ROWS) {
      return res.status(400).json({
        error: `CSV has ${rows.length} rows; the maximum per upload is ${MAX_CSV_ROWS}. Split the file and upload in parts.`,
      });
    }

    // 4. Validate required columns exist in headers
    const missingColumns = REQUIRED_CSV_COLUMNS.filter((col) => !headers.includes(col));
    if (missingColumns.length > 0) {
      return res.status(400).json({
        error: `CSV missing required columns: ${missingColumns.join(', ')}`,
        missingColumns,
        requiredColumns: REQUIRED_CSV_COLUMNS,
      });
    }

    // Fetch existing post IDs for this user to detect duplicates against database
    const existingPosts = await Post.find({ userId: req.user._id }).select('postId');
    const existingDbPostIds = new Set(existingPosts.map((p) => p.postId));
    const seenCsvPostIds = new Set();

    const validRecords = [];
    const errorRows = [];
    const previewRows = [];

    // Raw values are echoed back in error messages; keep them short
    const shown = (value) => {
      const text = String(value ?? '');
      return text.length > 40 ? `${text.slice(0, 40)}…` : text;
    };

    // 5. Validate row-by-row
    rows.forEach((row, index) => {
      const rowNum = index + 2; // +1 for 0-index, +1 for header line
      const rowErrors = [];

      const rawPostId = (row.post_id || '').trim();
      const rawDate = (row.date || '').trim();
      const rawPlatform = (row.platform || '').trim();
      const rawContentType = (row.content_type || '').trim();
      const rawCategory = (row.category || '').trim();

      // Validate Post ID
      if (!rawPostId) {
        rowErrors.push('Missing post_id');
      } else if (rawPostId.length > MAX_POST_ID_LENGTH) {
        rowErrors.push(`post_id cannot exceed ${MAX_POST_ID_LENGTH} characters`);
      } else if (seenCsvPostIds.has(rawPostId)) {
        rowErrors.push(`Duplicate post_id "${shown(rawPostId)}" within CSV`);
      } else if (existingDbPostIds.has(rawPostId)) {
        rowErrors.push(`post_id "${shown(rawPostId)}" already exists in your workspace`);
      } else {
        seenCsvPostIds.add(rawPostId);
      }

      // Validate Date
      let parsedDate = null;
      if (!rawDate) {
        rowErrors.push('Missing date');
      } else {
        // Strict YYYY-MM-DD: rejects impossible dates (2026-02-30) instead of rolling them over
        parsedDate = parseStrictDate(rawDate);
        if (!parsedDate) {
          rowErrors.push(`Invalid date "${shown(rawDate)}" (use YYYY-MM-DD)`);
        }
      }

      // Validate Platform
      const matchedPlatform = VALID_PLATFORMS.find(
        (p) => p.toLowerCase() === rawPlatform.toLowerCase()
      );
      if (!matchedPlatform) {
        rowErrors.push(`Invalid platform "${shown(rawPlatform)}". Supported: ${VALID_PLATFORMS.join(', ')}`);
      }

      // Validate Content Type
      const matchedContentType = VALID_CONTENT_TYPES.find(
        (t) => t.toLowerCase() === rawContentType.toLowerCase()
      );
      if (!matchedContentType) {
        rowErrors.push(`Invalid content_type "${shown(rawContentType)}". Supported: ${VALID_CONTENT_TYPES.join(', ')}`);
      }

      // Validate Category
      if (!rawCategory) {
        rowErrors.push('Missing category');
      } else if (rawCategory.length > MAX_CATEGORY_LENGTH) {
        rowErrors.push(`category cannot exceed ${MAX_CATEGORY_LENGTH} characters`);
      }

      // Validate Posting Hour (0-23)
      const rawHour = row.posting_hour;
      const parsedHour = parsePostingHour(rawHour);
      if (parsedHour === null) {
        rowErrors.push(`posting_hour must be an integer between 0 and 23 (got "${shown(rawHour)}")`);
      }

      // Validate Numeric Metrics
      const parseMetric = (colName) => {
        const val = Number(row[colName]);
        // Number.isFinite also rejects "Infinity"
        if (!Number.isFinite(val)) {
          rowErrors.push(`${colName} must be a number (got "${shown(row[colName])}")`);
          return 0;
        }
        if (val < 0) {
          rowErrors.push(`${colName} cannot be negative (got "${val}")`);
          return 0;
        }
        return val;
      };

      const captionLength = parseMetric('caption_length');
      const hashtagsCount = parseMetric('hashtags_count');
      const durationSeconds = parseMetric('duration_seconds');
      const views = parseMetric('views');
      const likes = parseMetric('likes');
      const comments = parseMetric('comments');
      const shares = parseMetric('shares');
      const saves = parseMetric('saves');
      const reach = parseMetric('reach');

      // Check row validity
      if (rowErrors.length > 0) {
        errorRows.push({
          row: rowNum,
          postId: rawPostId || `Row-${rowNum}`,
          errors: rowErrors,
        });
      } else {
        // Calculate engagement
        const engagement = likes + comments + shares + saves;
        const engagementRate = reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0;

        const record = {
          userId: req.user._id,
          postId: rawPostId,
          date: parsedDate,
          platform: matchedPlatform,
          contentType: matchedContentType,
          category: rawCategory,
          captionLength,
          hashtagsCount,
          durationSeconds,
          postingHour: parsedHour,
          views,
          likes,
          comments,
          shares,
          saves,
          reach,
          engagementRate,
        };

        validRecords.push(record);
      }

      // Include in preview rows (first 10 rows)
      if (index < 10) {
        previewRows.push({
          row: rowNum,
          post_id: rawPostId || `Row-${rowNum}`,
          platform: rawPlatform,
          content_type: rawContentType,
          category: rawCategory,
          views: Number(row.views) || 0,
          likes: Number(row.likes) || 0,
          status: rowErrors.length === 0 ? 'Valid' : 'Invalid',
          errors: rowErrors,
        });
      }
    });

    // 6. Insert valid records into MongoDB
    let importedRows = 0;
    let skippedDuplicates = 0;
    if (validRecords.length > 0) {
      try {
        const inserted = await Post.insertMany(validRecords, { ordered: false });
        importedRows = inserted.length;
      } catch (insertError) {
        // ordered:false keeps inserting after a duplicate-key error (e.g. a concurrent upload of the
        // same post_id); report what was actually saved instead of failing the whole request
        const duplicates = (insertError.writeErrors || []).filter((e) => (e.code ?? e.err?.code) === 11000);
        if (insertError.code !== 11000 && duplicates.length === 0) throw insertError;
        importedRows = insertError.insertedDocs?.length ?? insertError.result?.insertedCount ?? 0;
        skippedDuplicates = validRecords.length - importedRows;
      }
    }

    res.status(200).json({
      success: true,
      totalRows: rows.length,
      validRows: validRecords.length,
      invalidRows: errorRows.length,
      importedRows,
      skippedDuplicates,
      errors: errorRows.slice(0, MAX_REPORTED_ERRORS),
      errorsTruncated: errorRows.length > MAX_REPORTED_ERRORS,
      preview: previewRows,
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Server error processing CSV file' });
  }
};
