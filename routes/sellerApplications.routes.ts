import { Router } from 'express';
import {
  submitApplication,
  getMyApplication,
  getAllApplications,
  approveApplication,
  rejectApplication,
} from '../controllers/sellerApplications.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, submitApplication);
router.get('/mine', requireAuth, getMyApplication);
router.get('/', requireAuth, requireRole('admin'), getAllApplications);
router.patch('/:id/approve', requireAuth, requireRole('admin'), approveApplication);
router.patch('/:id/reject', requireAuth, requireRole('admin'), rejectApplication);

export default router;