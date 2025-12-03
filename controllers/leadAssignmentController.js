import Lead from "../models/Lead.js";

export const assignSingleLead = async (req, res) => {
  try {
    const { leadId, telecallerId } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    lead.assignedTo = telecallerId;
    lead.assignedAt = new Date();

    await lead.save();

    res.json({
      success: true,
      message: "Lead assigned successfully",
      lead,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignBulkLeads = async (req, res) => {
  try {
    const { leadIds, telecallerId } = req.body;

    await Lead.updateMany(
      { _id: { $in: leadIds } },
      {
        $set: {
          assignedTo: telecallerId,
          assignedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: "Bulk assignment completed",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

