export type ItemStatus = 'pending' | 'approved' | 'rejected';

export interface Item {
    _id?: string;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    quantity: number;
    specs: Record<string, string>;
    sellerId: string;
    sellerName: string;
    status: ItemStatus;
    likes: string[]; // userIds who liked this item
    ratingAvg: number;
    reviewCount: number;
    createdAt: Date;
}

export type SafeItem = Item & { _id: string };