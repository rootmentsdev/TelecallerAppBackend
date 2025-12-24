import mongoose from "mongoose";

const syncLogSchema = new mongoose.Schema(
  {
    syncType: {
      type: String,
      enum: ["booking", "return", "walkin", "lossofsale", "store"],
      required: true,
      // unique: true, // Removed to allow history
    },
    trigger: {
      type: String,
      enum: ["manual", "auto"],
      default: "auto",
    },
    lastSyncAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastSyncCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["success", "failed", "partial"],
      default: "success",
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
syncLogSchema.index({ syncType: 1, lastSyncAt: -1 });

export default mongoose.model("SyncLog", syncLogSchema);

