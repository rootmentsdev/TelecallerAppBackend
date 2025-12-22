// Helper function to clean phone number (keep only digits)
// Handles international formats by extracting last 10 digits
const cleanPhone = (phone) => {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, "");

  // If exactly 10 digits, return as is
  if (cleaned.length === 10) return cleaned;

  // If more than 10 digits (international format), extract last 10 digits
  if (cleaned.length > 10) {
    return cleaned.slice(-10);
  }

  // If less than 10 digits, try to pad with leading zero (for numbers like 813969469 -> 0813969469)
  if (cleaned.length === 9) {
    return '0' + cleaned;
  }

  // If still not 10 digits, return null (invalid)
  return null;
};

// Helper function to parse date from CSV files
// IMPORTANT: CSV files use DD-MM-YYYY format (e.g., "6-7-2024" = July 6, 2024)
const parseDate = (dateStr) => {
  if (!dateStr) return undefined;

  // If it's already a Date object, return as is
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? undefined : dateStr;
  }

  // Handle string dates - prioritize DD-MM-YYYY format (common in Indian date formats)
  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();

    // Handle dates with dashes or slashes (e.g., "6-7-2024" or "6/7/2024")
    if (trimmed.includes('-') || trimmed.includes('/')) {
      const separator = trimmed.includes('-') ? '-' : '/';
      const parts = trimmed.split(separator).map(p => p.trim());

      if (parts.length === 3) {
        const part0 = parseInt(parts[0], 10);
        const part1 = parseInt(parts[1], 10);
        const part2 = parseInt(parts[2], 10);

        // Validate all parts are numbers
        if (!isNaN(part0) && !isNaN(part1) && !isNaN(part2)) {
          // Determine format based on year position
          // If part2 is 4 digits, it's DD-MM-YYYY or MM-DD-YYYY
          // If part0 is 4 digits, it's YYYY-MM-DD

          if (part2.toString().length === 4) {
            // Format is either DD-MM-YYYY or MM-DD-YYYY
            // For CSV files, we assume DD-MM-YYYY format (Indian format)
            // If part0 > 12, it MUST be DD-MM-YYYY (since month can't be > 12)
            // If part0 <= 12 and part1 <= 12, we assume DD-MM-YYYY (Indian format preference)

            const day = part0; // First part is day in DD-MM-YYYY
            const month = part1 - 1; // Second part is month (0-indexed)
            const year = part2; // Third part is year

            // Validate date ranges
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
              const date = new Date(Date.UTC(year, month, day));
              if (!isNaN(date.getTime())) {
                return date;
              }
            }
          } else if (part0.toString().length === 4) {
            // YYYY-MM-DD format: parts[0] = year, parts[1] = month, parts[2] = day
            const year = part0;
            const month = part1 - 1; // Month is 0-indexed
            const day = part2;

            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
              const date = new Date(Date.UTC(year, month, day));
              if (!isNaN(date.getTime())) {
                return date;
              }
            }
          }
        }
      }
    }

    // Try standard date parsing as fallback (handles ISO format, etc.)
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
};

