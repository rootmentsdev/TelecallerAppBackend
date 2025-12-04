import { readCSV, readAllExcelSheets } from "../utils/csvReader.js";
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

// Google Sheets Sheet ID to Store Name mapping
// These are the sheet IDs from Google Sheets (gid parameter)
// When exported to Excel, sheet names might be different, so we'll map by index or name
const SHEET_ID_TO_STORE_NAME = {
  // Sheet index 0 = Trivandrum (gid: 0)
  0: 'Trivandrum',
  // Sheet index 1 = MG Road (gid: 472777444)
  1: 'MG Road',
  // Sheet index 2 = Edapally (gid: 1644277494)
  2: 'Z- Edapally',
  // Sheet index 3 = Perumbavoor (gid: 1527831850)
  3: 'Perumbavoor',
  // Sheet index 4 = Kottayam (gid: 1526890305)
  4: 'Kottayam',
  // Sheet index 5 = Trissur (gid: 1686470443)
  5: 'Trissur',
  // Sheet index 6 = Palakkad (gid: 1989740767)
  6: 'Palakkad',
  // Sheet index 7 = Chavakkad (gid: 1641608132)
  7: 'Chavakkad',
  // Sheet index 8 = Edappal (gid: 335772714)
  8: 'Edappal',
  // Sheet index 9 = Manjeri (gid: 273909184)
  9: 'MANJERY',
  // Sheet index 10 = Perinthalmanna (gid: 664513604)
  10: 'PMNA',
  // Sheet index 11 = Kottakal (gid: 96343120)
  11: 'Z.Kottakkal',
  // Sheet index 12 = Calicut (gid: 367741653)
  12: 'CALICUT',
  // Sheet index 13 = Vadakara (gid: 1043801732)
  13: 'VATAKARA',
  // Sheet index 14 = Kalpetta (gid: 1058040989)
  14: 'KALPETTA',
  // Sheet index 15 = Kannur (gid: 1881555117)
  15: 'KANNUR',
};

// Alternative: Map by sheet name (if sheet names in Excel match store names)
const SHEET_NAME_TO_STORE_NAME = {
  'Trivandrum': 'Trivandrum',
  'SG.TRIVANDRUM': 'Trivandrum',
  'trivandrum': 'Trivandrum',
  'MG Road': 'MG Road',
  'mg road': 'MG Road',
  'Edapally': 'Z- Edapally',
  'EDAPPALLY': 'Z- Edapally',
  'edapally': 'Z- Edapally',
  'Perumbavoor': 'Perumbavoor',
  'PERUMBAVOOR': 'Perumbavoor',
  'perumpavor': 'Perumbavoor',
  'Kottayam': 'Kottayam',
  'KOTTAYAM': 'Kottayam',
  'kottayam': 'Kottayam',
  'Trissur': 'Trissur',
  'THRISSUR': 'Trissur',
  'Trisuur': 'Trissur',
  'trissur': 'Trissur',
  'Palakkad': 'Palakkad',
  'PALAKKAD': 'Palakkad',
  'palakkad': 'Palakkad',
  'Chavakkad': 'Chavakkad',
  'CHAVAKKAD': 'Chavakkad',
  'chavakkad': 'Chavakkad',
  'Edappal': 'Edappal',
  'EDAPPAL': 'Edappal',
  'edappal': 'Edappal',
  'Manjeri': 'MANJERY',
  'MANJERI': 'MANJERY',
  'manjeri': 'MANJERY',
  'PMNA': 'PMNA',
  'Perinthalmanna': 'PMNA',
  'PERINTHALMANNA': 'PMNA',
  'perithalmanna': 'PMNA',
  'pmna': 'PMNA',
  'Kottakal': 'Z.Kottakkal',
  'KOTTAKKAL': 'Z.Kottakkal',
  'kottakal': 'Z.Kottakkal',
  'kottakal-': 'Z.Kottakkal',
  'Calicut': 'CALICUT',
  'CALICUT': 'CALICUT',
  'calicut': 'CALICUT',
  'Vadakara': 'VATAKARA',
  'VADAKARA': 'VATAKARA',
  'vadakara': 'VATAKARA',
  'Kalpetta': 'KALPETTA',
  'KALPETTA': 'KALPETTA',
  'kalpetta': 'KALPETTA',
  'Kannur': 'KANNUR',
  'KANNUR': 'KANNUR',
  'kannur': 'KANNUR',
};

