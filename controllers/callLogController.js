import CallLog from "../models/CallLog.js";

// Create log after a call
export const createCallLog = async (req, res) => {
  try {
    const { leadId, callStatus, durationSeconds, notes } = req.body;

    const log = await CallLog.create({
      lead: leadId,
      user: req.user.id,
      callStatus,
      durationSeconds: durationSeconds || 0,
      notes,
    });

    res.status(201).json({ message: "Call log saved", log });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Daily summary for home screen
export const getDailySummary = async (req, res) => {
  try {
    const { date } = req.query; // optional YYYY-MM-DD
    const target = date ? new Date(date) : new Date();
    target.setHours(0, 0, 0, 0);
    const next = new Date(target);
    next.setDate(next.getDate() + 1);

    const logs = await CallLog.aggregate([
      {
        $match: {
          user: req.user._id || req.user.id, // jwt payload has id
          callDate: { $gte: target, $lt: next },
        },
      },
      {
        $group: {
          _id: "$callStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to object structure
    const result = {
      "Connected": 0,
      "Not Connected": 0,
      "Call Back Later": 0,
      "Confirmed / Converted": 0,
      "Cancelled / Rejected": 0,
      total: 0,
    };

    logs.forEach((item) => {
      result[item._id] = item.count;
      result.total += item.count;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// For "Completed Calls" list
export const getCompletedCalls = async (req, res) => {
  try {
    const { date, callType } = req.query;
    const target = date ? new Date(date) : new Date();
    target.setHours(0, 0, 0, 0);
    const next = new Date(target);
    next.setDate(next.getDate() + 1);

    const logs = await CallLog.find({
      user: req.user.id,
      callDate: { $gte: target, $lt: next },
      // later we can filter by callType using leadType from populate
    })
      .populate("lead")
      .sort({ callDate: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
