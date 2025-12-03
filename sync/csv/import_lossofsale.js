import { readCSV } from "../utils/csvReader.js";
import { mapLossOfSale } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import fs from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
  console.log("🔄 Starting Loss of Sale CSV import...");
  
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
  
  const data = await readCSV(filePath);

  if (!data || data.length === 0) {
    console.warn("⚠️  No data found in CSV file or file not found");
    return;
  }

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of data) {
    const mapped = mapLossOfSale(row);
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

  console.log(`✅ Loss of Sale CSV import completed: ${saved} saved, ${skipped} skipped, ${errors} errors`);
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

