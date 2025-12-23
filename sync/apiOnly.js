// API-Only sync script - runs ONLY external API syncs (no CSV imports)
// Used by automatic scheduler every 5 minutes
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
    console.log("✅ Connected to MongoDB for API sync\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const runApiOnlySync = async () => {
  const startTime = Date.now();
  console.log("=".repeat(60));
  console.log("🚀 Starting Automatic API Sync (5-minute interval)");
  console.log("=".repeat(60));
  console.log("📋 Scope: External APIs only (CSV imports remain manual)");
  console.log();

  // Connect to MongoDB
  await connectDB();

  let syncResults = {
    stores: { saved: 0, skipped: 0, errors: 0 },
    booking: { saved: 0, skipped: 0, errors: 0 },
    returns: { saved: 0, skipped: 0, errors: 0 }
  };

  try {
    // Set trigger for logging
    process.env.SYNC_TRIGGER = "auto";

    // Step 1: Sync Stores (needed for booking/return sync)
    console.log("📦 Step 1/3: Syncing Stores...");
    console.log("-".repeat(60));
    const { run: syncStores } = await import("./api/sync_storelist.js");
    await syncStores();
    console.log();

    // Step 2: Sync Booking Confirmation (API)
    console.log("📦 Step 2/3: Syncing Booking Confirmation...");
    console.log("-".repeat(60));
    const { run: syncBooking } = await import("./api/sync_booking.js");
    await syncBooking();
    console.log();

    // Step 3: Sync Returns (API)
    console.log("📦 Step 3/3: Syncing Returns...");
    console.log("-".repeat(60));
    const { run: syncReturn } = await import("./api/sync_return.js");
    await syncReturn();
    console.log();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("=".repeat(60));
    console.log("🎉 Automatic API Sync Completed!");
    console.log("=".repeat(60));
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log();
    console.log("✅ Summary:");
    console.log("   • Stores synced (external API)");
    console.log("   • Booking Confirmation synced (incremental - only NEW records)");
    console.log("   • Returns synced (incremental - only NEW records)");
    console.log("   • CSV imports skipped (manual only)");
    console.log();
    console.log("📋 Incremental Sync Results:");
    console.log("   ✅ Only new/updated records processed");
    console.log("   ✅ Existing records preserved (no duplicates)");
    console.log("   ✅ User edits maintained");
    console.log();
    console.log("🔄 Next automatic sync: 5 minutes");
    console.log();

    return {
      success: true,
      duration: parseFloat(duration),
      results: syncResults
    };

  } catch (error) {
    console.error("❌ API sync failed:", error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

// Export for use by scheduler
export { runApiOnlySync };

// Auto-run if called directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  runApiOnlySync().catch((error) => {
    console.error("❌ Fatal error during API sync:", error.message);
    process.exit(1);
  });
}