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
    console.log(`🔍 [DIAG] Checking for expired lock... MAX_SYNC_DURATION=${MAX_SYNC_DURATION}ms (${MAX_SYNC_DURATION / 60000} minutes)`);
    const existingLock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    if (!existingLock) {
      console.log(`🔍 [DIAG] No existing lock found - system is clean`);
      return { expired: false, released: false };
    }

    const lockAgeMs = Date.now() - existingLock.lockedAt.getTime();
    const lockAgeSeconds = Math.round(lockAgeMs / 1000);
    const lockAgeMinutes = Math.round(lockAgeMs / 60000);
    const isExpired = lockAgeMs > MAX_SYNC_DURATION;

    console.log(`🔍 [DIAG] Lock found: lockedAt=${existingLock.lockedAt.toISOString()}, age=${lockAgeSeconds}s (${lockAgeMinutes}m), status=${existingLock.status}, isExpired=${isExpired}`);
    console.log(`🔍 [DIAG] Time comparison: now=${new Date().toISOString()}, lockedAt=${existingLock.lockedAt.toISOString()}, diff=${lockAgeMs}ms, threshold=${MAX_SYNC_DURATION}ms`);

    if (isExpired) {
      console.log(`⚠️  Lock timeout detected - lock is ${lockAgeMinutes} minutes old (max: ${MAX_SYNC_DURATION / 60000} minutes)`);
      console.log(`   Locked at: ${existingLock.lockedAt.toISOString()}`);
      console.log(`   Locked by: ${existingLock.lockedBy}`);
      console.log(`   Status: ${existingLock.status}`);
      console.log(`   Process PID: ${process.pid}`);
      console.log(`   🔓 Auto-releasing expired lock...`);

      const deleteResult = await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
      console.log(`🔍 [DIAG] deleteOne result: deletedCount=${deleteResult.deletedCount}, acknowledged=${deleteResult.acknowledged}`);

      if (deleteResult.deletedCount === 0) {
        console.error(`❌ CRITICAL: deleteOne returned deletedCount=0! Lock was NOT deleted.`);
        console.error(`   Lock document snapshot:`, JSON.stringify(existingLock.toObject(), null, 2));
        return { expired: true, released: false, error: "Delete operation returned deletedCount=0" };
      }

      console.log(`✅ Expired lock released (deletedCount=${deleteResult.deletedCount}) - sync can proceed`);
      return { expired: true, released: true, deletedCount: deleteResult.deletedCount };
    }

    return { expired: false, released: false, lock: existingLock };
  } catch (error) {
    console.error("⚠️  Error checking lock expiry:", error.message);
    console.error("   Stack:", error.stack);
    return { expired: false, released: false, error };
  }
};

