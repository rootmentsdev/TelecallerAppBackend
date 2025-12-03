/**
 * Remove Duplicate Booking Confirmation and Rent-Out Leads
 * Keeps the most recent record and removes older duplicates
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "../models/Lead.js";

dotenv.config();

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const removeDuplicates = async () => {
  try {
    await connectDB();

    console.log("=".repeat(60));
    console.log("🧹 Removing Duplicate Booking & Rent-Out Leads");
    console.log("=".repeat(60));
    console.log();

    // Find duplicates for booking confirmation and rent-out
    const duplicates = await Lead.aggregate([
      {
        $match: {
          leadType: { $in: ["bookingConfirmation", "rentOutFeedback"] },
          bookingNo: { $exists: true, $ne: "" }
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
          dates: { $push: "$createdAt" }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log(`📊 Found ${duplicates.length} sets of duplicates\n`);

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found!");
      await mongoose.disconnect();
      return;
    }

    let totalRemoved = 0;
    let totalKept = 0;
    let bookingRemoved = 0;
    let rentoutRemoved = 0;

    for (const dup of duplicates) {
      const { bookingNo, phone, leadType } = dup._id;
      const ids = dup.ids;
      const dates = dup.dates;

      // Find the most recent record (keep this one)
      let mostRecentIndex = 0;
      let mostRecentDate = dates[0];
      for (let i = 1; i < dates.length; i++) {
        if (new Date(dates[i]) > new Date(mostRecentDate)) {
          mostRecentDate = dates[i];
          mostRecentIndex = i;
        }
      }

      const keepId = ids[mostRecentIndex];
      const removeIds = ids.filter((id, index) => index !== mostRecentIndex);

      // Delete duplicates (keep the most recent)
      const deleteResult = await Lead.deleteMany({
        _id: { $in: removeIds }
      });

      totalRemoved += deleteResult.deletedCount;
      totalKept += 1;

      if (leadType === "bookingConfirmation") {
        bookingRemoved += deleteResult.deletedCount;
      } else if (leadType === "rentOutFeedback") {
        rentoutRemoved += deleteResult.deletedCount;
      }

      if (dup.count > 2) {
        console.log(`✅ ${leadType === "bookingConfirmation" ? "Booking" : "Rent-Out"}: ${bookingNo}, Phone: ${phone}`);
        console.log(`   Kept: 1 (most recent), Removed: ${deleteResult.deletedCount} duplicates`);
      }
    }

    console.log();
    console.log("=".repeat(60));
    console.log("✅ Duplicate Removal Complete!");
    console.log("=".repeat(60));
    console.log(`   Total kept: ${totalKept} records`);
    console.log(`   Total removed: ${totalRemoved} duplicates`);
    console.log(`   - Booking Confirmation: ${bookingRemoved} removed`);
    console.log(`   - Rent-Out: ${rentoutRemoved} removed`);
    console.log();

    // Verify no duplicates remain
    const remainingDuplicates = await Lead.aggregate([
      {
        $match: {
          leadType: { $in: ["bookingConfirmation", "rentOutFeedback"] },
          bookingNo: { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: {
            bookingNo: "$bookingNo",
            phone: "$phone",
            leadType: "$leadType"
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    if (remainingDuplicates.length === 0) {
      console.log("✅ No duplicates remaining!");
    } else {
      console.log(`⚠️  Still found ${remainingDuplicates.length} sets of duplicates`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

removeDuplicates();

