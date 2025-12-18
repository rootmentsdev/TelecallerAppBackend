// Master script to import all Walk-in files from data folder
// Automatically detects brand (Zurocci/Suitor Guy) and location from filenames
import { readCSV } from "../utils/csvReader.js";
import { mapWalkin } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import SyncLog from "../../models/SyncLog.js";
import fs from "fs";
import { join } from "path";
import { statSync } from "fs";
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

// Known brands and locations
const BRANDS = ["Zurocci", "Suitor Guy", "Zurocci", "SuitorGuy"];
// IMPORTANT: Put longer location names BEFORE shorter ones to avoid substring matching issues
// e.g., "Edappally" must come before "Edappal" so "edappally" doesn't match "Edappal"
const LOCATIONS = [
  "Trivandrum", "Edappally", "Edappal", "Perumbavoor", "Kottayam", "Trissur", "Thrissur",
  "Palakkad", "Chavakkad", "MANJERY", "Manjeri", "PMNA", "Perinthalmanna",
  "Z.Kottakkal", "Kottakkal", "CALICUT", "Calicut", "VATAKARA", "Vatakara", "Vadakara",
  "KALPETTA", "Kalpetta", "KANNUR", "Kannur", "MG Road"
];

// Extract brand and location from filename
const extractBrandAndLocation = (filename) => {
  const lowerFilename = filename.toLowerCase();

  // Detect brand - check for patterns like "walkin_sg_location" or "walkin_z_location"
  let brand = null;

  // Pattern 1: walkin_sg_location or walkin_z_location (most common)
  const walkinPattern = /walkin[_\s-]+(sg|z)[_\s-]+(.+?)(?:\.(csv|xlsx|xls))?$/i;
  const walkinMatch = filename.match(walkinPattern);

  if (walkinMatch) {
    const brandCode = walkinMatch[1].toLowerCase();
    if (brandCode === 'sg' || brandCode === 's') {
      brand = "Suitor Guy";
    } else if (brandCode === 'z') {
      brand = "Zurocci";
    }

    // Location is in the third group
    if (walkinMatch[2]) {
      const locationStr = walkinMatch[2].trim().toLowerCase();

      // First try exact match (case-insensitive)
      for (const loc of LOCATIONS) {
        if (locationStr === loc.toLowerCase()) {
          return { brand, location: loc };
        }
      }

      // If no match, use the extracted string (capitalize first letter of each word)
      const location = walkinMatch[2].trim().split(/[_\s-]+/).map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      return { brand, location };
    }
  }

  // Pattern 2: Check for full brand names
  if (lowerFilename.includes("zurocci") || lowerFilename.includes("z-")) {
    brand = "Zurocci";
  } else if (lowerFilename.includes("suitor") || lowerFilename.includes("suitorguy")) {
    brand = "Suitor Guy";
  } else if (lowerFilename.includes("_sg_") || lowerFilename.includes("-sg-") || lowerFilename.match(/\bsg\b/)) {
    brand = "Suitor Guy";
  } else if (lowerFilename.includes("_z_") || lowerFilename.includes("-z-") || lowerFilename.match(/\bz\b/)) {
    brand = "Zurocci";
  }

  // Detect location
  let location = null;
  for (const loc of LOCATIONS) {
    const locLower = loc.toLowerCase();
    // Check various formats
    if (lowerFilename.includes(locLower) ||
      lowerFilename.includes(locLower.replace(/\s+/g, "")) ||
      lowerFilename.includes(locLower.replace(/\s+/g, "_"))) {
      location = loc;
      break;
    }
  }

  // Try to extract from patterns like "brand_location" or "brand - location"
  if (!brand || !location) {
    // Pattern: "zurocci_edapally" or "zurocci-edapally" or "zurocci edapally"
    const patterns = [
      /(zurocci|suitor[\s_-]?guy|sg|z)[\s_-]+([a-z\s]+)/i,
      /([a-z\s]+)[\s_-]+(trivandrum|edapally|kottayam|trissur|palakkad|chavakkad|edappal|manjery|pmna|kottakkal|calicut|vadakara|kalpetta|kannur|mg[\s_-]?road)/i
    ];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        const brandCode = match[1]?.toLowerCase();
        if (!brand) {
          if (brandCode === 'sg' || brandCode === 's') {
            brand = "Suitor Guy";
          } else if (brandCode === 'z') {
            brand = "Zurocci";
          } else if (brandCode.includes("zurocci") || brandCode.includes("z-")) {
            brand = "Zurocci";
          } else if (brandCode.includes("suitor")) {
            brand = "Suitor Guy";
          }
        }
        if (!location && match[2]) {
          location = match[2].trim();
        }
      }
    }
  }

  return { brand, location };
};

