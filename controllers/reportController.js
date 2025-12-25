import Report from "../models/Report.js";

// GET /api/reports
// Query params: leadType (optional - must match flat field lead_type), editedBy, dateFrom, dateTo, leadCreatedFrom, leadCreatedTo, page, limit
export const getReports = async (req, res) => {
  try {
    const {
      leadType,
      editedBy,
      dateFrom,
      dateTo,
      leadCreatedFrom,
      leadCreatedTo,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (editedBy) query.editedBy = editedBy;
    if (leadType) query.lead_type = leadType; // flat field
    
    // Filter by report edit date (when report was created/moved)
    if (dateFrom || dateTo) {
      query.editedAt = {};
      if (dateFrom) query.editedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.editedAt.$lte = end;
      }
    }

    // Filter by original lead creation date
    if (leadCreatedFrom || leadCreatedTo) {
      query.created_at = {};
      if (leadCreatedFrom) query.created_at.$gte = new Date(leadCreatedFrom);
      if (leadCreatedTo) {
        const end = new Date(leadCreatedTo);
        end.setHours(23, 59, 59, 999);
        query.created_at.$lte = end;
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



