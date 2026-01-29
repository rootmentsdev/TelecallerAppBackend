import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "../models/Lead.js";
import FollowUp from "../models/FollowUp.js";

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

const cleanupDuplicates = async (dryRun = true) => {
  try {
    await connectDB();

    console.log("\n" + "=".repeat(80));
    console.log(`🔧 DUPLICATE CLEANUP ${dryRun ? "(DRY RUN - NO CHANGES)" : "(LIVE - WILL DELETE)"}`);
    console.log("=".repeat(80) + "\n");

    let totalDeleted = 0;
    const deletionLog = [];

    // ==================== CLEANUP BOOKED ====================
    console.log("📋 Cleaning Booked duplicates...");
    // For booking: If bookingNo exists, check by bookingNo+phone+leadType
    // If bookingNo is empty, check by phone+name+leadType+store
    const bookingWithBookingNo = await Lead.aggregate([
      {
        $match: {
          leadType: "booked",
          bookingNo: { $exists: true, $ne: "", $ne: null }
        }
      },
      {
        $group: {
          _id: {
            bookingNo: "$bookingNo",
            phone: "$phone",
            leadType: "$leadType"
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          docs: { $push: { id: "$_id", createdAt: "$createdAt" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ], { allowDiskUse: true });

    const bookingWithoutBookingNo = await Lead.aggregate([
      {
        $match: {
          leadType: "booked",
          $or: [
            { bookingNo: { $exists: false } },
            { bookingNo: "" },
            { bookingNo: null }
          ]
        }
      },
      {
        $group: {
          _id: {
            phone: "$phone",
            name: "$name",
            leadType: "$leadType",
            store: "$store"
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          docs: { $push: { id: "$_id", createdAt: "$createdAt" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ], { allowDiskUse: true });

    const bookingDuplicates = [...bookingWithBookingNo, ...bookingWithoutBookingNo];

    let bookingDeleted = 0;
    for (const group of bookingDuplicates) {
      // Sort by createdAt, keep the oldest (first one)
      group.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const keepId = group.docs[0].id;
      const deleteIds = group.docs.slice(1).map(d => d.id);

      if (!dryRun) {
        const deleteResult = await Lead.deleteMany({ _id: { $in: deleteIds } });
        bookingDeleted += deleteResult.deletedCount;
        deletionLog.push({
          type: "booked",
          group: group._id,
          kept: keepId.toString(),
          deleted: deleteIds.map(id => id.toString()),
          count: deleteResult.deletedCount
        });
      } else {
        bookingDeleted += deleteIds.length;
        deletionLog.push({
          type: "booked",
          group: group._id,
          kept: keepId.toString(),
          wouldDelete: deleteIds.map(id => id.toString()),
          count: deleteIds.length
        });
      }
    }
    console.log(`   ${dryRun ? "Would delete" : "Deleted"}: ${bookingDeleted} duplicates`);
    totalDeleted += bookingDeleted;

    // ==================== CLEANUP RETURN ====================
    console.log("📋 Cleaning Return duplicates...");
    const returnWithBookingNo = await Lead.aggregate([
      {
        $match: {
          leadType: "return",
          bookingNo: { $exists: true, $nin: ["", null] }
        }
      },
      {
        $group: {
          _id: {
            bookingNo: "$bookingNo",
            phone: "$phone",
            leadType: "$leadType"
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          docs: { $push: { id: "$_id", createdAt: "$createdAt" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ], { allowDiskUse: true });

    // Group 2: Check for duplicates by Name + Phone + Store (regardless of booking number)
    // This catches cases where booking numbers might be different (e.g. re-bookings) but arguably shouldn't be valid duplicates
    // OR cases where one has a booking number and the other doesn't.
    const returnByNamePhoneStore = await Lead.aggregate([
      {
        $match: {
          leadType: "return"
          // Removed checking for missing booking number - run this on ALL returns
        }
      },
      {
        $group: {
          _id: {
            phone: "$phone",
            name: "$name",
            leadType: "$leadType",
            store: "$store"
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          docs: { $push: { id: "$_id", createdAt: "$createdAt" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ], { allowDiskUse: true });

    // Combine both sets of duplicates
    // Use a Map to ensure we don't process the same group twice if it appears in both
    // But since the grouping keys are different, they will appear as different groups.
    // We just need to ensure we don't try to delete the same ID twice (mongo handles this gracefully usually)
    const returnDuplicates = [...returnWithBookingNo, ...returnByNamePhoneStore];

    let returnDeleted = 0;
    for (const group of returnDuplicates) {
      // Sort: keep the EARLIEST created record (assuming first import was correct)
      group.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const keepId = group.docs[0].id;
      // All other IDs are deletions
      const deleteIds = group.docs.slice(1).map(d => d.id);

      if (!dryRun) {
        // Use deleteMany with $in array of IDs
        const deleteResult = await Lead.deleteMany({ _id: { $in: deleteIds } });
        returnDeleted += deleteResult.deletedCount;

        deletionLog.push({
          type: "return",
          group: group._id,
          kept: keepId.toString(),
          deleted: deleteIds.map(id => id.toString()),
          count: deleteResult.deletedCount
        });
      } else {
        returnDeleted += deleteIds.length;
        deletionLog.push({
          type: "return",
          group: group._id,
          kept: keepId.toString(),
          wouldDelete: deleteIds.map(id => id.toString()),
          count: deleteIds.length
        });
      }
    }
    console.log(`   ${dryRun ? "Would delete" : "Deleted"}: ${returnDeleted} duplicates`);
    totalDeleted += returnDeleted;

    // ==================== CLEANUP LOSS OF SALE ====================
    console.log("📋 Cleaning Loss of Sale duplicates...");
    const lossOfSaleDuplicates = await Lead.aggregate([
      { $match: { leadType: "lossOfSale" } },
      {
        $group: {
          _id: {
            name: "$name",
            phone: "$phone",
            leadType: "$leadType",
            store: "$store"
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          docs: { $push: { id: "$_id", createdAt: "$createdAt" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ], { allowDiskUse: true });

    let lossOfSaleDeleted = 0;
    for (const group of lossOfSaleDuplicates) {
      group.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const keepId = group.docs[0].id;
      const deleteIds = group.docs.slice(1).map(d => d.id);

      if (!dryRun) {
        const deleteResult = await Lead.deleteMany({ _id: { $in: deleteIds } });
        lossOfSaleDeleted += deleteResult.deletedCount;
        deletionLog.push({
          type: "lossOfSale",
          group: group._id,
          kept: keepId.toString(),
          deleted: deleteIds.map(id => id.toString()),
          count: deleteResult.deletedCount
        });
      } else {
        lossOfSaleDeleted += deleteIds.length;
        deletionLog.push({
          type: "lossOfSale",
          group: group._id,
          kept: keepId.toString(),
          wouldDelete: deleteIds.map(id => id.toString()),
          count: deleteIds.length
        });
      }
    }
    console.log(`   ${dryRun ? "Would delete" : "Deleted"}: ${lossOfSaleDeleted} duplicates`);
    totalDeleted += lossOfSaleDeleted;

    // ==================== CLEANUP ENQUIRY ====================
    console.log("📋 Cleaning Enquiry duplicates...");
    const generalDuplicates = await Lead.aggregate([
      { $match: { leadType: "enquiry" } },
      {
        $group: {
          _id: {
            name: "$name",
            phone: "$phone",
            leadType: "$leadType",
            store: "$store"
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          docs: { $push: { id: "$_id", createdAt: "$createdAt" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ], { allowDiskUse: true });

    let generalDeleted = 0;
    for (const group of generalDuplicates) {
      group.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const keepId = group.docs[0].id;
      const deleteIds = group.docs.slice(1).map(d => d.id);

      if (!dryRun) {
        const deleteResult = await Lead.deleteMany({ _id: { $in: deleteIds } });
        generalDeleted += deleteResult.deletedCount;
        deletionLog.push({
          type: "enquiry",
          group: group._id,
          kept: keepId.toString(),
          deleted: deleteIds.map(id => id.toString()),
          count: deleteResult.deletedCount
        });
      } else {
        generalDeleted += deleteIds.length;
        deletionLog.push({
          type: "enquiry",
          group: group._id,
          kept: keepId.toString(),
          wouldDelete: deleteIds.map(id => id.toString()),
          count: deleteIds.length
        });
      }
    }
    console.log(`   ${dryRun ? "Would delete" : "Deleted"}: ${generalDeleted} duplicates`);
    totalDeleted += generalDeleted;



    // ==================== SUMMARY ====================
    console.log("\n" + "=".repeat(80));
    console.log("📈 CLEANUP SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total ${dryRun ? "would be deleted" : "deleted"}: ${totalDeleted} duplicate records`);
    console.log(`Booked: ${bookingDeleted}`);
    console.log(`Return: ${returnDeleted}`);
    console.log(`Loss of Sale: ${lossOfSaleDeleted}`);
    console.log(`Enquiry: ${generalDeleted}`);

    // Save deletion log
    if (deletionLog.length > 0) {
      const fs = await import('fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `duplicate-cleanup-${dryRun ? 'dryrun' : 'live'}-${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(deletionLog, null, 2));
      console.log(`\n📝 Deletion log saved to: ${filename}`);
    }

    if (dryRun) {
      console.log("\n⚠️  This was a DRY RUN. No records were deleted.");
      console.log("💡 To actually delete duplicates, run: node scripts/cleanup-duplicates.js --live");
    } else {
      console.log("\n✅ Cleanup completed!");
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

// Check command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

cleanupDuplicates(dryRun);
