import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    store: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        default: "",
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["admin", "teamLead", "telecaller"],
        default: "telecaller",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model("User", userSchema);