// Helper function to parse date from API responses
// IMPORTANT: APIs return ISO format dates (e.g., "2025-03-13T07:04:47" or "2025-04-01T00:00:00")
// This function ensures exact date parsing without timezone issues
const parseApiDate = (dateStr) => {
  if (!dateStr) return undefined;

  // If it's already a Date object, return as is
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? undefined : dateStr;
  }

  // Handle string dates from API
  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();

    // API returns ISO format dates: "2025-03-13T07:04:47" or "2025-04-01T00:00:00"
    // Parse ISO format dates correctly and ensure exact dates

    // Check for ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
      // Extract date parts to ensure exact parsing
      const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
        const day = parseInt(dateMatch[3], 10);

        // Validate date parts
        if (year >= 2000 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          // Extract time if present
          const timeMatch = trimmed.match(/T(\d{2}):(\d{2}):(\d{2})/);
          let hour = 0, minute = 0, second = 0;

          if (timeMatch) {
            hour = parseInt(timeMatch[1], 10);
            minute = parseInt(timeMatch[2], 10);
            second = parseInt(timeMatch[3], 10);
          }

          // Create date using UTC to ensure exact date without timezone conversion
          const date = new Date(Date.UTC(year, month, day, hour, minute, second));

          if (!isNaN(date.getTime())) {
            // Double-check the date is correct
            if (date.getUTCFullYear() === year &&
              date.getUTCMonth() === month &&
              date.getUTCDate() === day) {
              return date;
            }
          }
        }
      }
    }

    // Handle dates with dashes or slashes (fallback for non-ISO formats)
    if (trimmed.includes('-') || trimmed.includes('/')) {
      const separator = trimmed.includes('-') ? '-' : '/';
      const parts = trimmed.split(separator).map(p => p.trim());

      if (parts.length === 3) {
        const part0 = parseInt(parts[0], 10);
        const part1 = parseInt(parts[1], 10);
        const part2 = parseInt(parts[2], 10);

        // Validate all parts are numbers
        if (!isNaN(part0) && !isNaN(part1) && !isNaN(part2)) {
          // For API dates, prioritize YYYY-MM-DD format
          if (part0.toString().length === 4) {
            // YYYY-MM-DD format: parts[0] = year, parts[1] = month, parts[2] = day
            const year = part0;
            const month = part1 - 1; // Month is 0-indexed
            const day = part2;

            // Validate date ranges (ensure year is reasonable - 2000-2100)
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000 && year <= 2100) {
              const date = new Date(Date.UTC(year, month, day));
              if (!isNaN(date.getTime())) {
                // Verify the date is correct
                if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
                  return date;
                }
              }
            }
          } else if (part2.toString().length === 4) {
            // DD-MM-YYYY format: parts[0] = day, parts[1] = month, parts[2] = year
            const day = part0;
            const month = part1 - 1;
            const year = part2;

            // Validate date ranges (ensure year is reasonable - 2000-2100)
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000 && year <= 2100) {
              const date = new Date(Date.UTC(year, month, day));
              if (!isNaN(date.getTime())) {
                // Verify the date is correct
                if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
                  return date;
                }
              }
            }
          }
        }
      }
    }

    // Try standard date parsing as fallback (but validate year)
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      // Validate the parsed date is reasonable (not in 1900s)
      const year = date.getUTCFullYear();
      if (year >= 2000 && year <= 2100) {
        return date;
      } else {
        // If year is in 1900s, it's likely a parsing error - reject it
        console.warn(`⚠️  Suspicious date year detected: ${year} for date string: ${trimmed} - rejecting`);
      }
    }
  }

  return undefined;
};

