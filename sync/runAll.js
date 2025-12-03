// Master sync script - runs all sync operations
import dotenv from "dotenv";

dotenv.config();

const runAll = async () => {
  console.log("🚀 Starting full data sync...\n");

  // API Syncs
  console.log("📡 Syncing from APIs...\n");
  await import("./api/sync_booking.js");
  await new Promise(resolve => setTimeout(resolve, 1000));

  await import("./api/sync_rentout.js");
  await new Promise(resolve => setTimeout(resolve, 1000));

  await import("./api/sync_storelist.js");
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Note: Users are automatically synced when they login via /api/auth/login
  // No need to sync users separately - they're created/updated on first login
  // If you need bulk user sync, use: npm run sync:users (requires USER_CREDENTIALS env var)

  // CSV Imports
  console.log("\n📄 Importing from CSV files...\n");
  await import("./csv/import_walkin.js");
  await new Promise(resolve => setTimeout(resolve, 1000));

  await import("./csv/import_lossofsale.js");

  console.log("\n🎉 All sync operations completed!");
};

runAll().catch((error) => {
  console.error("❌ Sync failed:", error.message);
  process.exit(1);
});
