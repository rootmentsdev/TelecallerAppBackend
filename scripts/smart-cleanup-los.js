import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const runCleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for cleanup...");

        // 1. Identify all Loss of Sale leads (type: lossOfSale)
        const lossOfSaleCount = await Lead.countDocuments({ leadType: "lossOfSale" });
        console.log(`Found ${lossOfSaleCount} leads explicitly marked as 'lossOfSale'`);

        // 2. Identify 'general' leads that look like Loss of Sale (imported from Walk-in report with 'Loss' status)
        const misclassifiedQuery = {
            leadType: "general",
            $or: [
                { closingStatus: /loss/i },
                { status: /loss/i },
                { source: /Loss of Sale/i }
            ]
        };
        const misclassifiedCount = await Lead.countDocuments(misclassifiedQuery);
        console.log(`Found ${misclassifiedCount} misclassified 'general' leads that look like Loss of Sale`);

        // 3. Delete them
        const res1 = await Lead.deleteMany({ leadType: "lossOfSale" });
        const res2 = await Lead.deleteMany(misclassifiedQuery);

        console.log(`Deleted ${res1.deletedCount} lossOfSale leads.`);
        console.log(`Deleted ${res2.deletedCount} misclassified general leads.`);

        // 4. Reset Sync Logs
        const SyncLog = mongoose.model('SyncLog', new mongoose.Schema({}, { strict: false }), 'synclogs');
        await SyncLog.deleteMany({ syncType: { $in: ["lossofsale", "walkin"] } });
        console.log("Reset sync logs for both 'lossofsale' and 'walkin' to ensure a complete fresh import.");

        console.log("\n✅ Cleanup Complete! You can now run your imports again.");
        console.log("Commands to run:");
        console.log("1. npm run import:all:lossofsale");
        console.log("2. npm run import:all:walkin");

        await mongoose.disconnect();
    } catch (error) {
        console.error("Cleanup Error:", error.message);
        process.exit(1);
    }
};

runCleanup();
