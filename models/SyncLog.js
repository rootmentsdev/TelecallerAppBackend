import mongoose from "mongoose";

const syncLogSchema = new mongoose.Schema(
  {
    syncType: {
      type: String,
      enum: ["booking", "rentout", "walkin", "lossofsale", "store"],
      required: true,
      unique: true, // Only one log per sync type
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

// Index for faster queries (unique index is already created by unique: true above, so we don't need this)
// syncLogSchema.index({ syncType: 1 }); // Removed to avoid duplicate index warning

export default mongoose.model("SyncLog", syncLogSchema);

