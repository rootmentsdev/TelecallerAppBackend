import fs from "fs";
import csvParser from "csv-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    // If relative path, resolve from project root
    const fullPath = filePath.startsWith("/") 
      ? filePath 
      : join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${fullPath}`);
      resolve([]);
      return;
    }

    // Check if file is Excel (.xlsx, .xls) or CSV
    const fileExtension = fullPath.toLowerCase().split('.').pop();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Read Excel file
      try {
        const workbook = XLSX.readFile(fullPath);
        const sheetName = workbook.SheetNames[0]; // Get first sheet
        const worksheet = workbook.Sheets[sheetName];
        
        // Read as array to detect header row
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        // Find header row (look for row with '#', 'Date', 'Customer Name', etc.)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
          const row = rawData[i];
          if (row && Array.isArray(row) && row.length > 0) {
            const firstCell = String(row[0] || '').toLowerCase().trim();
            // Check if this looks like a header row
            if (firstCell === '#' || firstCell === 'number' || 
                (row.length > 2 && String(row[1] || '').toLowerCase().includes('date') &&
                 String(row[2] || '').toLowerCase().includes('customer'))) {
              headerRowIndex = i;
              break;
            }
          }
        }
        
        // Read with detected header row
        const headers = rawData[headerRowIndex];
        const dataRows = rawData.slice(headerRowIndex + 1);
        
        // Convert to objects
        const jsonData = dataRows
          .filter(row => row && Array.isArray(row) && row.length > 0)
          .map(row => {
            const obj = {};
            headers.forEach((header, i) => {
              const headerName = String(header || '').trim();
              if (headerName) {
                obj[headerName] = row[i] !== null && row[i] !== undefined ? row[i] : null;
              }
            });
            return obj;
          })
          .filter(row => {
            // Filter out completely empty rows
            return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
          });
        
        resolve(jsonData);
      } catch (error) {
        console.error(`Error reading Excel file: ${error.message}`);
        reject(error);
      }
    } else {
      // Read CSV file
      const data = [];
      fs.createReadStream(fullPath)
        .pipe(csvParser())
        .on("data", (row) => data.push(row))
        .on("end", () => resolve(data))
        .on("error", reject);
    }
  });
};

