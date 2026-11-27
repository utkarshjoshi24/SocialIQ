import { Router } from 'express';
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Protect all post routes with JWT middleware
router.use(protect);

router.route('/')
  .get(getPosts)
  .post(createPost);

router.route('/:id')
  .get(getPostById)
  .put(updatePost)
  .delete(deletePost);

export default router;
