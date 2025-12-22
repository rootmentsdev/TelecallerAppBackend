import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    // Basic Information (Required)
    name: { type: String, required: true },
    phone: { type: String, required: true },
    store: { type: String, required: true },
    
    // Source and Type
    source: { type: String }, // Instagram, JustDial, Walk-in, Loss of Sale, etc.
    leadType: { 
      type: String, 
      enum: ["lossOfSale", "return", "bookingConfirmation", "justDial", "general"],
      default: "general" 
    },
    brand: { type: String }, // For Add Lead page
    
    // Dates
    enquiryDate: { type: Date },
    visitDate: { type: Date }, // For Loss of Sale page
    functionDate: { type: Date },
    returnDate: { type: Date }, // For Rent-Out page
    callDate: { type: Date }, // Date when call was made
    followUpDate: { type: Date },
    
    // Booking/Rent-Out Information
    bookingNo: { type: String },
    securityAmount: { type: Number },
    
    // Status Fields
    callStatus: { type: String, default: "Not Called" },
    leadStatus: { type: String, default: "No Status" },
    closingStatus: { type: String }, // For Just Dial page
    
    // Follow-up
    followUpFlag: { type: Boolean, default: false },
    
    // Additional Information
    reason: { type: String }, // For Just Dial page
    reasonCollectedFromStore: { type: String }, // For Loss of Sale page
    rating: { type: Number, min: 1, max: 5 }, // For Rent-Out page
    attendedBy: { type: String },
    remarks: { type: String, default: "" },
    
    // User Tracking
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for faster queries
leadSchema.index({ phone: 1 });
leadSchema.index({ leadType: 1 });
leadSchema.index({ store: 1 });
leadSchema.index({ assignedTo: 1 });
// Compound index for duplicate checking (loss of sale, booking, rent-out)
leadSchema.index({ phone: 1, name: 1, leadType: 1, store: 1 });
leadSchema.index({ bookingNo: 1, phone: 1, leadType: 1 });

export default mongoose.model("Lead", leadSchema);
