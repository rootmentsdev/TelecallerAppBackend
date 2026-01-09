// API-Only sync script
// Runs ONLY external API syncs (no CSV imports)
// Used by automatic scheduler every 20 minutes
// ATOMIC: Uses global lock to ensure only one sync cycle runs at a time

import dotenv from "dotenv";
import mongoose from "mongoose";
import SyncLock from "../models/SyncLock.js";

dotenv.config();

// Connect to MongoDB if not already connected
const ensureDBConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected for API sync");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

// Global lock name
const GLOBAL_LOCK_NAME = "GLOBAL_API_SYNC";
// Maximum sync duration before lock is considered expired (15 minutes)
const MAX_SYNC_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// Check if lock is expired and auto-release if needed
const checkAndReleaseExpiredLock = async () => {
  try {
    const existingLock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    if (!existingLock) {
      return { expired: false, released: false };
    }

    const lockAge = Date.now() - existingLock.lockedAt.getTime();
    const isExpired = lockAge > MAX_SYNC_DURATION;

    if (isExpired) {
      const lockAgeMinutes = Math.round(lockAge / 60000);
      console.log(`⚠️  Lock timeout detected - lock is ${lockAgeMinutes} minutes old (max: ${MAX_SYNC_DURATION / 60000} minutes)`);
      console.log(`   Locked at: ${existingLock.lockedAt.toISOString()}`);
      console.log(`   Locked by: ${existingLock.lockedBy}`);
      console.log(`   Status: ${existingLock.status}`);
      console.log(`   🔓 Auto-releasing expired lock...`);
      
      await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
      console.log(`✅ Expired lock released - sync can proceed`);
      return { expired: true, released: true };
    }

    return { expired: false, released: false, lock: existingLock };
  } catch (error) {
    console.error("⚠️  Error checking lock expiry:", error.message);
    return { expired: false, released: false, error };
  }
};

// Acquire global sync lock
const acquireLock = async (lockedBy = "scheduler") => {
  try {
    // First, check for and auto-release any expired locks
    const expiryCheck = await checkAndReleaseExpiredLock();
    
    if (expiryCheck.released) {
      // Lock was expired and released, now we can acquire
      console.log("   Proceeding to acquire lock after auto-release");
    } else if (expiryCheck.lock) {
      // Lock exists and is still valid (not expired)
      const lockAge = Date.now() - expiryCheck.lock.lockedAt.getTime();
      const lockAgeMinutes = Math.round(lockAge / 60000);
      return { 
        acquired: false, 
        reason: `Lock already exists (active sync running, age: ${lockAgeMinutes} minutes)`,
        lock: expiryCheck.lock
      };
    }
    
    // Try to create lock document (will fail if already exists due to unique constraint)
    const lock = await SyncLock.create({
      lockName: GLOBAL_LOCK_NAME,
      lockedAt: new Date(),
      lockedBy: lockedBy,
      status: "active",
    });
    
    console.log(`🔒 Lock acquired at: ${lock.lockedAt.toISOString()}`);
    return { acquired: true, lock };
  } catch (error) {
    // Lock already exists (race condition - another process created it)
    if (error.code === 11000 || error.name === 'MongoServerError') {
      // Check if the newly created lock is expired (unlikely but possible)
      const expiryCheck = await checkAndReleaseExpiredLock();
      if (expiryCheck.released) {
        // Retry acquiring lock after releasing expired one
        try {
          const lock = await SyncLock.create({
            lockName: GLOBAL_LOCK_NAME,
            lockedAt: new Date(),
            lockedBy: lockedBy,
            status: "active",
          });
          return { acquired: true, lock };
        } catch (retryError) {
          return { acquired: false, reason: "Lock already exists (race condition after retry)" };
        }
      }
      return { acquired: false, reason: "Lock already exists (race condition)" };
    }
    throw error;
  }
};

