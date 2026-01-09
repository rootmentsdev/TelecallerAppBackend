// Manual Sync Lock Unlock Script
// Use this to forcefully clear a stuck sync lock
// Usage: node scripts/unlock-sync.js

import dotenv from "dotenv";
import mongoose from "mongoose";
import SyncLock from "../models/SyncLock.js";

dotenv.config();

const GLOBAL_LOCK_NAME = "GLOBAL_API_SYNC";
const MAX_SYNC_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

const unlockSync = async () => {
  try {
    console.log("=".repeat(60));
    console.log("🔓 Manual Sync Lock Unlock");
    console.log("=".repeat(60));
    console.log();

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
    console.log();

    // Find the lock
    const lock = await SyncLock.findOne({ lockName: GLOBAL_LOCK_NAME });

    if (!lock) {
      console.log("ℹ️  No sync lock found - system is already unlocked");
      console.log();
      await mongoose.connection.close();
      process.exit(0);
    }

    // Show lock details
    const lockAge = Date.now() - lock.lockedAt.getTime();
    const lockAgeMinutes = Math.round(lockAge / 60000);

    console.log("📋 Current Lock Details:");
    console.log(`   Lock Name: ${lock.lockName}`);
    console.log(`   Status: ${lock.status}`);
    console.log(`   Locked By: ${lock.lockedBy}`);
    console.log(`   Locked At: ${lock.lockedAt.toISOString()}`);
    console.log(`   Age: ${lockAgeMinutes} minutes`);
    console.log();

    // Check if lock is expired
    const isExpired = lockAge > MAX_SYNC_DURATION;
    if (isExpired) {
      console.log("⚠️  Lock is EXPIRED (older than 15 minutes)");
      console.log("   This indicates a stuck sync that should be cleared");
      console.log();
    }

    // Force unlock
    console.log("🔓 Forcefully clearing sync lock...");
    await SyncLock.deleteOne({ lockName: GLOBAL_LOCK_NAME });
    console.log("✅ Sync lock cleared successfully");
    console.log();
    console.log("🎉 System is now unlocked - syncs can proceed normally");
    console.log();

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error unlocking sync:", error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

unlockSync();
