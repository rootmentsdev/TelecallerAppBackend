import Report from "../models/Report.js";

// GET /api/reports
// Query params: leadType, editedBy, dateFrom, dateTo, page, limit
export const getReports = async (req, res) => {
  try {
    const {
      leadType,
      editedBy,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (leadType) query.leadType = leadType;
    if (editedBy) query.editedBy = editedBy;
    if (dateFrom || dateTo) {
      query.editedAt = {};
      if (dateFrom) query.editedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.editedAt.$lte = end;
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

    // For each report, merge original lead fields with edited values so the response contains a single combined object
    const mapped = reports.map((r) => {
      const originalLead = (r.beforeSnapshot && typeof r.beforeSnapshot === 'object') ? { ...r.beforeSnapshot } : {};

      const editedFields = {};
      if (r.changedFields && typeof r.changedFields === 'object') {
        Object.keys(r.changedFields).forEach((k) => {
          const after = r.changedFields[k]?.after;
          if (after !== undefined) editedFields[k] = after;
        });
      }

      // Merge: edited values override originalLead fields
      const merged = { ...originalLead, ...editedFields };

      return {
        report_id: r._id,
        ...merged,
        edited_by: r.editedBy ? { id: r.editedBy._id, name: r.editedBy.name, employee_id: r.editedBy.employeeId } : null,
        edited_at: r.editedAt,
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

    const originalLead = (report.beforeSnapshot && typeof report.beforeSnapshot === 'object') ? { ...report.beforeSnapshot } : {};
    const editedFields = {};
    if (report.changedFields && typeof report.changedFields === 'object') {
      Object.keys(report.changedFields).forEach((k) => {
        const after = report.changedFields[k]?.after;
        if (after !== undefined) editedFields[k] = after;
      });
    }

    const merged = { ...originalLead, ...editedFields };

    res.json({
      report_id: report._id,
      ...merged,
      edited_by: report.editedBy ? { id: report.editedBy._id, name: report.editedBy.name, employee_id: report.editedBy.employeeId } : null,
      edited_at: report.editedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
