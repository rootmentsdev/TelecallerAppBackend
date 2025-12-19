// Script to reset sync log and force re-import of Loss of Sale files
import mongoose from "mongoose";
import SyncLog from "../models/SyncLog.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // Delete the lossofsale sync log to force full re-import
        const result = await SyncLog.deleteOne({ syncType: "lossofsale" });
        console.log("Deleted lossofsale sync log:", result);

        // Also delete walkin sync log
        const result2 = await SyncLog.deleteOne({ syncType: "walkin" });
        console.log("Deleted walkin sync log:", result2);

        console.log("✅ Sync logs reset. Run 'npm run import:all:lossofsale' to re-import all files.");

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
};

run();