// Map Walk-in CSV data to Lead model
// CSV Fields: #, Date, Customer Name, Contact, Function Date, Staff, Status, Category, Sub Category, Repeat count, Remarks
export const mapWalkin = (row) => {
  // Handle different column name variations (including Excel column names)
  const phone = cleanPhone(
    row.phone || row.Phone || row.PHONE ||
    row.Contact || row.contact || row.CONTACT ||
    row["__EMPTY_2"] || row["Contact"] // Excel column name
  );
  if (!phone) return null;

  const name = (
    row.name || row.Name || row.NAME ||
    row["Customer Name"] || row["customer name"] || row["CUSTOMER NAME"] ||
    row.CustomerName || row.customerName ||
    row["__EMPTY_1"] || row["Customer Name"] // Excel column name
  )?.trim();

  if (!name) return null; // Name is required

  // Store is required - use from row or default
  const store = (
    row.store || row.Store || row.STORE ||
    row.StoreName || row.storeName
  )?.trim() || "Default Store"; // Default if not provided

  // Date field mapping (enquiryDate)
  const date = row.Date || row.date || row.DATE || row["Date"] ||
    row["__EMPTY"] || row["Date"]; // Excel column name

  // Function Date mapping
  const functionDate = (
    row["Function Date"] || row["function date"] || row["FUNCTION DATE"] ||
    row.functionDate || row.FunctionDate ||
    row["__EMPTY_3"] || row["Function Date"] // Excel column name
  );

  // Staff/Attended By
  const staff = (
    row.Staff || row.staff || row.STAFF ||
    row.attendedBy || row.AttendedBy ||
    row["__EMPTY_4"] || row["Staff"] // Excel column name
  )?.trim();

  // Status/Closing Status
  const status = (
    row.Status || row.status || row.STATUS ||
    row.closingStatus || row.ClosingStatus ||
    row["__EMPTY_5"] || row["Status"] // Excel column name
  )?.trim();

  // Category and Sub Category for enquiryType
  const category = (
    row.Category || row.category || row.CATEGORY ||
    row["__EMPTY_6"] || row["Category"] // Excel column name
  )?.trim();

  const subCategory = (
    row["Sub Category"] || row["sub category"] || row["SUB CATEGORY"] ||
    row.SubCategory || row.subCategory ||
    row["__EMPTY_7"] || row["Sub Category"] // Excel column name
  )?.trim();

  // Combine category and sub-category for enquiryType
  const enquiryType = [category, subCategory]
    .filter(Boolean)
    .join(" - ")
    .trim() || category || subCategory || "";

  // Remarks - check multiple possible column names and Excel variations
  // Excel columns: #, Date, Customer Name, Contact, Function Date, Staff, Status, Category, Sub Category, Repeat count, Remarks
  let remarksValue = "";

  // Try all possible column name variations
  const remarksFields = [
    row.remarks, row.Remarks, row.REMARKS,
    row["Remarks"], row["remarks"], row["REMARKS"],
    row.Notes, row.notes, row.NOTES,
    row["Notes"], row["notes"], row["NOTES"],
    row["Comment"], row["comment"], row["COMMENT"],
    row["Comments"], row["comments"], row["COMMENTS"],
    row["Other Comments"], row["other comments"], row["OTHER COMMENTS"],
    row["Additional Notes"], row["additional notes"],
    // Excel empty column variations (Remarks is typically around column 10-11)
    row["__EMPTY_9"], row["__EMPTY_10"], row["__EMPTY_11"], row["__EMPTY_12"]
  ];

  // Find first non-empty remarks value
  for (const field of remarksFields) {
    if (field !== null && field !== undefined && String(field).trim()) {
      remarksValue = String(field).trim();
      break;
    }
  }

  // If still empty, check all __EMPTY columns (Excel might have different column positions)
  if (!remarksValue) {
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith("__EMPTY") && value !== null && value !== undefined && String(value).trim()) {
        remarksValue = String(value).trim();
        break;
      }
    }
  }

  // If still empty, try to find any column that might contain remarks by checking column names
  if (!remarksValue) {
    for (const [key, value] of Object.entries(row)) {
      if (value && typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        // If column name suggests it's a remarks field
        if ((lowerKey.includes('remark') || lowerKey.includes('note') ||
          lowerKey.includes('comment') || lowerKey.includes('other')) &&
          String(value).trim().length > 0) {
          remarksValue = String(value).trim();
          break;
        }
      }
    }
  }

  const remarks = remarksValue || "";

  // Parse dates
  // Handle Excel date numbers
  let enquiryDateValue = date;
  if (enquiryDateValue && typeof enquiryDateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    enquiryDateValue = new Date(excelEpoch.getTime() + (enquiryDateValue - 2) * 24 * 60 * 60 * 1000);
  }

  let funcDateValue = functionDate;
  if (funcDateValue && typeof funcDateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    funcDateValue = new Date(excelEpoch.getTime() + (funcDateValue - 2) * 24 * 60 * 60 * 1000);
  }

  const parsedEnquiryDate = enquiryDateValue instanceof Date ? enquiryDateValue : parseDate(enquiryDateValue);
  const parsedFunctionDate = funcDateValue instanceof Date ? funcDateValue : parseDate(funcDateValue);

  // Set createdAt from enquiryDate (actual lead creation date from CSV, not import date)
  // IMPORTANT: Use the Date field from CSV as the creation date
  const createdAt = parsedEnquiryDate || undefined;

  // Determine if this is a Loss of Sale within the Walk-in report
  const isLoss = status && (status.toLowerCase().includes('loss') || status.toLowerCase().includes('lost'));
  const finalLeadType = isLoss ? "lossOfSale" : "general";

  // Build complete lead object with all fields
  const leadData = {
    // Required fields
    name: name,
    phone: phone,
    store: store,

    // Source and type (fixed for walk-in)
    source: isLoss ? "Loss of Sale" : "Walk-in",
    leadType: finalLeadType,

    // Enquiry information
    enquiryType: enquiryType || undefined,

    // Dates
    enquiryDate: parsedEnquiryDate,
    functionDate: parsedFunctionDate,
    visitDate: isLoss ? parsedEnquiryDate : undefined,

    // Status and tracking
    closingStatus: status || undefined,
    attendedBy: staff || undefined,

    // Additional information
    remarks: remarks || undefined,
    reasonCollectedFromStore: isLoss ? (category || subCategory || remarks) : undefined,
  };

  // Only add createdAt if we have a valid date (Mongoose will use it instead of current date)
  // This ensures createdAt reflects the actual lead creation date from CSV, not import date
  if (createdAt) {
    leadData.createdAt = createdAt;
  }

  // Remove undefined values to keep data clean
  Object.keys(leadData).forEach(key => {
    if (leadData[key] === undefined) {
      delete leadData[key];
    }
  });

  return leadData;
};

