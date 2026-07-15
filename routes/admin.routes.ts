import { Router } from 'express';
import { getAdminItems, approveItem, rejectItem } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/items', getAdminItems);
router.patch('/items/:id/approve', approveItem);
router.patch('/items/:id/reject', rejectItem);

export default router;