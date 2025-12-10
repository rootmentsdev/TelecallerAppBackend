import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  // flattened lead data as returned by the leads list API
  leadData: { type: mongoose.Schema.Types.Mixed, required: true },
  // user who edited/moved the lead
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // when the edit happened
  editedAt: { type: Date, default: Date.now },
  // which fields were edited (before/after)
  editedFields: { type: mongoose.Schema.Types.Mixed },
  // optional human-readable note
  note: { type: String, default: "moved after edit" }
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
