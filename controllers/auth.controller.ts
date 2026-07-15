import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDB } from '../config/db';
import { User, SafeUser, AuthProvider } from '../models/User';
import { signToken } from '../utils/jwt';
import { isValidEmail, isValidPassword } from '../utils/validators';
import { verifyGoogleToken, exchangeFacebookCode } from '../utils/oauth';

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
            provider: 'local',
            banned: false,
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
        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        if (user.banned) {
            return res.status(403).json({ message: 'This account has been banned. Contact support for help.' });
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

export async function me(req: Request, res: Response) {
    return res.status(200).json({ user: (req as any).user });
}

async function findOrCreateOAuthUser(
    profile: { email: string; name: string; image?: string },
    provider: AuthProvider
) {
    const db = getDB();
    const users = db.collection<User>('users');

    let user = await users.findOne({ email: profile.email.toLowerCase() });

    if (!user) {
        const newUser: User = {
            name: profile.name,
            email: profile.email.toLowerCase(),
            role: 'user',
            image: profile.image,
            provider,
            sellerStatus: 'none',
            createdAt: new Date(),
        };
        const result = await users.insertOne(newUser);
        user = { ...newUser, _id: result.insertedId.toString() };
    }

    const safeUser: SafeUser = {
        id: user._id!.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
    };

    const token = signToken(safeUser);
    return { token, user: safeUser };
}

export async function googleAuth(req: Request, res: Response) {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ message: 'Google token is required.' });

        const profile = await verifyGoogleToken(idToken);
        const result = await findOrCreateOAuthUser(profile, 'google');

        return res.status(200).json(result);
    } catch (err) {
        console.error('Google auth error:', err);
        return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
    }
}

export async function facebookAuth(req: Request, res: Response) {
    try {
        const { code, redirectUri } = req.body;
        if (!code || !redirectUri) {
            return res.status(400).json({ message: 'Facebook authorization code is required.' });
        }

        const profile = await exchangeFacebookCode(code, redirectUri);
        const result = await findOrCreateOAuthUser(profile, 'facebook');

        return res.status(200).json(result);
    } catch (err: any) {
        console.error('Facebook auth error:', err);
        return res.status(401).json({ message: err.message || 'Facebook sign-in failed. Please try again.' });
    }
}