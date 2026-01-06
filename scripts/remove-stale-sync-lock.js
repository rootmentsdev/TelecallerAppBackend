import mongoose from "mongoose";
import dotenv from "dotenv";
import SyncLock from "../models/SyncLock.js";

dotenv.config();

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const removeStaleLock = async () => {
  try {
    await connectDB();

    console.log("\n" + "=".repeat(80));
    console.log("🔓 REMOVING STALE SYNC LOCK");
    console.log("=".repeat(80) + "\n");

    // Find active locks
    const activeLocks = await SyncLock.find({ status: "active" }).lean();
    
    if (activeLocks.length === 0) {
      console.log("✅ No active locks found - syncs should work normally");
    } else {
      console.log(`⚠️  Found ${activeLocks.length} active lock(s):\n`);
      
      for (const lock of activeLocks) {
        const lockAge = (Date.now() - lock.lockedAt.getTime()) / (1000 * 60);
        console.log(`   Lock: ${lock.lockName}`);
        console.log(`   Locked By: ${lock.lockedBy || 'unknown'}`);
        console.log(`   Locked At: ${lock.lockedAt.toISOString()}`);
        console.log(`   Age: ${lockAge.toFixed(1)} minutes`);
        console.log(`   Status: ${lock.status}`);
        
        // Remove the lock
        const result = await SyncLock.deleteOne({ _id: lock._id });
        
        if (result.deletedCount > 0) {
          console.log(`   ✅ Lock removed successfully`);
        } else {
          console.log(`   ⚠️  Failed to remove lock`);
        }
        console.log();
      }
    }

    // Verify no locks remain
    const remainingLocks = await SyncLock.find({ status: "active" }).countDocuments();
    
    if (remainingLocks === 0) {
      console.log("✅ All stale locks removed - syncs should resume automatically");
      console.log("\n💡 Next automatic sync should run within 20 minutes");
      console.log("   Or trigger manually: npm run sync:api");
    } else {
      console.log(`⚠️  ${remainingLocks} lock(s) still remain`);
    }

    console.log("\n" + "=".repeat(80) + "\n");

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

removeStaleLock();
