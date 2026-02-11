import Report from "../models/Report.js";
import Complaint from "../models/Complaint.js";
import { normalizeQueryParams, parseQueryDate, buildStoreFilter } from "./filterUtils.js";

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



    const query = {};

    // Auth & Permission Logic (Telecaller Scope)
    if (req.user.role === 'telecaller') {
      query.editedBy = req.user._id;
    } else if (editedBy) {
      query.editedBy = editedBy;
    }

    if (leadType) query.leadType = leadType; // Changed from lead_type to leadType to match DB schema
    if (callStatus) query.call_status = callStatus;
    if (leadStatus) query.lead_status = leadStatus;
    if (source) query.source = source;

    // Store filtering (exact same logic as Leads API)
    const storeFilter = buildStoreFilter(store);
    if (storeFilter) {
      if (storeFilter.$or) query.$or = storeFilter.$or;
      else if (storeFilter.$and) query.$and = storeFilter.$and;
      else if (storeFilter.store) query.store = storeFilter.store;
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

    console.log('🔍 GET /api/reports - Request Query:', req.query);
    console.log('🔍 GET /api/reports - Constructed MongoDB Query:', JSON.stringify(query, null, 2));

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

      // Ensure callDuration is included (default to 0 if not present)
      if (obj.callDuration === undefined) obj.callDuration = 0;

      // Ensure rating is included (for return leads - 1-5 stars)
      // Rating may be null/undefined if not set, but explicitly preserve it
      const rating = obj.rating !== undefined ? obj.rating : null;

      // Remove internal mongoose fields if present
      delete obj._id;
      delete obj.__v;

      return {
        report_id: obj.report_id,
        ...obj,
        rating, // Explicitly include rating in response
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

    // Strict Access Control for Telecallers
    if (req.user.role === 'telecaller') {
      const ownerId = report.editedBy?._id || report.editedBy;
      if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied. You can only view your own reports." });
      }
    }

    const obj = report.toObject ? report.toObject() : { ...report };
    const edited_by = report.editedBy ? { id: report.editedBy._id, name: report.editedBy.name, employee_id: report.editedBy.employeeId } : null;
    const edited_at = report.editedAt;

    if (!obj.report_id) obj.report_id = String(report._id);

    // Ensure callDuration is included (default to 0 if not present)
    if (obj.callDuration === undefined) obj.callDuration = 0;

    // Ensure rating is included (for return leads - 1-5 stars)
    // Rating may be null/undefined if not set, but explicitly preserve it
    const rating = obj.rating !== undefined ? obj.rating : null;

    delete obj._id;
    delete obj.__v;

    res.json({
      report_id: obj.report_id,
      ...obj,
      rating, // Explicitly include rating in response
      edited_by,
      edited_at,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get call summary report
// Get call summary report (Per-User Statistics)
export const getCallStatusSummary = async (req, res) => {
  try {
    const user = req.user;

    const normalizedQuery = normalizeQueryParams(req.query);
    const {
      store,
      createdAt,
      createdAtFrom,
      createdAtTo,
      dateFrom,
      dateTo,
      dateField
    } = normalizedQuery;

    // Build shared filter object (applied to both Report and Complaint calculations)
    const baseFilters = {};

    // 1. Store filtering
    const storeFilter = buildStoreFilter(store);
    if (storeFilter) {
      if (storeFilter.$or) baseFilters.$or = storeFilter.$or;
      else if (storeFilter.store) baseFilters.store = storeFilter.store;
    }

    // 2. Date filtering
    // Priority: createdAt (Single Day) > createdAtFrom/To > dateFrom/To

    // 2a. Lead Creation Date (createdAt)
    if (createdAt) {
      const parsed = parseQueryDate(createdAt);
      if (parsed) {
        const startOfDay = new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999));
        baseFilters.createdAt = { $gte: startOfDay, $lte: endOfDay };
      }
    } else if (createdAtFrom || createdAtTo) {
      baseFilters.createdAt = {};
      if (createdAtFrom) {
        const parsed = parseQueryDate(createdAtFrom);
        baseFilters.createdAt.$gte = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day)) : new Date(createdAtFrom);
      }
      if (createdAtTo) {
        const parsed = parseQueryDate(createdAtTo);
        const end = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999)) : new Date(createdAtTo);
        if (!parsed) end.setHours(23, 59, 59, 999);
        else end.setUTCHours(23, 59, 59, 999);
        baseFilters.createdAt.$lte = end;
      }
    }

    // 2b. Generic Date (Default: Work Date)
    // For Reports: 'editedAt'
    // For Complaints: 'complaintMarkedAt'
    if ((dateFrom || dateTo) && !baseFilters.createdAt) {
      // If user explicitly asks for 'createdAt' via dateField, map it to baseFilters.createdAt
      // Otherwise, keep it generic to map separately for Report vs Complaint
      if (dateField === 'createdAt') {
        baseFilters.createdAt = {};
        if (dateFrom) {
          const parsed = parseQueryDate(dateFrom);
          baseFilters.createdAt.$gte = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day)) : new Date(dateFrom);
        }
        if (dateTo) {
          const parsed = parseQueryDate(dateTo);
          const end = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999)) : new Date(dateTo);
          if (!parsed) end.setHours(23, 59, 59, 999);
          else end.setUTCHours(23, 59, 59, 999);
          baseFilters.createdAt.$lte = end;
        }
      }
    }

    // --- REPORT FILTERS ---
    const reportMatch = { ...baseFilters };
    reportMatch.editedBy = user._id; // Scope to user

    // Apply generic date filter to 'editedAt' (Work Date) if not already filtered by createdAt
    if ((dateFrom || dateTo) && dateField !== 'createdAt' && !baseFilters.createdAt) {
      reportMatch.editedAt = {};
      if (dateFrom) {
        const parsed = parseQueryDate(dateFrom);
        reportMatch.editedAt.$gte = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day)) : new Date(dateFrom);
      }
      if (dateTo) {
        const parsed = parseQueryDate(dateTo);
        const end = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999)) : new Date(dateTo);
        if (!parsed) end.setHours(23, 59, 59, 999);
        else end.setUTCHours(23, 59, 59, 999);
        reportMatch.editedAt.$lte = end;
      }
    }

    // --- COMPLAINT FILTERS ---
    const complaintMatch = { ...baseFilters };
    complaintMatch.complaintMarkedBy = user._id; // Scope to user

    // Apply generic date filter to 'complaintMarkedAt' (Work Date)
    if ((dateFrom || dateTo) && dateField !== 'createdAt' && !baseFilters.createdAt) {
      complaintMatch.complaintMarkedAt = {};
      if (dateFrom) {
        const parsed = parseQueryDate(dateFrom);
        complaintMatch.complaintMarkedAt.$gte = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day)) : new Date(dateFrom);
      }
      if (dateTo) {
        const parsed = parseQueryDate(dateTo);
        const end = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999)) : new Date(dateTo);
        if (!parsed) end.setHours(23, 59, 59, 999);
        else end.setUTCHours(23, 59, 59, 999);
        complaintMatch.complaintMarkedAt.$lte = end;
      }
    }

    // 1. Total Calls & Duration from Reports
    // Matches reports processed (edited) by the current user
    const reportStats = await Report.aggregate([
      {
        $match: reportMatch
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalCallDuration: { $sum: "$callDuration" }
        }
      }
    ]);

    // 2. Complaint Stats (Count + Duration + Re-Calls)
    const complaintStatsResult = await Complaint.aggregate([
      { $match: complaintMatch },
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          totalComplaintDuration: { $sum: "$callDuration" },
          totalReCalls: { $sum: 0 }
        }
      }
    ]);

    const compStats = complaintStatsResult[0] || { totalComplaints: 0, totalComplaintDuration: 0, totalReCalls: 0 };
    const stats = reportStats[0] || { totalCalls: 0, totalCallDuration: 0 };

    // Combine Reports and Complaints
    // Total Calls = Report Calls + Initial Complaint Calls + Re-Calls
    const finalTotalCalls = (stats.totalCalls || 0) + (compStats.totalComplaints || 0) + (compStats.totalReCalls || 0);

    // Total Duration = Report Duration + Complaint Duration (Initial + Re-Calls)
    const finalTotalDuration = (stats.totalCallDuration || 0) + (compStats.totalComplaintDuration || 0);

    return res.json({
      totalCalls: finalTotalCalls,
      totalCallDuration: finalTotalDuration,
      totalComplaints: compStats.totalComplaints || 0
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};