// Map Loss of Sale CSV data to Lead model
// CSV Fields: name, phone, store, source, enquiryType, leadType, reason, closingStatus, remarks
export const mapLossOfSale = (row) => {
  // Handle different column name variations (including Excel column names)
  const phone = cleanPhone(
    row.phone || row.Phone || row.PHONE ||
    row.customerPhone || row.CustomerPhone || row.Contact || row.contact ||
    row.NUMBER || row.Number || row["NUMBER"] || // Excel column name
    row["Contact"] || row["CONTACT"] // Excel column name variations
  );
  if (!phone) return null;

  const name = (
    row.name || row.Name || row.NAME ||
    row.customerName || row.CustomerName || row["Customer Name"] ||
    row["CUSTOMER NAME"] || row["customer name"] // Excel column name
  )?.trim();

  if (!name) return null; // Name is required

  // Store is required - use from row or default (should be set by import script)
  const store = (
    row.store || row.Store || row.STORE ||
    row.StoreName || row.storeName
  )?.trim() || "Default Store"; // Default if not provided

  // Source - use from CSV or default to "Loss of Sale"
  const source = (
    row.source || row.Source || row.SOURCE
  )?.trim() || "Loss of Sale";

  // Lead Type - use from CSV or default to "lossOfSale"
  const leadType = (
    row.leadType || row.LeadType || row["lead type"] || row["Lead Type"] || row.LEADTYPE
  )?.trim() || "lossOfSale";

  // Enquiry Type
  const enquiryType = (
    row.enquiryType || row.EnquiryType || row["enquiry type"] || row["Enquiry Type"] || row.ENQUIRYTYPE
  )?.trim();

  // Reason (specific to loss of sale - important field)
  const reason = (
    row.reason || row.Reason || row.REASON ||
    row["REASON"] // Excel column name
  )?.trim();

  // Closing Status
  const closingStatus = (
    row.closingStatus || row.ClosingStatus || row["closing status"] || row["Closing Status"] || row.CLOSINGSTATUS ||
    row.status || row.Status || row.STATUS
  )?.trim();

  // Remarks - combine multiple comment fields and check all possible variations
  let remarksValue = "";

  // Try all possible column name variations
  const remarksFields = [
    row.remarks, row.Remarks, row.REMARKS,
    row.notes, row.Notes, row.NOTES,
    row["Remarks"], row["remarks"], row["REMARKS"],
    row["Notes"], row["notes"], row["NOTES"],
    row["Comment"], row["comment"], row["COMMENT"],
    row["Comments"], row["comments"], row["COMMENTS"],
    row["Other Comments"], row["other comments"], row["OTHER COMMENTS"],
    row["Additional Notes"], row["additional notes"],
    row.COMMENTS, row["COMMENTS"],
    row["OTHER COMMENTS"], row["other comments"],
    // Excel empty column variations (check multiple positions)
    row["__EMPTY_8"], row["__EMPTY_9"], row["__EMPTY_10"], row["__EMPTY_11"], row["__EMPTY_12"]
  ];

  // Find first non-empty remarks value
  for (const field of remarksFields) {
    if (field && String(field).trim()) {
      remarksValue = String(field).trim();
      break;
    }
  }

  // If we have multiple comment fields, combine them
  if (row.COMMENTS && row["OTHER COMMENTS"]) {
    const comments = String(row.COMMENTS || '').trim();
    const otherComments = String(row["OTHER COMMENTS"] || '').trim();
    if (comments && otherComments) {
      remarksValue = `${comments} ${otherComments}`.trim();
    } else if (comments) {
      remarksValue = comments;
    } else if (otherComments) {
      remarksValue = otherComments;
    }
  }

  const remarks = remarksValue || "";

  // Attended By (Staff Name)
  const attendedBy = (
    row.attendedBy || row.AttendedBy || row.attended_by ||
    row["STAFF NAME"] || row["Staff Name"] || row.staffName || row.StaffName ||
    row.staff || row.Staff || row.STAFF
  )?.trim();

  // Date fields (if present in CSV)
  // Excel stores dates as numbers (days since 1900-01-01), convert to date
  // For loss of sale CSV, the "Date" field is typically the visit date (when customer visited store)
  let visitDateValue = row.visitDate || row.VisitDate || row["Visit Date"] || row["visit date"] ||
    row.Date || row.date || row.DATE; // Date field from CSV is the visit date

  // If it's an Excel date number, convert it
  if (visitDateValue && typeof visitDateValue === 'number') {
    // Excel date: days since 1900-01-01 (Excel incorrectly treats 1900 as leap year, so we use Dec 30, 1899 as epoch)
    // Subtract 2 days to account for Excel's leap year bug
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + (visitDateValue - 2) * 24 * 60 * 60 * 1000);
    visitDateValue = date; // Pass Date object directly
  }

  const visitDate = visitDateValue instanceof Date ? visitDateValue : parseDate(visitDateValue);

  let enquiryDateValue = row.enquiryDate || row["enquiry date"] || row["Enquiry Date"];

  // If it's an Excel date number, convert it
  if (enquiryDateValue && typeof enquiryDateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + (enquiryDateValue - 2) * 24 * 60 * 60 * 1000);
    enquiryDateValue = date; // Pass Date object directly
  }

  const enquiryDate = enquiryDateValue instanceof Date ? enquiryDateValue : parseDate(enquiryDateValue);

  let functionDateValue = row.functionDate || row["function date"] || row["Function Date"] ||
    row["functionDate"] || row.FunctionDate || row["FUNCTION DATE"];

  // If it's an Excel date number, convert it
  if (functionDateValue && typeof functionDateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + (functionDateValue - 2) * 24 * 60 * 60 * 1000);
    functionDateValue = date; // Pass Date object directly
  }

  const functionDate = functionDateValue instanceof Date ? functionDateValue : parseDate(functionDateValue);

  // Set createdAt from visitDate (Date field from CSV) or enquiryDate (actual lead creation date from CSV, not import date)
  // IMPORTANT: Use the Date field from CSV as the creation date
  // Priority: visitDate (Date field from CSV) -> enquiryDate
  const createdAt = visitDate || enquiryDate || undefined;

  // Build complete lead object with all fields
  const leadData = {
    // Required fields
    name: name,
    phone: phone,
    store: store,

    // Source and type
    source: source,
    leadType: leadType,

    // Enquiry information
    enquiryType: enquiryType || undefined,

    // Loss of Sale specific fields
    reason: reason || undefined,
    reasonCollectedFromStore: reason || undefined, // Map reason to reasonCollectedFromStore
    closingStatus: closingStatus || undefined,

    // Attended By (Staff Name)
    attendedBy: attendedBy || undefined,

    // Dates (if available)
    enquiryDate: enquiryDate || visitDate,
    functionDate: functionDate,
    visitDate: visitDate,

    // Additional information
    remarks: remarks || undefined,
  };

  // Only add createdAt if we have a valid date (Mongoose will use it instead of current date)
  // This ensures createdAt reflects the actual lead creation date from CSV, not import date
  if (createdAt) {
    leadData.createdAt = createdAt;
  }

  // Remove undefined values to keep data clean
  Object.keys(leadData).forEach(key => {
    if (leadData[key] === undefined) {
      delete leadData[key];
    }
  });

  return leadData;
};

