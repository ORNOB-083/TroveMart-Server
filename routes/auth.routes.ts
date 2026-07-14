import { Router } from 'express';
import { register, login, me, googleAuth, facebookAuth } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/facebook', facebookAuth);
router.get('/me', requireAuth, me);

export default router;