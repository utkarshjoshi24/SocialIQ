import mongoose from 'mongoose';
import Post, { VALID_PLATFORMS, VALID_CONTENT_TYPES } from '../models/Post.js';
import {
  MAX_CATEGORY_LENGTH,
  MAX_POST_ID_LENGTH,
  escapeRegex,
  isString,
  optionalString,
  parseNonNegativeNumber,
  parsePostingHour,
  parseStrictDate,
} from '../utils/validation.js';

const NUMERIC_KEYS = [
  'views',
  'likes',
  'comments',
  'shares',
  'saves',
  'reach',
  'captionLength',
  'hashtagsCount',
  'durationSeconds',
];

/** Mongoose validation / cast errors are client errors; anything else is a generic 500 */
const sendError = (res, error, fallback) => {
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors || {})[0]?.message || 'Invalid post data';
    return res.status(400).json({ error: message });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for ${error.path}` });
  }
  return res.status(500).json({ error: fallback });
};

const SORTABLE_FIELDS = ['date', 'views', 'likes', 'comments', 'shares', 'saves', 'reach', 'engagementRate', 'postId', 'createdAt'];

/**
 * Helper to compute engagement & engagement rate
 */
const calculateMetrics = (likes = 0, comments = 0, shares = 0, saves = 0, reach = 0) => {
  const engagement = Number(likes) + Number(comments) + Number(shares) + Number(saves);
  const engagementRate = reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0;
  return { engagement, engagementRate };
};

/**
 * Helper to build query filter for finding by _id or postId scoped to user
 */
const buildUserPostQuery = (id, userId) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return {
      $or: [{ _id: id, userId }, { postId: id, userId }],
    };
  }
  return { postId: id, userId };
};

/**
 * @desc    Get all posts for authenticated user
 * @route   GET /api/posts
 * @access  Private
 */
export const getPosts = async (req, res) => {
  try {
    const query = { userId: req.user._id };

    const search = optionalString(req.query.search);
    const platform = optionalString(req.query.platform);
    const contentType = optionalString(req.query.contentType);
    const category = optionalString(req.query.category);
    const sortParam = optionalString(req.query.sort);
    // Arrays/objects (e.g. ?platform[$ne]=x) must never reach the MongoDB filter
    if ([search, platform, contentType, category, sortParam].includes(null)) {
      return res.status(400).json({ error: 'Query parameters must be single text values' });
    }

    // Search query across category, platform, or postId (escaped so input like "(" is literal)
    if (search) {
      const regex = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
      query.$or = [{ category: regex }, { platform: regex }, { postId: regex }];
    }

    if (platform && platform !== 'All') query.platform = platform;
    if (contentType && contentType !== 'All') query.contentType = contentType;
    if (category && category !== 'All') query.category = category;

    // Sorting
    let sort = { date: -1, createdAt: -1 };
    if (sortParam) {
      const sortField = sortParam.replace('-', '');
      const sortOrder = sortParam.startsWith('-') ? -1 : 1;
      if (SORTABLE_FIELDS.includes(sortField)) {
        sort = { [sortField]: sortOrder };
      }
    }

    const posts = await Post.find(query).sort(sort);

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    console.error('getPosts error:', error);
    sendError(res, error, 'Server error fetching posts');
  }
};

/**
 * @desc    Get single post by ID (MongoDB _id or postId)
 * @route   GET /api/posts/:id
 * @access  Private
 */
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findOne(buildUserPostQuery(req.params.id, req.user._id));

    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('getPostById error:', error);
    sendError(res, error, 'Server error fetching post');
  }
};

/**
 * @desc    Create new post
 * @route   POST /api/posts
 * @access  Private
 */
export const createPost = async (req, res) => {
  try {
    const {
      postId: customPostId,
      date,
      platform,
      contentType,
      category,
      captionLength = 0,
      hashtagsCount = 0,
      durationSeconds = 0,
      postingHour,
      views = 0,
      likes = 0,
      comments = 0,
      shares = 0,
      saves = 0,
      reach = 0,
    } = req.body;

    // 1. Required fields validation (strings only — objects/arrays are rejected)
    if (!isString(platform) || !isString(contentType) || !isString(category) || !category.trim() ||
        postingHour === undefined || postingHour === null || postingHour === '') {
      return res.status(400).json({
        error: 'Please provide all required fields: platform, contentType, category, and postingHour',
      });
    }
    if (category.trim().length > MAX_CATEGORY_LENGTH) {
      return res.status(400).json({ error: `Category cannot exceed ${MAX_CATEGORY_LENGTH} characters` });
    }
    if (customPostId !== undefined && customPostId !== null && customPostId !== '') {
      if (!isString(customPostId) || !customPostId.trim() || customPostId.trim().length > MAX_POST_ID_LENGTH) {
        return res.status(400).json({ error: `postId must be text of at most ${MAX_POST_ID_LENGTH} characters` });
      }
    }

    // 2. Validate Platform & Content Type
    if (!VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        error: `Invalid platform. Supported platforms: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      return res.status(400).json({
        error: `Invalid content type. Supported types: ${VALID_CONTENT_TYPES.join(', ')}`,
      });
    }

    // 3. Validate postingHour (0-23)
    const parsedHour = parsePostingHour(postingHour);
    if (parsedHour === null) {
      return res.status(400).json({
        error: 'Posting hour must be an integer between 0 and 23',
      });
    }

    // 4. Validate non-negative, finite numbers
    const rawNumbers = { views, likes, comments, shares, saves, reach, captionLength, hashtagsCount, durationSeconds };
    const numericFields = {};
    for (const [key, raw] of Object.entries(rawNumbers)) {
      const val = parseNonNegativeNumber(raw);
      if (val === null) {
        return res.status(400).json({
          error: `${key} must be a non-negative number`,
        });
      }
      numericFields[key] = val;
    }

    // 5. Generate or validate postId
    let assignedPostId = isString(customPostId) ? customPostId.trim() : '';
    if (!assignedPostId) {
      // Next free P### id (a plain count can collide after posts are deleted)
      let next = (await Post.countDocuments({ userId: req.user._id })) + 1;
      do {
        assignedPostId = `P${String(next).padStart(3, '0')}`;
        next += 1;
      } while (await Post.exists({ userId: req.user._id, postId: assignedPostId }));
    }

    // Check for duplicate postId for this user
    const existingPost = await Post.findOne({ userId: req.user._id, postId: assignedPostId });
    if (existingPost) {
      return res.status(400).json({
        error: `Post with ID "${assignedPostId}" already exists in your workspace`,
      });
    }

    // 6. Validate Date
    let parsedDate = new Date();
    if (date !== undefined && date !== null && date !== '') {
      parsedDate = parseStrictDate(date);
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date provided (use YYYY-MM-DD)' });
      }
    }

    // 7. Calculate engagementRate
    const { engagementRate } = calculateMetrics(
      numericFields.likes,
      numericFields.comments,
      numericFields.shares,
      numericFields.saves,
      numericFields.reach
    );

    // 8. Create and save post
    const post = await Post.create({
      postId: assignedPostId,
      userId: req.user._id,
      date: parsedDate,
      platform,
      contentType,
      category: category.trim(),
      captionLength: numericFields.captionLength,
      hashtagsCount: numericFields.hashtagsCount,
      durationSeconds: numericFields.durationSeconds,
      postingHour: parsedHour,
      views: numericFields.views,
      likes: numericFields.likes,
      comments: numericFields.comments,
      shares: numericFields.shares,
      saves: numericFields.saves,
      reach: numericFields.reach,
      engagementRate,
    });

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('createPost error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A post with this postId already exists' });
    }
    sendError(res, error, 'Server error creating post');
  }
};

