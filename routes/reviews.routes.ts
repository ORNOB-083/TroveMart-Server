import { Router } from 'express';
import { getReviews, addReview } from '../controllers/reviews.controller';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.get('/', getReviews);
router.post('/', requireAuth, addReview);

export default router;