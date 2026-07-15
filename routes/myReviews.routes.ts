import { Router } from 'express';
import { getMyReviews, deleteReview } from '../controllers/reviews.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/mine', requireAuth, getMyReviews);
router.delete('/:id', requireAuth, deleteReview);

export default router;