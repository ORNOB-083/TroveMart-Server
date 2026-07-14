import jwt from 'jsonwebtoken';
import { SafeUser } from '../models/User';

function getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in .env');
    }
    return secret;
}

export function signToken(user: SafeUser): string {
    return jwt.sign(user, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): SafeUser {
    return jwt.verify(token, getSecret()) as SafeUser;
}