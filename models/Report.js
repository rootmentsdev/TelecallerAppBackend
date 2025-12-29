import mongoose from "mongoose";

// Flat, dynamic Report schema — allow dynamic fields (before/after pairs)
const reportSchema = new mongoose.Schema({
  // Editor metadata
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  editedAt: { type: Date, default: Date.now },
  note: { type: String, default: null },
  // Call duration in seconds
  callDuration: { type: Number, default: 0, index: true }
}, { timestamps: true, strict: false });

export default mongoose.model("Report", reportSchema);
