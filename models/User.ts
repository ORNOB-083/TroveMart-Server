export type UserRole = 'user' | 'seller' | 'admin';
export type AuthProvider = 'local' | 'google' | 'facebook';

export interface User {
    _id?: string;
    name: string;
    email: string;
    password?: string; // hashed — omitted for OAuth users
    role: UserRole;
    image?: string;
    provider: AuthProvider;
    sellerStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    banned: boolean;
    createdAt: Date;
}

export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    image?: string;
}