export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface SellerApplication {
    _id?: string;
    userId: string;
    userName: string;
    userEmail: string;
    businessName: string;
    businessDescription: string;
    phone: string;
    status: ApplicationStatus;
    createdAt: Date;
}