// Get store name for a sheet
const getStoreNameForSheet = (sheetName, sheetIndex) => {
  // First try to match by sheet name (case-insensitive)
  const normalizedSheetName = sheetName.trim();
  if (SHEET_NAME_TO_STORE_NAME[normalizedSheetName]) {
    return SHEET_NAME_TO_STORE_NAME[normalizedSheetName];
  }
  // Try case-insensitive match
  const lowerSheetName = normalizedSheetName.toLowerCase();
  for (const [key, value] of Object.entries(SHEET_NAME_TO_STORE_NAME)) {
    if (key.toLowerCase() === lowerSheetName) {
      return value;
    }
  }
  // Fallback to index-based mapping
  if (SHEET_ID_TO_STORE_NAME[sheetIndex] !== undefined) {
    return SHEET_ID_TO_STORE_NAME[sheetIndex];
  }
  // Default fallback
  return 'Default Store';
};

const run = async () => {
  console.log("🔄 Starting Loss of Sale CSV import...");
  await connectDB(); // Connect to DB
  
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
  
  const fileExtension = filePath.toLowerCase().split('.').pop();
  const isExcel = fileExtension === 'xlsx' || fileExtension === 'xls';
  
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  if (isExcel) {
    // Read all sheets from Excel file
    console.log("📊 Reading all sheets from Excel file...");
    const sheets = await readAllExcelSheets(filePath);
    
    if (!sheets || sheets.length === 0) {
      console.warn("⚠️  No sheets found in Excel file or file not found");
      return;
    }
    
    console.log(`✅ Found ${sheets.length} sheet(s) in Excel file\n`);
    
    // Process each sheet
    for (const sheet of sheets) {
      const storeName = getStoreNameForSheet(sheet.name, sheet.index);
      console.log(`📋 Processing Sheet: "${sheet.name}" (Index: ${sheet.index}) → Store: "${storeName}"`);
      console.log(`   Records in sheet: ${sheet.data.length}`);
      
      if (sheet.data.length === 0) {
        console.log(`   ⏭️  Skipping empty sheet\n`);
        continue;
      }
      
      let saved = 0;
      let skipped = 0;
      let errors = 0;
      
      const totalRecords = sheet.data.length;
      const progressInterval = Math.max(1, Math.floor(totalRecords / 20)); // Update every 5%
      
      for (let i = 0; i < totalRecords; i++) {
        const row = sheet.data[i];
        
        if (i % progressInterval === 0 || i === totalRecords - 1) {
          const progress = ((i + 1) / totalRecords * 100).toFixed(1);
          process.stdout.write(`\r   ⏳ Progress: ${progress}% (${i + 1}/${totalRecords}) | Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors}`);
        }
        
        // Add store name to row data
        const rowWithStore = {
          ...row,
          store: storeName, // Override store with the correct one from sheet mapping
        };
        
        const mapped = mapLossOfSale(rowWithStore);
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
      }
      
      if (totalRecords > 0) {
        process.stdout.write('\n'); // New line after progress indicator
      }
      
      console.log(`   ✅ Saved: ${saved}, ⏭️  Skipped: ${skipped}, ❌ Errors: ${errors}\n`);
      
      totalSaved += saved;
      totalSkipped += skipped;
      totalErrors += errors;
    }
  } else {
    // Single CSV file (backward compatible)
    console.log("📄 Reading CSV file...");
    const data = await readCSV(filePath);
    
    if (!data || data.length === 0) {
      console.warn("⚠️  No data found in CSV file or file not found");
      return;
    }
    
    console.log(`✅ Found ${data.length} records in CSV file\n`);
    
    const totalRecords = data.length;
    const progressInterval = Math.max(1, Math.floor(totalRecords / 20)); // Update every 5%
    
    for (let i = 0; i < totalRecords; i++) {
      const row = data[i];
      
      if (i % progressInterval === 0 || i === totalRecords - 1) {
        const progress = ((i + 1) / totalRecords * 100).toFixed(1);
        process.stdout.write(`\r   ⏳ Progress: ${progress}% (${i + 1}/${totalRecords}) | Saved: ${totalSaved}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
      }
      
      const mapped = mapLossOfSale(row);
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
    }
    
    if (totalRecords > 0) {
      process.stdout.write('\n'); // New line after final progress
    }
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

