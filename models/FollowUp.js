import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    scheduledDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },

    remarks: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["normal", "urgent"],
      default: "normal",
    },
  },
  { timestamps: true }
);

export default mongoose.model("FollowUp", followUpSchema);
