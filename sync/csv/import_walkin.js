import { readCSV } from "../utils/csvReader.js";
import { mapWalkin } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
  console.log("🔄 Starting Walk-in CSV import...");
  
  const csvPath = process.env.WALKIN_CSV_PATH || "data/walkin.csv";
  const data = await readCSV(csvPath);

  if (!data || data.length === 0) {
    console.warn("⚠️  No data found in CSV file or file not found");
    return;
  }

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of data) {
    const mapped = mapWalkin(row);
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

  console.log(`✅ Walk-in CSV import completed: ${saved} saved, ${skipped} skipped, ${errors} errors`);
};

run().catch((error) => {
  console.error("❌ Walk-in CSV import failed:", error.message);
  process.exit(1);
});

