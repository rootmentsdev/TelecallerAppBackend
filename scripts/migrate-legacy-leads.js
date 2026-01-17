import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

// Legacy types to remove
const LEGACY_TYPES = ['general', 'justDial', 'bookingConfirmation'];

// Connect to MongoDB
const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return; // Already connected
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB Connection Error:", err.message);
        process.exit(1);
    }
};

const migrateLegacyLeads = async () => {
    const isLive = process.argv.includes("--live");

    try {
        await connectDB();

        console.log("=".repeat(60));
        console.log(`🧹 Migrating Legacy Leads (Types: ${LEGACY_TYPES.join(", ")})`);
        console.log(`🔥 Mode: ${isLive ? "LIVE (Destructive)" : "DRY RUN (Safe)"}`);
        console.log("=".repeat(60));

        const query = { leadType: { $in: LEGACY_TYPES } };

        // Count legacy leads
        const count = await Lead.countDocuments(query);
        console.log(`\nFound ${count} legacy leads matching the criteria.`);

        if (count === 0) {
            console.log("✅ No legacy leads found. Nothing to do.");
            await mongoose.connection.close();
            process.exit(0);
        }

        // Get breakdown by type
        const breakdown = await Lead.aggregate([
            { $match: query },
            { $group: { _id: "$leadType", count: { $sum: 1 } } }
        ]);

        console.log("\n📊 Breakdown by Type:");
        breakdown.forEach(item => {
            console.log(`   - ${item._id}: ${item.count}`);
        });

        if (!isLive) {
            console.log("\n⚠️  DRY RUN COMPLETED. No changes made.");
            console.log("   To perform the actual migration and deletion, run with --live flag.");
            await mongoose.connection.close();
            process.exit(0);
        }

        // LIVE MODE EXECUTION
        console.log("\n🚀 Starting LIVE migration...");

        // 1. Fetch all legacy leads
        console.log("   Fetching leads for backup...");
        const leadsToArchive = await Lead.find(query).lean();

        if (leadsToArchive.length > 0) {
            // 2. Archive to LegacyLeads collection
            console.log(`   Archiving ${leadsToArchive.length} leads to 'legacyleads' collection...`);
            const legacyCollection = mongoose.connection.collection("legacyleads");

            // Add movedAt timestamp
            const archivedDocs = leadsToArchive.map(lead => ({
                ...lead,
                archivedAt: new Date(),
                originalCollection: "leads"
            }));

            await legacyCollection.insertMany(archivedDocs);
            console.log("   ✅ Archive successful.");

            // 3. Delete from Leads collection
            console.log("   Deleting leads from 'leads' collection...");
            const deleteResult = await Lead.deleteMany(query);
            console.log(`   ✅ Deleted ${deleteResult.deletedCount} leads.`);
        }

        console.log("\n✅ Migration completed successfully.");
        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Error during migration:", error);
        process.exit(1);
    }
};

migrateLegacyLeads();
