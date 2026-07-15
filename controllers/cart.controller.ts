import { Request, Response } from 'express';
import { getDB } from '../config/db';
import { ObjectId } from 'mongodb';
import { CartItem } from '../models/User';

// Get user's cart
export const getUserCart = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const db = getDB();
        
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get cart items from user document
        const cartItems = user.cart || [];
        
        // Fetch item details for each cart item
        const itemsWithDetails = await Promise.all(
            cartItems.map(async (cartItem: CartItem) => {
                const item = await db.collection('items').findOne({ 
                    _id: new ObjectId(cartItem.itemId) 
                });
                
                if (!item) return null;
                
                return {
                    itemId: cartItem.itemId,
                    quantity: cartItem.quantity,
                    item: {
                        _id: item._id,
                        title: item.title,
                        price: item.price,
                        images: item.images,
                        category: item.category,
                        sellerId: item.sellerId,
                        sellerName: item.sellerName,
                        quantity: item.quantity
                    }
                };
            })
        );

        // Filter out null items (deleted items)
        const validItems = itemsWithDetails.filter(item => item !== null);

        res.json({ items: validItems });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Failed to fetch cart' });
    }
};

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { itemId, quantity = 1 } = req.body;
        
        // Ensure itemId is a string
        const itemIdString = Array.isArray(itemId) ? itemId[0] : itemId;
        
        if (!itemIdString) {
            return res.status(400).json({ message: 'Item ID is required' });
        }

        const db = getDB();
        
        // Check if item exists and is available
        const item = await db.collection('items').findOne({ 
            _id: new ObjectId(itemIdString) 
        });
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        if (item.quantity < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }

        // Update user's cart
        const user = await db.collection('users').findOne({ 
            _id: new ObjectId(userId) 
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const cart: CartItem[] = user.cart || [];
        const existingItemIndex = cart.findIndex((item: CartItem) => item.itemId === itemIdString);

        if (existingItemIndex >= 0) {
            // Update quantity if item already in cart
            cart[existingItemIndex].quantity += quantity;
        } else {
            // Add new item to cart
            cart.push({ itemId: itemIdString, quantity });
        }

        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { cart } }
        );

        res.json({ message: 'Item added to cart', cart });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Failed to add item to cart' });
    }
};

// Update item quantity in cart
export const updateCartItem = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { itemId } = req.params;
        const { quantity } = req.body;
        
        // Ensure itemId is a string
        const itemIdString = Array.isArray(itemId) ? itemId[0] : itemId;
        
        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Valid quantity is required' });
        }

        const db = getDB();
        
        const user = await db.collection('users').findOne({ 
            _id: new ObjectId(userId) 
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const cart: CartItem[] = user.cart || [];
        const itemIndex = cart.findIndex((item: CartItem) => item.itemId === itemIdString);

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not in cart' });
        }

        // Check if requested quantity is available
        const item = await db.collection('items').findOne({ 
            _id: new ObjectId(itemIdString) 
        });
        
        if (item && item.quantity < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }

        cart[itemIndex].quantity = quantity;

        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { cart } }
        );

        res.json({ message: 'Cart item updated', cart });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ message: 'Failed to update cart item' });
    }
};

// Remove item from cart
export const removeFromCart = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { itemId } = req.params;
        
        // Ensure itemId is a string
        const itemIdString = Array.isArray(itemId) ? itemId[0] : itemId;
        
        const db = getDB();
        
        const user = await db.collection('users').findOne({ 
            _id: new ObjectId(userId) 
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const cart: CartItem[] = (user.cart || []).filter((item: CartItem) => item.itemId !== itemIdString);

        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { cart } }
        );

        res.json({ message: 'Item removed from cart', cart });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ message: 'Failed to remove item from cart' });
    }
};

// Clear cart
export const clearCart = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const db = getDB();
        
        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { cart: [] } }
        );

        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Failed to clear cart' });
    }
};