// Map Booking API data to Lead model
export const mapBooking = (row) => {
  // Phone field: API uses 'phoneNo'
  const phone = cleanPhone(
    row.phoneNo || row.phone || row.Phone || row.customerPhone ||
    row.mobile || row.Mobile || row.contact || row.Contact
  );
  if (!phone) return null;

  // Parse dates
  const bookingDate = parseApiDate(row.bookingDate || row.booking_date);
  const enquiryDate = parseApiDate(row.enquiryDate || row.enquiry_date || row.date);
  const functionDate = parseApiDate(row.functionDate || row.eventDate || row.deliveryDate || row.trialDate || row.function_date);

  // Set createdAt from bookingDate or enquiryDate (actual lead creation date, not import date)
  // IMPORTANT: Use the earliest available date as the creation date
  const createdAt = bookingDate || enquiryDate || undefined;

  const leadData = {
    name: (row.name || row.Name || row.customerName || row.CustomerName || "").trim(),
    phone: phone,
    store: (row.store || row.Store || row.storeName || row.StoreName || row.location || row.Location || "").trim(),
    source: "Booking",
    leadType: "bookingConfirmation",
    enquiryType: (row.enquiryType || row.type || row.category || row.subCategory || "").trim(),
    bookingNo: (row.bookingNo || row.bookingNumber || row.BookingNo || "").trim(),
    // Security Amount: API uses 'price' field
    securityAmount: row.price || row.securityAmount || row.security || row.SecurityAmount || row.deposit
      ? parseFloat(row.price || row.securityAmount || row.security || row.SecurityAmount || row.deposit)
      : undefined,
    enquiryDate: enquiryDate,
    // Function Date: API uses 'deliveryDate' or 'trialDate'
    functionDate: functionDate,
    remarks: (row.remarks || row.notes || row.Remarks || "").trim(),
  };

  // Only add createdAt if we have a valid date (Mongoose will use it instead of current date)
  if (createdAt) {
    leadData.createdAt = createdAt;
  }

  return leadData;
};

