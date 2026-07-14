import { MongoClient, Db } from 'mongodb';
import process = require('process');

let client: MongoClient;
let db: Db;

export async function connectDB(): Promise<Db> {
    if (db) return db;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not defined in .env');
    }

    client = new MongoClient(uri);
    await client.connect();
    db = client.db('TroveMart');
    console.log('MongoDB connected: TroveMart database');
    return db;
}

export function getDB(): Db {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB() first.');
    }
    return db;
}