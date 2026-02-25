/**
 * Verify bookingconfirmation leads and SyncLog in MongoDB.
 * Run from repo root: node scripts/verify-bookingconfirmation-db.js
 * Requires: MONGO_URI in .env
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "../models/Lead.js";
import SyncLog from "../models/SyncLog.js";

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected.\n");

  const count = await Lead.countDocuments({ leadType: "bookingconfirmation" });
  console.log("db.leads.countDocuments({ leadType: 'bookingconfirmation' }):", count);

  const syncLogs = await SyncLog.find({ syncType: "bookingconfirmation" }).sort({ lastSyncAt: -1 }).limit(5).lean();
  console.log("\ndb.synclogs.find({ syncType: 'bookingconfirmation' }) (last 5):");
  syncLogs.forEach((log, i) => {
    console.log(`  [${i + 1}] lastSyncAt: ${log.lastSyncAt?.toISOString?.() ?? log.lastSyncAt}, lastSyncCount: ${log.lastSyncCount}, status: ${log.status}`);
  });

  const sample = await Lead.find({ leadType: "bookingconfirmation" }).limit(3).lean();
  console.log("\ndb.leads.find({ leadType: 'bookingconfirmation' }).limit(3) — sample fields:");
  sample.forEach((lead, i) => {
    console.log(`  [${i + 1}] brand: ${lead.brand}, store: ${lead.store}, bookingNo: ${lead.bookingNo}, returnDate: ${lead.returnDate ?? "null"}, refund_status: ${lead.refund_status ?? "null"}`);
  });

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
