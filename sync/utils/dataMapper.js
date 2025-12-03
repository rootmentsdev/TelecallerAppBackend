// Helper function to clean phone number (keep only digits)
const cleanPhone = (phone) => {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, "");
  return cleaned.length === 10 ? cleaned : null;
};

// Helper function to parse date
const parseDate = (dateStr) => {
  if (!dateStr) return undefined;
  
  // Handle DD-MM-YYYY format (common in Indian date formats)
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // Try DD-MM-YYYY format
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }
  
  // Try standard date parsing
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
};

// Map Walk-in CSV data to Lead model
// CSV Fields: #, Date, Customer Name, Contact, Function Date, Staff, Status, Category, Sub Category, Repeat count, Remarks
export const mapWalkin = (row) => {
  // Handle different column name variations
  const phone = cleanPhone(
    row.phone || row.Phone || row.PHONE || 
    row.Contact || row.contact || row.CONTACT
  );
  if (!phone) return null;

  const name = (
    row.name || row.Name || row.NAME || 
    row["Customer Name"] || row["customer name"] || row["CUSTOMER NAME"] ||
    row.CustomerName || row.customerName
  )?.trim();

  if (!name) return null; // Name is required

  // Store is required - use from row or default
  const store = (
    row.store || row.Store || row.STORE || 
    row.StoreName || row.storeName
  )?.trim() || "Default Store"; // Default if not provided

  // Date field mapping (enquiryDate)
  const date = row.Date || row.date || row.DATE || row["Date"];
  
  // Function Date mapping
  const functionDate = (
    row["Function Date"] || row["function date"] || row["FUNCTION DATE"] ||
    row.functionDate || row.FunctionDate
  );

  // Staff/Attended By
  const staff = (
    row.Staff || row.staff || row.STAFF ||
    row.attendedBy || row.AttendedBy
  )?.trim();

  // Status/Closing Status
  const status = (
    row.Status || row.status || row.STATUS ||
    row.closingStatus || row.ClosingStatus
  )?.trim();

  // Category and Sub Category for enquiryType
  const category = (
    row.Category || row.category || row.CATEGORY
  )?.trim();
  
  const subCategory = (
    row["Sub Category"] || row["sub category"] || row["SUB CATEGORY"] ||
    row.SubCategory || row.subCategory
  )?.trim();

  // Combine category and sub-category for enquiryType
  const enquiryType = [category, subCategory]
    .filter(Boolean)
    .join(" - ")
    .trim() || category || subCategory || "";

  // Remarks
  const remarks = (
    row.remarks || row.Remarks || row.REMARKS ||
    row.Notes || row.notes
  )?.trim() || "";

  // Build complete lead object with all fields
  const leadData = {
    // Required fields
    name: name,
    phone: phone,
    store: store,
    
    // Source and type (fixed for walk-in)
    source: "Walk-in",
    leadType: "general",
    
    // Enquiry information
    enquiryType: enquiryType || undefined,
    
    // Dates
    enquiryDate: parseDate(date),
    functionDate: parseDate(functionDate),
    
    // Status and tracking
    closingStatus: status || undefined,
    attendedBy: staff || undefined,
    
    // Additional information
    remarks: remarks || undefined,
  };

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
  // Handle different column name variations
  const phone = cleanPhone(
    row.phone || row.Phone || row.PHONE || 
    row.customerPhone || row.CustomerPhone || row.Contact || row.contact
  );
  if (!phone) return null;

  const name = (
    row.name || row.Name || row.NAME || 
    row.customerName || row.CustomerName || row["Customer Name"]
  )?.trim();

  if (!name) return null; // Name is required

  // Store is required - use from row or default
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
    row.reason || row.Reason || row.REASON
  )?.trim();

  // Closing Status
  const closingStatus = (
    row.closingStatus || row.ClosingStatus || row["closing status"] || row["Closing Status"] || row.CLOSINGSTATUS ||
    row.status || row.Status || row.STATUS
  )?.trim();

  // Remarks
  const remarks = (
    row.remarks || row.Remarks || row.REMARKS || row.notes || row.Notes
  )?.trim() || "";

  // Date fields (if present in CSV)
  const enquiryDate = parseDate(
    row.enquiryDate || row["enquiry date"] || row["Enquiry Date"] ||
    row.date || row.Date || row.DATE
  );

  const functionDate = parseDate(
    row.functionDate || row["function date"] || row["Function Date"] ||
    row["functionDate"] || row.FunctionDate
  );

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
    closingStatus: closingStatus || undefined,
    
    // Dates (if available)
    enquiryDate: enquiryDate,
    functionDate: functionDate,
    
    // Additional information
    remarks: remarks || undefined,
  };

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
  const phone = cleanPhone(row.phone || row.Phone || row.customerPhone || row.mobile || row.Mobile);
  if (!phone) return null;

  return {
    name: (row.name || row.Name || row.customerName || row.CustomerName || "").trim(),
    phone: phone,
    store: (row.store || row.Store || row.storeName || row.StoreName || "").trim(),
    source: "Booking",
    leadType: "bookingConfirmation",
    enquiryType: (row.enquiryType || row.type || "").trim(),
    bookingNo: (row.bookingNo || row.bookingNumber || row.BookingNo || "").trim(),
    securityAmount: row.securityAmount || row.security || row.SecurityAmount ? parseFloat(row.securityAmount || row.security || row.SecurityAmount) : undefined,
    enquiryDate: parseDate(row.enquiryDate || row.bookingDate || row.date),
    functionDate: parseDate(row.functionDate || row.eventDate || row.function_date),
    remarks: (row.remarks || row.notes || row.Remarks || "").trim(),
  };
};

// Map Rent-Out API data to Lead model
export const mapRentOut = (row) => {
  const phone = cleanPhone(row.phone || row.Phone || row.customerPhone || row.mobile || row.Mobile);
  if (!phone) return null;

  return {
    name: (row.name || row.Name || row.customerName || row.CustomerName || "").trim(),
    phone: phone,
    store: (row.store || row.Store || row.storeName || row.StoreName || "").trim(),
    source: "Rent-out",
    leadType: "rentOutFeedback",
    enquiryType: (row.enquiryType || row.type || "").trim(),
    bookingNo: (row.bookingNo || row.bookingNumber || row.BookingNo || "").trim(),
    securityAmount: row.securityAmount || row.security || row.SecurityAmount ? parseFloat(row.securityAmount || row.security || row.SecurityAmount) : undefined,
    returnDate: parseDate(row.returnDate || row.return_date || row.returnDate),
    enquiryDate: parseDate(row.enquiryDate || row.rentDate || row.rent_date),
    functionDate: parseDate(row.functionDate || row.eventDate || row.function_date),
    remarks: (row.remarks || row.feedback || row.notes || row.Remarks || "").trim(),
  };
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
    enquiryDate: parseDate(row.enquiryDate || row.date || row.bookingDate),
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

