import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../models/Lead.js';

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected');

        const queries = [
            /Vatakara/i,
            /Vadakara/i,
            /Edappal/i,
            /Perinthalmanna/i,
            /MG Road/i,
            /Mg road/i
        ];

        for (const regex of queries) {
            console.log(`\n🔍 Searching for store matching: ${regex}`);
            const leads = await Lead.aggregate([
                { $match: { store: regex } },
                { $group: { _id: "$store", count: { $sum: 1 }, types: { $addToSet: "$leadType" } } }
            ]);
            console.log(leads);
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};
check();
