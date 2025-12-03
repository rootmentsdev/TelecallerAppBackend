import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },

    source: { type: String },          // Instagram, JustDial, Walk-in, etc.
    enquiryType: { type: String },     // Wedding Suit, Bridal, Rent-out, etc.
    store: { type: String, required: true },

    // Call category for reports & UI tabs
    // "lossOfSale", "rentOutFeedback", "bookingConfirmation", "justDial", "general"
    leadType: {
      type: String,
      default: "general",
    },

    // Booking / rent-out specific fields (optional)
    enquiryDate: { type: Date },
    functionDate: { type: Date },
    bookingNo: { type: String },
    securityAmount: { type: Number },
    returnDate: { type: Date },
    closingStatus: { type: String },     // Already Visited, Not Interested, etc.
    reason: { type: String },            // Reason collected from store
    rating: { type: Number, min: 1, max: 5 },

    // Call updates
    callStatus: { type: String, default: "Not Called" }, // Connected, Not Connected, Busy, etc.
    leadStatus: { type: String, default: "No Status" },  // Interested, Not Interested, etc.

    remarks: { type: String, default: "" },

    // Follow-up
    followUpDate: { type: Date },

    // For completed calls / attended by
    attendedBy: { type: String },

    // who created the lead in app
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Lead assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
