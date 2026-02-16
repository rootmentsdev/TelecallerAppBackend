import mongoose from "mongoose";

// Flat, dynamic Report schema — allow dynamic fields (before/after pairs)
const reportSchema = new mongoose.Schema({
  // Editor metadata
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  editedByEmpId: { type: String }, // NEW
  editedByName: { type: String }, // NEW
  editedAt: { type: Date, default: Date.now },

  // Creation metadata (first time)
  createdByEmpId: { type: String }, // NEW
  createdByName: { type: String }, // NEW

  note: { type: String, default: null },
  // Call duration in seconds
  callDuration: { type: Number, default: 0, index: true },

  // Explicitly defined fields for consistency across collections
  leadType: { type: String, default: "enquiry", index: true },
  functionDate: { type: Date, default: null },
  subCategory: { type: String, default: null },
  itemCategory: { type: String, default: null },
  service: { type: String, default: null }, // NEW
  numberOfFunctions: { type: Number, default: 0 }, // NEW
  numberOfAttires: { type: Number, default: 0 }, // NEW
  competitor: { type: String, default: null }, // NEW
  closingAction: { type: String, default: null },

  remarks: { type: String, default: "" },
  lead_status: { type: String, default: "" },
  call_status: { type: String, default: "" }
}, { timestamps: true, strict: false });

export default mongoose.model("Report", reportSchema);