// Map Return API data to Lead model
export const mapReturn = (row) => {
  // Phone field: API uses 'phoneNo'
  const phone = cleanPhone(
    row.phoneNo || row.phone || row.Phone || row.customerPhone ||
    row.mobile || row.Mobile || row.contact || row.Contact
  );
  if (!phone) return null;

  // Parse dates
  const returnDate = parseApiDate(row.returnDate || row.return_date || row.ReturnDate);
  const enquiryDate = parseApiDate(row.enquiryDate || row.enquiry_date || row.date);
  const functionDate = parseApiDate(row.functionDate || row.eventDate || row.deliveryDate || row.trialDate || row.function_date);

  // Set createdAt from returnDate or enquiryDate (actual lead creation date, not import date)
  // IMPORTANT: Use the earliest available date as the creation date
  const createdAt = returnDate || enquiryDate || undefined;

  const leadData = {
    name: (row.name || row.Name || row.customerName || row.CustomerName || "").trim(),
    phone: phone,
    store: (row.store || row.Store || row.storeName || row.StoreName || row.location || row.Location || "").trim(),
    source: "Return",
    leadType: "return",
    enquiryType: (row.enquiryType || row.type || row.category || row.subCategory || "").trim(),
    bookingNo: (row.bookingNo || row.bookingNumber || row.BookingNo || "").trim(),
    returnDate: returnDate,
    enquiryDate: enquiryDate,
    functionDate: functionDate,
    // Attended By: API uses 'bookingBy'
    attendedBy: (row.attendedBy || row.attended_by || row.staff || row.Staff || row.bookingBy || row.handledBy || "").trim() || undefined,
    remarks: (row.remarks || row.feedback || row.notes || row.Remarks || "").trim(),
  };

  // Only add createdAt if we have a valid date (Mongoose will use it instead of current date)
  if (createdAt) {
    leadData.createdAt = createdAt;
  }

  return leadData;
};

