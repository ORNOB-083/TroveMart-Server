import { Router } from 'express';
import { getItems, getItemById, getCategories } from '../controllers/items.controller';

const router = Router();

router.get('/', getItems);
router.get('/categories', getCategories);
router.get('/:id', getItemById);

// POST / PUT / DELETE (create, update, delete) come later with items/add + items/manage,
// guarded by requireAuth + requireRole('seller', 'admin')

export default router;