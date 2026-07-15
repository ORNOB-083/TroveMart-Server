import express from 'express';
import { requireAuth } from '../middleware/auth';
import * as cartController from '../controllers/cart.controller';

const router = express.Router();

// All cart routes require authentication
router.use(requireAuth);

// Get user's cart
router.get('/', cartController.getUserCart);

// Add item to cart
router.post('/', cartController.addToCart);

// Update item quantity in cart
router.put('/:itemId', cartController.updateCartItem);

// Remove item from cart
router.delete('/:itemId', cartController.removeFromCart);

// Clear cart
router.delete('/', cartController.clearCart);

export default router;