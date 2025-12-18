// Script to delete all Loss of Sale leads from database
// Run this before re-importing to start fresh
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // Count before deletion
        const countBefore = await Lead.countDocuments({ leadType: "lossOfSale" });
        console.log(`Found ${countBefore} Loss of Sale leads`);

        // Delete all loss of sale leads
        const result = await Lead.deleteMany({ leadType: "lossOfSale" });
        console.log(`Deleted ${result.deletedCount} Loss of Sale leads`);

        // Also reset the sync log so fresh import works
        const SyncLog = mongoose.model('SyncLog', new mongoose.Schema({}, { strict: false }), 'synclogs');
        await SyncLog.deleteOne({ syncType: "lossofsale" });
        console.log("Reset lossofsale sync log");

        console.log("\n✅ Done! Now run: npm run import:all:lossofsale");

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
};

run();
