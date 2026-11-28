import mongoose from 'mongoose';

const VALID_PLATFORMS = ['Instagram', 'YouTube', 'LinkedIn', 'Twitter/X', 'TikTok', 'Facebook'];
const VALID_CONTENT_TYPES = ['Reel', 'Carousel', 'Video', 'Image', 'Text'];

const postSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: [true, 'Post ID is required'],
      trim: true,
      maxlength: [64, 'Post ID cannot exceed 64 characters'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    platform: {
      type: String,
      required: [true, 'Platform is required'],
      enum: {
        values: VALID_PLATFORMS,
        message: '{VALUE} is not a supported platform',
      },
    },
    contentType: {
      type: String,
      required: [true, 'Content type is required'],
      enum: {
        values: VALID_CONTENT_TYPES,
        message: '{VALUE} is not a supported content type',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
    },
    captionLength: {
      type: Number,
      default: 0,
      min: [0, 'Caption length cannot be negative'],
    },
    hashtagsCount: {
      type: Number,
      default: 0,
      min: [0, 'Hashtags count cannot be negative'],
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
    postingHour: {
      type: Number,
      required: [true, 'Posting hour is required'],
      min: [0, 'Posting hour must be between 0 and 23'],
      max: [23, 'Posting hour must be between 0 and 23'],
    },
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative'],
    },
    likes: {
      type: Number,
      default: 0,
      min: [0, 'Likes cannot be negative'],
    },
    comments: {
      type: Number,
      default: 0,
      min: [0, 'Comments cannot be negative'],
    },
    shares: {
      type: Number,
      default: 0,
      min: [0, 'Shares cannot be negative'],
    },
    saves: {
      type: Number,
      default: 0,
      min: [0, 'Saves cannot be negative'],
    },
    reach: {
      type: Number,
      default: 0,
      min: [0, 'Reach cannot be negative'],
    },
    engagementRate: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique postId per user
postSchema.index({ userId: 1, postId: 1 }, { unique: true });

// Pre-save calculation of engagement rate
postSchema.pre('save', function () {
  const engagement = (this.likes || 0) + (this.comments || 0) + (this.shares || 0) + (this.saves || 0);
  if (this.reach && this.reach > 0) {
    this.engagementRate = Number(((engagement / this.reach) * 100).toFixed(2));
  } else {
    this.engagementRate = 0;
  }
});

export { VALID_PLATFORMS, VALID_CONTENT_TYPES };
const Post = mongoose.model('Post', postSchema);
export default Post;
