// Master sync script - runs all sync operations in sequence
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// Connect to MongoDB once for all syncs
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const runAll = async () => {
  const startTime = Date.now();
  console.log("=".repeat(60));
  console.log("🚀 Starting Full Data Sync");
  console.log("=".repeat(60));
  console.log();

  // Connect to MongoDB
  await connectDB();

  try {
    // Step 1: Sync Stores (needed for general sync)
    console.log("📦 Step 1/5: Syncing Stores...");
    console.log("-".repeat(60));
    const { run: syncStores } = await import("./api/sync_storelist.js");
    await syncStores();
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log();

    // Step 2: [Removed - Booking Confirmation deprecated]


    // Step 3: Sync Returns (API)
    console.log("📦 Step 3/5: Syncing Returns...");
    console.log("-".repeat(60));
    const { run: syncReturn } = await import("./api/sync_return.js");
    await syncReturn();
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log();

    // Step 4: Import Walk-in (CSV/Excel) - Import ALL walkin files
    console.log("📦 Step 4/5: Importing Walk-in Data (All Files)...");
    console.log("-".repeat(60));
    const { run: importAllWalkin } = await import("./csv/import_all_walkin.js");
    await importAllWalkin();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log();

    // Step 5: Import Loss of Sale (CSV/Excel) - Import ALL loss of sale files
    console.log("📦 Step 5/5: Importing Loss of Sale Data (All Files)...");
    console.log("-".repeat(60));
    const { run: importAllLossOfSale } = await import("./csv/import_all_lossofsale.js");
    await importAllLossOfSale();
    console.log();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("=".repeat(60));
    console.log("🎉 All Sync Operations Completed!");
    console.log("=".repeat(60));
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log();
    console.log("✅ Summary:");
    console.log("   • Stores synced");

    console.log("   • Return synced (incremental - only NEW records, duplicates skipped)");
    console.log("   • Walk-in data imported (incremental - only modified files, duplicates updated)");
    console.log("   • Loss of Sale data imported (incremental - only modified files, duplicates updated)");
    console.log();
    console.log("📋 Duplicate Prevention:");
    console.log("   ✅ API imports: Duplicates skipped (preserves user edits)");
    console.log("   ✅ CSV imports: Duplicates updated (keeps data fresh)");
    console.log("   ✅ Reports check: Leads in reports skipped (prevents reappearing)");
    console.log();
    console.log("🔄 Incremental Sync:");
    console.log("   ✅ Next sync will only process:");
    console.log("      • API: Records updated after last sync time");
    console.log("      • CSV: Files modified after last sync time");
    console.log();

  } catch (error) {
    console.error("❌ Sync failed:", error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

runAll().catch((error) => {
  console.error("❌ Fatal error during sync:", error.message);
  process.exit(1);
});
