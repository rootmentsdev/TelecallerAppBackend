import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../models/Lead.js';

dotenv.config();

const migrateData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const result = await Lead.updateMany(
            { source: 'Rent-out' },
            { $set: { source: 'Return' } }
        );

        console.log(`✅ Migration complete! Updated ${result.modifiedCount} records from "Rent-out" to "Return".`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during migration:', err.message);
        process.exit(1);
    }
};

migrateData();
