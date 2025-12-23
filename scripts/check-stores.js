import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../models/Lead.js';

dotenv.config();

const checkStores = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const stores = await Lead.distinct('store');
        console.log('📋 Unique Store Names in Leads:', stores.sort());

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

checkStores();
