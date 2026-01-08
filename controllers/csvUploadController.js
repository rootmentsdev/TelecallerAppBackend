import { importLeadsFromCsvBuffer } from "../sync/utils/csvImportService.js";
import { extractStoreNameFromFilename } from "../sync/utils/storeNameExtractor.js";

/**
 * Upload CSV and import leads
 * Reuses EXACT same logic as CLI importers (import_walkin.js, import_lossofsale.js)
 */
export const uploadCSV = async (req, res) => {
  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded",
      });
    }

    // Validate leadType (must match CLI script names)
    const { leadType } = req.body;
    const validLeadTypes = ["walkin", "lossofsale"];
    if (!leadType || !validLeadTypes.includes(leadType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid leadType. Must be one of: ${validLeadTypes.join(", ")}`,
      });
    }

    // Extract store name from filename (same logic as CLI import scripts)
    // Priority: filename extraction > request body > user store > null
    let storeName = null;
    
    // Try to extract from filename first (e.g., "lossofsale_sg_kannur.xlsx" → "Suitor Guy - Kannur")
    const extractedStoreName = extractStoreNameFromFilename(req.file.originalname);
    if (extractedStoreName) {
      storeName = extractedStoreName;
      console.log(`📁 Extracted store name from filename "${req.file.originalname}": "${storeName}"`);
    }
    
    // Fallback to request body or user store if filename extraction failed
    if (!storeName) {
      storeName = req.body.storeName || req.user?.store || null;
      if (storeName) {
        console.log(`📁 Using store name from request/user: "${storeName}"`);
      }
    }

    // Import using the same service function that reuses existing logic
    const result = await importLeadsFromCsvBuffer({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      leadType: leadType,
      storeName: storeName,
      importedByUserId: req.user?._id || null,
    });

    // Return response matching existing import script format
    res.json({
      success: true,
      message: "CSV import completed",
      fileName: req.file.originalname,
      summary: {
        totalRows: result.totalRows,
        insertedCount: result.saved,
        updatedCount: result.updated,
        skippedCount: result.skipped,
        duplicateCount: result.skipped, // Skipped = duplicates (same as CLI scripts)
        errorsCount: result.errors,
      },
      errors: result.errorDetails,
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing CSV upload",
      error: error.message,
    });
  }
};
