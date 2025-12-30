import mongoose from "mongoose";

// Global sync lock schema - ensures only one sync cycle runs at a time
const syncLockSchema = new mongoose.Schema(
  {
    lockName: {
      type: String,
      required: true,
      unique: true,
      default: "GLOBAL_API_SYNC",
    },
    lockedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lockedBy: {
      type: String,
      default: "scheduler", // "scheduler" or "manual"
    },
    status: {
      type: String,
      enum: ["active", "completed", "failed"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Index for faster queries
syncLockSchema.index({ lockName: 1 });
syncLockSchema.index({ status: 1, lockedAt: 1 });

// TTL index to auto-cleanup stale locks (24 hours)
syncLockSchema.index({ lockedAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model("SyncLock", syncLockSchema);
