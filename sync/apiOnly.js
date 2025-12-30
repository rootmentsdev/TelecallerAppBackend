// API-Only sync script
// Runs ONLY external API syncs (no CSV imports)
// Used by automatic scheduler every 20 minutes
// IMPORTANT: Assumes MongoDB is ALREADY connected by server.js
// ATOMIC: Uses global lock to ensure only one sync cycle runs at a time

import dotenv from "dotenv";
import mongoose from "mongoose";
import SyncLock from "../models/SyncLock.js";

dotenv.config();

// Global lock name
const GLOBAL_LOCK_NAME = "GLOBAL_API_SYNC";

// Acquire global sync lock
const acquireLock = async (lockedBy = "scheduler") => {
  try {
    // Try to create lock document (will fail if already exists due to unique constraint)
    const lock = await SyncLock.create({
      lockName: GLOBAL_LOCK_NAME,
      lockedAt: new Date(),
      lockedBy: lockedBy,
      status: "active",
    });
    return { acquired: true, lock };
  } catch (error) {
    // Lock already exists
    if (error.code === 11000 || error.name === 'MongoServerError') {
      // Check if lock is stale (older than 2 hours)
      const existingLock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
      if (existingLock) {
        const lockAge = Date.now() - existingLock.lockedAt.getTime();
        const twoHours = 2 * 60 * 60 * 1000;
        
        if (lockAge > twoHours) {
          // Stale lock - remove it and create new one
          await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
          const newLock = await SyncLock.create({
            lockName: GLOBAL_LOCK_NAME,
            lockedAt: new Date(),
            lockedBy: lockedBy,
            status: "active",
          });
          console.log(`⚠️  Removed stale lock (age: ${Math.round(lockAge / 60000)} minutes)`);
          return { acquired: true, lock: newLock };
        }
      }
      return { acquired: false, reason: "Lock already exists" };
    }
    throw error;
  }
};

// Release global sync lock
const releaseLock = async (status = "completed") => {
  try {
    await SyncLock.findOneAndUpdate(
      { lockName: GLOBAL_LOCK_NAME },
      { status: status },
      { new: true }
    );
    // Optionally delete the lock after completion
    await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
  } catch (error) {
    console.error("⚠️  Error releasing lock:", error.message);
  }
};

const runApiOnlySync = async () => {
  const startTime = Date.now();
  const trigger = process.env.SYNC_TRIGGER || "auto";

  console.log("=".repeat(60));
  console.log("🚀 Starting Automatic API Sync (20-minute interval)");
  console.log("=".repeat(60));
  console.log("📋 Scope: External APIs only (CSV imports remain manual)");
  console.log("🔒 Lock: Global sync lock (atomic execution)");
  console.log();

  // Mark trigger source (used in logs)
  process.env.SYNC_TRIGGER = trigger;

  // Try to acquire global lock
  const lockResult = await acquireLock(trigger);
  
  if (!lockResult.acquired) {
    console.log("⏭️  Skipping sync - global lock is active");
    console.log("   Another sync cycle is already running");
    console.log("   This ensures atomic execution and prevents partial syncs");
    console.log();
    return {
      success: false,
      skipped: true,
      reason: "Global lock active",
      duration: 0,
    };
  }

  console.log("🔒 Global sync lock acquired");
  console.log(`   Lock acquired at: ${lockResult.lock.lockedAt.toISOString()}`);
  console.log();

  let storeSuccess = false;
  let bookingSuccess = false;
  let returnSuccess = false;
  const errors = [];
  let lockReleased = false;

  try {
    console.log("📦 Running all API syncs in SEQUENCE (ordered execution)...");
    console.log("-".repeat(60));
    console.log();

    // Step 1: Sync Stores (must complete before booking/return)
    try {
      console.log("📦 Step 1/3: Starting Stores sync...");
      const { run: syncStores } = await import("./api/sync_storelist.js");
      await syncStores();
      storeSuccess = true;
      console.log("✅ Stores sync completed");
      console.log();
    } catch (error) {
      console.error("❌ Stores sync failed:", error.message);
      errors.push({ step: "Stores", error: error.message });
      throw error; // Stop execution if store sync fails (booking/return depend on stores)
    }

    // Step 2: Sync Booking Confirmation (awaits store sync completion)
    try {
      console.log("📦 Step 2/3: Starting Booking Confirmation sync...");
      const { run: syncBooking } = await import("./api/sync_booking.js");
      await syncBooking();
      bookingSuccess = true;
      console.log("✅ Booking Confirmation sync completed");
      console.log();
    } catch (error) {
      console.error("❌ Booking Confirmation sync failed:", error.message);
      errors.push({ step: "Booking", error: error.message });
      // Continue to return sync even if booking fails
    }

    // Step 3: Sync Returns (awaits booking sync completion)
    try {
      console.log("📦 Step 3/3: Starting Returns sync...");
      const { run: syncReturn } = await import("./api/sync_return.js");
      await syncReturn();
      returnSuccess = true;
      console.log("✅ Returns sync completed");
      console.log();
    } catch (error) {
      console.error("❌ Returns sync failed:", error.message);
      errors.push({ step: "Returns", error: error.message });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const allSuccess = storeSuccess && bookingSuccess && returnSuccess;

    console.log("=".repeat(60));
    if (allSuccess) {
      console.log("🎉 Automatic API Sync Completed Successfully!");
    } else {
      console.log("⚠️  Automatic API Sync Completed with Errors");
    }
    console.log("=".repeat(60));
    console.log(`⏱️  Total time: ${duration} seconds (SEQUENTIAL EXECUTION)`);
    console.log();
    console.log("✅ Summary:");
    console.log(`   • Stores: ${storeSuccess ? "✅ Synced" : "❌ Failed"}`);
    console.log(`   • Booking Confirmation: ${bookingSuccess ? "✅ Synced" : "❌ Failed"}`);
    console.log(`   • Returns: ${returnSuccess ? "✅ Synced" : "❌ Failed"}`);
    console.log("   • CSV imports skipped (manual only)");
    console.log("   • MongoDB connection reused (singleton)");
    console.log();
    console.log("🔄 Next automatic sync: 20 minutes");
    console.log();

    // Release lock with appropriate status
    await releaseLock(allSuccess ? "completed" : "failed");
    lockReleased = true;

    return {
      success: allSuccess,
      duration: parseFloat(duration),
      failures: errors.length,
      errors: errors,
    };

  } catch (error) {
    console.error("❌ API sync failed:", error.message);
    console.error(error.stack);
    
    // Ensure lock is released even on error
    if (!lockReleased) {
      await releaseLock("failed");
    }
    
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