// Map Rent-Out API data to Lead model
export const mapRentOut = (row) => {
  // Phone field: API uses 'phoneNo'
  const phone = cleanPhone(
    row.phoneNo || row.phone || row.Phone || row.customerPhone ||
    row.mobile || row.Mobile || row.contact || row.Contact
  );
  if (!phone) return null;

  // Parse dates
  const rentOutDate = parseApiDate(row.rentOutDate || row.rentOut_date || row.rent_date);
  const enquiryDate = parseApiDate(row.enquiryDate || row.enquiry_date || row.rentDate);
  const returnDate = parseApiDate(row.returnDate || row.return_date || row.expectedReturnDate);
  const functionDate = parseApiDate(row.functionDate || row.eventDate || row.deliveryDate || row.trialDate || row.function_date);

  // Set createdAt from rentOutDate or enquiryDate (actual lead creation date, not import date)
  // IMPORTANT: Use the earliest available date as the creation date
  const createdAt = rentOutDate || enquiryDate || undefined;

  const leadData = {
    name: (row.name || row.Name || row.customerName || row.CustomerName || "").trim(),
    phone: phone,
    store: (row.store || row.Store || row.storeName || row.StoreName || row.location || row.Location || "").trim(),
    source: "Return",
    leadType: "rentOutFeedback",
    enquiryType: (row.enquiryType || row.type || row.category || row.subCategory || "").trim(),
    bookingNo: (row.bookingNo || row.bookingNumber || row.BookingNo || "").trim(),
    // Security Amount: API uses 'price' field
    securityAmount: row.price || row.securityAmount || row.security || row.SecurityAmount || row.deposit
      ? parseFloat(row.price || row.securityAmount || row.security || row.SecurityAmount || row.deposit)
      : undefined,
    returnDate: returnDate,
    enquiryDate: enquiryDate,
    functionDate: functionDate,
    // Attended By: API uses 'bookingBy'
    attendedBy: (row.attendedBy || row.attended_by || row.staff || row.Staff || row.bookingBy || row.handledBy || "").trim() || undefined,
    remarks: (row.remarks || row.feedback || row.notes || row.Remarks || "").trim(),
  };

  // Only add createdAt if we have a valid date (Mongoose will use it instead of current date)
  if (createdAt) {
    leadData.createdAt = createdAt;
  }

  return leadData;
};

