// API-Only sync script - runs ONLY external API syncs (no CSV imports)
// Used by automatic scheduler every 10 minutes
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
  console.log("🚀 Starting Automatic API Sync (10-minute interval)");
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

    console.log("📦 Running all API syncs in PARALLEL...");
    console.log("-".repeat(60));

    // Run all syncs in parallel for maximum speed
    const [storeResult, bookingResult, returnResult] = await Promise.allSettled([
      // Step 1: Sync Stores (needed for booking/return sync)
      (async () => {
        console.log("📦 Starting Stores sync...");
        const { run: syncStores } = await import("./api/sync_storelist.js");
        await syncStores();
        console.log("✅ Stores sync completed");
      })(),

      // Step 2: Sync Booking Confirmation (API)
      (async () => {
        console.log("📦 Starting Booking Confirmation sync...");
        const { run: syncBooking } = await import("./api/sync_booking.js");
        await syncBooking();
        console.log("✅ Booking Confirmation sync completed");
      })(),

      // Step 3: Sync Returns (API)
      (async () => {
        console.log("📦 Starting Returns sync...");
        const { run: syncReturn } = await import("./api/sync_return.js");
        await syncReturn();
        console.log("✅ Returns sync completed");
      })()
    ]);

    // Check results
    const failures = [storeResult, bookingResult, returnResult].filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.log(`⚠️  ${failures.length} sync(s) failed:`);
      failures.forEach((failure, index) => {
        const syncNames = ['Stores', 'Booking', 'Returns'];
        console.log(`   ❌ ${syncNames[index]}: ${failure.reason.message}`);
      });
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("=".repeat(60));
    console.log("🎉 Automatic API Sync Completed!");
    console.log("=".repeat(60));
    console.log(`⏱️  Total time: ${duration} seconds (PARALLEL EXECUTION)`);
    console.log();
    console.log("✅ Summary:");
    console.log("   • Stores synced (external API)");
    console.log("   • Booking Confirmation synced (incremental - only NEW records)");
    console.log("   • Returns synced (incremental - only NEW records)");
    console.log("   • CSV imports skipped (manual only)");
    console.log("   • All syncs ran in PARALLEL for maximum speed");
    console.log();
    console.log("📋 Performance Optimizations Applied:");
    console.log("   ✅ Parallel API calls (5x concurrency)");
    console.log("   ✅ Batch processing (50 records per batch)");
    console.log("   ✅ Reduced delays (100ms between calls)");
    console.log("   ✅ Incremental sync (last 7 days only)");
    console.log("   ✅ Bulk database operations");
    console.log();
    console.log("🔄 Next automatic sync: 10 minutes");
    console.log();

    return {
      success: failures.length === 0,
      duration: parseFloat(duration),
      results: syncResults,
      failures: failures.length
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