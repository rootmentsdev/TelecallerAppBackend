import Report from "../models/Report.js";

// GET /api/reports
// Query params: leadType, editedBy, store, callStatus, leadStatus, source, dateFrom, dateTo, leadCreatedFrom, leadCreatedTo, createdAt, createdAtFrom, createdAtTo, editedAtFrom, editedAtTo, dateField, page, limit
export const getReports = async (req, res) => {
  try {
    const {
      leadType,
      editedBy,
      store,
      callStatus,
      leadStatus,
      source,
      dateFrom,
      dateTo,
      leadCreatedFrom,
      leadCreatedTo,
      createdAt,
      createdAtFrom,
      createdAtTo,
      editedAtFrom,
      editedAtTo,
      dateField = 'created_at',
      page = 1,
      limit = 50,
    } = req.query;

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

    const query = {};
    if (editedBy) query.editedBy = editedBy;
    if (leadType) query.lead_type = leadType; // flat field
    if (callStatus) query.call_status = callStatus;
    if (leadStatus) query.lead_status = leadStatus;
    if (source) query.source = source;

    // Store filtering (exact same logic as Leads API)
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
          if (lower.includes('vadakara') || lower.includes('vatakara')) {
            variants.push('Vatakara', 'Vadakara');
          }
          if (lower.includes('calicut') || lower.includes('kozhikode')) {
            variants.push('Calicut', 'Kozhikode');
          }
        }
        return [...new Set(variants)];
      };

      // Helper to escape and build a "word-boundary" regex pattern
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

          // Check if this is a Suitor Guy query
          const isSuitorGuy = brandVariations.some(v => ['Suitor Guy', 'SG'].includes(v));

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

          // Special handling for implicit Suitor Guy stores
          if (isSuitorGuy) {
            for (const locVar of locationVariations) {
              orConditions.push({
                $and: [
                  { store: { $regex: buildStrictRegex(locVar), $options: 'i' } },
                  { store: { $not: { $regex: /(^|[\s.-])(Z|Zorucci|Zurocci)([\s.-]|$)/i } } }
                ]
              });
            }
          }

          query.$or = orConditions;
        } else {
          // Fallback for weirdly formatted dash query
          query.store = { $regex: buildStrictRegex(store), $options: 'i' };
        }
      } else {
        // No dash - could be just brand OR just location OR both combined without dash
        const brandVars = getVariants(store, 'brand');
        const locVars = getVariants(store, 'location');

        const hasSpecificBrand = brandVars.some(v => v.toLowerCase() !== store.toLowerCase());
        const hasSpecificLoc = locVars.some(v => v.toLowerCase() !== store.toLowerCase());

        if (hasSpecificBrand && hasSpecificLoc) {
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
          query.$or = orConditions;
        } else {
          const allVars = [...new Set([...brandVars, ...locVars])];
          if (allVars.length > 1) {
            query.$or = allVars.map(v => ({
              store: { $regex: buildStrictRegex(v), $options: 'i' }
            }));
          } else {
            query.store = { $regex: buildStrictRegex(store), $options: 'i' };
          }
        }
      }
    }

    // Date filtering logic (matching Leads API exactly)
    
    // Single date filter for createdAt (takes priority over range)
    if (createdAt) {
      const parsed = parseQueryDate(createdAt);
      if (parsed) {
        const startOfDay = new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999));

        query.created_at = {
          $gte: startOfDay,
          $lte: endOfDay
        };
      }
    } else if (createdAtFrom || createdAtTo) {
      // Date range filter for createdAt (original lead creation)
      query.created_at = {};
      if (createdAtFrom) {
        const parsed = parseQueryDate(createdAtFrom);
        if (parsed) query.created_at.$gte = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else query.created_at.$gte = new Date(createdAtFrom);
      }
      if (createdAtTo) {
        const parsed = parseQueryDate(createdAtTo);
        let endDate;
        if (parsed) endDate = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else endDate = new Date(createdAtTo);

        endDate.setHours(23, 59, 59, 999);
        query.created_at.$lte = endDate;
      }
    }

    // Edited date filtering (when report was created/moved)
    if (editedAtFrom || editedAtTo) {
      query.editedAt = {};
      if (editedAtFrom) {
        const parsed = parseQueryDate(editedAtFrom);
        if (parsed) query.editedAt.$gte = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else query.editedAt.$gte = new Date(editedAtFrom);
      }
      if (editedAtTo) {
        const parsed = parseQueryDate(editedAtTo);
        let endDate;
        if (parsed) endDate = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else endDate = new Date(editedAtTo);

        endDate.setHours(23, 59, 59, 999);
        query.editedAt.$lte = endDate;
      }
    }

    // Legacy support for existing dateFrom/dateTo (maps to editedAt for backward compatibility)
    if ((dateFrom || dateTo) && !editedAtFrom && !editedAtTo && !createdAtFrom && !createdAtTo && !createdAt) {
      query.editedAt = {};
      if (dateFrom) {
        const parsed = parseQueryDate(dateFrom);
        if (parsed) query.editedAt.$gte = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else query.editedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const parsed = parseQueryDate(dateTo);
        let endDate;
        if (parsed) endDate = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else endDate = new Date(dateTo);

        endDate.setHours(23, 59, 59, 999);
        query.editedAt.$lte = endDate;
      }
    }

    // Legacy support for leadCreatedFrom/leadCreatedTo (backward compatibility)
    if ((leadCreatedFrom || leadCreatedTo) && !createdAtFrom && !createdAtTo && !createdAt) {
      query.created_at = {};
      if (leadCreatedFrom) {
        const parsed = parseQueryDate(leadCreatedFrom);
        if (parsed) query.created_at.$gte = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else query.created_at.$gte = new Date(leadCreatedFrom);
      }
      if (leadCreatedTo) {
        const parsed = parseQueryDate(leadCreatedTo);
        let endDate;
        if (parsed) endDate = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
        else endDate = new Date(leadCreatedTo);

        endDate.setHours(23, 59, 59, 999);
        query.created_at.$lte = endDate;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate("editedBy", "name employeeId")
        .sort({ editedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(query),
    ]);

    // Reports are stored flat; return them directly with editor metadata
    const mapped = reports.map((r) => {
      const obj = r.toObject ? r.toObject() : { ...r };
      // Normalize edited_by and edited_at presentation
      const edited_by = r.editedBy ? { id: r.editedBy._id, name: r.editedBy.name, employee_id: r.editedBy.employeeId } : null;
      const edited_at = r.editedAt;

      // Ensure report_id exists
      if (!obj.report_id) obj.report_id = String(r._id);

      // Remove internal mongoose fields if present
      delete obj._id;
      delete obj.__v;

      return {
        report_id: obj.report_id,
        ...obj,
        edited_by,
        edited_at,
      };
    });

    res.json({
      reports: mapped,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit) || 1),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reports/:id
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id).populate("editedBy", "name employeeId");
    if (!report) return res.status(404).json({ message: "Report not found" });

    const obj = report.toObject ? report.toObject() : { ...report };
    const edited_by = report.editedBy ? { id: report.editedBy._id, name: report.editedBy.name, employee_id: report.editedBy.employeeId } : null;
    const edited_at = report.editedAt;

    if (!obj.report_id) obj.report_id = String(report._id);
    delete obj._id;
    delete obj.__v;

    res.json({
      report_id: obj.report_id,
      ...obj,
      edited_by,
      edited_at,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get call summary report
export const getCallStatusSummary = async (req, res) => {
  try {
    const { date, store } = req.query;
    const user = req.user;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    let match = {
      created_at: { $gte: start, $lte: end }   // ✅ FIXED: use created_at for date filtering
    };

    // Telecaller can only see their own reports
    if (user.role === "telecaller") {
      match["editedBy._id"] = user._id;
    }

    // Optional store filter
    if (store) {
      match["store"] = store;
    }

    const summary = await Report.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$call_status",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      connected: 0,
      not_connected: 0,
      call_back_later: 0,
      confirmed: 0,
    };

    summary.forEach((row) => {
      const key = row._id?.toLowerCase().replace(/\s+/g, "_");
      if (result[key] !== undefined) {
        result[key] = row.count;
      }
    });

    return res.json(result);

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};