// Acquire global sync lock
const acquireLock = async (lockedBy = "scheduler") => {
  try {
    console.log(`🔍 [DIAG] acquireLock called: lockedBy=${lockedBy}, PID=${process.pid}`);
    // First, check for and auto-release any expired locks
    const expiryCheck = await checkAndReleaseExpiredLock();

    if (expiryCheck.released) {
      // Lock was expired and released, now we can acquire
      console.log(`   Proceeding to acquire lock after auto-release (deletedCount=${expiryCheck.deletedCount || 'N/A'})`);
    } else if (expiryCheck.lock) {
      // Lock exists and is still valid (not expired)
      const lockAge = Date.now() - expiryCheck.lock.lockedAt.getTime();
      const lockAgeMinutes = Math.round(lockAge / 60000);
      console.log(`🔍 [DIAG] Lock acquisition rejected - active lock exists (age: ${lockAgeMinutes}m)`);
      return {
        acquired: false,
        reason: `Lock already exists (active sync running, age: ${lockAgeMinutes} minutes)`,
        lock: expiryCheck.lock
      };
    }

    // Try to create lock document (will fail if already exists due to unique constraint)
    const now = new Date();
    console.log(`🔍 [DIAG] Creating new lock: lockName=${GLOBAL_LOCK_NAME}, lockedAt=${now.toISOString()}, lockedBy=${lockedBy}, PID=${process.pid}`);
    const lock = await SyncLock.create({
      lockName: GLOBAL_LOCK_NAME,
      lockedAt: now,
      lockedBy: lockedBy,
      status: "active",
    });

    console.log(`🔒 [DIAG] Lock acquired successfully: _id=${lock._id}, lockedAt=${lock.lockedAt.toISOString()}, lockedBy=${lock.lockedBy}, PID=${process.pid}`);
    console.log(`🔒 Lock acquired at: ${lock.lockedAt.toISOString()}`);
    return { acquired: true, lock };
  } catch (error) {
    // Lock already exists (race condition - another process created it)
    if (error.code === 11000 || error.name === 'MongoServerError') {
      console.log(`🔍 [DIAG] Unique constraint violation (race condition) - checking for expired lock...`);
      // Check if the newly created lock is expired (unlikely but possible)
      const expiryCheck = await checkAndReleaseExpiredLock();
      if (expiryCheck.released) {
        // Retry acquiring lock after releasing expired one
        try {
          const now = new Date();
          console.log(`🔍 [DIAG] Retrying lock creation after expiry release: lockedAt=${now.toISOString()}, PID=${process.pid}`);
          const lock = await SyncLock.create({
            lockName: GLOBAL_LOCK_NAME,
            lockedAt: now,
            lockedBy: lockedBy,
            status: "active",
          });
          console.log(`🔒 [DIAG] Lock acquired on retry: _id=${lock._id}, lockedAt=${lock.lockedAt.toISOString()}, PID=${process.pid}`);
          return { acquired: true, lock };
        } catch (retryError) {
          console.error(`🔍 [DIAG] Retry lock creation failed:`, retryError.message);
          return { acquired: false, reason: "Lock already exists (race condition after retry)" };
        }
      }
      console.log(`🔍 [DIAG] Lock acquisition failed - race condition (lock not expired)`);
      return { acquired: false, reason: "Lock already exists (race condition)" };
    }
    console.error(`🔍 [DIAG] Unexpected error in acquireLock:`, error.message);
    throw error;
  }
};

