import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';
import { Item, ItemStatus } from '../models/Item';
import { User } from '../models/User';

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

export async function getAllUsers(req: Request, res: Response) {
    try {
        const db = getDB();
        const users = db.collection<User>('users');
        const { role = 'all' } = req.query as { role?: string };

        const filter: Record<string, any> = {};
        if (role !== 'all') filter.role = role;

        const results = await users
            .find(filter, { projection: { password: 0 } }) // never send password hashes
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({ users: results });
    } catch (err) {
        console.error('Get all users error:', err);
        return res.status(500).json({ message: 'Failed to load users.' });
    }
}

async function setUserBanStatus(req: Request, res: Response, banned: boolean) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user ID.' });
        }

        const db = getDB();
        const users = db.collection<User>('users');

        const target = await users.findOne({ _id: new ObjectId(id) as any });
        if (!target) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (target.role === 'admin') {
            return res.status(403).json({ message: 'Admins cannot be banned.' });
        }

        const result = await users.findOneAndUpdate(
            { _id: new ObjectId(id) as any },
            { $set: { banned } },
            { returnDocument: 'after', projection: { password: 0 } }
        );

        return res.status(200).json({ user: result });
    } catch (err) {
        console.error('Set ban status error:', err);
        return res.status(500).json({ message: 'Failed to update user.' });
    }
}



export const approveItem = (req: Request, res: Response) => updateItemStatus(req, res, 'approved');
export const rejectItem = (req: Request, res: Response) => updateItemStatus(req, res, 'rejected');
export const banUser = (req: Request, res: Response) => setUserBanStatus(req, res, true);
export const unbanUser = (req: Request, res: Response) => setUserBanStatus(req, res, false);