import { parseCsvFromBuffer } from "./csvBufferParser.js";
import { mapWalkin, mapLossOfSale } from "./dataMapper.js";
import { saveToMongo } from "./saveToMongo.js";

/**
 * Import leads from CSV buffer - reuses EXACT same logic as CLI importers
 * This function wraps the existing import workflow to work with uploaded files
 * 
 * @param {Buffer} buffer - CSV/Excel file buffer
 * @param {string} originalName - Original filename (for detecting Excel vs CSV)
 * @param {string} leadType - "walkin" or "lossofsale" (determines which mapper to use)
 * @param {string} storeName - Optional store name override (if not in CSV)
 * @param {string} importedByUserId - Optional user ID who imported (for createdBy field)
 * @returns {Promise<{totalRows, saved, updated, skipped, errors, errorDetails}>}
 */
export const importLeadsFromCsvBuffer = async ({
  buffer,
  originalName = "upload.csv",
  leadType,
  storeName = null,
  importedByUserId = null,
}) => {
  // Validate leadType
  if (leadType !== "walkin" && leadType !== "lossofsale") {
    throw new Error(`Invalid leadType: ${leadType}. Must be "walkin" or "lossofsale"`);
  }

  // Parse CSV from buffer (reuses same parsing logic)
  const data = await parseCsvFromBuffer(buffer, originalName);

  if (!data || data.length === 0) {
    return {
      totalRows: 0,
      saved: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };
  }

  // Counters (matching existing import scripts)
  let saved = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails = [];

  // Process each row (EXACT same logic as import_walkin.js / import_lossofsale.js)
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      // Add store name to row data if specified (overrides CSV column)
      // This matches the behavior in existing import scripts
      const rowWithStore = storeName
        ? { ...row, store: storeName }
        : row; // Use store from CSV column if available

      // Use appropriate mapper based on leadType (same as existing scripts)
      let mapped = null;
      if (leadType === "lossofsale") {
        mapped = mapLossOfSale(rowWithStore);
      } else if (leadType === "walkin") {
        mapped = mapWalkin(rowWithStore);
      }

      if (mapped) {
        // Add createdBy if provided
        if (importedByUserId) {
          mapped.createdBy = importedByUserId;
        }

        // Call saveToMongo (EXACT same duplicate prevention logic)
        const result = await saveToMongo(mapped);

        // Count results (matching existing import scripts)
        if (result.saved) {
          saved++;
        } else if (result.updated) {
          updated++;
        } else if (result.skipped) {
          skipped++;
        } else {
          errors++;
          errorDetails.push({
            row: i + 1,
            error: result.message || result.reason || "Failed to save lead",
            data: row,
          });
        }
      } else {
        // Mapping failed (missing required fields, etc.)
        skipped++;
        errorDetails.push({
          row: i + 1,
          error: "Mapping failed: missing required fields (name, phone, or store)",
          data: row,
        });
      }
    } catch (error) {
      errors++;
      errorDetails.push({
        row: i + 1,
        error: error.message,
        data: row,
      });
    }
  }

  return {
    totalRows: data.length,
    saved,
    updated,
    skipped,
    errors,
    errorDetails: errorDetails.slice(0, 100), // Limit to first 100 errors
  };
};
