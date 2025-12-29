// API-Only sync script
// Runs ONLY external API syncs (no CSV imports)
// Used by automatic scheduler every 15 minutes
// IMPORTANT: Assumes MongoDB is ALREADY connected by server.js

import dotenv from "dotenv";
dotenv.config();

const runApiOnlySync = async () => {
  const startTime = Date.now();

  console.log("=".repeat(60));
  console.log("🚀 Starting Automatic API Sync (15-minute interval)");
  console.log("=".repeat(60));
  console.log("📋 Scope: External APIs only (CSV imports remain manual)");
  console.log();

  try {
    // Mark trigger source (used in logs)
    process.env.SYNC_TRIGGER = "auto";

    console.log("📦 Running all API syncs in PARALLEL...");
    console.log("-".repeat(60));

    // Run all syncs in parallel
    const [storeResult, bookingResult, returnResult] =
      await Promise.allSettled([
        // Step 1: Sync Stores
        (async () => {
          console.log("📦 Starting Stores sync...");
          const { run: syncStores } = await import("./api/sync_storelist.js");
          await syncStores();
          console.log("✅ Stores sync completed");
        })(),

        // Step 2: Sync Booking Confirmation
        (async () => {
          console.log("📦 Starting Booking Confirmation sync...");
          const { run: syncBooking } = await import("./api/sync_booking.js");
          await syncBooking();
          console.log("✅ Booking Confirmation sync completed");
        })(),

        // Step 3: Sync Returns
        (async () => {
          console.log("📦 Starting Returns sync...");
          const { run: syncReturn } = await import("./api/sync_return.js");
          await syncReturn();
          console.log("✅ Returns sync completed");
        })()
      ]);

    // Handle failures (if any)
    const failures = [storeResult, bookingResult, returnResult]
      .filter(result => result.status === "rejected");

    if (failures.length > 0) {
      console.log(`⚠️  ${failures.length} sync(s) failed:`);
      failures.forEach((failure, index) => {
        const syncNames = ["Stores", "Booking", "Returns"];
        console.log(`   ❌ ${syncNames[index]}: ${failure.reason?.message}`);
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("=".repeat(60));
    console.log("🎉 Automatic API Sync Completed!");
    console.log("=".repeat(60));
    console.log(`⏱️  Total time: ${duration} seconds (PARALLEL EXECUTION)`);
    console.log();
    console.log("✅ Summary:");
    console.log("   • Stores synced (external API)");
    console.log("   • Booking Confirmation synced (incremental)");
    console.log("   • Returns synced (incremental)");
    console.log("   • CSV imports skipped (manual only)");
    console.log("   • MongoDB connection reused (singleton)");
    console.log();
    console.log("🔄 Next automatic sync: 15 minutes");
    console.log();

    return {
      success: failures.length === 0,
      duration: parseFloat(duration),
      failures: failures.length
    };

  } catch (error) {
    console.error("❌ API sync failed:", error.message);
    console.error(error.stack);
    throw error;
  }
};

// Export for scheduler usage
export { runApiOnlySync };

// Auto-run if executed directly (local testing ONLY)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🧪 Running API-only sync manually...");
  runApiOnlySync()
    .then(() => {
      console.log("✅ Manual API sync finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Manual API sync failed:", error.message);
      process.exit(1);
    });
}
