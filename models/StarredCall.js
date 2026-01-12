import mongoose from "mongoose";

// StarredCall schema - for leads marked as issues
// Stores all lead fields directly (flattened structure, no snapshot)
const starredCallSchema = new mongoose.Schema(
  {
    // Basic Information (Required)
    name: { type: String, required: true },
    phone: { type: String, required: true },
    store: { type: String, required: true },
    
    // Source and Type
    source: { type: String },
    leadType: { 
      type: String, 
      enum: ["lossOfSale", "return", "bookingConfirmation", "justDial", "general"],
      default: "general"
    },
    brand: { type: String },
    
    // Dates
    enquiryDate: { type: Date },
    visitDate: { type: Date },
    functionDate: { type: Date },
    returnDate: { type: Date },
    callDate: { type: Date },
    followUpDate: { type: Date },
    
    // Booking/Rent-Out Information
    bookingNo: { type: String },
    securityAmount: { type: Number },
    
    // Status Fields
    callStatus: { type: String, default: "Not Called" },
    leadStatus: { type: String, default: "No Status" },
    closingStatus: { type: String },
    
    // Follow-up
    followUpFlag: { type: Boolean, default: false },
    
    // Additional Information
    reason: { type: String },
    reasonCollectedFromStore: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    attendedBy: { type: String },
    remarks: { type: String, default: "" },
    
    // Call Duration (in seconds)
    callDuration: { type: Number, default: 0 },
    
    // User Tracking (from original lead)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt: { type: Date },
    
    // Issue-specific fields
    issueMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    issueMarkedAt: { type: Date, default: Date.now },
    
    // Reference to original lead (for audit trail)
    sourceLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
  },
  { timestamps: true }
);

// Indexes for faster queries
starredCallSchema.index({ phone: 1 });
starredCallSchema.index({ leadType: 1 });
starredCallSchema.index({ store: 1 });
starredCallSchema.index({ issueMarkedBy: 1 });
starredCallSchema.index({ issueMarkedAt: -1 });
starredCallSchema.index({ createdAt: -1 });

export default mongoose.model("StarredCall", starredCallSchema);
