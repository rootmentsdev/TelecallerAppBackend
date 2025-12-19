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
        // Handle both simple store conditions and $and conditions
        if (condition.store) {
          // Simple store condition: combine with teamLead's store
          return {
            $and: [
              { store: userStoreRegex },
              condition
            ]
          };
        } else if (condition.$and) {
          // $and condition: add teamLead's store to the $and array
          return {
            $and: [
              { store: userStoreRegex },
              ...condition.$and
            ]
          };
        } else {
          // Other condition types: just add teamLead's store requirement
          return {
            $and: [
              { store: userStoreRegex },
              condition
            ]
          };
        }
      });

      query.$or = updatedOrConditions;
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

// Helper to create a Report entry from a Lead document using a completely flat structure
const createReportFromLead = async (leadDoc, userId, note = 'moved after edit', editedFields = null) => {
  // Normalize lead object
  const lead = (leadDoc && typeof leadDoc.toObject === 'function') ? leadDoc.toObject() : (leadDoc || {});

  // Utility: camelCase to snake_case
  const toSnake = (s) => s.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();

  const payload = {};

  // Core mappings (common lead fields)
  if (lead._id) payload.id = String(lead._id);
  payload.lead_name = lead.name ?? "";
  payload.phone_number = lead.phone ?? "";
  payload.store = lead.store ?? "";
  payload.lead_type = lead.leadType ?? lead.lead_type ?? "";
  payload.call_status = lead.callStatus ?? lead.call_status ?? "";
  payload.lead_status = lead.leadStatus ?? lead.lead_status ?? "";
  payload.function_date = lead.functionDate ?? lead.function_date ?? null;
  payload.enquiry_date = lead.enquiryDate ?? lead.enquiry_date ?? null;
  payload.visit_date = lead.visitDate ?? lead.visit_date ?? null;
  payload.return_date = lead.returnDate ?? lead.return_date ?? null;
  payload.created_at = lead.createdAt ?? lead.created_at ?? null;
  payload.assigned_to = (lead.assignedTo !== undefined) ? lead.assignedTo : (lead.assigned_to !== undefined ? lead.assigned_to : null);
  payload.attended_by = lead.attendedBy ?? lead.attended_by ?? "";
  payload.booking_number = lead.bookingNo ?? lead.booking_number ?? null;
  payload.security_amount = lead.securityAmount ?? lead.security_amount ?? null;
  payload.remarks = lead.remarks ?? "";
  payload.reason_collected_from_store = lead.reasonCollectedFromStore ?? lead.reason_collected_from_store ?? "";

  // Also copy any other top-level lead properties dynamically (convert camelCase -> snake_case)
  Object.keys(lead).forEach((k) => {
    if (['id', '_id', 'name', 'phone', 'store', 'leadType', 'lead_type', 'callStatus', 'call_status', 'leadStatus', 'lead_status', 'functionDate', 'function_date', 'enquiryDate', 'enquiry_date', 'visitDate', 'visit_date', 'returnDate', 'return_date', 'createdAt', 'created_at', 'assignedTo', 'assigned_to', 'attendedBy', 'attended_by', 'bookingNo', 'booking_number', 'securityAmount', 'security_amount', 'remarks', 'reasonCollectedFromStore', 'reason_collected_from_store'].includes(k)) return;
    const snake = toSnake(k);
    // Only set if not already set by core mappings
    if (payload[snake] === undefined) payload[snake] = lead[k];
  });

  // Attach edited before/after fields for every changed key
  if (editedFields && typeof editedFields === 'object') {
    Object.keys(editedFields).forEach((origKey) => {
      const beforeVal = editedFields[origKey]?.before;
      const afterVal = editedFields[origKey]?.after;

      const snakeKey = toSnake(origKey);

      // Set <field>_before and <field>_after
      payload[`${snakeKey}_before`] = (beforeVal === undefined || beforeVal === null) ? "" : beforeVal;
      payload[`${snakeKey}_after`] = (afterVal === undefined || afterVal === null) ? "" : afterVal;

      // Also ensure the canonical field is present and reflects the "after" value (or existing payload)
      if (afterVal !== undefined) {
        // If field maps to a date field in payload (ends with _date), try to preserve type
        if (snakeKey.endsWith('date')) payload[snakeKey] = afterVal;
        else payload[snakeKey] = afterVal;
      } else if (payload[snakeKey] === undefined) {
        payload[snakeKey] = payload[snakeKey] ?? "";
      }
    });
  }

  // Metadata
  payload.editedBy = userId;
  payload.editedAt = new Date();
  payload.note = note;

  // Create the report document (schema allows dynamic fields via strict:false)
  const report = await Report.create(payload);

  // Ensure report_id field is set to the saved _id string
  try {
    await Report.findByIdAndUpdate(report._id, { $set: { report_id: String(report._id) } });
  } catch (e) {
    // ignore
  }

  return await Report.findById(report._id);
};

