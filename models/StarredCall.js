import mongoose from "mongoose";

// StarredCall schema - for leads marked as issues
// Similar to FollowUp but specifically for issue tracking
const starredCallSchema = new mongoose.Schema(
  {
    // Full lead snapshot (preserves all lead data)
    leadSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    
    // Issue-specific fields
    remarks: { type: String, default: "" },
    issueMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    issueMarkedAt: { type: Date, default: Date.now },
    
    // Reference to original lead (for audit trail)
    sourceLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    
    // Common fields for easier querying (extracted from leadSnapshot)
    name: { type: String },
    phone: { type: String },
    store: { type: String },
    leadType: { 
      type: String, 
      enum: ["lossOfSale", "return", "bookingConfirmation", "justDial", "general"],
    },
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
