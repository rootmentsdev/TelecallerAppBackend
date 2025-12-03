import FollowUp from "../models/FollowUp.js";
import Lead from "../models/Lead.js";

// Create follow-up (from any call update screen)
export const createFollowUp = async (req, res) => {
  try {
    const { leadId, scheduledDate, remarks, priority } = req.body;

    const followUp = await FollowUp.create({
      lead: leadId,
      user: req.user.id,
      scheduledDate,
      remarks,
      priority: priority || "normal",
    });

    // Also store followUpDate on Lead for quick filters
    await Lead.findByIdAndUpdate(leadId, { followUpDate: scheduledDate });

    res.status(201).json({ message: "Follow-up created", followUp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark follow-up as completed / cancelled
export const updateFollowUpStatus = async (req, res) => {
  try {
    const { status } = req.body; // "completed" / "cancelled"

    const updated = await FollowUp.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({ message: "Follow-up updated", updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get follow-ups by filter: today / upcoming / overdue
export const getFollowUps = async (req, res) => {
  try {
    const { filter } = req.query; // "today" | "upcoming" | "overdue"
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = { user: req.user.id, status: "pending" };

    if (filter === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.scheduledDate = { $gte: today, $lt: tomorrow };
    } else if (filter === "upcoming") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.scheduledDate = { $gte: tomorrow };
    } else if (filter === "overdue") {
      query.scheduledDate = { $lt: today };
    }

    const followUps = await FollowUp.find(query)
      .populate("lead")
      .sort({ scheduledDate: 1 });

    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
