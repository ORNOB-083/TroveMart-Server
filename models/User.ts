export type UserRole = 'user' | 'seller' | 'admin';

export interface User {
    _id?: string;
    name: string;
    email: string;
    password: string; // hashed
    role: UserRole;
    image?: string;
    sellerStatus?: 'none' | 'pending' | 'approved' | 'rejected'; // for the "become a seller" flow
    createdAt: Date;
}

// What we ever send back to the client — never the password
export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    image?: string;
}