// Map Booking Item API data to Lead model
export const mapBookingItem = (row) => {
  const phone = cleanPhone(row.phone || row.Phone || row.customerPhone || row.mobile || row.Mobile);
  if (!phone) return null;

  return {
    name: (row.name || row.Name || row.customerName || row.CustomerName || "").trim(),
    phone: phone,
    store: (row.store || row.Store || row.storeName || row.StoreName || "").trim(),
    source: "Booking Item",
    leadType: "bookingConfirmation",
    enquiryType: (row.enquiryType || row.itemType || row.type || "").trim(),
    bookingNo: (row.bookingNo || row.bookingNumber || row.itemNo || row.BookingNo || "").trim(),
    remarks: (row.remarks || row.status || row.notes || row.Remarks || "").trim(),
    enquiryDate: parseApiDate(row.enquiryDate || row.date || row.bookingDate),
  };
};

// Map User API data to User model
export const mapUser = (row) => {
  // Required fields - handle UserAuthentication API response format
  const employeeId = (
    row.userID || row.userId || row.UserID || row.UserId ||
    row.employeeId || row.EmployeeId || row.EMPLOYEE_ID ||
    row.empId || row.EmpId || row.id || row.Id
  )?.trim();

  if (!employeeId) return null; // Employee ID is required

  const name = (
    row.userName || row.UserName || row.USERNAME ||
    row.name || row.Name || row.NAME ||
    row.employeeName || row.EmployeeName || row.fullName || row.FullName
  )?.trim();

  if (!name) return null; // Name is required

  // Password - if plain text, it will be hashed in saveUserToMongo
  // Note: UserAuthentication API response doesn't include password, so we'll use a default
  // Password should be set separately or use the verify_employee API for login
  const password = (
    row.password || row.Password || row.PASSWORD ||
    row.pwd || row.Pwd
  )?.trim() || "defaultPassword123"; // Default password if not provided (should be changed)

  // Store is required - use from API response or provided store name
  const store = (
    row.storeName || row.StoreName || row.store || row.Store ||
    row.storeCode || row.StoreCode || row.STORE
  )?.trim() || "Default Store";

  // Phone (optional)
  const phone = cleanPhone(
    row.phone || row.Phone || row.PHONE ||
    row.mobile || row.Mobile || row.contact || row.Contact
  ) || "";

  // Role mapping based on roleID, userType, or isAdmin from UserAuthentication API
  let role = "telecaller";

  // Check isAdmin flag first
  if (row.isAdmin === 1 || row.isAdmin === true || row.isAdmin === "1") {
    role = "admin";
  } else {
    // Check roleID or userType
    const roleID = row.roleID || row.roleId || row.role || row.Role;
    const userType = row.userType || row.UserType;

    // Map roleID/userType to our roles
    // You may need to adjust these mappings based on your API's role IDs
    if (roleID === 1 || userType === 1 || roleID === "1" || userType === "1") {
      role = "admin";
    } else if (roleID === 2 || userType === 2 || roleID === "2" || userType === "2") {
      role = "teamLead";
    } else {
      // Try text-based role mapping
      const roleFromAPI = (
        row.role || row.Role || row.ROLE ||
        row.userRole || row.UserRole || row.designation || row.Designation
      )?.toLowerCase()?.trim();

      if (roleFromAPI) {
        if (roleFromAPI.includes("admin") || roleFromAPI === "admin") {
          role = "admin";
        } else if (roleFromAPI.includes("lead") || roleFromAPI.includes("team") || roleFromAPI === "teamlead") {
          role = "teamLead";
        } else {
          role = "telecaller";
        }
      }
    }
  }

  // isActive (default to true)
  const isActive = row.isActive !== undefined
    ? row.isActive
    : (row.active !== undefined ? row.active : true);

  return {
    employeeId,
    name,
    password, // Will be hashed in saveUserToMongo if plain text
    store,
    phone,
    role,
    isActive,
  };
};

