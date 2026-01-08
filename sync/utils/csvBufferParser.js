import csvParser from "csv-parser";
import { Readable } from "stream";
import XLSX from "xlsx";

/**
 * Parse CSV from buffer (reuses same logic as readCSV but accepts buffer instead of file path)
 * This is used for UI uploads while maintaining exact same parsing behavior
 */
export const parseCsvFromBuffer = (buffer, originalName = "upload.csv") => {
  return new Promise((resolve, reject) => {
    // Check if file is Excel (.xlsx, .xls) or CSV based on original filename
    const fileExtension = originalName.toLowerCase().split('.').pop();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Read Excel file from buffer
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; // Get first sheet
        const worksheet = workbook.Sheets[sheetName];
        
        // Reuse the same Excel parsing logic from csvReader.js
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });

        if (!rawData || rawData.length === 0) {
          resolve([]);
          return;
        }

        // Find header row (same logic as readExcelSheet)
        let headerRowIndex = 0;
        const headerKeywords = ['#', 'number', 'date', 'customer', 'contact', 'phone', 'name', 'store', 'status', 'remarks', 'reason'];

        for (let i = 0; i < Math.min(10, rawData.length); i++) {
          const row = rawData[i];
          if (row && Array.isArray(row) && row.length > 0) {
            let headerLikeCount = 0;
            let hasNumericData = false;

            for (let j = 0; j < Math.min(row.length, 10); j++) {
              const cell = String(row[j] || '').trim().toLowerCase();
              if (headerKeywords.some(keyword => cell.includes(keyword))) {
                headerLikeCount++;
              }
              if (!isNaN(parseFloat(cell)) && cell !== '') {
                hasNumericData = true;
              }
            }

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

            // Filter out title rows
            const rowValues = Object.values(row).map(v => String(v || '').toUpperCase().trim());
            const titlePatterns = ['LOSS OF SALE', 'MONTH', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
              'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
            if (rowValues.some(val => titlePatterns.some(pattern => val.includes(pattern)) && val.length < 50)) {
              return false;
            }

            // Filter out duplicate header rows
            const headerNames = headers.map(h => String(h || '').toUpperCase().trim());
            const allValuesAreHeaders = rowValues.every(val =>
              headerNames.includes(val) || val === '' || val === null || val === undefined
            );
            if (allValuesAreHeaders && rowValues.filter(v => v).length >= 3) {
              return false;
            }

            return true;
          });

        resolve(jsonData);
      } catch (error) {
        console.error(`Error reading Excel file from buffer: ${error.message}`);
        reject(error);
      }
    } else {
      // Read CSV file from buffer
      const allRows = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csvParser({ header: false })) // Read without headers first
        .on("data", (row) => allRows.push(Object.values(row)))
        .on("end", () => {
          if (allRows.length === 0) {
            resolve([]);
            return;
          }

          // Find header row (same logic as readCSV)
          let headerRowIndex = 0;
          const headerKeywords = ['#', 'number', 'date', 'customer', 'contact', 'phone', 'name', 'store', 'status', 'remarks', 'reason'];

          for (let i = 0; i < Math.min(10, allRows.length); i++) {
            const row = allRows[i];
            let headerLikeCount = 0;
            row.forEach(cell => {
              const str = String(cell || '').trim().toLowerCase();
              if (headerKeywords.some(kw => str.includes(kw))) headerLikeCount++;
            });
            if (headerLikeCount >= 2) {
              headerRowIndex = i;
              break;
            }
          }

          const headers = allRows[headerRowIndex].map(h => String(h || '').trim());
          const dataRows = allRows.slice(headerRowIndex + 1);

          const jsonData = dataRows.map(row => {
            const obj = {};
            headers.forEach((h, i) => {
              if (h) obj[h] = row[i];
            });
            return obj;
          }).filter(row => Object.values(row).some(v => v !== null && v !== undefined && v !== ''));

          resolve(jsonData);
        })
        .on("error", reject);
    }
  });
};
