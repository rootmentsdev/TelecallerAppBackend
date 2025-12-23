import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SyncLog from '../models/SyncLog.js';

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected');

        const indexes = await SyncLog.collection.indexes();
        console.log('Indexes:', JSON.stringify(indexes, null, 2));

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};
check();
