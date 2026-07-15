import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db';
import { Item } from '../models/Item';

export async function getItems(req: Request, res: Response) {
  try {
    const db = getDB();
    const items = db.collection<Item>('items');

    const {
      search = '',
      category = '',
      minPrice,
      maxPrice,
      minRating,
      sort = 'newest',
      page = '1',
      limit = '8',
    } = req.query as Record<string, string>;

    // Only ever show approved items on the public explore route
    const filter: Record<string, any> = { status: 'approved' };

    if (search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'all') filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minRating) filter.ratingAvg = { $gte: Number(minRating) };

    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      popular: { reviewCount: -1 },
      rating: { ratingAvg: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap.newest;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(24, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [results, total] = await Promise.all([
      items.find(filter).sort(sortQuery).skip(skip).limit(limitNum).toArray(),
      items.countDocuments(filter),
    ]);

    return res.status(200).json({
      items: results,
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    console.error('Get items error:', err);
    return res.status(500).json({ message: 'Failed to load items.' });
  }
}

export async function getItemById(req: Request, res: Response) {
  try {
    const db = getDB();
    const items = db.collection<Item>('items');
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid item ID.' });
    }

    const item = await items.findOne({ _id: new ObjectId(id) as any, status: 'approved' });
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const related = await items
      .find({ category: item.category, status: 'approved', _id: { $ne: item._id } })
      .limit(4)
      .toArray();

    return res.status(200).json({ item, related });
  } catch (err) {
    console.error('Get item error:', err);
    return res.status(500).json({ message: 'Failed to load item.' });
  }
}

export async function getCategories(req: Request, res: Response) {
  try {
    const db = getDB();
    const items = db.collection<Item>('items');
    const categories = await items.distinct('category', { status: 'approved' });
    return res.status(200).json({ categories });
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({ message: 'Failed to load categories.' });
  }
}

export async function createItem(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { title, description, price, category, images, quantity, specs } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ message: 'Title is required.' });
    if (!description || !description.trim())
      return res.status(400).json({ message: 'Description is required.' });
    if (!category) return res.status(400).json({ message: 'Category is required.' });
    if (!price || Number(price) <= 0) return res.status(400).json({ message: 'Enter a valid price.' });
    if (quantity === undefined || Number(quantity) < 0)
      return res.status(400).json({ message: 'Enter a valid quantity.' });
    if (!Array.isArray(images) || images.length < 1 || images.length > 5) {
      return res.status(400).json({ message: 'Add between 1 and 5 images.' });
    }

    const db = getDB();
    const items = db.collection<Item>('items');

    const newItem: Item = {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      category,
      images,
      quantity: Number(quantity),
      specs: specs && typeof specs === 'object' ? specs : {},
      sellerId: user.id,
      sellerName: user.name,
      status: 'pending',
      likes: [],
      ratingAvg: 0,
      reviewCount: 0,
      createdAt: new Date(),
    };

    const result = await items.insertOne(newItem);

    return res.status(201).json({ item: { ...newItem, _id: result.insertedId.toString() } });
  } catch (err) {
    console.error('Create item error:', err);
    return res.status(500).json({ message: 'Failed to create item.' });
  }
}