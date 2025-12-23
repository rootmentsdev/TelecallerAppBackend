import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../models/Lead.js';

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected');

        const queries = [
            "PMNA",
            "Perinthalmanna",
            "Perinth",
            "Vatakara",
            "Vadakara"
        ];

        for (const q of queries) {
            console.log(`\n🔍 Searching for exact/regex store: ${q}`);
            const leads = await Lead.aggregate([
                { $match: { store: { $regex: q, $options: 'i' } } },
                { $group: { _id: "$store", count: { $sum: 1 } } }
            ]);
            console.log(leads);
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};
check();
