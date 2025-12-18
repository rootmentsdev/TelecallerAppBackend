import mongoose from "mongoose";
import { saveToMongo } from "../sync/utils/saveToMongo.js";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const testPhone = "9998887776";
        const testName = "Test Duplicate User";
        const testStore = "Suitor Guy - Kottakkal";

        // Clean up previous test data
        await Lead.deleteMany({ phone: testPhone });
        console.log("Cleaned up previous test data");

        // Lead 1: Visit on Dec 13
        const lead1 = {
            name: testName,
            phone: testPhone,
            store: testStore,
            leadType: "lossOfSale",
            visitDate: new Date("2025-12-13T00:00:00Z"),
            remarks: "Visit Day 1"
        };

        // Lead 2: Visit on Dec 17 (Same user, different day)
        const lead2 = {
            name: testName,
            phone: testPhone,
            store: testStore,
            leadType: "lossOfSale",
            visitDate: new Date("2025-12-17T00:00:00Z"),
            remarks: "Visit Day 2"
        };

        console.log("\nSaving Lead 1 (Dec 13)...");
        const res1 = await saveToMongo(lead1);
        console.log("Result 1:", res1.saved ? "✅ Saved" : "❌ Failed", res1.reason || "");

        console.log("\nSaving Lead 2 (Dec 17)...");
        const res2 = await saveToMongo(lead2);
        console.log("Result 2:", res2.saved ? "✅ Saved (Correct - should be a new record)" : "❌ Updated (Wrong - it overwrote the old one)", res2.reason || "");

        const finalCount = await Lead.countDocuments({ phone: testPhone });
        console.log(`\nFinal count for ${testPhone}: ${finalCount}`);

        if (finalCount === 2) {
            console.log("\n✨ SUCCESS: Multiple visits were preserved as separate records!");
        } else if (finalCount === 1) {
            console.log("\n❗ FAILURE: Lead was overwritten. Still only 1 record found.");
        }

        // Cleanup
        await Lead.deleteMany({ phone: testPhone });
        await mongoose.disconnect();
    } catch (error) {
        console.error("Test Error:", error);
        process.exit(1);
    }
};

runTest();
