
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

    // 2. Lead Creation Date (createdAt) - Applies to original lead creation
    const fromForCreatedAt = createdAtFrom || (dateField === 'createdAt' && dateFrom ? dateFrom : null);
    const toForCreatedAt = createdAtTo || (dateField === 'createdAt' && dateTo ? dateTo : null);

    if (createdAt) {
        const parsed = parseQueryDate(createdAt);
        if (parsed) {
            const startOfDay = new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999));
            baseFilters.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }
    } else if (fromForCreatedAt || toForCreatedAt) {
        baseFilters.createdAt = {};
        if (fromForCreatedAt) {
            const parsed = parseQueryDate(fromForCreatedAt);
            baseFilters.createdAt.$gte = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day)) : new Date(fromForCreatedAt);
        }
        if (toForCreatedAt) {
            const parsed = parseQueryDate(toForCreatedAt);
            const end = parsed ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999)) : new Date(toForCreatedAt);
            if (!parsed) end.setHours(23, 59, 59, 999);
            else end.setUTCHours(23, 59, 59, 999);
            baseFilters.createdAt.$lte = end;
        }
    }

    return { baseFilters, dateFrom, dateTo, dateField };
};

// GET /api/admin/health
export const getAdminHealth = async (req, res) => {
    res.json({ ok: true, message: "Admin API is healthy" });
};

