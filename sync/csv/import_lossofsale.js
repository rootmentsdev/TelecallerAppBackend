import { readCSV } from "../utils/csvReader.js";
import { mapLossOfSale } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import SyncLog from "../../models/SyncLog.js";
import fs from "fs";
import { join } from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for loss of sale import");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const run = async (brand = null, location = null) => {
  console.log("🔄 Starting Loss of Sale CSV import...");
  await connectDB(); // Connect to DB
  
  // Get brand and location from: command line arguments > environment variables > CSV columns
  // Command line: node import_lossofsale.js "Zurocci" "Edapally"
  // Or: node import_lossofsale.js "Zurocci - Edapally" (combined)
  const brandArg = process.argv[2];
  const locationArg = process.argv[3];
  
  let finalBrand = brand || brandArg || process.env.LOSSOFSALE_BRAND || null;
  let finalLocation = location || locationArg || process.env.LOSSOFSALE_LOCATION || null;
  
  // If first argument contains " - ", split it (e.g., "Zurocci - Edapally")
  if (brandArg && brandArg.includes(' - ')) {
    const parts = brandArg.split(' - ');
    finalBrand = parts[0].trim();
    finalLocation = parts[1].trim();
  }
  
  // Build store name: "Brand - Location" (e.g., "Zurocci - Edapally")
  let finalStoreName = null;
  if (finalBrand && finalLocation) {
    finalStoreName = `${finalBrand} - ${finalLocation}`;
  } else if (process.env.LOSSOFSALE_STORE_NAME) {
    finalStoreName = process.env.LOSSOFSALE_STORE_NAME;
  }
  
  if (finalStoreName) {
    console.log(`🏪 Store: "${finalStoreName}"`);
    console.log(`   Brand: ${finalBrand || 'N/A'}, Location: ${finalLocation || 'N/A'}`);
    console.log(`   (You can specify via:`);
    console.log(`    • Command: npm run import:lossofsale "Zurocci" "Edapally"`);
    console.log(`    • Command: npm run import:lossofsale "Zurocci - Edapally"`);
    console.log(`    • Environment: LOSSOFSALE_BRAND="Zurocci" LOSSOFSALE_LOCATION="Edapally"`);
    console.log(`    • Environment: LOSSOFSALE_STORE_NAME="Zurocci - Edapally"`);
    console.log(`    • CSV column: 'store' or 'Store' column in CSV)`);
    console.log();
  } else {
    console.log(`ℹ️  Store name not specified. Will use 'store' column from CSV if available.`);
    console.log(`   If CSV doesn't have store column, records will use "Default Store".`);
    console.log();
  }
  
  // Support both CSV and Excel files
  const csvPath = process.env.LOSSOFSALE_CSV_PATH || "data/lossofsale.csv";
  
  // Also check for Excel file if CSV not found
  let filePath = csvPath;
  if (!fs.existsSync(join(process.cwd(), csvPath))) {
    // Try Excel file names
    const excelPaths = [
      "data/lossofsale.xlsx",
      "data/Loss of Sale.xlsx",
      "data/LossOfSale.xlsx"
    ];
    for (const excelPath of excelPaths) {
      if (fs.existsSync(join(process.cwd(), excelPath))) {
        filePath = excelPath;
        console.log(`📄 Found Excel file: ${excelPath}`);
        break;
      }
    }
  }
  
  // Read CSV/Excel file (single sheet only - no multi-sheet support)
  console.log("📄 Reading CSV/Excel file...");
  const data = await readCSV(filePath);
  
  if (!data || data.length === 0) {
    console.warn("⚠️  No data found in CSV file or file not found");
    return;
  }
  
  console.log(`✅ Found ${data.length} records in file\n`);
  
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  const totalRecords = data.length;
  const progressInterval = Math.max(1, Math.floor(totalRecords / 20)); // Update every 5%
  
  for (let i = 0; i < totalRecords; i++) {
    const row = data[i];
    
    // Add store name to row data if specified (overrides CSV column)
    const rowWithStore = finalStoreName 
      ? { ...row, store: finalStoreName }
      : row; // Use store from CSV column if available
    
    const mapped = mapLossOfSale(rowWithStore);
    if (mapped) {
      const result = await saveToMongo(mapped);
      if (result.saved) {
        totalSaved++;
      } else if (result.skipped) {
        totalSkipped++;
      } else {
        totalErrors++;
      }
    } else {
      totalSkipped++;
    }
    
    // Show progress AFTER processing (so counters are accurate)
    if (i % progressInterval === 0 || i === totalRecords - 1) {
      const progress = ((i + 1) / totalRecords * 100).toFixed(1);
      process.stdout.write(`\r   ⏳ Progress: ${progress}% (${i + 1}/${totalRecords}) | Saved: ${totalSaved}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
    }
  }
  
  if (totalRecords > 0) {
    process.stdout.write('\n'); // New line after final progress
  }

  // Update sync log with latest sync time
  const syncEndTime = new Date();
  await SyncLog.findOneAndUpdate(
    { syncType: "lossofsale" },
    {
      lastSyncAt: syncEndTime,
      lastSyncCount: totalSaved,
      status: totalErrors > 0 ? "partial" : "success",
      errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : null,
    },
    { upsert: true, new: true }
  );

  console.log(`\n✅ Loss of Sale CSV import completed!`);
  console.log(`   💾 Total new records saved: ${totalSaved}`);
  console.log(`   ⏭️  Total skipped (already exists): ${totalSkipped}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
  console.log(`   📅 Next sync will skip existing records (duplicate prevention enabled)`);
};

// Export run function for use in runAll.js
export { run };

// Auto-run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('import_lossofsale.js')) {
  run().catch((error) => {
    console.error("❌ Loss of Sale CSV import failed:", error.message);
    process.exit(1);
  });
}