// Find all Walk-in files in data folder
const findWalkinFiles = () => {
  const dataDir = join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    return [];
  }

  const files = fs.readdirSync(dataDir);
  const walkinFiles = [];

  const patterns = [
    /walk[\s_-]?in/i,
    /walkin/i,
    /walk_in/i
  ];

  for (const file of files) {
    const filePath = join(dataDir, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      const ext = file.toLowerCase().split('.').pop();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        // Check if filename contains walk-in pattern
        for (const pattern of patterns) {
          if (pattern.test(file)) {
            walkinFiles.push({
              filename: file,
              path: filePath,
              brand: null,
              location: null
            });
            break;
          }
        }
      }
    }
  }

  return walkinFiles;
};

const importFile = async (fileInfo) => {
  const { filename, path, brand, location } = fileInfo;

  // Extract brand and location from filename if not provided
  let finalBrand = brand;
  let finalLocation = location;

  if (!finalBrand || !finalLocation) {
    const extracted = extractBrandAndLocation(filename);
    finalBrand = finalBrand || extracted.brand;
    finalLocation = finalLocation || extracted.location;
  }

  // Build store name
  let storeName = null;
  if (finalBrand && finalLocation) {
    storeName = `${finalBrand} - ${finalLocation}`;
  }

  console.log(`\n📄 Processing: ${filename}`);
  if (storeName) {
    console.log(`   🏪 Store: "${storeName}"`);
    console.log(`   Brand: ${finalBrand}, Location: ${finalLocation}`);
  } else {
    console.log(`   ⚠️  Could not detect brand/location from filename`);
    console.log(`   Will use CSV column or default to "Default Store"`);
  }

  // Read file
  const data = await readCSV(path);

  if (!data || data.length === 0) {
    console.log(`   ⚠️  No data found in file`);
    return { saved: 0, skipped: 0, errors: 0 };
  }

  console.log(`   📊 Found ${data.length} records`);

  let saved = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const totalRecords = data.length;
  const progressInterval = Math.max(1, Math.floor(totalRecords / 20));

  for (let i = 0; i < totalRecords; i++) {
    const row = data[i];

    // Add store name to row data if specified
    const rowWithStore = storeName
      ? { ...row, store: storeName }
      : row;

    const mapped = mapWalkin(rowWithStore);
    if (mapped) {
      const result = await saveToMongo(mapped);
      if (result.saved) {
        saved++;
      } else if (result.updated) {
        updated++;
      } else if (result.skipped) {
        skipped++;
      } else {
        errors++;
      }
    } else {
      skipped++;
    }

    // Show progress
    if (i % progressInterval === 0 || i === totalRecords - 1) {
      const progress = ((i + 1) / totalRecords * 100).toFixed(1);
      process.stdout.write(`\r   ⏳ Progress: ${progress}% (${i + 1}/${totalRecords}) | Saved: ${saved}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
    }
  }

  if (totalRecords > 0) {
    process.stdout.write('\n');
  }

  console.log(`   ✅ Saved: ${saved}, 🔄 Updated: ${updated}, ⏭️  Skipped: ${skipped}, ❌ Errors: ${errors}`);

  return { saved, updated, skipped, errors };
};

const run = async () => {
  console.log("🔄 Starting All Walk-in CSV Import...");
  console.log("=".repeat(60));
  await connectDB();

  // Get last sync time for incremental sync
  let lastSyncAt = null;
  let syncLog = await SyncLog.findOne({ syncType: "walkin" });

  if (syncLog && syncLog.lastSyncAt) {
    lastSyncAt = syncLog.lastSyncAt;
    console.log(`📅 Last sync: ${lastSyncAt.toISOString()}`);
    console.log(`   Will only process files modified after this time (incremental sync)`);
  } else {
    console.log(`📅 First sync - will process all files`);
  }

  // Find all Walk-in files
  const allFiles = findWalkinFiles();

  if (allFiles.length === 0) {
    console.log("⚠️  No Walk-in files found in data/ folder");
    console.log("   Looking for files matching: *walkin*.csv, *walk-in*.xlsx");
    return;
  }

  // Filter files: only process if modified after last sync (incremental sync)
  let filesToProcess = [];
  let filesSkipped = 0;

  if (lastSyncAt) {
    for (const fileInfo of allFiles) {
      try {
        const stats = statSync(fileInfo.path);
        const fileModifiedTime = stats.mtime;

        if (fileModifiedTime > lastSyncAt) {
          filesToProcess.push(fileInfo);
        } else {
          filesSkipped++;
        }
      } catch (error) {
        // If we can't read file stats, include it to be safe
        filesToProcess.push(fileInfo);
      }
    }

    console.log(`\n📁 Found ${allFiles.length} Walk-in file(s) total`);
    console.log(`   📝 Files to process: ${filesToProcess.length} (modified since last sync)`);
    console.log(`   ⏭️  Files skipped: ${filesSkipped} (not modified since last sync)\n`);
  } else {
    filesToProcess = allFiles;
    console.log(`\n📁 Found ${allFiles.length} Walk-in file(s) in data/ folder\n`);
  }

  if (filesToProcess.length === 0) {
    console.log("✅ No files to process - all files are up to date!");
    console.log(`   Next sync will only process files modified after: ${new Date().toISOString()}`);

    // Update sync log even if no files processed
    const syncEndTime = new Date();
    await SyncLog.findOneAndUpdate(
      { syncType: "walkin" },
      {
        lastSyncAt: syncEndTime,
        lastSyncCount: 0,
        status: "success",
        errorMessage: null,
      },
      { upsert: true, new: true }
    );
    return;
  }

  let totalSaved = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Process each file
  for (let i = 0; i < filesToProcess.length; i++) {
    const fileInfo = filesToProcess[i];
    console.log(`\n[${i + 1}/${filesToProcess.length}]`);

    try {
      const result = await importFile(fileInfo);
      totalSaved += result.saved || 0;
      totalUpdated += result.updated || 0;
      totalSkipped += result.skipped || 0;
      totalErrors += result.errors || 0;
    } catch (error) {
      console.error(`   ❌ Error processing ${fileInfo.filename}:`, error.message);
      totalErrors++;
    }
  }

  // Update sync log
  const syncEndTime = new Date();
  await SyncLog.findOneAndUpdate(
    { syncType: "walkin" },
    {
      lastSyncAt: syncEndTime,
      lastSyncCount: totalSaved + totalUpdated,
      status: totalErrors > 0 ? "partial" : "success",
      errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : null,
    },
    { upsert: true, new: true }
  );

  console.log("\n" + "=".repeat(60));
  console.log("✅ All Walk-in Imports Completed!");
  console.log("=".repeat(60));
  console.log(`   📁 Files processed: ${filesToProcess.length}`);
  console.log(`   ⏭️  Files skipped (not modified): ${filesSkipped}`);
  console.log(`   💾 Total new records saved: ${totalSaved}`);
  console.log(`   🔄 Total records updated: ${totalUpdated}`);
  console.log(`   ⏭️  Total skipped (duplicates): ${totalSkipped}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
  console.log(`   📅 Next sync will only process files modified after: ${syncEndTime.toISOString()}`);
};

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('import_all_walkin.js')) {
  run().catch((error) => {
    console.error("❌ All Walk-in import failed:", error.message);
    process.exit(1);
  });
}

export { run };

