import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';
import { SellerApplication } from '../models/SellerApplication';
import { User } from '../models/User';

export async function submitApplication(req: Request, res: Response) {
    try {
        const authUser = (req as any).user;
        const { businessName, businessDescription, phone } = req.body;

        if (!businessName || !businessName.trim()) {
            return res.status(400).json({ message: 'Business name is required.' });
        }
        if (!businessDescription || !businessDescription.trim()) {
            return res.status(400).json({ message: 'Tell us what you plan to sell.' });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({ message: 'Phone number is required.' });
        }

        const db = getDB();
        const users = db.collection<User>('users');
        const applications = db.collection<SellerApplication>('sellerApplications');

        const user = await users.findOne({ _id: new ObjectId(authUser.id) } as any);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.role !== 'user') {
            return res.status(403).json({ message: 'Only buyer accounts can apply to become a seller.' });
        }

        const existing = await applications.findOne({ userId: authUser.id, status: 'pending' });
        if (existing) {
            return res.status(409).json({ message: 'You already have a pending application.' });
        }

        const newApplication: SellerApplication = {
            userId: authUser.id,
            userName: user.name,
            userEmail: user.email,
            businessName: businessName.trim(),
            businessDescription: businessDescription.trim(),
            phone: phone.trim(),
            status: 'pending',
            createdAt: new Date(),
        };

        const result = await applications.insertOne(newApplication);

        await users.updateOne({ _id: new ObjectId(authUser.id) } as any, { $set: { sellerStatus: 'pending' } });

        return res.status(201).json({ application: { ...newApplication, _id: result.insertedId.toString() } });
    } catch (err) {
        console.error('Submit application error:', err);
        return res.status(500).json({ message: 'Failed to submit application.' });
    }
}

export async function getMyApplication(req: Request, res: Response) {
    try {
        const authUser = (req as any).user;
        const db = getDB();
        const applications = db.collection<SellerApplication>('sellerApplications');

        const application = await applications.findOne(
            { userId: authUser.id },
            { sort: { createdAt: -1 } }
        );

        return res.status(200).json({ application: application || null });
    } catch (err) {
        console.error('Get my application error:', err);
        return res.status(500).json({ message: 'Failed to load application status.' });
    }
}

export async function getAllApplications(req: Request, res: Response) {
    try {
        const db = getDB();
        const applications = db.collection<SellerApplication>('sellerApplications');
        const { status = 'pending' } = req.query as { status?: string };

        const filter: Record<string, any> = {};
        if (status !== 'all') filter.status = status;

        const results = await applications.find(filter).sort({ createdAt: -1 }).toArray();
        return res.status(200).json({ applications: results });
    } catch (err) {
        console.error('Get all applications error:', err);
        return res.status(500).json({ message: 'Failed to load applications.' });
    }
}

async function updateApplicationStatus(req: Request, res: Response, status: 'approved' | 'rejected') {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid application ID.' });
        }

        const db = getDB();
        const applications = db.collection<SellerApplication>('sellerApplications');
        const users = db.collection<User>('users');

        const application = await applications.findOne({ _id: new ObjectId(id) } as any);
        if (!application) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        await applications.updateOne({ _id: new ObjectId(id) } as any, { $set: { status } });

        if (status === 'approved') {
            await users.updateOne(
                { _id: new ObjectId(application.userId) } as any,
                { $set: { role: 'seller', sellerStatus: 'approved' } }
            );
        } else {
            await users.updateOne(
                { _id: new ObjectId(application.userId) } as any,
                { $set: { sellerStatus: 'rejected' } }
            );
        }

        return res.status(200).json({ message: `Application ${status}.` });
    } catch (err) {
        console.error('Update application status error:', err);
        return res.status(500).json({ message: 'Failed to update application.' });
    }
}

export const approveApplication = (req: Request, res: Response) => updateApplicationStatus(req, res, 'approved');
export const rejectApplication = (req: Request, res: Response) => updateApplicationStatus(req, res, 'rejected');