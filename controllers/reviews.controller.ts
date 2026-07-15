import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';
import { Review } from '../models/Review';
import { Item } from '../models/Item';

export async function getReviews(req: Request, res: Response) {
    try {
        const db = getDB();
        const reviews = db.collection<Review>('reviews');

        const itemIdParam = req.params.itemId;
        const itemId = Array.isArray(itemIdParam) ? itemIdParam[0] : itemIdParam;

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

        const isValidObjectId = ObjectId.isValid(itemId);
        if (!isValidObjectId && !itemId) {
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

        const lookupItemId = isValidObjectId ? new ObjectId(itemId) : itemId;
        await items.updateOne(
            { _id: lookupItemId as any },
            { $set: { ratingAvg: Math.round(ratingAvg * 10) / 10, reviewCount } }
        );

        return res.status(201).json({ review: newReview });
    } catch (err) {
        console.error('Add review error:', err);
        return res.status(500).json({ message: 'Failed to submit review.' });
    }
}

export async function getMyReviews(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const db = getDB();
        const reviews = db.collection<Review>('reviews');
        const items = db.collection<Item>('items');

        const myReviews = await reviews.find({ userId: user.id }).sort({ createdAt: -1 }).toArray();

        const itemIds = myReviews
            .map((r) => (ObjectId.isValid(r.itemId) ? new ObjectId(r.itemId) : null))
            .filter(Boolean);

        const relatedItems = await items
            .find({ _id: { $in: itemIds as any[] } })
            .project({ title: 1, images: 1, price: 1 })
            .toArray();

        const itemMap = new Map(relatedItems.map((it) => [it._id!.toString(), it]));

        const enriched = myReviews.map((review) => ({
            ...review,
            item: itemMap.get(review.itemId) || null,
        }));

        return res.status(200).json({ reviews: enriched });
    } catch (err) {
        console.error('Get my reviews error:', err);
        return res.status(500).json({ message: 'Failed to load your reviews.' });
    }
}

export async function deleteReview(req: Request, res: Response) {
    try {
        const user = (req as any).user;

        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid review ID.' });
        }

        const db = getDB();
        const reviews = db.collection<Review>('reviews');
        const items = db.collection<Item>('items');

        const review = await reviews.findOne({ _id: new ObjectId(id) as any });
        if (!review) {
            return res.status(404).json({ message: 'Review not found.' });
        }
        if (review.userId !== user.id) {
            return res.status(403).json({ message: 'You can only delete your own reviews.' });
        }

        await reviews.deleteOne({ _id: new ObjectId(id) as any });

        // Recalculate the item's aggregate rating
        const remaining = await reviews.find({ itemId: review.itemId }).toArray();
        const reviewCount = remaining.length;
        const ratingAvg = reviewCount > 0 ? remaining.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;

        if (ObjectId.isValid(review.itemId)) {
            await items.updateOne(
                { _id: new ObjectId(review.itemId) as any },
                { $set: { ratingAvg: Math.round(ratingAvg * 10) / 10, reviewCount } }
            );
        }

        return res.status(200).json({ message: 'Review deleted.' });
    } catch (err) {
        console.error('Delete review error:', err);
        return res.status(500).json({ message: 'Failed to delete review.' });
    }
}