// ==================== Leads Listing ====================

// GET - Fetch list of leads (for listing pages)
export const getLeads = async (req, res) => {
  try {
    // Normalize query parameters (handle snake_case aliases)
    const normalizedQuery = { ...req.query };

    // Mapping of snake_case query params to their camelCase equivalents
    const paramAliases = {
      'lead_type': 'leadType',
      'call_status': 'callStatus',
      'lead_status': 'leadStatus',
      'enquiry_date_from': 'enquiryDateFrom',
      'enquiry_date_to': 'enquiryDateTo',
      'function_date_from': 'functionDateFrom',
      'function_date_to': 'functionDateTo',
      'visit_date_from': 'visitDateFrom',
      'visit_date_to': 'visitDateTo',
      'created_at_from': 'createdAtFrom',
      'created_at_to': 'createdAtTo',
      'date_from': 'dateFrom',
      'date_to': 'dateTo',
      'date_field': 'dateField',
      'sort_by': 'sortBy',
      'sort_order': 'sortOrder'
    };

    Object.keys(paramAliases).forEach(snakeKey => {
      const camelKey = paramAliases[snakeKey];
      if (normalizedQuery[snakeKey] !== undefined && normalizedQuery[camelKey] === undefined) {
        normalizedQuery[camelKey] = normalizedQuery[snakeKey];
      }
    });

    const {
      leadType,
      callStatus,
      leadStatus,
      store,
      source,
      page = 1,
      limit = 100,
      enquiryDateFrom,
      enquiryDateTo,
      functionDateFrom,
      functionDateTo,
      visitDateFrom,
      visitDateTo,
      createdAtFrom,
      createdAtTo,
      createdAt,
      dateFrom,
      dateTo,
      dateField = 'enquiryDate',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = normalizedQuery;

    // Remap friendly leadType names to DB values using fuzzy matching
    let dbLeadType = leadType;
    if (leadType) {
      const lowerType = leadType.toLowerCase();
      if (lowerType.includes('rent') || lowerType.includes('out')) dbLeadType = 'rentOutFeedback';
      else if (lowerType.includes('book')) dbLeadType = 'bookingConfirmation';
      else if (lowerType.includes('loss')) dbLeadType = 'lossOfSale';
      else if (lowerType.includes('walk')) dbLeadType = 'general';
    }

    const filters = {};
    if (dbLeadType) filters.leadType = dbLeadType;
    if (callStatus) filters.callStatus = callStatus;
    if (leadStatus) filters.leadStatus = leadStatus;
    if (store) {
      // Helper to get all variants of a brand or location
      const getVariants = (text, type) => {
        const variants = [text];
        const lower = text.toLowerCase();

        if (type === 'brand') {
          if (lower.includes('suitor guy') || lower === 'sg') {
            variants.push('Suitor Guy', 'SG');
          }
          if (lower.includes('zorucci') || lower.includes('zurocci') || lower === 'z') {
            variants.push('Zurocci', 'Zorucci', 'Z');
          }
        } else if (type === 'location') {
          if (lower.includes('kottakkal') || lower.includes('kottakal')) {
            variants.push('Kottakkal', 'Kottakal', 'Z.Kottakkal');
          }
          if (lower.includes('manjeri') || lower.includes('manjery')) {
            variants.push('Manjeri', 'MANJERY');
          }
          if (lower.includes('perinthalmanna') || lower.includes('perinathalmann') || lower === 'pmna') {
            variants.push('Perinthalmanna', 'PMNA');
          }
          if (lower.includes('edappally') || lower.includes('edapally') || lower.includes('edappall')) {
            variants.push('Edappally', 'Edapally');
          }
        }
        return [...new Set(variants)];
      };

      // Helper to escape and build a "word-boundary" regex pattern
      // Matches the text at start of string or after a separator (space/dash)
      // and at end of string or before a separator
      const buildStrictRegex = (text) => {
        const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return `(^|[\\s-])${escaped}([\\s-]|$)`;
      };

      // Split by dash to handle Brand - Location format
      const hasDash = store.includes('-') || store.includes(' - ');

      if (hasDash) {
        const parts = store.split(/[\s-]*[-][\s-]*/).map(p => p.trim()).filter(p => p.length > 0);

        if (parts.length >= 2) {
          const brandPart = parts[0];
          const locationPart = parts[parts.length - 1];

          const brandVariations = getVariants(brandPart, 'brand');
          const locationVariations = getVariants(locationPart, 'location');

          const orConditions = [];
          for (const brandVar of brandVariations) {
            for (const locVar of locationVariations) {
              orConditions.push({
                $and: [
                  { store: { $regex: buildStrictRegex(brandVar), $options: 'i' } },
                  { store: { $regex: buildStrictRegex(locVar), $options: 'i' } }
                ]
              });
            }
          }
          filters.$or = orConditions;
        } else {
          // Fallback for weirdly formatted dash query
          filters.store = { $regex: buildStrictRegex(store), $options: 'i' };
        }
      } else {
        // No dash - could be just brand OR just location OR both combined without dash
        const brandVars = getVariants(store, 'brand');
        const locVars = getVariants(store, 'location');

        // Check if we detected BOTH a known brand and a known location
        // We exclude the original string text from this check to see if we found specific variants
        const hasSpecificBrand = brandVars.some(v => v.toLowerCase() !== store.toLowerCase());
        const hasSpecificLoc = locVars.some(v => v.toLowerCase() !== store.toLowerCase());

        if (hasSpecificBrand && hasSpecificLoc) {
          // Intersection: must match both a brand variant AND a location variant
          // Use variants that are not the original string to ensure we found specific matches
          const bVars = brandVars.filter(v => v.toLowerCase() !== store.toLowerCase());
          const lVars = locVars.filter(v => v.toLowerCase() !== store.toLowerCase());

          const orConditions = [];
          for (const brandVar of bVars) {
            for (const locVar of lVars) {
              orConditions.push({
                $and: [
                  { store: { $regex: buildStrictRegex(brandVar), $options: 'i' } },
                  { store: { $regex: buildStrictRegex(locVar), $options: 'i' } }
                ]
              });
            }
          }
          filters.$or = orConditions;
        } else {
          // Union: just match whatever variants we found
          const allVars = [...new Set([...brandVars, ...locVars])];
          if (allVars.length > 1) {
            filters.$or = allVars.map(v => ({
              store: { $regex: buildStrictRegex(v), $options: 'i' }
            }));
          } else {
            filters.store = { $regex: buildStrictRegex(store), $options: 'i' };
          }
        }
      }
    }
    if (source) filters.source = source;

    // Date filtering logic
    // Date filtering logic
    // Priority: specific date fields > generic date range
    if (enquiryDateFrom || enquiryDateTo) {
      filters.enquiryDate = {};
      if (enquiryDateFrom) {
        const parsed = parseQueryDate(enquiryDateFrom);
        if (parsed) filters.enquiryDate.$gte = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else filters.enquiryDate.$gte = new Date(enquiryDateFrom);
      }
      if (enquiryDateTo) {
        const parsed = parseQueryDate(enquiryDateTo);
        let endDate;
        if (parsed) endDate = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else endDate = new Date(enquiryDateTo);

        endDate.setHours(23, 59, 59, 999);
        filters.enquiryDate.$lte = endDate;
      }
    }

    if (functionDateFrom || functionDateTo) {
      filters.functionDate = {};
      if (functionDateFrom) {
        const parsed = parseQueryDate(functionDateFrom);
        if (parsed) filters.functionDate.$gte = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else filters.functionDate.$gte = new Date(functionDateFrom);
      }
      if (functionDateTo) {
        const parsed = parseQueryDate(functionDateTo);
        let endDate;
        if (parsed) endDate = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else endDate = new Date(functionDateTo);

        endDate.setHours(23, 59, 59, 999);
        filters.functionDate.$lte = endDate;
      }
    }

    if (visitDateFrom || visitDateTo) {
      filters.visitDate = {};
      if (visitDateFrom) {
        const parsed = parseQueryDate(visitDateFrom);
        if (parsed) filters.visitDate.$gte = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else filters.visitDate.$gte = new Date(visitDateFrom);
      }
      if (visitDateTo) {
        const parsed = parseQueryDate(visitDateTo);
        let endDate;
        if (parsed) endDate = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else endDate = new Date(visitDateTo);

        endDate.setHours(23, 59, 59, 999);
        filters.visitDate.$lte = endDate;
      }
    }

    // Helper to robustly parse date strings (YYYY-MM-DD or DD-MM-YYYY)
    const parseQueryDate = (dateStr) => {
      if (!dateStr) return null;

      const parts = dateStr.split('-');
      if (parts.length === 3) {
        // Check for YYYY-MM-DD
        if (parts[0].length === 4) {
          return {
            year: parseInt(parts[0], 10),
            month: parseInt(parts[1], 10) - 1,
            day: parseInt(parts[2], 10)
          };
        }
        // Check for DD-MM-YYYY
        if (parts[2].length === 4) {
          return {
            year: parseInt(parts[2], 10),
            month: parseInt(parts[1], 10) - 1,
            day: parseInt(parts[0], 10)
          };
        }
      }
      // Fallback for unexpected formats
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return {
          year: d.getUTCFullYear(),
          month: d.getUTCMonth(),
          day: d.getUTCDate()
        };
      }
      return null;
    };

    // Single date filter for createdAt (takes priority over range)
    if (createdAt) {
      const parsed = parseQueryDate(createdAt);
      if (parsed) {
        const startOfDay = new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999));

        filters.createdAt = {
          $gte: startOfDay,
          $lte: endOfDay
        };
      }
    } else if (createdAtFrom || createdAtTo) {
      // Date range filter for createdAt
      filters.createdAt = {};
      if (createdAtFrom) {
        const parsed = parseQueryDate(createdAtFrom);
        if (parsed) filters.createdAt.$gte = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else filters.createdAt.$gte = new Date(createdAtFrom);
      }
      if (createdAtTo) {
        const parsed = parseQueryDate(createdAtTo);
        let endDate;
        if (parsed) endDate = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else endDate = new Date(createdAtTo);

        endDate.setHours(23, 59, 59, 999);
        filters.createdAt.$lte = endDate;
      }
    }

    // Generic date range (if specific fields not provided)
    if ((dateFrom || dateTo) && !enquiryDateFrom && !enquiryDateTo && !functionDateFrom && !functionDateTo && !visitDateFrom && !visitDateTo && !createdAtFrom && !createdAtTo && !createdAt) {
      const dateFieldName = dateField === 'functionDate' ? 'functionDate' :
        dateField === 'visitDate' ? 'visitDate' :
          dateField === 'createdAt' ? 'createdAt' :
            'enquiryDate';

      filters[dateFieldName] = {};
      if (dateFrom) {
        const parsed = parseQueryDate(dateFrom);
        if (parsed) filters[dateFieldName].$gte = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else filters[dateFieldName].$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const parsed = parseQueryDate(dateTo);
        let endDate;
        if (parsed) endDate = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else endDate = new Date(dateTo);

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

    // Build sort object based on sortBy and sortOrder parameters
    // Allowed sort fields: createdAt, enquiryDate, functionDate, visitDate, name, store
    const allowedSortFields = ['createdAt', 'enquiryDate', 'functionDate', 'visitDate', 'name', 'store'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortObject = { [sortField]: sortDirection };

    const leads = await Lead.find(query)
      .populate("assignedTo", "name employeeId")
      .sort(sortObject)
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

    const beforeLead = lead.toObject();

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    const changedFields = {};
    Object.keys(updateData).forEach((key) => {
      changedFields[key] = { before: beforeLead[key], after: updatedLead[key] };
    });

    const report = await createReportFromLead(updatedLead, req.user._id, "moved after edit", changedFields);

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
      changedFields[key] = { before: beforeLead[key], after: updatedLead[key] };
    });

    const report = await createReportFromLead(updatedLead, req.user._id, "moved after edit", changedFields);

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

    const report = await createReportFromLead(updatedLead, req.user._id, "moved after edit", changedFields);

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

    const report = await createReportFromLead(updatedLead, req.user._id, "moved after edit", changedFields);

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

    const report = await createReportFromLead(updatedLead, req.user._id, "moved after edit", changedFields);

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
