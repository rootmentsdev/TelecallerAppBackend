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
  // Note: Report schema now stores flattened lead data in `leadData`.
  // Keep support for filtering by editedBy and date range.
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

    // Reports now contain `leadData` which is the flattened lead object.
    const mapped = reports.map((r) => {
      const lead = (r.leadData && typeof r.leadData === 'object') ? { ...r.leadData } : {};

      return {
        report_id: r._id,
        ...lead,
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

    const lead = (report.leadData && typeof report.leadData === 'object') ? { ...report.leadData } : {};

    res.json({
      report_id: report._id,
      ...lead,
      edited_by: report.editedBy ? { id: report.editedBy._id, name: report.editedBy.name, employee_id: report.editedBy.employeeId } : null,
      edited_at: report.editedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
