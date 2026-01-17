import mongoose from "mongoose";

// Complaint schema - for leads marked as complaints
// Stores all lead fields directly (flattened structure, no snapshot)
const complaintSchema = new mongoose.Schema(
  {
    // Basic Information (Required)
    name: { type: String, required: true },
    phone: { type: String, required: true },
    store: { type: String, required: true },

    // Source and Type
    source: { type: String },
    leadType: {
      type: String,
      enum: ["enquiry", "return", "booked", "lossOfSale"],
      default: "enquiry"
    },
    brand: { type: String },
    subCategory: { type: String, default: null },
    itemCategory: { type: String, default: null },

    // Dates
    enquiryDate: { type: Date },
    visitDate: { type: Date },
    functionDate: { type: Date },
    returnDate: { type: Date },
    callDate: { type: Date }, // Date when call was made
    followUpDate: { type: Date },

    // Booking/Rent-Out Information
    bookingNo: { type: String },
    securityAmount: { type: Number },

    // Status Fields
    callStatus: { type: String, default: "Not Called" },
    leadStatus: { type: String, default: "No Status" },
    closingStatus: { type: String }, // For Just Dial page (Legacy support if needed, or remove? Keeping for schema compat)
    closingAction: { type: String, default: null },

    // Follow-up
    followUpFlag: { type: Boolean, default: false },

    // Additional Information
    reason: { type: String }, // For Just Dial page
    reasons: { type: String, default: null },
    reasonCollectedFromStore: { type: String }, // For Loss of Sale page
    rating: { type: Number, min: 1, max: 5 }, // For Rent-Out page
    attendedBy: { type: String },
    remarks: { type: String, default: "" },

    // Call Duration (in seconds)
    callDuration: { type: Number, default: 0 },

    // User Tracking (from original lead)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt: { type: Date },

    // Complaint-specific fields
    complaintMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    complaintMarkedAt: { type: Date, default: Date.now },

    // Reference to original lead (for audit trail)
    sourceLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
  },
  { timestamps: true }
);

// Indexes for faster queries
complaintSchema.index({ phone: 1 });
complaintSchema.index({ leadType: 1 });
complaintSchema.index({ store: 1 });
complaintSchema.index({ complaintMarkedBy: 1 });
complaintSchema.index({ complaintMarkedAt: -1 });
complaintSchema.index({ createdAt: -1 });

export default mongoose.model("Complaint", complaintSchema);
