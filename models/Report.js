import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  originalLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
  // full snapshot before the edit
  beforeSnapshot: { type: mongoose.Schema.Types.Mixed },
  // full snapshot after the edit
  leadSnapshot: { type: mongoose.Schema.Types.Mixed },
  // flattened snapshot matching the leads list API format
  listSnapshot: { type: mongoose.Schema.Types.Mixed },
  leadType: { type: String, index: true },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  editedAt: { type: Date, default: Date.now },
  // store which fields were changed during the edit (per-field before/after)
  changedFields: { type: mongoose.Schema.Types.Mixed },
  // optional human-readable note
  note: { type: String, default: "moved after edit" }
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
