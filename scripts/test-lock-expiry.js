// Test script to verify lock expiry and deletion
// Usage: node scripts/test-lock-expiry.js

import dotenv from "dotenv";
import mongoose from "mongoose";
import SyncLock from "../models/SyncLock.js";

dotenv.config();

const GLOBAL_LOCK_NAME = "GLOBAL_API_SYNC";
const MAX_SYNC_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

const testLockExpiry = async () => {
  try {
    console.log("=".repeat(60));
    console.log("🧪 Testing Lock Expiry and Deletion");
    console.log("=".repeat(60));
    console.log();

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
    console.log();

    // Step 1: Check MongoDB indexes (verify TTL index exists)
    console.log("📋 Step 1: Checking MongoDB indexes...");
    console.log("-".repeat(60));
    try {
      const indexes = await SyncLock.collection.getIndexes();
      console.log("Current indexes on synclocks collection:");
      console.log(JSON.stringify(indexes, null, 2));
      console.log();

      // Check for TTL index on lockedAt
      const ttlIndex = indexes.lockedAt_1;
      if (ttlIndex && ttlIndex.expireAfterSeconds) {
        console.log(`✅ TTL index found on lockedAt: expireAfterSeconds=${ttlIndex.expireAfterSeconds} (${ttlIndex.expireAfterSeconds / 3600} hours)`);
      } else {
        console.log("⚠️  TTL index NOT found on lockedAt field!");
        console.log("   This means MongoDB will NOT auto-delete expired locks.");
      }
      console.log();
    } catch (error) {
      console.error("❌ Error checking indexes:", error.message);
    }

    // Step 2: Check for existing lock
    console.log("📋 Step 2: Checking for existing lock...");
    console.log("-".repeat(60));
    const existingLock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    if (existingLock) {
      const lockAge = Date.now() - existingLock.lockedAt.getTime();
      const lockAgeSeconds = Math.round(lockAge / 1000);
      const lockAgeMinutes = Math.round(lockAge / 60000);
      const isExpired = lockAge > MAX_SYNC_DURATION;

      console.log("Existing lock found:");
      console.log(`  _id: ${existingLock._id}`);
      console.log(`  lockName: ${existingLock.lockName}`);
      console.log(`  lockedAt: ${existingLock.lockedAt.toISOString()}`);
      console.log(`  lockedBy: ${existingLock.lockedBy}`);
      console.log(`  status: ${existingLock.status}`);
      console.log(`  createdAt: ${existingLock.createdAt.toISOString()}`);
      console.log(`  updatedAt: ${existingLock.updatedAt.toISOString()}`);
      console.log(`  Age: ${lockAgeSeconds} seconds (${lockAgeMinutes} minutes)`);
      console.log(`  MAX_SYNC_DURATION: ${MAX_SYNC_DURATION / 1000} seconds (${MAX_SYNC_DURATION / 60000} minutes)`);
      console.log(`  Is Expired: ${isExpired}`);
      console.log(`  Issue: updatedAt === lockedAt: ${existingLock.updatedAt.getTime() === existingLock.lockedAt.getTime()}`);
      console.log();
    } else {
      console.log("✅ No existing lock found");
      console.log();
    }

    // Step 3: Create a test lock with lockedAt = 20 minutes ago (expired)
    console.log("📋 Step 3: Creating test lock (expired - 20 minutes ago)...");
    console.log("-".repeat(60));
    const testLockedAt = new Date(Date.now() - (20 * 60 * 1000)); // 20 minutes ago
    
    // Delete any existing lock first
    await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
    console.log("Cleared any existing lock");
    
    const testLock = await SyncLock.create({
      lockName: GLOBAL_LOCK_NAME,
      lockedAt: testLockedAt,
      lockedBy: "test-script",
      status: "active",
    });
    console.log(`✅ Test lock created:`);
    console.log(`  _id: ${testLock._id}`);
    console.log(`  lockedAt: ${testLock.lockedAt.toISOString()}`);
    console.log(`  Time difference: ${Math.round((Date.now() - testLock.lockedAt.getTime()) / 60000)} minutes`);
    console.log();

    // Step 4: Verify the lock exists
    console.log("📋 Step 4: Verifying test lock exists...");
    console.log("-".repeat(60));
    const verifyLock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    if (verifyLock) {
      console.log(`✅ Test lock verified: _id=${verifyLock._id}, lockedAt=${verifyLock.lockedAt.toISOString()}`);
    } else {
      console.log("❌ Test lock NOT found (unexpected!)");
    }
    console.log();

    // Step 5: Test checkAndReleaseExpiredLock logic
    console.log("📋 Step 5: Testing checkAndReleaseExpiredLock logic...");
    console.log("-".repeat(60));
    const lock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    if (!lock) {
      console.log("❌ Lock not found (unexpected)");
    } else {
      const lockAgeMs = Date.now() - lock.lockedAt.getTime();
      const lockAgeSeconds = Math.round(lockAgeMs / 1000);
      const isExpired = lockAgeMs > MAX_SYNC_DURATION;

      console.log(`Current time: ${new Date().toISOString()}`);
      console.log(`LockedAt: ${lock.lockedAt.toISOString()}`);
      console.log(`Lock age: ${lockAgeSeconds} seconds (${Math.round(lockAgeMs / 60000)} minutes)`);
      console.log(`MAX_SYNC_DURATION: ${MAX_SYNC_DURATION / 1000} seconds (${MAX_SYNC_DURATION / 60000} minutes)`);
      console.log(`Is Expired: ${isExpired} (${lockAgeMs} > ${MAX_SYNC_DURATION})`);
      console.log();

      if (isExpired) {
        console.log("🔓 Lock is expired - testing deletion...");
        const deleteResult = await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
        console.log(`deleteOne result: deletedCount=${deleteResult.deletedCount}, acknowledged=${deleteResult.acknowledged}`);
        
        if (deleteResult.deletedCount === 1) {
          console.log("✅ Lock successfully deleted!");
        } else {
          console.error("❌ CRITICAL: deleteOne returned deletedCount=0 - lock was NOT deleted!");
        }
      } else {
        console.log("⚠️  Lock is NOT expired (this should not happen with 20-minute-old lock)");
      }
    }
    console.log();

    // Step 6: Verify lock is deleted
    console.log("📋 Step 6: Verifying lock is deleted...");
    console.log("-".repeat(60));
    const finalCheck = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    if (!finalCheck) {
      console.log("✅ Lock successfully deleted - test passed!");
    } else {
      console.error("❌ CRITICAL: Lock still exists after deletion!");
      console.error(`  Lock details:`, JSON.stringify(finalCheck.toObject(), null, 2));
    }
    console.log();

    // Step 7: Test query correctness
    console.log("📋 Step 7: Testing query correctness...");
    console.log("-".repeat(60));
    
    // Create a new test lock
    const newTestLock = await SyncLock.create({
      lockName: GLOBAL_LOCK_NAME,
      lockedAt: new Date(),
      lockedBy: "test-query",
      status: "active",
    });
    console.log(`Created test lock with lockName="${newTestLock.lockName}"`);
    
    // Test exact query match
    const queryResult = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });
    console.log(`Query { lockName: "${GLOBAL_LOCK_NAME}" } result: ${queryResult ? 'FOUND' : 'NOT FOUND'}`);
    
    if (queryResult) {
      console.log(`  Query matched: lockName="${queryResult.lockName}" === "${GLOBAL_LOCK_NAME}"`);
      
      // Test delete with same query
      const deleteResult2 = await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
      console.log(`  deleteOne({ lockName: "${GLOBAL_LOCK_NAME}" }) result: deletedCount=${deleteResult2.deletedCount}`);
      
      if (deleteResult2.deletedCount === 1) {
        console.log("✅ Query correctness verified - delete worked!");
      } else {
        console.error("❌ CRITICAL: Query-based delete failed - deletedCount=0");
      }
    }
    console.log();

    console.log("=".repeat(60));
    console.log("🎉 Lock Expiry Test Completed");
    console.log("=".repeat(60));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testLockExpiry();
