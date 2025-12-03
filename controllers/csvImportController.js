import Lead from "../models/Lead.js";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { mapWalkin, mapLossOfSale } from "../sync/utils/dataMapper.js";

export const importLeadsFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded",
      });
    }

    const rows = [];
    const buffer = req.file.buffer;
    const stream = Readable.from(buffer.toString());

    // First, parse CSV and collect all rows
    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on("data", (row) => {
          rows.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Filter out invalid rows (rows that look like headers or empty rows)
    const validRows = rows.filter((row, index) => {
      // Skip rows that are likely headers or title rows
      const rowKeys = Object.keys(row);
      const rowValues = Object.values(row);
      
      // Skip if row has no data or only empty values
      const hasData = rowValues.some(val => val && val.toString().trim() !== "");
      
      // Skip if row looks like a header (all values are column-like names)
      const looksLikeHeader = rowValues.every(val => {
        const str = String(val || "").trim();
        return str === "" || 
               str.includes("Customer Name") || 
               str.includes("Contact") || 
               str.includes("Walk-In Report") ||
               str === "#" ||
               str === "Date" ||
               str === "Function Date";
      });
      
      return hasData && !looksLikeHeader;
    });

    const results = [];
    const errors = [];

    // Detect CSV type from first valid row (check for loss of sale indicators)
    const firstRow = validRows[0] || {};
    const isLossOfSale = 
      firstRow.reason !== undefined || 
      firstRow.Reason !== undefined ||
      firstRow.leadType === "lossOfSale" ||
      firstRow.LeadType === "lossOfSale" ||
      (firstRow.source && firstRow.source.toLowerCase().includes("loss")) ||
      (firstRow.Source && firstRow.Source.toLowerCase().includes("loss"));

    // Process each valid row
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const rowNumber = i + 1;

      try {
        // Use appropriate mapper based on CSV type
        let leadData = null;
        
        if (isLossOfSale) {
          // Use loss of sale mapper
          leadData = mapLossOfSale(row);
        } else {
          // Use walk-in mapper
          leadData = mapWalkin(row);
        }
        
        // If mapping failed, try fallback to basic mapping
        if (!leadData) {
          // Fallback: basic mapping for other CSV formats
          // Handle column names with spaces - csv-parser converts them to keys with spaces
          leadData = {
            name: (
              row.name?.trim() || 
              row.Name?.trim() || 
              row.NAME?.trim() || 
              row["Customer Name"]?.trim() ||
              row["customer name"]?.trim() ||
              row["CUSTOMER NAME"]?.trim()
            ),
            phone: (
              row.phone?.trim() || 
              row.Phone?.trim() || 
              row.PHONE?.trim() || 
              row.Contact?.trim() ||
              row.contact?.trim() ||
              row.CONTACT?.trim()
            ),
            store: (
              row.store?.trim() || 
              row.Store?.trim() || 
              row.STORE?.trim() || 
              req.user.store
            ),
            source: (
              row.source?.trim() || 
              row.Source?.trim() || 
              row.SOURCE?.trim() || 
              (isLossOfSale ? "Loss of Sale" : "Walk-in")
            ),
            enquiryType: (
              row.enquiryType?.trim() || 
              row["enquiry type"]?.trim() || 
              row["Enquiry Type"]?.trim() || 
              row.Category?.trim() ||
              row.category?.trim()
            ),
            leadType: (
              row.leadType?.trim() || 
              row["lead type"]?.trim() || 
              row["Lead Type"]?.trim() || 
              (isLossOfSale ? "lossOfSale" : "general")
            ),
            enquiryDate: row.enquiryDate ? new Date(row.enquiryDate) : (row.Date ? new Date(row.Date) : undefined),
            functionDate: (
              row.functionDate ? new Date(row.functionDate) : 
              (row["Function Date"] ? new Date(row["Function Date"]) : undefined)
            ),
            bookingNo: row.bookingNo?.trim() || row["booking no"]?.trim() || row["Booking No"]?.trim(),
            securityAmount: row.securityAmount ? parseFloat(row.securityAmount) : undefined,
            returnDate: row.returnDate ? new Date(row.returnDate) : undefined,
            remarks: (
              row.remarks?.trim() || 
              row.Remarks?.trim() ||
              row.remarks?.trim()
            ),
            attendedBy: (
              row.Staff?.trim() || 
              row.staff?.trim() ||
              row["Staff"]?.trim()
            ),
            closingStatus: (
              row.closingStatus?.trim() || 
              row["closing status"]?.trim() || 
              row.Status?.trim() || 
              row.status?.trim() ||
              row["Status"]?.trim()
            ),
            reason: row.reason?.trim() || row.Reason?.trim(), // For loss of sale
          };
        }
        
        // Add createdBy (required for API uploads)
        leadData.createdBy = req.user._id;
        
        // Ensure store is set (use user's store as fallback)
        if (!leadData.store) {
          leadData.store = req.user.store || "Default Store";
        }

        // Validate required fields
        if (!leadData.name || !leadData.phone || !leadData.store) {
          // Show available columns for debugging
          const availableColumns = Object.keys(row);
          errors.push({
            row: rowNumber,
            error: "Missing required fields: name, phone, or store",
            data: { 
              name: leadData.name || "missing", 
              phone: leadData.phone || "missing", 
              store: leadData.store || "missing",
              availableColumns: availableColumns,
              sampleRowData: row
            },
          });
          continue;
        }

        // Validate phone format (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(leadData.phone)) {
          errors.push({
            row: rowNumber,
            error: `Invalid phone format: ${leadData.phone}. Must be 10 digits`,
            data: { phone: leadData.phone },
          });
          continue;
        }

        // Validate leadType
        const validLeadTypes = ["general", "lossOfSale", "rentOutFeedback", "bookingConfirmation", "justDial"];
        if (leadData.leadType && !validLeadTypes.includes(leadData.leadType)) {
          leadData.leadType = "general"; // Default to general if invalid
        }

        // Create lead (duplicates allowed for tracking customer revisits)
        const lead = await Lead.create(leadData);
        results.push({
          row: rowNumber,
          success: true,
          leadId: lead._id,
          name: lead.name,
          phone: lead.phone,
        });
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
          data: row,
        });
      }
    }

    // Return response
    res.json({
      success: true,
      message: "CSV import completed",
      summary: {
        totalRows: validRows.length,
        successful: results.length,
        failed: errors.length,
      },
      results: results.slice(0, 100), // Limit results to first 100
      errors: errors.slice(0, 100), // Limit errors to first 100
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing CSV import",
      error: error.message,
    });
  }
};
