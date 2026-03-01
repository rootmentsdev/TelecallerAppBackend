import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from './models/Lead.js';

dotenv.config();

const testLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const leadsCount = await Lead.countDocuments();
        console.log("Total Leads:", leadsCount);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

testLeads();
