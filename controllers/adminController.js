import Report from "../models/Report.js";
import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import { normalizeQueryParams, parseQueryDate, buildStoreFilter } from "./filterUtils.js";

// Helper to build date/store filters (reused from reportController/pageController)
const buildBaseFilters = (query) => {
    const normalizedQuery = normalizeQueryParams(query);
    const {
        store,
        createdAt,
        createdAtFrom,
        createdAtTo,
        dateFrom,
        dateTo,
        dateField
    } = normalizedQuery;

    const baseFilters = {};

    // 1. Store filtering
    const storeFilter = buildStoreFilter(store);
    if (storeFilter) {
        if (storeFilter.$or) baseFilters.$or = storeFilter.$or;
        else if (storeFilter.store) baseFilters.store = storeFilter.store;
        else if (storeFilter.$and) baseFilters.$and = storeFilter.$and;
    }

    // 2. Date filtering

    // 2a. Lead Creation Date (createdAt) - Applies to original lead creation
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

    return { baseFilters, dateFrom, dateTo, dateField };
};

// GET /api/admin/complaints/pivot
export const getComplaintPivot = async (req, res) => {
    try {
        const { baseFilters, dateFrom, dateTo, dateField } = buildBaseFilters(req.query);
        const { groupBy, includeTotals } = req.query;

        const query = { ...baseFilters };

        // Apply generic date filter to 'complaintMarkedAt' (Work Date) if not already filtered by createdAt
        if ((dateFrom || dateTo) && dateField !== 'createdAt' && !query.createdAt) {
            query.complaintMarkedAt = {};
            if (dateFrom) {
                const parsed = parseQueryDate(dateFrom);
                query.complaintMarkedAt.$gte = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day)) : new Date(dateFrom);
            }
            if (dateTo) {
                const parsed = parseQueryDate(dateTo);
                const end = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999)) : new Date(dateTo);
                if (!parsed) end.setHours(23, 59, 59, 999);
                else end.setUTCHours(23, 59, 59, 999);
                query.complaintMarkedAt.$lte = end;
            }
        }

        // Default Group By fields
        let groups = ["store", "subCategory"];
        if (groupBy) {
            // Allow passing multiple fields as comma-separated or array
            if (Array.isArray(groupBy)) groups = groupBy;
            else if (typeof groupBy === 'string') groups = groupBy.split(',').map(s => s.trim());
        }

        // Valid fields for grouping (safety)
        const validGroupFields = ["store", "leadType", "subCategory", "itemCategory", "callStatus", "leadStatus", "createdBy", "complaintMarkedBy", "brand", "closingAction"];
        groups = groups.filter(g => validGroupFields.includes(g));
        if (groups.length === 0) groups = ["store"];

        // Build Group ID object
        // For createdBy/complaintMarkedBy, we might want to populate names later, 
        // but aggregate usually gives IDs. We'll handle lookup if needed, or just return IDs.
        const groupId = {};
        groups.forEach(field => {
            groupId[field] = `$${field}`;
        });

        const pipeline = [
            { $match: query },
            {
                $group: {
                    _id: groupId,
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ];

        const results = await Complaint.aggregate(pipeline);

        // If "createdBy" or "complaintMarkedBy" is in group, we might want to fetch user names
        // Determine unique user IDs to fetch
        const userFields = ['createdBy', 'complaintMarkedBy'];
        const fieldsToPopulate = groups.filter(g => userFields.includes(g));

        let populatedResults = results;

        if (fieldsToPopulate.length > 0) {
            const userIds = new Set();
            results.forEach(item => {
                fieldsToPopulate.forEach(field => {
                    if (item._id[field]) userIds.add(item._id[field]);
                });
            });

            const users = await User.find({ _id: { $in: Array.from(userIds) } }).select('name employeeId');
            const userMap = {};
            users.forEach(u => userMap[String(u._id)] = u);

            populatedResults = results.map(item => {
                const newItem = { ...item };
                fieldsToPopulate.forEach(field => {
                    if (item._id[field] && userMap[String(item._id[field])]) {
                        newItem._id[`${field}_details`] = userMap[String(item._id[field])];
                    }
                });
                return newItem;
            });
        }

        const response = {
            data: populatedResults
        };

        if (includeTotals === 'true') {
            response.total = await Complaint.countDocuments(query);
        }

        res.json(response);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/admin/telecallers/summary
export const getTelecallerSummary = async (req, res) => {
    try {
        const { baseFilters, dateFrom, dateTo, dateField } = buildBaseFilters(req.query);

        // --- REPORT FILTERS ---
        const reportMatch = { ...baseFilters };
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

        // Parallel Aggregation
        const [reportStats, complaintStats] = await Promise.all([
            Report.aggregate([
                { $match: reportMatch },
                {
                    $group: {
                        _id: "$editedBy",
                        totalReports: { $sum: 1 },
                        totalCallDuration: { $sum: "$callDuration" },
                        lastReportAt: { $max: "$editedAt" }
                    }
                }
            ]),
            Complaint.aggregate([
                { $match: complaintMatch },
                {
                    $group: {
                        _id: "$complaintMarkedBy",
                        totalComplaints: { $sum: 1 }
                    }
                }
            ])
        ]);

        // Merge results
        const summaryMap = {};

        // Helper to init/get entry
        const getEntry = (id) => {
            if (!summaryMap[id]) summaryMap[id] = {
                telecallerId: id,
                totalReports: 0,
                totalCallDuration: 0,
                totalComplaints: 0
            };
            return summaryMap[id];
        };

        reportStats.forEach(stat => {
            if (stat._id) {
                const id = String(stat._id);
                const entry = getEntry(id);
                entry.totalReports = stat.totalReports;
                entry.totalCallDuration = stat.totalCallDuration;
                entry.lastReportAt = stat.lastReportAt;
            }
        });

        complaintStats.forEach(stat => {
            if (stat._id) {
                const id = String(stat._id);
                const entry = getEntry(id);
                entry.totalComplaints = stat.totalComplaints;
            }
        });

        // Fetch User Details to populate names
        const userIds = Object.keys(summaryMap);
        const users = await User.find({ _id: { $in: userIds } }).select('name employeeId store role');

        users.forEach(u => {
            if (summaryMap[String(u._id)]) {
                summaryMap[String(u._id)].telecallerName = u.name;
                summaryMap[String(u._id)].employeeId = u.employeeId;
                summaryMap[String(u._id)].role = u.role;
                summaryMap[String(u._id)].store = u.store;
            }
        });

        res.json({
            data: Object.values(summaryMap)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/admin/reports
export const getAdminReports = async (req, res) => {
    try {
        const { baseFilters, dateFrom, dateTo, dateField } = buildBaseFilters(req.query);
        const {
            page = 1,
            limit = 50,
            leadType,
            editedBy,
            callStatus,
            leadStatus,
            source
        } = req.query;

        const query = { ...baseFilters };

        // Common optional filters
        if (leadType) query.leadType = leadType;
        if (editedBy) query.editedBy = editedBy;
        if (callStatus) query.call_status = callStatus;
        if (leadStatus) query.lead_status = leadStatus;
        if (source) query.source = source;

        // Apply generic date filter to 'editedAt' (Work Date) if not already filtered by createdAt
        if ((dateFrom || dateTo) && dateField !== 'createdAt' && !query.createdAt) {
            query.editedAt = {};
            if (dateFrom) {
                const parsed = parseQueryDate(dateFrom);
                query.editedAt.$gte = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day)) : new Date(dateFrom);
            }
            if (dateTo) {
                const parsed = parseQueryDate(dateTo);
                const end = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999)) : new Date(dateTo);
                if (!parsed) end.setHours(23, 59, 59, 999);
                else end.setUTCHours(23, 59, 59, 999);
                query.editedAt.$lte = end;
            }
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [reports, total] = await Promise.all([
            Report.find(query)
                .populate("editedBy", "name employeeId")
                .sort({ editedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Report.countDocuments(query),
        ]);

        // Map response (reuse similar mapping logic as consumer API, but maybe slightly richer if needed)
        // For now, keep it consistent.
        const mapped = reports.map((r) => {
            const obj = r.toObject ? r.toObject() : { ...r };
            const edited_by = r.editedBy ? { id: r.editedBy._id, name: r.editedBy.name, employee_id: r.editedBy.employeeId } : null;

            if (!obj.report_id) obj.report_id = String(r._id);
            if (obj.callDuration === undefined) obj.callDuration = 0;
            const rating = obj.rating !== undefined ? obj.rating : null;

            delete obj._id;
            delete obj.__v;

            return {
                report_id: obj.report_id,
                ...obj,
                rating,
                edited_by,
                // edited_at is already in obj (or should be)
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