// Release global sync lock
const releaseLock = async (status = "completed") => {
  try {
    const lock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    if (!lock) {
      console.log("ℹ️  Lock already released or does not exist");
      return;
    }

    const lockAge = Date.now() - lock.lockedAt.getTime();
    const lockAgeMinutes = Math.round(lockAge / 60000);
    
    // Update status before deletion (for audit)
    await SyncLock.findOneAndUpdate(
      { lockName: GLOBAL_LOCK_NAME },
      { status: status },
      { new: true }
    );
    
    // Delete the lock
    await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
    
    console.log(`🔓 Lock released (status: ${status}, duration: ${lockAgeMinutes} minutes)`);
  } catch (error) {
    console.error("⚠️  Error releasing lock:", error.message);
    // Try direct delete as fallback
    try {
      await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
      console.log("✅ Lock force-released via direct delete");
    } catch (deleteError) {
      console.error("❌ CRITICAL: Failed to force-release lock:", deleteError.message);
    }
  }
};

const runApiOnlySync = async () => {
  const startTime = Date.now();
  const trigger = process.env.SYNC_TRIGGER || "auto";

  // Ensure MongoDB is connected (required for SyncLock operations)
  await ensureDBConnection();

  console.log("=".repeat(60));
  console.log("🚀 Starting Automatic API Sync (20-minute interval)");
  console.log("=".repeat(60));
  console.log("📋 Scope: External APIs only (CSV imports remain manual)");
  console.log("🔒 Lock: Global sync lock (atomic execution)");
  console.log();

  // Mark trigger source (used in logs)
  process.env.SYNC_TRIGGER = trigger;

  // Try to acquire global lock (with auto-expiry check built-in)
  const lockResult = await acquireLock(trigger);
  
  if (!lockResult.acquired) {
    // Lock acquisition failed - check if it's because lock is still active
    if (lockResult.lock) {
      // Lock exists and is still valid (not expired)
      const lockAge = Date.now() - lockResult.lock.lockedAt.getTime();
      const lockAgeMinutes = Math.round(lockAge / 60000);
      console.log("⏭️  Skipping sync - global lock is active");
      console.log(`   Reason: ${lockResult.reason}`);
      console.log(`   Lock age: ${lockAgeMinutes} minutes (max: ${MAX_SYNC_DURATION / 60000} minutes)`);
      console.log("   Another sync cycle is already running");
      console.log("   This ensures atomic execution and prevents partial syncs");
      console.log();
      return {
        success: false,
        skipped: true,
        reason: lockResult.reason || "Global lock active",
        duration: 0,
      };
    } else {
      // Lock acquisition failed for other reason (race condition)
      console.log("⏭️  Skipping sync - lock acquisition failed");
      console.log(`   Reason: ${lockResult.reason}`);
      console.log();
      return {
        success: false,
        skipped: true,
        reason: lockResult.reason || "Lock acquisition failed",
        duration: 0,
      };
    }
  }
  
  // Lock successfully acquired
  console.log("🔒 Global sync lock acquired");
  console.log(`   Lock acquired at: ${lockResult.lock.lockedAt.toISOString()}`);
  console.log();

  let storeSuccess = false;
  let bookingSuccess = false;
  let returnSuccess = false;
  const errors = [];
  let lockReleased = false;

  // CRITICAL: Wrap entire sync in try-finally to guarantee lock release
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
    errors.push({ step: "Sync", error: error.message });
    
    // Lock will be released in finally block
  } finally {
    // CRITICAL: ALWAYS release lock in finally block to guarantee cleanup
    if (!lockReleased) {
      console.log("🔓 Releasing lock in finally block (guaranteed cleanup)...");
      try {
        await releaseLock("failed");
        lockReleased = true;
        console.log("✅ Lock released successfully");
      } catch (releaseError) {
        console.error("❌ CRITICAL: Failed to release lock in finally block:", releaseError.message);
        // Try one more time with direct delete
        try {
          await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
          console.log("✅ Lock force-released via direct delete");
        } catch (deleteError) {
          console.error("❌ CRITICAL: Failed to force-release lock:", deleteError.message);
        }
      }
    }
    
    // If there was an error, re-throw it after cleanup
    if (errors.length > 0 && !lockReleased) {
      // This shouldn't happen due to finally, but just in case
      throw new Error(`Sync failed: ${errors.map(e => e.error).join(", ")}`);
    }
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
