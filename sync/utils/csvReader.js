import fs from "fs";
import csvParser from "csv-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to read a single Excel sheet
const readExcelSheet = (worksheet, sheetName = '') => {
  // Read as array to detect header row
  // Use raw: true to get raw cell values (important for dates)
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });

  if (!rawData || rawData.length === 0) {
    return [];
  }

  // Find header row - look for row with multiple text columns that look like headers
  // Common header patterns: '#', 'Date', 'Customer Name', 'Contact', 'Phone', etc.
  let headerRowIndex = 0;
  const headerKeywords = ['#', 'number', 'date', 'customer', 'contact', 'phone', 'name', 'store', 'status', 'remarks', 'reason'];

  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && Array.isArray(row) && row.length > 0) {
      // Count how many cells look like headers (text that matches header keywords)
      let headerLikeCount = 0;
      let hasNumericData = false;

      for (let j = 0; j < Math.min(row.length, 10); j++) {
        const cell = String(row[j] || '').trim().toLowerCase();
        // Check if cell looks like a header keyword
        if (headerKeywords.some(keyword => cell.includes(keyword))) {
          headerLikeCount++;
        }
        // Check if cell is a number (likely data, not header)
        if (!isNaN(parseFloat(cell)) && cell !== '') {
          hasNumericData = true;
        }
      }

      // If we have multiple header-like cells and no numeric data, this is likely the header row
      if (headerLikeCount >= 2 && !hasNumericData) {
        headerRowIndex = i;
        break;
      }

      // Also check for specific patterns
      const firstCell = String(row[0] || '').toLowerCase().trim();
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
      if (!Object.values(row).some(val => val !== null && val !== undefined && val !== '')) {
        return false;
      }

      // Filter out title rows (like "JULY LOSS OF SALE", "AUGUST LOSS OF SALE")
      const rowValues = Object.values(row).map(v => String(v || '').toUpperCase().trim());
      const titlePatterns = ['LOSS OF SALE', 'MONTH', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      if (rowValues.some(val => titlePatterns.some(pattern => val.includes(pattern)) && val.length < 50)) {
        return false; // Likely a title row
      }

      // Filter out duplicate header rows (where all values are column header names)
      const headerNames = headers.map(h => String(h || '').toUpperCase().trim());
      const allValuesAreHeaders = rowValues.every(val =>
        headerNames.includes(val) || val === '' || val === null || val === undefined
      );
      if (allValuesAreHeaders && rowValues.filter(v => v).length >= 3) {
        return false; // Likely a duplicate header row
      }

      return true;
    });

  return jsonData;
};

// Read CSV or single Excel sheet (backward compatible)
export const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    // If relative path, resolve from project root
    // Check for both Unix (starts with /) and Windows (starts with drive letter like C:\) absolute paths
    const isAbsolutePath = filePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePath);
    const fullPath = isAbsolutePath
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
        const jsonData = readExcelSheet(worksheet, sheetName);
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

// Read all sheets from Excel file and return with sheet names
export const readAllExcelSheets = (filePath) => {
  return new Promise((resolve, reject) => {
    // Check for both Unix (starts with /) and Windows (starts with drive letter like C:\) absolute paths
    const isAbsolutePath = filePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePath);
    const fullPath = isAbsolutePath
      ? filePath
      : join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${fullPath}`);
      resolve([]);
      return;
    }

    const fileExtension = fullPath.toLowerCase().split('.').pop();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      try {
        const workbook = XLSX.readFile(fullPath);
        const sheets = [];

        // Read each sheet
        workbook.SheetNames.forEach((sheetName, index) => {
          const worksheet = workbook.Sheets[sheetName];
          const data = readExcelSheet(worksheet, sheetName);
          if (data && data.length > 0) {
            sheets.push({
              name: sheetName,
              index: index,
              data: data
            });
          }
        });

        resolve(sheets);
      } catch (error) {
        console.error(`Error reading Excel file: ${error.message}`);
        reject(error);
      }
    } else {
      // For CSV, return as single sheet
      const data = [];
      fs.createReadStream(fullPath)
        .pipe(csvParser())
        .on("data", (row) => data.push(row))
        .on("end", () => resolve([{ name: 'Sheet1', index: 0, data: data }]))
        .on("error", reject);
    }
  });
};