// Release global sync lock
const releaseLock = async (status = "completed") => {
  try {
    console.log(`🔍 [DIAG] releaseLock called: status=${status}, PID=${process.pid}, query={ lockName: "${GLOBAL_LOCK_NAME}" }`);
    const lock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    if (!lock) {
      console.log(`🔍 [DIAG] Lock not found - already released or does not exist`);
      console.log("ℹ️  Lock already released or does not exist");
      return { released: false, reason: "Lock not found" };
    }

    console.log(`🔍 [DIAG] Lock found for release: _id=${lock._id}, status=${lock.status}, lockedAt=${lock.lockedAt.toISOString()}, lockedBy=${lock.lockedBy}, PID=${process.pid}`);
    const lockAge = Date.now() - lock.lockedAt.getTime();
    const lockAgeSeconds = Math.round(lockAge / 1000);
    const lockAgeMinutes = Math.round(lockAge / 60000);

    // Update status before deletion (for audit)
    console.log(`🔍 [DIAG] Updating lock status to "${status}" before deletion...`);
    const updateResult = await SyncLock.findOneAndUpdate(
      { lockName: GLOBAL_LOCK_NAME },
      { status: status },
      { new: true }
    );
    console.log(`🔍 [DIAG] Status update result: ${updateResult ? 'success' : 'failed'}`);

    // Delete the lock
    console.log(`🔍 [DIAG] Deleting lock with deleteOne({ lockName: "${GLOBAL_LOCK_NAME}" })...`);
    const deleteResult = await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
    console.log(`🔍 [DIAG] deleteOne result: deletedCount=${deleteResult.deletedCount}, acknowledged=${deleteResult.acknowledged}`);

    if (deleteResult.deletedCount === 0) {
      console.error(`❌ CRITICAL: deleteOne returned deletedCount=0! Lock was NOT deleted.`);
      console.error(`   Lock document snapshot:`, JSON.stringify(lock.toObject(), null, 2));
      throw new Error(`Lock deletion failed - deletedCount=0`);
    }

    console.log(`🔓 [DIAG] Lock released successfully: deletedCount=${deleteResult.deletedCount}, status=${status}, duration=${lockAgeSeconds}s (${lockAgeMinutes}m), PID=${process.pid}`);
    console.log(`🔓 Lock released (status: ${status}, duration: ${lockAgeMinutes} minutes)`);
    return { released: true, deletedCount: deleteResult.deletedCount, duration: lockAgeSeconds };
  } catch (error) {
    console.error("⚠️  Error releasing lock:", error.message);
    console.error("   Stack:", error.stack);
    console.error(`🔍 [DIAG] Attempting fallback direct delete...`);
    // Try direct delete as fallback
    try {
      const deleteResult = await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
      console.log(`🔍 [DIAG] Fallback deleteOne result: deletedCount=${deleteResult.deletedCount}, acknowledged=${deleteResult.acknowledged}`);
      if (deleteResult.deletedCount > 0) {
        console.log("✅ Lock force-released via direct delete");
        return { released: true, deletedCount: deleteResult.deletedCount, method: "fallback" };
      } else {
        console.error("❌ CRITICAL: Fallback delete also returned deletedCount=0!");
        throw new Error(`Fallback lock deletion failed - deletedCount=0`);
      }
    } catch (deleteError) {
      console.error("❌ CRITICAL: Failed to force-release lock:", deleteError.message);
      console.error("   Stack:", deleteError.stack);
      throw deleteError;
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
  let returnSuccess = false;
  const errors = [];
  let lockReleased = false;

  // CRITICAL: Wrap entire sync in try-finally to guarantee lock release
  try {
    console.log("📦 Running all API syncs in SEQUENCE (ordered execution)...");
    console.log("-".repeat(60));
    console.log();

    let bookingConfirmationSuccess = false;
    // Step 1: Sync Stores (must complete before return/bookingconfirmation)
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

    // Step 2: Sync Booking Confirmation (separate from return)
    try {
      console.log("📦 Step 2/3: Starting Booking Confirmation sync...");
      const { run: syncBookingConfirmation } = await import("./api/sync_bookingconfirmation.js");
      await syncBookingConfirmation();
      bookingConfirmationSuccess = true;
      console.log("✅ Booking Confirmation sync completed");
      console.log();
    } catch (error) {
      console.error("❌ Booking Confirmation sync failed:", error.message);
      errors.push({ step: "BookingConfirmation", error: error.message });
    }

    // Step 3: Sync Returns (awaits store sync completion)
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
    const allSuccess = storeSuccess && returnSuccess && bookingConfirmationSuccess;

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
    console.log(`   • Booking Confirmation: ${bookingConfirmationSuccess ? "✅ Synced" : "❌ Failed"}`);
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
    console.log(`🔍 [DIAG] finally block entered: lockReleased=${lockReleased}, PID=${process.pid}`);
    if (!lockReleased) {
      console.log("🔓 Releasing lock in finally block (guaranteed cleanup)...");
      try {
        const releaseResult = await releaseLock("failed");
        lockReleased = true;
        console.log(`✅ Lock released successfully in finally: deletedCount=${releaseResult?.deletedCount || 'N/A'}, PID=${process.pid}`);
      } catch (releaseError) {
        console.error("❌ CRITICAL: Failed to release lock in finally block:", releaseError.message);
        console.error("   Stack:", releaseError.stack);
        // Try one more time with direct delete
        try {
          console.log(`🔍 [DIAG] Attempting final fallback delete with deleteOne({ lockName: "${GLOBAL_LOCK_NAME}" })...`);
          const deleteResult = await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
          console.log(`🔍 [DIAG] Final fallback deleteOne result: deletedCount=${deleteResult.deletedCount}, acknowledged=${deleteResult.acknowledged}`);
          if (deleteResult.deletedCount > 0) {
            console.log("✅ Lock force-released via direct delete in finally block");
          } else {
            console.error("❌ CRITICAL: Final fallback delete returned deletedCount=0 - lock may still exist!");
          }
        } catch (deleteError) {
          console.error("❌ CRITICAL: Failed to force-release lock in finally:", deleteError.message);
          console.error("   Stack:", deleteError.stack);
        }
      }
    } else {
      console.log(`🔍 [DIAG] Lock already released (lockReleased=true), skipping finally release, PID=${process.pid}`);
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
