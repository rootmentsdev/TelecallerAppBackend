import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Report from './models/Report.js';
import Complaint from './models/Complaint.js';

dotenv.config();

const testDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");

        const reportsCount = await Report.countDocuments();
        console.log("Total Reports:", reportsCount);

        const complaintsCount = await Complaint.countDocuments();
        console.log("Total Complaints:", complaintsCount);

        const reportSample = await Report.findOne();
        console.log("Report Sample:", reportSample);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
        process.exit(0);
    }
};

testDb();
