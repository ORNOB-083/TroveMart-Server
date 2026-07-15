import { Router } from 'express';
import { getMyWishlist, toggleWishlist } from '../controllers/wishlist.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/mine', requireAuth, getMyWishlist);
router.post('/:itemId/toggle', requireAuth, toggleWishlist);

export default router;