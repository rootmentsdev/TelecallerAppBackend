import dotenv from "dotenv";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
// Models are imported to ensure schemas are registered if needed, though we only delete from Lead
import FollowUp from "../models/FollowUp.js";
import StarredCall from "../models/StarredCall.js";
import Report from "../models/Report.js";

dotenv.config();

const run = async () => {
    const isLive = process.argv.includes("--live");

    if (!process.env.MONGO_URI) {
        console.error("❌ MONGO_URI is missing in environment variables.");
        process.exit(1);
    }

    try {
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected.");

        const query = { leadType: "bookingConfirmation" };

        // Count first
        const count = await Lead.countDocuments(query);
        console.log(`\n📊 Found ${count} leads with leadType: "bookingConfirmation"`);

        if (count === 0) {
            console.log("✅ No booking confirmation leads found. Nothing to delete.");
            process.exit(0);
        }

        if (!isLive) {
            console.log("\n⚠️  DRY RUN MODE (Default)");
            console.log(`   To actually delete these ${count} records, run with --live flag:`);
            console.log("   npm run cleanup:booking-confirmation -- --live"); // Arguments passing might vary based on npm script, usually via --
            console.log("\n🚫 NO DELETION PERFORMED.");
        } else {
            console.log("\n🚀 LIVE MODE - DELETING DATA");
            console.log(`   Deleting ${count} booking confirmation leads...`);

            const result = await Lead.deleteMany(query);

            console.log(`\n✅ Deletion complete.`);
            console.log(`   Deleted count: ${result.deletedCount}`);

            if (result.deletedCount !== count) {
                console.warn(`⚠️  Warning: Deleted count (${result.deletedCount}) differs from initial count (${count}). Data might have changed concurrently.`);
            }
        }

    } catch (error) {
        console.error("❌ Error during cleanup:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected.");
    }
};

run();
