import { Router } from 'express';
import { getAdminItems, approveItem, rejectItem, getAllUsers, banUser, unbanUser } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/items', getAdminItems);
router.get('/users', getAllUsers);
router.patch('/items/:id/approve', approveItem);
router.patch('/items/:id/reject', rejectItem);
router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/unban', unbanUser);

export default router;