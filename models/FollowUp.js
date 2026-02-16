import mongoose from "mongoose";

// FollowUp schema - matches Lead schema plus edited fields
// FollowUp is a workflow state (not a leadType)
const followUpSchema = new mongoose.Schema(
  {
    // Basic Information
    name: { type: String, required: false },
    phone: { type: String, required: true },
    store: { type: String, required: true },

    // Source and Type - same as Lead
    source: { type: String },
    leadType: {
      type: String,
      enum: ["enquiry", "return", "booked", "lossOfSale"],
      default: "enquiry"
    },
    brand: { type: String },
    subCategory: { type: String, default: null },
    itemCategory: { type: String, default: null },

    // Dates - same as Lead
    enquiryDate: { type: Date },
    visitDate: { type: Date },
    functionDate: { type: Date },
    returnDate: { type: Date },
    callDate: { type: Date },
    followUpDate: { type: Date },

    // Booking/Rent-Out Information - same as Lead
    bookingNo: { type: String },
    securityAmount: { type: mongoose.Schema.Types.Mixed },
    service: { type: String }, // NEW
    numberOfFunctions: { type: Number }, // NEW
    numberOfAttires: { type: Number }, // NEW
    competitor: { type: String }, // NEW

    // Status Fields - same as Lead (these are edited fields)
    callStatus: { type: String, default: "Not Called" },
    leadStatus: { type: String, default: "No Status" },
    closingStatus: { type: String },
    closingAction: { type: String, default: null },

    // Follow-up - same as Lead
    followUpFlag: { type: Boolean, default: false },

    // Additional Information - same as Lead

    reasonCollectedFromStore: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    attendedBy: { type: String },
    remarks: { type: String, default: "" },

    // Call Duration (in seconds) - NEW FIELD
    callDuration: { type: Number, default: 0 },

    // User Tracking - same as Lead
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt: { type: Date },

    // Track when moved to FollowUp
    movedToFollowUpAt: { type: Date, default: Date.now },

    // Auditing fields (Consistent across collections)
    editedByEmpId: { type: String }, // NEW
    editedByName: { type: String }, // NEW
    editedAt: { type: Date }, // NEW
    createdByEmpId: { type: String }, // NEW
    createdByName: { type: String }, // NEW
    movedToFollowUpBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Return-lead only: refund status (preserved across workflow)
    refund_status: { type: String, default: null },
  },
  { timestamps: true }
);

// Index for faster queries (same as Lead)
followUpSchema.index({ phone: 1 });
followUpSchema.index({ leadType: 1 });
followUpSchema.index({ store: 1 });
followUpSchema.index({ assignedTo: 1 });
followUpSchema.index({ phone: 1, name: 1, leadType: 1, store: 1 });
followUpSchema.index({ bookingNo: 1, phone: 1, leadType: 1 });

export default mongoose.model("FollowUp", followUpSchema);
