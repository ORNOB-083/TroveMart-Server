import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDB } from '../config/db';
import { User, SafeUser } from '../models/User';
import { signToken } from '../utils/jwt';
import { isValidEmail, isValidPassword } from '../utils/validators';

export async function register(req: Request, res: Response) {
    try {
        const { name, email, password } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Full name is required.' });
        }
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ message: 'Enter a valid email address.' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const db = getDB();
        const users = db.collection<User>('users');

        const existing = await users.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser: User = {
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'user',
            sellerStatus: 'none',
            createdAt: new Date(),
        };

        const result = await users.insertOne(newUser);

        const safeUser: SafeUser = {
            id: result.insertedId.toString(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
        };

        const token = signToken(safeUser);

        return res.status(201).json({ token, user: safeUser });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const db = getDB();
        const users = db.collection<User>('users');

        const user = await users.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const safeUser: SafeUser = {
            id: user._id!.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
        };

        const token = signToken(safeUser);

        return res.status(200).json({ token, user: safeUser });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
}

// Used by the frontend to validate a stored token / refresh user info
export async function me(req: Request, res: Response) {
    // req.user is attached by the auth middleware after verifying the JWT
    return res.status(200).json({ user: (req as any).user });
}