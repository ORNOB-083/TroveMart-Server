import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import itemsRoutes from './routes/items.routes';
import { errorHandler } from './middleware/errorHandler';
import reviewsRoutes from './routes/reviews.routes';
import adminRoutes from './routes/admin.routes';
import myReviewsRoutes from './routes/myReviews.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('TrovéMart API is running.');
});

app.use('/auth', authRoutes);
app.use('/items', itemsRoutes);
app.use('/items/:itemId/reviews', reviewsRoutes);
app.use('/admin', adminRoutes);
app.use('/reviews', myReviewsRoutes);

app.use(errorHandler);

connectDB()
    .then(() => {
        app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    });