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

    // ==================== CLEANUP BOOKING CONFIRMATION ====================
    console.log("📋 Cleaning Booking Confirmation duplicates...");
    // For booking: If bookingNo exists, check by bookingNo+phone+leadType
    // If bookingNo is empty, check by phone+name+leadType+store
    const bookingWithBookingNo = await Lead.aggregate([
      { 
        $match: { 
          leadType: "bookingConfirmation",
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
          leadType: "bookingConfirmation",
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
          type: "bookingConfirmation",
          group: group._id,
          kept: keepId.toString(),
          deleted: deleteIds.map(id => id.toString()),
          count: deleteResult.deletedCount
        });
      } else {
        bookingDeleted += deleteIds.length;
        deletionLog.push({
          type: "bookingConfirmation",
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

    const returnWithoutBookingNo = await Lead.aggregate([
      { 
        $match: { 
          leadType: "return",
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

    const returnDuplicates = [...returnWithBookingNo, ...returnWithoutBookingNo];

    let returnDeleted = 0;
    for (const group of returnDuplicates) {
      group.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const keepId = group.docs[0].id;
      const deleteIds = group.docs.slice(1).map(d => d.id);

      if (!dryRun) {
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

    // ==================== CLEANUP GENERAL ====================
    console.log("📋 Cleaning General duplicates...");
    const generalDuplicates = await Lead.aggregate([
      { $match: { leadType: "general" } },
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
          type: "general",
          group: group._id,
          kept: keepId.toString(),
          deleted: deleteIds.map(id => id.toString()),
          count: deleteResult.deletedCount
        });
      } else {
        generalDeleted += deleteIds.length;
        deletionLog.push({
          type: "general",
          group: group._id,
          kept: keepId.toString(),
          wouldDelete: deleteIds.map(id => id.toString()),
          count: deleteIds.length
        });
      }
    }
    console.log(`   ${dryRun ? "Would delete" : "Deleted"}: ${generalDeleted} duplicates`);
    totalDeleted += generalDeleted;

    // ==================== CLEANUP JUST DIAL ====================
    console.log("📋 Cleaning Just Dial duplicates...");
    const justDialDuplicates = await Lead.aggregate([
      { $match: { leadType: "justDial" } },
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

    let justDialDeleted = 0;
    for (const group of justDialDuplicates) {
      group.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const keepId = group.docs[0].id;
      const deleteIds = group.docs.slice(1).map(d => d.id);

      if (!dryRun) {
        const deleteResult = await Lead.deleteMany({ _id: { $in: deleteIds } });
        justDialDeleted += deleteResult.deletedCount;
        deletionLog.push({
          type: "justDial",
          group: group._id,
          kept: keepId.toString(),
          deleted: deleteIds.map(id => id.toString()),
          count: deleteResult.deletedCount
        });
      } else {
        justDialDeleted += deleteIds.length;
        deletionLog.push({
          type: "justDial",
          group: group._id,
          kept: keepId.toString(),
          wouldDelete: deleteIds.map(id => id.toString()),
          count: deleteIds.length
        });
      }
    }
    console.log(`   ${dryRun ? "Would delete" : "Deleted"}: ${justDialDeleted} duplicates`);
    totalDeleted += justDialDeleted;

    // ==================== SUMMARY ====================
    console.log("\n" + "=".repeat(80));
    console.log("📈 CLEANUP SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total ${dryRun ? "would be deleted" : "deleted"}: ${totalDeleted} duplicate records`);
    console.log(`Booking Confirmation: ${bookingDeleted}`);
    console.log(`Return: ${returnDeleted}`);
    console.log(`Loss of Sale: ${lossOfSaleDeleted}`);
    console.log(`General: ${generalDeleted}`);
    console.log(`Just Dial: ${justDialDeleted}`);

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
