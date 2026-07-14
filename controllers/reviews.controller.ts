import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';
import { Review } from '../models/Review';
import { Item } from '../models/Item';

export async function getReviews(req: Request, res: Response) {
    try {
        const db = getDB();
        const reviews = db.collection<Review>('reviews');
        const { itemId } = req.params;

        const results = await reviews.find({ itemId }).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ reviews: results });
    } catch (err) {
        console.error('Get reviews error:', err);
        return res.status(500).json({ message: 'Failed to load reviews.' });
    }
}

export async function addReview(req: Request, res: Response) {
    try {
        const itemIdRaw = req.params.itemId;
        const itemId = typeof itemIdRaw === 'string' ? itemIdRaw : '';
        const { rating, comment } = req.body;
        const user = (req as any).user; // set by requireAuth middleware

        if (!ObjectId.isValid(itemId)) {
            return res.status(400).json({ message: 'Invalid item ID.' });
        }
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }
        if (!comment || !comment.trim()) {
            return res.status(400).json({ message: 'Review comment is required.' });
        }

        const db = getDB();
        const reviews = db.collection<Review>('reviews');
        const items = db.collection<Item>('items');

        // One review per user per item
        const existing = await reviews.findOne({ itemId, userId: user.id });
        if (existing) {
            return res.status(409).json({ message: 'You have already reviewed this item.' });
        }

        const newReview: Review = {
            itemId,
            userId: user.id,
            userName: user.name,
            userImage: user.image,
            rating: Number(rating),
            comment: comment.trim(),
            createdAt: new Date(),
        };

        await reviews.insertOne(newReview);

        // Recalculate the item's aggregate rating
        const allReviews = await reviews.find({ itemId }).toArray();
        const reviewCount = allReviews.length;
        const ratingAvg = allReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

        await items.updateOne(
            { _id: new ObjectId(itemId) as any },
            { $set: { ratingAvg: Math.round(ratingAvg * 10) / 10, reviewCount } }
        );

        return res.status(201).json({ review: newReview });
    } catch (err) {
        console.error('Add review error:', err);
        return res.status(500).json({ message: 'Failed to submit review.' });
    }
}