/**
 * @desc    Update post by ID (MongoDB _id or postId)
 * @route   PUT /api/posts/:id
 * @access  Private
 */
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findOne(buildUserPostQuery(req.params.id, req.user._id));

    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    const body = req.body || {};
    for (const key of ['platform', 'contentType', 'category']) {
      if (body[key] !== undefined && (!isString(body[key]) || !body[key].trim())) {
        return res.status(400).json({ error: `${key} must be non-empty text` });
      }
    }
    if (isString(body.category) && body.category.trim().length > MAX_CATEGORY_LENGTH) {
      return res.status(400).json({ error: `Category cannot exceed ${MAX_CATEGORY_LENGTH} characters` });
    }

    // Validate platform if provided
    if (req.body.platform && !VALID_PLATFORMS.includes(req.body.platform)) {
      return res.status(400).json({
        error: `Invalid platform. Supported platforms: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    // Validate contentType if provided
    if (req.body.contentType && !VALID_CONTENT_TYPES.includes(req.body.contentType)) {
      return res.status(400).json({
        error: `Invalid content type. Supported types: ${VALID_CONTENT_TYPES.join(', ')}`,
      });
    }

    // Validate postingHour if provided
    if (req.body.postingHour !== undefined) {
      const parsedHour = parsePostingHour(req.body.postingHour);
      if (parsedHour === null) {
        return res.status(400).json({
          error: 'Posting hour must be an integer between 0 and 23',
        });
      }
      post.postingHour = parsedHour;
    }

    // Validate numeric values if provided
    for (const key of NUMERIC_KEYS) {
      if (req.body[key] !== undefined) {
        const val = parseNonNegativeNumber(req.body[key]);
        if (val === null) {
          return res.status(400).json({ error: `${key} must be a non-negative number` });
        }
        post[key] = val;
      }
    }

    // Update string and date fields if provided
    if (req.body.platform) post.platform = req.body.platform;
    if (req.body.contentType) post.contentType = req.body.contentType;
    if (req.body.category) post.category = req.body.category.trim();
    if (req.body.date) {
      const parsedDate = parseStrictDate(req.body.date);
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date provided (use YYYY-MM-DD)' });
      }
      post.date = parsedDate;
    }

    // Recalculate engagement rate
    const { engagementRate } = calculateMetrics(post.likes, post.comments, post.shares, post.saves, post.reach);
    post.engagementRate = engagementRate;

    await post.save();

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('updatePost error:', error);
    sendError(res, error, 'Server error updating post');
  }
};

/**
 * @desc    Delete ALL posts for the authenticated user (Settings → Delete Data)
 * @route   DELETE /api/posts
 * @access  Private
 */
export const deleteAllPosts = async (req, res) => {
  try {
    if (req.query.confirm !== 'DELETE') {
      return res.status(400).json({ error: 'Confirmation required: pass confirm=DELETE' });
    }
    const result = await Post.deleteMany({ userId: req.user._id });
    res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('deleteAllPosts error:', error);
    res.status(500).json({ error: 'Server error deleting posts' });
  }
};

/**
 * @desc    Delete post by ID (MongoDB _id or postId)
 * @route   DELETE /api/posts/:id
 * @access  Private
 */
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete(buildUserPostQuery(req.params.id, req.user._id));

    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    res.status(200).json({
      success: true,
      message: `Post ${post.postId} deleted successfully`,
      data: { id: post._id, postId: post.postId },
    });
  } catch (error) {
    console.error('deletePost error:', error);
    sendError(res, error, 'Server error deleting post');
  }
};
