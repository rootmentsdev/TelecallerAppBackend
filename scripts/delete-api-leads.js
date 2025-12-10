import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const deleteApiLeads = async () => {
  try {
    await connectDB();

    console.log("=".repeat(70));
    console.log("🗑️  DELETING BOOKING & RENT-OUT LEADS (API DATA)");
    console.log("=".repeat(70));
    console.log();

    // Count existing leads before deletion
    const bookingCount = await Lead.countDocuments({ leadType: "bookingConfirmation" });
    const rentoutCount = await Lead.countDocuments({ leadType: "rentOutFeedback" });

    console.log(`📦 Found ${bookingCount} Booking Confirmation leads`);
    console.log(`📋 Found ${rentoutCount} Rent-Out leads`);
    console.log(`📊 Total to delete: ${bookingCount + rentoutCount} leads`);
    console.log();

    if (bookingCount === 0 && rentoutCount === 0) {
      console.log("ℹ️  No Booking or Rent-Out leads found. Nothing to delete.");
      await mongoose.disconnect();
      return;
    }

    // Delete Booking Confirmation leads
    if (bookingCount > 0) {
      console.log("🗑️  Deleting Booking Confirmation leads...");
      const bookingResult = await Lead.deleteMany({ leadType: "bookingConfirmation" });
      console.log(`   ✅ Deleted ${bookingResult.deletedCount} Booking Confirmation leads`);
    }

    // Delete Rent-Out leads
    if (rentoutCount > 0) {
      console.log("🗑️  Deleting Rent-Out leads...");
      const rentoutResult = await Lead.deleteMany({ leadType: "rentOutFeedback" });
      console.log(`   ✅ Deleted ${rentoutResult.deletedCount} Rent-Out leads`);
    }

    console.log();
    console.log("=".repeat(70));
    console.log("✅ DELETION COMPLETED!");
    console.log("=".repeat(70));
    console.log();
    console.log("📝 Next steps:");
    console.log("   1. Run: npm run sync:all");
    console.log("   2. This will re-import Booking & Rent-Out data from API with correct dates");
    console.log("   3. Dates will now be parsed correctly using the fixed parseApiDate function");
    console.log();

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

// Run if called directly
deleteApiLeads();

