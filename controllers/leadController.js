import Lead from "../models/Lead.js";

// Create new lead
export const createLead = async (req, res) => {
  try {
    const { name, phone, source, enquiryType, store } = req.body;

    const lead = await Lead.create({
      name,
      phone,
      source,
      enquiryType,
      store,
      createdBy: req.user._id
    });

    res.status(201).json({ message: "Lead created successfully", lead });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all leads (store filter will be added later)
export const getLeads = async (req, res) => {
  try {
    let leads;
    const filters = {};

    // Admin: can view all leads
    if (req.user.role === "admin") {
      leads = await Lead.find(filters)
        .populate("assignedTo", "name employeeId")
        .sort({ createdAt: -1 });
      return res.json(leads);
    }

    // Team Lead: see only leads in their store
    if (req.user.role === "teamLead") {
      leads = await Lead.find({
        ...filters,
        store: req.user.store,
      })
        .populate("assignedTo", "name employeeId")
        .sort({ createdAt: -1 });
      return res.json(leads);
    }

    // Telecaller: see only leads assigned to them
    if (req.user.role === "telecaller") {
      leads = await Lead.find({
        ...filters,
        assignedTo: req.user._id,
      })
        .populate("assignedTo", "name employeeId")
        .sort({ createdAt: -1 });
      return res.json(leads);
    }

    res.json([]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single lead
export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update lead (used in call update screens)
export const updateLead = async (req, res) => {
  try {
    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json({ message: "Lead updated", updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Optional delete
export const deleteLead = async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: "Lead deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
