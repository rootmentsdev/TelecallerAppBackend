import Lead from "../models/Lead.js";
import Report from "../models/Report.js";

// Helper function to check access permissions
const checkAccess = (lead, user) => {
  if (user.role === "admin") return true;
  if (user.role === "telecaller" && lead.assignedTo?.toString() !== user._id.toString()) {
    return false;
  }
  if (user.role === "teamLead" && lead.store !== user.store) {
    return false;
  }
  return true;
};

// Helper function to build query filters based on user role
const buildLeadQuery = (user, filters = {}) => {
  const query = { ...filters };

  // Apply role-based filtering
  if (user.role === "admin") {
    // Admin can see all leads
  } else if (user.role === "teamLead") {
    // Team Lead can see leads in their store.
    // Use case-insensitive regex for both the teamLead's store and the provided store filter
    const escapeRegex = (s) => (s || '').replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

    if (query.$or) {
      // If $or exists (from store filter with " - " pattern), we need to combine it with teamLead's store filter
      const userStoreRegex = { $regex: escapeRegex(user.store), $options: 'i' };
      
      // Each $or condition needs to also match the teamLead's store
      const updatedOrConditions = query.$or.map(condition => {
        // Each condition in $or should be combined with teamLead's store using $and
        return {
          $and: [
            { store: userStoreRegex },
            condition
          ]
        };
      });
      
      query.$or = updatedOrConditions;
      // Remove $or from filters if it was the only store-related filter
    } else if (query.store) {
      // Provided store filter may already be a regex object; keep it if so, otherwise build a regex
      const providedStoreFilter = typeof query.store === 'string'
        ? { $regex: escapeRegex(query.store), $options: 'i' }
        : query.store;

      const userStoreRegex = { $regex: escapeRegex(user.store), $options: 'i' };

      // Combine both as $and so results must match teamLead's store and the provided filter
      query.$and = [{ store: userStoreRegex }, { store: providedStoreFilter }];
      delete query.store;
    } else {
      query.store = { $regex: escapeRegex(user.store), $options: 'i' };
    }
  } else if (user.role === "telecaller") {
    // Telecaller can see only assigned leads
    query.assignedTo = user._id;
  }

  return query;
};

// Helper to build flattened lead object matching the leads list API format
const buildListSnapshot = (lead) => {
  return {
    id: lead._id,
    lead_name: lead.name,
    phone_number: lead.phone,
    store: lead.store,
    lead_type: lead.leadType,
    call_status: lead.callStatus,
    lead_status: lead.leadStatus,
    function_date: lead.functionDate,
    enquiry_date: lead.enquiryDate,
    created_at: lead.createdAt,
    assigned_to: lead.assignedTo && typeof lead.assignedTo === 'object' ? {
      id: lead.assignedTo._id,
      name: lead.assignedTo.name,
      employee_id: lead.assignedTo.employeeId
    } : null,
    reason_collected_from_store: lead.reasonCollectedFromStore || null,
    attended_by: lead.attendedBy || null,
    booking_number: lead.bookingNo || null,
    visit_date: lead.visitDate || null,
    return_date: lead.returnDate || null,
    security_amount: lead.securityAmount || null
  };
};

// ==================== Leads Listing ====================

