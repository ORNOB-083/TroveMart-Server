import { Request, Response } from 'express';
import { getDB } from '../config/db';
import { Item } from '../models/Item';
import { ObjectId } from 'mongodb';

export async function getItems(req: Request, res: Response) {
    try {
        const db = getDB();
        const items = db.collection<Item>('items');

        const {
            search = '',
            category = '',
            minPrice,
            maxPrice,
            minRating,
            sort = 'newest',
            page = '1',
            limit = '8',
        } = req.query as Record<string, string>;

        const filter: Record<string, any> = {};

        if (search.trim()) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        if (minRating) {
            filter.ratingAvg = { $gte: Number(minRating) };
        }

        const sortMap: Record<string, any> = {
            newest: { createdAt: -1 },
            price_asc: { price: 1 },
            price_desc: { price: -1 },
            popular: { reviewCount: -1 },
            rating: { ratingAvg: -1 },
        };
        const sortQuery = sortMap[sort] || sortMap.newest;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(24, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [results, total] = await Promise.all([
            items.find(filter).sort(sortQuery).skip(skip).limit(limitNum).toArray(),
            items.countDocuments(filter),
        ]);

        return res.status(200).json({
            items: results,
            total,
            page: pageNum,
            totalPages: Math.max(1, Math.ceil(total / limitNum)),
        });
    } catch (err) {
        console.error('Get items error:', err);
        return res.status(500).json({ message: 'Failed to load items.' });
    }
}

export async function getItemById(req: Request, res: Response) {
    try {
        const db = getDB();
        const items = db.collection<Item>('items');
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!id || !ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid item ID.' });
        }

        const lookupId = ObjectId.isValid(id) ? new ObjectId(id) : id;
        const item = await items.findOne({ _id: lookupId as any });
        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        // Related items: same category, excluding the current item
        const related = await items
            .find({ category: item.category, _id: { $ne: item._id } })
            .limit(4)
            .toArray();

        return res.status(200).json({ item, related });
    } catch (err) {
        console.error('Get item error:', err);
        return res.status(500).json({ message: 'Failed to load item.' });
    }
}

export async function getCategories(req: Request, res: Response) {
    try {
        const db = getDB();
        const items = db.collection<Item>('items');
        const categories = await items.distinct('category');
        return res.status(200).json({ categories });
    } catch (err) {
        console.error('Get categories error:', err);
        return res.status(500).json({ message: 'Failed to load categories.' });
    }
}