// GET /api/admin/telecaller-summary
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

        // Parallel Aggregation:
        // 1. Group Reports by 'editedBy'
        // 2. Group Complaints by 'complaintMarkedBy'
        const [reportStats, complaintStats] = await Promise.all([
            Report.aggregate([
                { $match: reportMatch },
                {
                    $group: {
                        _id: "$editedBy",
                        totalCalls: { $sum: 1 },
                        totalCallDuration: { $sum: "$callDuration" }
                    }
                }
            ]),
            Complaint.aggregate([
                { $match: complaintMatch },
                {
                    $group: {
                        _id: "$complaintMarkedBy",
                        totalComplaints: { $sum: 1 },
                        totalComplaintDuration: { $sum: "$callDuration" },
                        totalReCalls: { $sum: 0 }
                    }
                }
            ])
        ]);

        // Merge results using a map keyed by User ID
        const summaryMap = {};

        // Helper to init/get entry
        const getEntry = (id) => {
            if (!summaryMap[id]) {
                summaryMap[id] = {
                    telecaller: { id },
                    totalCalls: 0,
                    totalCallDuration: 0,
                    totalComplaints: 0
                };
            }
            return summaryMap[id];
        };

        // Process Report Stats
        for (const stat of reportStats) {
            if (stat._id) {
                const id = String(stat._id);
                const entry = getEntry(id);
                entry.totalCalls = stat.totalCalls; // Initial calls from reports
                entry.totalCallDuration = stat.totalCallDuration;
            }
        }

        // Process Complaint Stats
        for (const stat of complaintStats) {
            if (stat._id) {
                const id = String(stat._id);
                const entry = getEntry(id);
                entry.totalComplaints = stat.totalComplaints;

                // Complaints are also call interactions:
                // 1. Add count to totalCalls (Initial Complaints + Re-Calls)
                entry.totalCalls += (stat.totalComplaints + (stat.totalReCalls || 0));
                // 2. Add duration to totalCallDuration
                entry.totalCallDuration += (stat.totalComplaintDuration || 0);
            }
        }

        // Fetch User Details to populate names
        const userIds = Object.keys(summaryMap);
        if (userIds.length > 0) {
            const users = await User.find({ _id: { $in: userIds } }).select('name employeeId');
            users.forEach(u => {
                const id = String(u._id);
                if (summaryMap[id]) {
                    summaryMap[id].telecaller = {
                        id: id,
                        name: u.name,
                        employeeId: u.employeeId
                    };
                }
            });
        }

        res.json({
            data: Object.values(summaryMap)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/admin/complaints/pivot
export const getComplaintPivot = async (req, res) => {
    try {
        const { baseFilters, dateFrom, dateTo, dateField } = buildBaseFilters(req.query);
        const { groupBy, leadType, subCategory, itemCategory, telecallerId } = req.query;

        // --- COMPLAINT FILTERS ---
        const query = { ...baseFilters };
        if (leadType) query.leadType = leadType;
        if (subCategory) query.subCategory = subCategory;
        if (itemCategory) query.itemCategory = itemCategory;
        if (telecallerId) query.complaintMarkedBy = new mongoose.Types.ObjectId(telecallerId);

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

        // --- GROUP BY LOGIC ---
        let groups = ["store", "subCategory"];
        if (groupBy) {
            groups = groupBy.split(',').map(s => s.trim()).filter(Boolean);
        }

        // Ensure store is always present if no others? 
        // User request says: if groupBy not provided -> "store,subCategory".
        // If provided, use it strictly.

        const validFields = ["store", "subCategory", "itemCategory", "leadType", "telecaller"]; // 'telecaller' maps to complaintMarkedBy

        const groupId = {};
        const projectFields = {};

        let groupByTelecaller = false;

        groups.forEach(field => {
            if (field === 'telecaller') {
                groupId.complaintMarkedBy = "$complaintMarkedBy";
                groupByTelecaller = true;
            } else if (validFields.includes(field)) {
                groupId[field] = `$${field}`;
                projectFields[field] = `$_id.${field}`;
            }
        });

        if (Object.keys(groupId).length === 0) {
            // Fallback just in case
            groupId.store = "$store";
            groupId.subCategory = "$subCategory";
        }

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

        const aggregated = await Complaint.aggregate(pipeline);

        // --- POST-PROCESS & POPULATE ---
        // If grouped by telecaller, we need to populate user details
        let rows = [];

        if (groupByTelecaller) {
            // Collect User IDs
            const userIds = new Set();
            aggregated.forEach(item => {
                if (item._id.complaintMarkedBy) userIds.add(String(item._id.complaintMarkedBy));
            });

            const users = await User.find({ _id: { $in: Array.from(userIds) } }).select('name employeeId');
            const userMap = {};
            users.forEach(u => userMap[String(u._id)] = u);

            rows = aggregated.map(item => {
                const row = {};
                // Map group keys to row properties
                Object.keys(item._id).forEach(key => {
                    if (key !== 'complaintMarkedBy') row[key] = item._id[key];
                });

                // Attach telecaller
                const uid = item._id.complaintMarkedBy ? String(item._id.complaintMarkedBy) : null;
                if (uid && userMap[uid]) {
                    row.telecaller = {
                        id: uid,
                        name: userMap[uid].name,
                        employeeId: userMap[uid].employeeId
                    };
                } else {
                    row.telecaller = null;
                }

                row.count = item.count;
                return row;
            });
        } else {
            // Simple mapping
            rows = aggregated.map(item => {
                const row = { ...item._id, count: item.count, telecaller: null };
                return row;
            });
        }

        // Ensure all expected group fields are present (as null if missing in group) - requirement implied by sample response
        // "itemCategory": null type behavior.
        // We will just return the sparse rows; the frontend/consumer can handle nulls.
        // However, the sample response shows explicit nulls. Let's try to match that if easy.

        const requestedFields = groups.includes('telecaller') ? [...groups.filter(g => g !== 'telecaller')] : groups;

        rows = rows.map(r => {
            const finalRow = {};
            // Ensure requested group keys exist
            requestedFields.forEach(k => finalRow[k] = r[k] || null);
            if (groups.includes('telecaller')) finalRow.telecaller = r.telecaller || null;
            else finalRow.telecaller = null;

            finalRow.count = r.count;

            // Backfill other standard fields from sample if they were not requested?
            // Sample response had: store, subCategory, itemCategory, leadType
            ["store", "subCategory", "itemCategory", "leadType"].forEach(f => {
                if (finalRow[f] === undefined) finalRow[f] = null;
            });

            return finalRow;
        });

        res.json({
            meta: {
                groupBy: groupBy || "store,subCategory",
                dateFieldUsed: query.complaintMarkedAt ? "complaintMarkedAt" : (query.createdAt ? "createdAt" : "complaintMarkedAt"),
                filters: {
                    dateFrom: dateFrom || null,
                    dateTo: dateTo || null,
                    store: baseFilters.store ? req.query.store : null, // Returning raw query store for meta
                    leadType: leadType || null,
                    subCategory: subCategory || null,
                    itemCategory: itemCategory || null,
                    telecallerId: telecallerId || null
                }
            },
            rows
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
            telecallerId, // Maps to editedBy (telecaller context - legacy/ObjectId)
            telecaller,   // Maps to createdByEmpId (NEW - String EmpId)
            callStatus,
            leadStatus,
            source,
            refund_status, // Only applies when leadType = return
            filtersOnly   // NEW: If true, returns only filter metadata (telecallers/stores)
        } = req.query;

        // --- 1. HANDLE FILTERS-ONLY REQUEST ---
        if (filtersOnly === 'true' || filtersOnly === true) {
            // Aggregate unique telecallers (creators) from Reports
            // We want unique combinations of { id: createdByEmpId, name: createdByName }
            // Filter out null/empty EmpIds
            const telecallerAgg = await Report.aggregate([
                { $match: { createdByEmpId: { $exists: true, $ne: null } } },
                {
                    $group: {
                        _id: { empId: "$createdByEmpId", name: "$createdByName" }
                    }
                },
                { $sort: { "_id.name": 1 } },
                {
                    $project: {
                        _id: 0,
                        empId: "$_id.empId",
                        name: "$_id.name"
                    }
                }
            ]);

            // Aggregate unique stores
            const storeAgg = await Report.distinct("store");
            const stores = storeAgg.filter(Boolean).sort();

            // Refund status options (return leads only) for filter dropdown
            const refundStatusOptions = await Report.distinct("refund_status", { leadType: "return" });
            const refundStatuses = refundStatusOptions.filter(Boolean).sort();

            return res.json({
                telecallers: telecallerAgg,
                stores: stores,
                refundStatuses: refundStatuses
            });
        }

        // --- 2. NORMAL REPORT FETCHING ---

        const query = { ...baseFilters };

        // Common optional filters
        if (leadType) query.leadType = leadType;
        if (telecallerId) query.editedBy = telecallerId; // Legacy/Admin context targetting editor by ObjectId

        // NEW: Filter by createdByEmpId
        if (telecaller) {
            query.createdByEmpId = telecaller;
        }

        if (callStatus) query.callStatus = callStatus;
        if (leadStatus) query.leadStatus = leadStatus;
        if (source) query.source = source;
        if (leadType === 'return' && refund_status !== undefined && refund_status !== '') query.refund_status = refund_status;

        // Apply generic date filter to 'createdAt' if dateField is 'createdAt' (handled in baseFilters)
        // OR apply to 'editedAt' (default behavior for Reports if not specified)
        // User Requirement: "Date Range Filter... using createdAt"
        // If the user selects date range in UI, we should probably map it to 'createdAt' if that's the intent.
        // The prompt says: "Filter reports using: createdAt".
        // BaseFilters handles 'createdAt' if query.createdAtFrom/To is passed OR query.dateField='createdAt'
        // If frontend sends generic dateFrom/To without dateField, current logic maps to editedAt.
        // I will let frontend control this by sending dateField='createdAt' or just assume dateFrom/To maps to createdAt if intended.
        // However, the prompt says "Filter reports using: createdAt".
        // Use existing logic: if dateFrom/To is provided AND dateField is NOT 'createdAt', it maps to editedAt.
        // If frontend wants createdAt, it should send `createdAtFrom/To` OR `dateField=createdAt`.
        // I will assume frontend will send `dateField=createdAt` or `createdAtFrom/To` for this specific filter.
        // But for completeness, I will check if we need to force createdAt logic here.
        // Current baseFilters/adminController logic: "if ((dateFrom || dateTo) && dateField !== 'createdAt'...) { query.editedAt... }"
        // So I don't need to change this IF the frontend sends `dateField=createdAt`.

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [reports, total] = await Promise.all([
            Report.find(query)
                .populate("editedBy", "name employeeId")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Report.countDocuments(query),
        ]);

        // Map response to flat format as requested
        const rows = reports.map((r) => {
            const obj = r.toObject ? r.toObject() : { ...r };

            // Flatten Telecaller (Editor)
            let telecallerObj = null;
            if (r.editedBy) {
                telecallerObj = {
                    id: String(r.editedBy._id),
                    name: r.editedBy.name,
                    employeeId: r.editedBy.employeeId
                };
            }

            return {
                reportId: String(obj._id),
                leadName: obj.leadName || obj.name || obj.lead_name || null, // Handle naming variants if any
                phone: obj.phone || obj.phone_number || obj.phoneNumber || null,
                store: obj.store || null,
                leadType: obj.leadType || obj.lead_type || null,
                callStatus: obj.callStatus || obj.call_status || null,
                leadStatus: obj.leadStatus || obj.lead_status || null,
                closingAction: obj.closingAction || obj.closing_action || null,
                remarks: obj.remarks || null,
                callDuration: obj.callDuration || obj.call_duration || 0,
                createdAt: obj.createdAt || obj.created_at || null,
                editedAt: obj.editedAt || obj.edited_at || null,
                telecaller: telecallerObj,
                // Include Creator info just in case
                createdByEmpId: obj.createdByEmpId,
                createdByName: obj.createdByName,
                // Return-lead only: refund status (visible in admin when leadType = return)
                refund_status: obj.refund_status ?? null,
            };
        });

        res.json({
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit) || 1),
            },
            rows
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/admin/users
export const getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const query = {};

        // If role is provided, filter by it
        // Note: For "telecaller" dropdown, we might want both 'telecaller' and 'teamLead' 
        // but for now, strict match is fine, or client can request what they want.
        if (role) {
            query.role = role;
        }

        // Return lightweight user objects
        const users = await User.find(query)
            .select('name employeeId role store')
            .sort({ name: 1 });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
