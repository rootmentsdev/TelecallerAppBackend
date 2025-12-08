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

    // Helper to convert changedFields (before/after) into a simple edited_fields map using listSnapshot keys
    const fieldMap = {
      callStatus: "call_status",
      leadStatus: "lead_status",
      followUpDate: "follow_up_date",
      callDate: "call_date",
      reasonCollectedFromStore: "reason_collected_from_store",
      remarks: "remarks",
      closingStatus: "closing_status",
      rating: "rating",
      bookingNo: "booking_number",
      visitDate: "visit_date",
      returnDate: "return_date",
      securityAmount: "security_amount",
      attendedBy: "attended_by",
    };

    const mapped = reports.map((r) => {
      const list = r.listSnapshot || {};

      // Build edited_fields: map each changedFields key to the corresponding listSnapshot key and value
      const edited_fields = {};
      if (r.changedFields && typeof r.changedFields === "object") {
        Object.keys(r.changedFields).forEach((k) => {
          const listKey = fieldMap[k] || k;
          // Prefer value from listSnapshot (already formatted) otherwise use .after
          const valFromList = list[listKey];
          const afterVal = r.changedFields[k]?.after;
          edited_fields[listKey] = valFromList !== undefined ? valFromList : afterVal;
        });
      }

      // Return flattened object matching lead list + edited_fields
      return {
        ...list,
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
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