// GET - Fetch list of leads (for listing pages)
export const getLeads = async (req, res) => {
  try {
    const { 
      leadType, 
      callStatus, 
      leadStatus, 
      store, 
      source, 
      page = 1, 
      limit = 100, // Increased default limit from 50 to 100
      // Date filtering parameters
      enquiryDateFrom,
      enquiryDateTo,
      functionDateFrom,
      functionDateTo,
      visitDateFrom,
      visitDateTo,
      // Generic date range (applies to enquiryDate by default)
      dateFrom,
      dateTo,
      dateField = 'enquiryDate' // Which date field to filter: enquiryDate, functionDate, visitDate, createdAt
    } = req.query;
    
    const filters = {};
    if (leadType) filters.leadType = leadType;
    if (callStatus) filters.callStatus = callStatus;
    if (leadStatus) filters.leadStatus = leadStatus;
    if (store) {
      // Use case-insensitive partial match for store so callers can pass:
      // - Full format: "Suitor Guy - Kottayam", "Zorucci - Edappally"
      // - Location-only: "Kottayam", "Edappally"
      // - Brand-only: "Suitor Guy", "Zorucci"
      const escaped = store.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      
      // Check if store contains " - " pattern (e.g., "Suitor Guy - Kottayam")
      if (store.includes(' - ')) {
        // Extract both brand part (before " - ") and location part (after " - ")
        const parts = store.split(' - ').map(p => p.trim());
        const brandPart = parts[0];
        const locationPart = parts[parts.length - 1]; // Get last part in case of multiple dashes
        
        const escapedBrand = brandPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const escapedLocation = locationPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        
        // Match either:
        // 1. The full term (e.g., "Suitor Guy - Kottayam")
        // 2. Just the location part (e.g., "Kottayam")
        // 3. Just the brand part (e.g., "Suitor Guy")
        filters.$or = [
          { store: { $regex: escaped, $options: 'i' } },
          { store: { $regex: escapedLocation, $options: 'i' } },
          { store: { $regex: escapedBrand, $options: 'i' } }
        ];
      } else {
        // Simple regex match for single term (could be brand or location)
        filters.store = { $regex: escaped, $options: 'i' };
      }
    }
    if (source) filters.source = source;

    // Date filtering logic
    // Priority: specific date fields > generic date range
    if (enquiryDateFrom || enquiryDateTo) {
      filters.enquiryDate = {};
      if (enquiryDateFrom) {
        filters.enquiryDate.$gte = new Date(enquiryDateFrom);
      }
      if (enquiryDateTo) {
        // Set to end of day for inclusive range
        const endDate = new Date(enquiryDateTo);
        endDate.setHours(23, 59, 59, 999);
        filters.enquiryDate.$lte = endDate;
      }
    }

    if (functionDateFrom || functionDateTo) {
      filters.functionDate = {};
      if (functionDateFrom) {
        filters.functionDate.$gte = new Date(functionDateFrom);
      }
      if (functionDateTo) {
        const endDate = new Date(functionDateTo);
        endDate.setHours(23, 59, 59, 999);
        filters.functionDate.$lte = endDate;
      }
    }

    if (visitDateFrom || visitDateTo) {
      filters.visitDate = {};
      if (visitDateFrom) {
        filters.visitDate.$gte = new Date(visitDateFrom);
      }
      if (visitDateTo) {
        const endDate = new Date(visitDateTo);
        endDate.setHours(23, 59, 59, 999);
        filters.visitDate.$lte = endDate;
      }
    }

    // Generic date range (if specific fields not provided)
    if ((dateFrom || dateTo) && !enquiryDateFrom && !enquiryDateTo && !functionDateFrom && !functionDateTo && !visitDateFrom && !visitDateTo) {
      const dateFieldName = dateField === 'functionDate' ? 'functionDate' : 
                           dateField === 'visitDate' ? 'visitDate' : 
                           dateField === 'createdAt' ? 'createdAt' : 
                           'enquiryDate';
      
      filters[dateFieldName] = {};
      if (dateFrom) {
        filters[dateFieldName].$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filters[dateFieldName].$lte = endDate;
      }
    }

    const query = buildLeadQuery(req.user, filters);

    // Temporary debug log: show who called the endpoint and the resolved Mongo query
    try {
      console.log("[DEBUG getLeads] user:", {
        id: req.user?._id?.toString(),
        role: req.user?.role,
        userStore: req.user?.store,
      }, "queryParams:", req.query, "resolvedQuery:", query);
    } catch (e) {
      // swallow any logging errors
      console.log("[DEBUG getLeads] failed to log user/query", e.message);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Select fields based on lead type for better data retrieval
    const selectFields = "name phone store leadType callStatus leadStatus bookingNo functionDate enquiryDate visitDate returnDate createdAt assignedTo reasonCollectedFromStore attendedBy";
    
    const leads = await Lead.find(query)
      .populate("assignedTo", "name employeeId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(selectFields);

    const total = await Lead.countDocuments(query);

    // Map to API response format with type-specific fields
    const mappedLeads = leads.map(lead => {
      const baseLead = {
        id: lead._id,
        lead_name: lead.name,
        phone_number: lead.phone,
        store: lead.store,
        lead_type: lead.leadType,
        call_status: lead.callStatus,
        lead_status: lead.leadStatus,
        function_date: lead.functionDate,
        enquiry_date: lead.enquiryDate,
        created_at: lead.createdAt,
        assigned_to: lead.assignedTo ? {
          id: lead.assignedTo._id,
          name: lead.assignedTo.name,
          employee_id: lead.assignedTo.employeeId
        } : null
      };

      // Add type-specific fields
      if (lead.leadType === "lossOfSale") {
        baseLead.visit_date = lead.visitDate;
        baseLead.reason_collected_from_store = lead.reasonCollectedFromStore;
        baseLead.attended_by = lead.attendedBy;
      } else if (lead.leadType === "rentOutFeedback") {
        baseLead.booking_number = lead.bookingNo;
        baseLead.return_date = lead.returnDate;
        baseLead.attended_by = lead.attendedBy;
      } else if (lead.leadType === "bookingConfirmation") {
        baseLead.booking_number = lead.bookingNo;
      }

      return baseLead;
    });

    res.json({
      leads: mappedLeads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Loss of Sale Page ====================

// GET - Fetch Loss of Sale lead data (GET fields only)
export const getLossOfSaleLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Return only GET fields
    res.json({
      lead_name: lead.name,
      phone_number: lead.phone,
      visit_date: lead.visitDate || lead.enquiryDate,
      function_date: lead.functionDate,
      attended_by: lead.attendedBy,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Update Loss of Sale lead data (POST fields only)
export const updateLossOfSaleLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { call_status, lead_status, follow_up_date, reason_collected_from_store, remarks } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updateData = {};
    if (call_status !== undefined) updateData.callStatus = call_status;
    if (lead_status !== undefined) updateData.leadStatus = lead_status;
    if (follow_up_date !== undefined) updateData.followUpDate = follow_up_date;
    if (reason_collected_from_store !== undefined) updateData.reasonCollectedFromStore = reason_collected_from_store;
    if (remarks !== undefined) updateData.remarks = remarks;

    if (!lead.leadType || lead.leadType === "general") {
      updateData.leadType = "lossOfSale";
    }

    // Capture full snapshot before update
    const beforeLead = lead.toObject();

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    // Build detailed changedFields (before/after) for only the updated keys
    const changedFields = {};
    Object.keys(updateData).forEach((key) => {
      changedFields[key] = {
        before: beforeLead[key],
        after: updatedLead[key],
      };
    });

    const report = await Report.create({
      originalLeadId: beforeLead._id,
      beforeSnapshot: beforeLead,
      leadSnapshot: updatedLead.toObject(), // full details after edit
      listSnapshot: buildListSnapshot(updatedLead),
      leadType: updatedLead.leadType,
      editedBy: req.user._id,
      changedFields,
      note: "moved after edit",
    });

    // Remove the lead from active collection
    await Lead.findByIdAndDelete(id);

    res.json({ message: "Loss of Sale lead updated and moved to reports", report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Rent-Out Page ====================

// GET - Fetch Rent-Out lead data (GET fields only)
export const getRentOutLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Return only GET fields
    // For return_date, use returnDate if available, otherwise it will be null (item not returned yet)
    res.json({
      lead_name: lead.name,
      phone_number: lead.phone,
      booking_number: lead.bookingNo,
      return_date: lead.returnDate || null, // null is valid for items not yet returned
      attended_by: lead.attendedBy || null, // Optional field, may be empty
      security_amount: lead.securityAmount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Update Rent-Out lead data (POST fields only)
export const updateRentOutLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { call_status, lead_status, follow_up_flag, call_date, rating, remarks } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updateData = {};
    if (call_status !== undefined) updateData.callStatus = call_status;
    if (lead_status !== undefined) updateData.leadStatus = lead_status;
    if (follow_up_flag !== undefined) {
      updateData.followUpFlag = follow_up_flag;
      if (follow_up_flag && !lead.followUpDate) {
        updateData.followUpDate = new Date();
      }
    }
    if (call_date !== undefined) updateData.callDate = call_date;
    if (rating !== undefined) updateData.rating = rating;
    if (remarks !== undefined) updateData.remarks = remarks;

    if (!lead.leadType || lead.leadType === "general") {
      updateData.leadType = "rentOutFeedback";
    }

    const beforeLead = lead.toObject();

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    const changedFields = {};
    Object.keys(updateData).forEach((key) => {
      changedFields[key] = {
        before: beforeLead[key],
        after: updatedLead[key],
      };
    });

    const report = await Report.create({
      originalLeadId: beforeLead._id,
      beforeSnapshot: beforeLead,
      leadSnapshot: updatedLead.toObject(),
      listSnapshot: buildListSnapshot(updatedLead),
      leadType: updatedLead.leadType,
      editedBy: req.user._id,
      changedFields,
      note: "moved after edit",
    });

    await Lead.findByIdAndDelete(id);

    res.json({ message: "Rent-Out lead updated and moved to reports", report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Booking Confirmation Page ====================

// GET - Fetch Booking Confirmation lead data (GET fields only)
export const getBookingConfirmationLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Return only GET fields
    res.json({
      lead_name: lead.name,
      phone_number: lead.phone,
      enquiry_date: lead.enquiryDate,
      function_date: lead.functionDate,
      booking_number: lead.bookingNo,
      security_amount: lead.securityAmount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Update Booking Confirmation lead data (POST fields only)
export const updateBookingConfirmationLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { call_status, lead_status, follow_up_flag, call_date, remarks } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updateData = {};
    if (call_status !== undefined) updateData.callStatus = call_status;
    if (lead_status !== undefined) updateData.leadStatus = lead_status;
    if (follow_up_flag !== undefined) {
      updateData.followUpFlag = follow_up_flag;
      if (follow_up_flag && !lead.followUpDate) {
        updateData.followUpDate = new Date();
      }
    }
    if (call_date !== undefined) updateData.callDate = call_date;
    if (remarks !== undefined) updateData.remarks = remarks;

    if (!lead.leadType || lead.leadType === "general") {
      updateData.leadType = "bookingConfirmation";
    }

    const beforeLead = lead.toObject();

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    const changedFields = {};
    Object.keys(updateData).forEach((key) => {
      changedFields[key] = {
        before: beforeLead[key],
        after: updatedLead[key],
      };
    });

    const report = await Report.create({
      originalLeadId: beforeLead._id,
      beforeSnapshot: beforeLead,
      leadSnapshot: updatedLead.toObject(),
      listSnapshot: buildListSnapshot(updatedLead),
      leadType: updatedLead.leadType,
      editedBy: req.user._id,
      changedFields,
      note: "moved after edit",
    });

    await Lead.findByIdAndDelete(id);

    res.json({ message: "Booking Confirmation lead updated and moved to reports", report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Just Dial Page ====================

// GET - Fetch Just Dial lead data (GET fields only)
export const getJustDialLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Return only GET fields
    res.json({
      lead_name: lead.name,
      phone_number: lead.phone,
      enquiry_date: lead.enquiryDate,
      function_date: lead.functionDate,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Update Just Dial lead data (POST fields only)
export const updateJustDialLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { call_status, lead_status, closing_status, reason, follow_up_flag, call_date, remarks } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updateData = {};
    if (call_status !== undefined) updateData.callStatus = call_status;
    if (lead_status !== undefined) updateData.leadStatus = lead_status;
    if (closing_status !== undefined) updateData.closingStatus = closing_status;
    if (reason !== undefined) updateData.reason = reason;
    if (follow_up_flag !== undefined) {
      updateData.followUpFlag = follow_up_flag;
      if (follow_up_flag && !lead.followUpDate) {
        updateData.followUpDate = new Date();
      }
    }
    if (call_date !== undefined) updateData.callDate = call_date;
    if (remarks !== undefined) updateData.remarks = remarks;

    if (!lead.leadType || lead.leadType === "general") {
      updateData.leadType = "justDial";
    }

    const beforeLead = lead.toObject();

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    const changedFields = {};
    Object.keys(updateData).forEach((key) => {
      changedFields[key] = {
        before: beforeLead[key],
        after: updatedLead[key],
      };
    });

    const report = await Report.create({
      originalLeadId: beforeLead._id,
      beforeSnapshot: beforeLead,
      leadSnapshot: updatedLead.toObject(),
      listSnapshot: buildListSnapshot(updatedLead),
      leadType: updatedLead.leadType,
      editedBy: req.user._id,
      changedFields,
      note: "moved after edit",
    });

    await Lead.findByIdAndDelete(id);

    res.json({ message: "Just Dial lead updated and moved to reports", report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== Add Lead Page ====================

// POST - Create new lead (All fields are POST)
export const createAddLead = async (req, res) => {
  try {
    const { customer_name, phone_number, brand, store_location, lead_status, call_status, follow_up_date } = req.body;

    // Check if lead with same phone number already exists
    const existingLead = await Lead.findOne({ phone: phone_number });
    if (existingLead) {
      return res.status(400).json({
        message: "Lead with this phone number already exists",
        existingLeadId: existingLead._id,
      });
    }

    // Clean and deduplicate brand/store values to avoid "Brand - Brand - Location" issues
    const brandClean = (brand || '').trim();
    let storeLocationClean = (store_location || '').trim();

    if (brandClean) {
      // If store_location already starts with the brand (e.g. "Brand - Location"), remove the duplicate prefix
      const escapedBrand = brandClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const brandPrefixRegex = new RegExp(`^${escapedBrand}\\s*-\\s*`, 'i');
      if (brandPrefixRegex.test(storeLocationClean)) {
        storeLocationClean = storeLocationClean.replace(brandPrefixRegex, '').trim();
      }
    }

    const storeValue = brandClean
      ? (storeLocationClean ? `${brandClean} - ${storeLocationClean}` : brandClean)
      : storeLocationClean;

    const lead = await Lead.create({
      name: customer_name,
      phone: phone_number,
      brand: brandClean,
      store: storeValue,
      leadStatus: lead_status || "No Status",
      callStatus: call_status || "Not Called",
      followUpDate: follow_up_date,
      createdBy: req.user._id,
      leadType: "general",
    });

    res.status(201).json({
      message: "Lead created successfully",
      lead: {
        id: lead._id,
        customer_name: lead.name,
        phone_number: lead.phone,
        brand: lead.brand,
        store_location: lead.store,
        lead_status: lead.leadStatus,
        call_status: lead.callStatus,
        follow_up_date: lead.followUpDate,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH - Generic update for any lead (useful for 'general' leadType)
export const updateGenericLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      call_status,
      lead_status,
      follow_up_flag,
      follow_up_date,
      call_date,
      reason_collected_from_store,
      remarks,
      closing_status,
      rating
    } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData = {};
    if (call_status !== undefined) updateData.callStatus = call_status;
    if (lead_status !== undefined) updateData.leadStatus = lead_status;
    if (follow_up_flag !== undefined) {
      updateData.followUpFlag = follow_up_flag;
      if (follow_up_flag && !lead.followUpDate) {
        updateData.followUpDate = new Date();
      }
    }
    if (follow_up_date !== undefined) updateData.followUpDate = follow_up_date;
    if (call_date !== undefined) updateData.callDate = call_date;
    if (reason_collected_from_store !== undefined) updateData.reasonCollectedFromStore = reason_collected_from_store;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (closing_status !== undefined) updateData.closingStatus = closing_status;
    if (rating !== undefined) updateData.rating = rating;

    // If lead was general and client intends to keep it general, don't overwrite leadType.
    // If you want to change leadType, frontend can call a specific endpoint or include lead_type in body.

    // Capture before snapshot
    const beforeLead = lead.toObject();

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    // Build changedFields
    const changedFields = {};
    Object.keys(updateData).forEach((key) => {
      changedFields[key] = { before: beforeLead[key], after: updatedLead[key] };
    });

    const report = await Report.create({
      originalLeadId: beforeLead._id,
      beforeSnapshot: beforeLead,
      leadSnapshot: updatedLead.toObject(),
      listSnapshot: buildListSnapshot(updatedLead),
      leadType: updatedLead.leadType,
      editedBy: req.user._id,
      changedFields,
      note: 'moved after edit',
    });

    await Lead.findByIdAndDelete(id);

    res.json({ message: 'Lead updated and moved to reports', report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET - Generic fetch lead by id (returns flattened list format)
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id).populate('assignedTo', 'name employeeId');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (!checkAccess(lead, req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const list = buildListSnapshot(lead);

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
