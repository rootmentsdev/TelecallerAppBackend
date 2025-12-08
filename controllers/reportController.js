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

    res.json({
      reports,
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
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
