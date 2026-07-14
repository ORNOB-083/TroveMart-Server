export interface Review {
    _id?: string;
    itemId: string;
    userId: string;
    userName: string;
    userImage?: string;
    rating: number; // 1–5
    comment: string;
    createdAt: Date;
}