import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';
import { User } from '../models/User';
import { Item } from '../models/Item';

export async function getMyWishlist(req: Request, res: Response) {
    try {
        const authUser = (req as any).user;
        const db = getDB();
        const users = db.collection<User>('users');
        const items = db.collection<Item>('items');

        const user = await users.findOne({ _id: new ObjectId(authUser.id) } as any);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const wishlistIds = (user.wishlist || [])
            .filter((id) => ObjectId.isValid(id))
            .map((id) => new ObjectId(id));

        // 'as any' is also fine here
        const wishlistItems = await items.find({ _id: { $in: wishlistIds } } as any).toArray();

        return res.status(200).json({ items: wishlistItems });
    } catch (err) {
        console.error('Get wishlist error:', err);
        return res.status(500).json({ message: 'Failed to load wishlist.' });
    }
}

export async function toggleWishlist(req: Request, res: Response) {
    try {
        const authUser = (req as any).user;

        const itemIdParam = req.params.itemId;
        const itemId = Array.isArray(itemIdParam) ? itemIdParam[0] : itemIdParam;

        if (!ObjectId.isValid(itemId)) {
            return res.status(400).json({ message: 'Invalid item ID.' });
        }

        const db = getDB();
        const users = db.collection<User>('users');

        const user = await users.findOne({ _id: new ObjectId(authUser.id) } as any);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isLiked = (user.wishlist || []).includes(itemId);

        // The 'as any' on the update operators is safe
        await users.updateOne(
            { _id: new ObjectId(authUser.id) } as any,
            isLiked
                ? { $pull: { wishlist: itemId } as any }
                : { $addToSet: { wishlist: itemId } as any }
        );

        return res.status(200).json({ liked: !isLiked });
    } catch (err) {
        console.error('Toggle wishlist error:', err);
        return res.status(500).json({ message: 'Failed to update wishlist.' });
    }
}