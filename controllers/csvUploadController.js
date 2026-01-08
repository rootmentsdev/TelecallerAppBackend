import { importLeadsFromCsvBuffer } from "../sync/utils/csvImportService.js";

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

    // Get store name from user or request (optional override)
    const storeName = req.body.storeName || req.user?.store || null;

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
