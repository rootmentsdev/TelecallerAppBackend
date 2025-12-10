import mongoose from "mongoose";

// Flat, dynamic Report schema — allow dynamic fields (before/after pairs)
const reportSchema = new mongoose.Schema({
  // Editor metadata
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  editedAt: { type: Date, default: Date.now },
  note: { type: String, default: "moved after edit" }
}, { timestamps: true, strict: false });

export default mongoose.model("Report", reportSchema);
