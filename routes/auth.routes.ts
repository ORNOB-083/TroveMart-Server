import { Router } from 'express';
import { register, login, me, googleAuth, facebookAuth, refreshToken } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/facebook', facebookAuth);
router.get('/me', requireAuth, me);
router.get('/refresh', requireAuth, refreshToken);

export default router;