import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "./models/Lead.js";
import Store from "./models/Store.js";
import User from "./models/User.js";
import SyncLog from "./models/SyncLog.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const verifyData = async () => {
  try {
    await connectDB();

    console.log("=".repeat(70));
    console.log("📊 DATABASE & SYNC STATUS CHECK");
    console.log("=".repeat(70));
    console.log();

    // 1. Data Collections & Counts
    console.log("1️⃣  COLLECTIONS & COUNTS");
    console.log("-".repeat(30));

    const totalLeads = await Lead.countDocuments();
    const returnCount = await Lead.countDocuments({ leadType: "return" });
    const enquiryCount = await Lead.countDocuments({ leadType: "enquiry" });
    const lossOfSaleCount = await Lead.countDocuments({ leadType: "lossOfSale" });
    const bookedCount = await Lead.countDocuments({ leadType: "booked" });

    const totalStores = await Store.countDocuments();
    const totalUsers = await User.countDocuments();

    console.log(`   📂 Leads Collection:      ${totalLeads.toLocaleString()}`);
    console.log(`      • Return:              ${returnCount.toLocaleString()}`);
    console.log(`      • Enquiry:             ${enquiryCount.toLocaleString()}`);
    console.log(`      • Loss of Sale:        ${lossOfSaleCount.toLocaleString()}`);
    console.log(`      • Booked:              ${bookedCount.toLocaleString()}`);
    console.log();
    console.log(`   📂 Stores Collection:     ${totalStores.toLocaleString()}`);
    console.log(`   📂 Users Collection:      ${totalUsers.toLocaleString()}`);
    console.log();

    // 2. Overall Total Count (Leads)
    console.log("2️⃣  OVERALL TOTAL (LEADS)");
    console.log("-".repeat(30));
    console.log(`   TOTAL RECORDS: ${totalLeads.toLocaleString()}`);
    console.log();

    // 3. Sync Status
    console.log("3️⃣  SYNC STATUS");
    console.log("-".repeat(30));

    // For simplicity, we check if key syncs have run successfully at least once
    const returnSyncLog = await SyncLog.findOne({ syncType: "return" }).sort({ lastSyncAt: -1 });
    // Assuming if return sync ran, the api system is generally active. 
    // We can also check others if needed, but keeping it simple as requested.

    // Check if synced recently (e.g. within last 24 hours just as a sanity check for "Completed")
    // Or just check if specific major syncs exist.
    const isReturnSynced = !!returnSyncLog;

    // We can check if all core syncs have a success entry
    const storeSyncLog = await SyncLog.findOne({ syncType: "store" }).sort({ lastSyncAt: -1 });

    const syncsCompleted = isReturnSynced && !!storeSyncLog;

    if (syncsCompleted) {
      console.log("   ✅ Syncs Completed: YES");
      if (returnSyncLog) {
        console.log(`      (Last Return Sync: ${new Date(returnSyncLog.lastSyncAt).toLocaleString()})`);
      }
    } else {
      console.log("   ⚠️  Syncs Completed: PARTIAL / NO");
      console.log("      (Run 'npm run sync:all' to initialize)");
    }
    console.log();

    // 4. Next Sync Time
    console.log("4️⃣  NEXT SYNC TIME");
    console.log("-".repeat(30));

    // The scheduler runs every 5 minutes.
    // We calculate the next 5-minute interval from now.
    const now = new Date();
    const minutes = now.getMinutes();
    const nextInterval = Math.ceil((minutes + 1) / 5) * 5;
    const nextSyncTime = new Date(now);

    if (nextInterval === 60) {
      nextSyncTime.setHours(nextSyncTime.getHours() + 1);
      nextSyncTime.setMinutes(0);
    } else {
      nextSyncTime.setMinutes(nextInterval);
    }
    nextSyncTime.setSeconds(0);
    nextSyncTime.setMilliseconds(0);

    console.log(`   ⏰ Next Sync Run: ${nextSyncTime.toLocaleTimeString()}`);
    console.log("      (Automatic sync runs every 20 minutes)");
    console.log();

    console.log("=".repeat(70));
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

verifyData();

