import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return;
    }
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB\n");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
};

const deleteRentOutLeads = async () => {
    try {
        await connectDB();

        console.log("=".repeat(70));
        console.log("🗑️  DELETING ONLY RENT-OUT LEADS");
        console.log("=".repeat(70));
        console.log();

        const rentoutCount = await Lead.countDocuments({ leadType: "rentOutFeedback" });

        console.log(`📋 Found ${rentoutCount} Rent-Out leads`);

        if (rentoutCount === 0) {
            console.log("ℹ️  No Rent-Out leads found. Nothing to delete.");
        } else {
            console.log("🗑️  Deleting Rent-Out leads...");
            const rentoutResult = await Lead.deleteMany({ leadType: "rentOutFeedback" });
            console.log(`   ✅ Deleted ${rentoutResult.deletedCount} Rent-Out leads`);
        }

        console.log();
        console.log("=".repeat(70));
        console.log("✅ DELETION COMPLETED!");
        console.log("=".repeat(70));

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
    }
};

deleteRentOutLeads();
