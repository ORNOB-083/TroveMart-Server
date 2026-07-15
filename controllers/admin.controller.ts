import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';
import { Item, ItemStatus } from '../models/Item';

export async function getAdminItems(req: Request, res: Response) {
    try {
        const db = getDB();
        const items = db.collection<Item>('items');
        const { status = 'pending' } = req.query as { status?: string };

        const filter: Record<string, any> = {};
        if (status !== 'all') filter.status = status;

        const results = await items.find(filter).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ items: results });
    } catch (err) {
        console.error('Get admin items error:', err);
        return res.status(500).json({ message: 'Failed to load items.' });
    }
}

async function updateItemStatus(req: Request, res: Response, status: ItemStatus) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid item ID.' });
        }

        const db = getDB();
        const items = db.collection<Item>('items');

        const result = await items.findOneAndUpdate(
            { _id: new ObjectId(id) as any },
            { $set: { status } },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        return res.status(200).json({ item: result });
    } catch (err) {
        console.error('Update item status error:', err);
        return res.status(500).json({ message: 'Failed to update item status.' });
    }
}

export const approveItem = (req: Request, res: Response) => updateItemStatus(req, res, 'approved');
export const rejectItem = (req: Request, res: Response) => updateItemStatus(req, res, 'rejected');