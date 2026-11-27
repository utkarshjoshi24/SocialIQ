import mongoose from 'mongoose';
import Post, { VALID_PLATFORMS, VALID_CONTENT_TYPES } from '../models/Post.js';

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

    // Search query across category, platform, or postId
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      query.$or = [{ category: regex }, { platform: regex }, { postId: regex }];
    }

    // Platform filter
    if (req.query.platform && req.query.platform !== 'All') {
      query.platform = req.query.platform;
    }

    // Content Type filter
    if (req.query.contentType && req.query.contentType !== 'All') {
      query.contentType = req.query.contentType;
    }

    // Category filter
    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }

    // Sorting
    let sort = { date: -1, createdAt: -1 };
    if (req.query.sort) {
      const sortField = req.query.sort.replace('-', '');
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sort = { [sortField]: sortOrder };
    }

    const posts = await Post.find(query).sort(sort);

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    console.error('getPosts error:', error);
    res.status(500).json({ error: error.message || 'Server error fetching posts' });
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
    res.status(500).json({ error: error.message || 'Server error fetching post' });
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

    // 1. Required fields validation
    if (!platform || !contentType || !category || postingHour === undefined || postingHour === null) {
      return res.status(400).json({
        error: 'Please provide all required fields: platform, contentType, category, and postingHour',
      });
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
    const parsedHour = Number(postingHour);
    if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) {
      return res.status(400).json({
        error: 'Posting hour must be an integer between 0 and 23',
      });
    }

    // 4. Validate non-negative numbers
    const numericFields = {
      views: Number(views),
      likes: Number(likes),
      comments: Number(comments),
      shares: Number(shares),
      saves: Number(saves),
      reach: Number(reach),
      captionLength: Number(captionLength),
      hashtagsCount: Number(hashtagsCount),
      durationSeconds: Number(durationSeconds),
    };

    for (const [key, val] of Object.entries(numericFields)) {
      if (isNaN(val) || val < 0) {
        return res.status(400).json({
          error: `${key} must be a non-negative number`,
        });
      }
    }

    // 5. Generate or validate postId
    let assignedPostId = customPostId;
    if (!assignedPostId) {
      const count = await Post.countDocuments({ userId: req.user._id });
      assignedPostId = `P${String(count + 1).padStart(3, '0')}`;
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
    if (date) {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date provided' });
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
    res.status(500).json({ error: error.message || 'Server error creating post' });
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
      const parsedHour = Number(req.body.postingHour);
      if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) {
        return res.status(400).json({
          error: 'Posting hour must be an integer between 0 and 23',
        });
      }
      post.postingHour = parsedHour;
    }

    // Validate numeric values if provided
    const numericKeys = [
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

    for (const key of numericKeys) {
      if (req.body[key] !== undefined) {
        const val = Number(req.body[key]);
        if (isNaN(val) || val < 0) {
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
      const parsedDate = new Date(req.body.date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date provided' });
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
    res.status(500).json({ error: error.message || 'Server error updating post' });
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
    res.status(500).json({ error: error.message || 'Server error deleting post' });
  }
};
