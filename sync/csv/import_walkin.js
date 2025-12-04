import { readCSV } from "../utils/csvReader.js";
import { mapWalkin } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
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
    console.log("MongoDB Connected for walk-in import");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const run = async (brand = null, location = null) => {
  console.log("🔄 Starting Walk-in CSV import...");
  await connectDB(); // Connect to DB
  
  // Get brand and location from: command line arguments > environment variables > CSV columns
  // Command line: node import_walkin.js "Zurocci" "Edapally"
  // Or: node import_walkin.js "Zurocci - Edapally" (combined)
  const brandArg = process.argv[2];
  const locationArg = process.argv[3];
  
  let finalBrand = brand || brandArg || process.env.WALKIN_BRAND || null;
  let finalLocation = location || locationArg || process.env.WALKIN_LOCATION || null;
  
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
  } else if (process.env.WALKIN_STORE_NAME) {
    finalStoreName = process.env.WALKIN_STORE_NAME;
  }
  
  if (finalStoreName) {
    console.log(`🏪 Store: "${finalStoreName}"`);
    console.log(`   Brand: ${finalBrand || 'N/A'}, Location: ${finalLocation || 'N/A'}`);
    console.log(`   (You can specify via:`);
    console.log(`    • Command: npm run import:walkin "Zurocci" "Edapally"`);
    console.log(`    • Command: npm run import:walkin "Zurocci - Edapally"`);
    console.log(`    • Environment: WALKIN_BRAND="Zurocci" WALKIN_LOCATION="Edapally"`);
    console.log(`    • Environment: WALKIN_STORE_NAME="Zurocci - Edapally"`);
    console.log(`    • CSV column: 'store' or 'Store' column in CSV)`);
    console.log();
  } else {
    console.log(`ℹ️  Store name not specified. Will use 'store' column from CSV if available.`);
    console.log(`   If CSV doesn't have store column, records will use "Default Store".`);
    console.log();
  }
  
  // Support both CSV and Excel files
  const csvPath = process.env.WALKIN_CSV_PATH || "data/walkin.csv";
  
  // Also check for Excel file if CSV not found
  let filePath = csvPath;
  if (!fs.existsSync(join(process.cwd(), csvPath))) {
    // Try Excel file names
    const excelPaths = [
      "data/Walk-In Report.xlsx",
      "data/walkin.xlsx",
      "data/WalkIn.xlsx"
    ];
    for (const excelPath of excelPaths) {
      if (fs.existsSync(join(process.cwd(), excelPath))) {
        filePath = excelPath;
        console.log(`📄 Found Excel file: ${excelPath}`);
        break;
      }
    }
  }
  
  console.log("📄 Reading CSV/Excel file...");
  const data = await readCSV(filePath);

  if (!data || data.length === 0) {
    console.warn("⚠️  No data found in CSV file or file not found");
    return;
  }

  console.log(`✅ Found ${data.length} records in file\n`);

  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  const totalRecords = data.length;
  const progressInterval = Math.max(1, Math.floor(totalRecords / 20)); // Update every 5%

  for (let i = 0; i < totalRecords; i++) {
    const row = data[i];
    
    // Add store name to row data if specified (overrides CSV column)
    const rowWithStore = finalStoreName 
      ? { ...row, store: finalStoreName }
      : row; // Use store from CSV column if available
    
    const mapped = mapWalkin(rowWithStore);
    if (mapped) {
      const result = await saveToMongo(mapped);
      if (result.saved) {
        saved++;
      } else if (result.skipped) {
        skipped++;
      } else {
        errors++;
      }
    } else {
      skipped++;
    }
    
    // Show progress AFTER processing (so counters are accurate)
    if (i % progressInterval === 0 || i === totalRecords - 1) {
      const progress = ((i + 1) / totalRecords * 100).toFixed(1);
      process.stdout.write(`\r   ⏳ Progress: ${progress}% (${i + 1}/${totalRecords}) | Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors}`);
    }
  }
  
  if (totalRecords > 0) {
    process.stdout.write('\n'); // New line after final progress
  }

  console.log(`✅ Walk-in CSV import completed: ${saved} saved, ${skipped} skipped, ${errors} errors`);
};

// Export run function for use in runAll.js
export { run };

// Auto-run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('import_walkin.js')) {
  run().catch((error) => {
    console.error("❌ Walk-in CSV import failed:", error.message);
    process.exit(1);
  });
}

