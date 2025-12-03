import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    callStatus: {
      type: String,
      enum: [
        "Connected",
        "Not Connected",
        "Call Back Later",
        "Confirmed / Converted",
        "Cancelled / Rejected",
      ],
      required: true,
    },

    durationSeconds: { type: Number, default: 0 }, // 0 for not connected etc.
    notes: { type: String, default: "" },

    callDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CallLog", callLogSchema);
