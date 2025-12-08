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

    // For each report return only the original lead details (beforeSnapshot) and the edited fields (after values)
    const mapped = reports.map((r) => {
      const originalLead = r.beforeSnapshot || {};

      const edited_fields = {};
      if (r.changedFields && typeof r.changedFields === 'object') {
        Object.keys(r.changedFields).forEach((k) => {
          edited_fields[k] = r.changedFields[k]?.after;
        });
      }

      return {
        original_lead: originalLead,
        edited_fields,
        report_id: r._id,
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

    const originalLead = report.beforeSnapshot || {};
    const edited_fields = {};
    if (report.changedFields && typeof report.changedFields === 'object') {
      Object.keys(report.changedFields).forEach((k) => {
        edited_fields[k] = report.changedFields[k]?.after;
      });
    }

    res.json({
      original_lead: originalLead,
      edited_fields,
      report_id: report._id,
      edited_by: report.editedBy ? { id: report.editedBy._id, name: report.editedBy.name, employee_id: report.editedBy.employeeId } : null,
      edited_at: report.editedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
