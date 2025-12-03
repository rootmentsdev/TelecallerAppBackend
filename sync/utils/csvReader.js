import fs from "fs";
import csvParser from "csv-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const data = [];
    
    // If relative path, resolve from project root
    const fullPath = filePath.startsWith("/") 
      ? filePath 
      : join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`CSV file not found: ${fullPath}`);
      resolve([]);
      return;
    }

    fs.createReadStream(fullPath)
      .pipe(csvParser())
      .on("data", (row) => data.push(row))
      .on("end", () => resolve(data))
      .on("error", reject);
  });
};

