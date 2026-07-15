import { Router } from 'express';
import { getItems, getItemById, getCategories, createItem } from '../controllers/items.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getItems);
router.get('/categories', getCategories);
router.get('/:id', getItemById);
router.post('/', requireAuth, requireRole('seller', 'admin'), createItem);

// POST / PUT / DELETE (create, update, delete) come later with items/add + items/manage,
// guarded by requireAuth + requireRole('seller', 'admin')

export default router;