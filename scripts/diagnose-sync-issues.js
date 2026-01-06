import mongoose from "mongoose";
import dotenv from "dotenv";
import SyncLog from "../models/SyncLog.js";
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

const diagnoseSyncIssues = async () => {
  try {
    await connectDB();

    console.log("\n" + "=".repeat(80));
    console.log("🔍 SYNC DIAGNOSTIC REPORT");
    console.log("=".repeat(80) + "\n");

    // 1. Check recent sync logs
    console.log("📋 1. RECENT SYNC LOGS");
    console.log("-".repeat(80));
    
    const recentLogs = await SyncLog.find({})
      .sort({ lastSyncAt: -1 })
      .limit(10)
      .lean();

    if (recentLogs.length === 0) {
      console.log("   ⚠️  No sync logs found in database");
    } else {
      console.log(`   Found ${recentLogs.length} recent sync logs:\n`);
      
      recentLogs.forEach((log, idx) => {
        const timeAgo = getTimeAgo(log.lastSyncAt);
        console.log(`   ${idx + 1}. ${log.syncType.toUpperCase()} Sync`);
        console.log(`      Status: ${log.status}`);
        console.log(`      Trigger: ${log.trigger || 'unknown'}`);
        console.log(`      Last Sync: ${log.lastSyncAt.toISOString()}`);
        console.log(`      Time Ago: ${timeAgo}`);
        console.log(`      Records Synced: ${log.lastSyncCount || 0}`);
        if (log.errorMessage) {
          console.log(`      ⚠️  Error: ${log.errorMessage}`);
        }
        console.log();
      });

      const latestLog = recentLogs[0];
      const hoursSinceLastSync = (Date.now() - latestLog.lastSyncAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastSync > 1) {
        console.log(`   ⚠️  WARNING: Last sync was ${hoursSinceLastSync.toFixed(1)} hours ago`);
        console.log(`   ⚠️  Expected syncs every 20 minutes - syncs may not be running!`);
      } else {
        console.log(`   ✅ Last sync was ${hoursSinceLastSync.toFixed(1)} hours ago (recent)`);
      }
    }

    // 2. Check for active sync locks
    console.log("\n📋 2. ACTIVE SYNC LOCKS");
    console.log("-".repeat(80));
    
    const activeLocks = await SyncLock.find({ status: "active" }).lean();
    
    if (activeLocks.length === 0) {
      console.log("   ✅ No active sync locks (normal - no sync running)");
    } else {
      console.log(`   ⚠️  Found ${activeLocks.length} active lock(s):\n`);
      
      activeLocks.forEach((lock, idx) => {
        const lockAge = (Date.now() - lock.lockedAt.getTime()) / (1000 * 60);
        console.log(`   ${idx + 1}. Lock: ${lock.lockName}`);
        console.log(`      Locked By: ${lock.lockedBy || 'unknown'}`);
        console.log(`      Locked At: ${lock.lockedAt.toISOString()}`);
        console.log(`      Age: ${lockAge.toFixed(1)} minutes`);
        console.log(`      Status: ${lock.status}`);
        
        if (lockAge > 120) {
          console.log(`      ⚠️  STALE LOCK: Lock is older than 2 hours - may be blocking syncs!`);
        }
        console.log();
      });
    }

    // 3. Check sync statistics by type
    console.log("\n📋 3. SYNC STATISTICS BY TYPE");
    console.log("-".repeat(80));
    
    const stats = await SyncLog.aggregate([
      {
        $group: {
          _id: "$syncType",
          total: { $sum: 1 },
          successful: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          partial: { $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] } },
          latest: { $max: "$lastSyncAt" },
          latestCount: { $first: { $cond: [{ $eq: ["$status", "success"] }, "$lastSyncCount", 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    stats.forEach(stat => {
      console.log(`\n   ${stat._id.toUpperCase()}:`);
      console.log(`      Total Syncs: ${stat.total}`);
      console.log(`      Successful: ${stat.successful}`);
      console.log(`      Failed: ${stat.failed}`);
      console.log(`      Partial: ${stat.partial}`);
      if (stat.latest) {
        const timeAgo = getTimeAgo(stat.latest);
        console.log(`      Latest Sync: ${stat.latest.toISOString()} (${timeAgo})`);
        console.log(`      Latest Count: ${stat.latestCount || 0} records`);
      }
    });

    // 4. Check for errors in last 24 hours
    console.log("\n📋 4. RECENT ERRORS (Last 24 Hours)");
    console.log("-".repeat(80));
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const errorLogs = await SyncLog.find({
      $or: [
        { status: "failed" },
        { errorMessage: { $exists: true, $ne: null } }
      ],
      createdAt: { $gte: oneDayAgo }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    if (errorLogs.length === 0) {
      console.log("   ✅ No errors found in last 24 hours");
    } else {
      console.log(`   ⚠️  Found ${errorLogs.length} error(s) in last 24 hours:\n`);
      
      errorLogs.forEach((log, idx) => {
        console.log(`   ${idx + 1}. ${log.syncType.toUpperCase()} Sync`);
        console.log(`      Time: ${log.createdAt.toISOString()}`);
        console.log(`      Status: ${log.status}`);
        if (log.errorMessage) {
          console.log(`      Error: ${log.errorMessage}`);
        }
        console.log();
      });
    }

    // 5. Recommendations
    console.log("\n📋 5. RECOMMENDATIONS");
    console.log("-".repeat(80));
    
    const latestSync = recentLogs[0];
    if (latestSync) {
      const hoursSinceLastSync = (Date.now() - latestSync.lastSyncAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastSync > 1) {
        console.log("   ⚠️  ISSUES DETECTED:\n");
        console.log("   1. Automatic syncs appear to have stopped");
        console.log("   2. Last sync was more than 1 hour ago");
        console.log("\n   🔧 TROUBLESHOOTING STEPS:\n");
        console.log("   • Check if server is running: `ps aux | grep node`");
        console.log("   • Check server logs for scheduler startup messages");
        console.log("   • Verify API_SYNC_ENABLED is not set to 'false' in .env");
        console.log("   • Check for stale sync locks (older than 2 hours)");
        console.log("   • Restart the server to restart the scheduler");
        console.log("   • Manually trigger a sync: `npm run sync:api`");
        console.log("\n   📝 To manually trigger sync:");
        console.log("      node sync/apiOnly.js");
      } else {
        console.log("   ✅ Syncs appear to be working normally");
        console.log("   • Last sync was recent");
        console.log("   • No stale locks detected");
      }
    } else {
      console.log("   ⚠️  No sync logs found - syncs may never have run");
      console.log("   • Check if server is running");
      console.log("   • Verify scheduler is started in server.js");
      console.log("   • Manually trigger first sync: `npm run sync:api`");
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

const getTimeAgo = (date) => {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day(s) ago`;
  } else if (hours > 0) {
    return `${hours} hour(s) ago`;
  } else {
    return `${minutes} minute(s) ago`;
  }
};

diagnoseSyncIssues();
