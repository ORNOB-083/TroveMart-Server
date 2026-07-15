import { Router } from 'express';
import { getItems, getItemById, getCategories, createItem, getMyItems } from '../controllers/items.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getItems);
router.get('/categories', getCategories);
router.get('/mine', requireAuth, requireRole('seller', 'admin'), getMyItems);
router.get('/:id', getItemById);
router.post('/', requireAuth, requireRole('seller', 'admin'), createItem);

// POST / PUT / DELETE (create, update, delete) come later with items/add + items/manage,
// guarded by requireAuth + requireRole('seller', 'admin')

export default router;