// Master sync script - runs all sync operations in sequence
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// Connect to MongoDB once for all syncs
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const runAll = async () => {
  const startTime = Date.now();
  console.log("=".repeat(60));
  console.log("🚀 Starting Full Data Sync");
  console.log("=".repeat(60));
  console.log();

  // Connect to MongoDB
  await connectDB();

  try {
    // Step 1: Sync Stores (needed for booking sync)
    console.log("📦 Step 1/5: Syncing Stores...");
    console.log("-".repeat(60));
    const { run: syncStores } = await import("./api/sync_storelist.js");
    await syncStores();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log();

    // Step 2: Sync Booking Confirmation (API)
    console.log("📦 Step 2/5: Syncing Booking Confirmation...");
    console.log("-".repeat(60));
    const { run: syncBooking } = await import("./api/sync_booking.js");
    await syncBooking();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log();

    // Step 3: Sync Rent-Out (API)
    console.log("📦 Step 3/5: Syncing Rent-Out...");
    console.log("-".repeat(60));
    const { run: syncRentout } = await import("./api/sync_rentout.js");
    await syncRentout();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log();

    // Step 4: Import Walk-in (CSV/Excel)
    console.log("📦 Step 4/5: Importing Walk-in Data...");
    console.log("-".repeat(60));
    const { run: importWalkin } = await import("./csv/import_walkin.js");
    await importWalkin();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log();

    // Step 5: Import Loss of Sale (CSV/Excel)
    console.log("📦 Step 5/5: Importing Loss of Sale Data...");
    console.log("-".repeat(60));
    const { run: importLossOfSale } = await import("./csv/import_lossofsale.js");
    await importLossOfSale();
    console.log();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("=".repeat(60));
    console.log("🎉 All Sync Operations Completed!");
    console.log("=".repeat(60));
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log();
    console.log("✅ Summary:");
    console.log("   • Stores synced");
    console.log("   • Booking Confirmation synced (incremental + duplicate prevention)");
    console.log("   • Rent-Out synced (incremental + duplicate prevention)");
    console.log("   • Walk-in data imported");
    console.log("   • Loss of Sale data imported");
    console.log();

  } catch (error) {
    console.error("❌ Sync failed:", error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

runAll().catch((error) => {
  console.error("❌ Fatal error during sync:", error.message);
  process.exit(1);
});
