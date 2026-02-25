import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    // Basic Information
    name: { type: String, required: false },
    phone: { type: String, required: true },
    store: { type: String, required: true },

    // Source and Type
    source: { type: String },
    // leadType: "booked" = manual entry; "bookingconfirmation" = API sync (GetBookingReport). Keep them separate.
    leadType: {
      type: String,
      enum: ["enquiry", "return", "booked", "lossOfSale", "bookingconfirmation"],
      default: "enquiry"
    },
    brand: { type: String }, // For Add Lead page
    subCategory: { type: String, default: null },
    itemCategory: { type: String, default: null },

    // Dates
    enquiryDate: { type: Date },
    visitDate: { type: Date }, // For Loss of Sale page
    functionDate: { type: Date },
    returnDate: { type: Date }, // For Rent-Out page
    callDate: { type: Date }, // Date when call was made
    followUpDate: { type: Date },

    // Booking/Rent-Out Information
    bookingNo: { type: String },
    securityAmount: { type: mongoose.Schema.Types.Mixed },
    service: { type: String },
    numberOfFunctions: { type: Number },
    numberOfAttires: { type: Number },
    competitor: { type: String },
    // Booking Confirmation API fields (GetBookingReport)
    itemCode: { type: String },
    itemName: { type: String },
    paymentType: { type: String },
    measurement: { type: String },
    address: { type: String },
    bookingDate: { type: Date },
    deliveryDate: { type: Date },
    rentOutDate: { type: Date },
    expectedReturnDate: { type: Date },
    trialDate: { type: Date },
    cancelDate: { type: Date },
    category: { type: String },
    price: { type: mongoose.Schema.Types.Mixed },

    // Status Fields
    callStatus: { type: String, default: "Not Called" },
    leadStatus: { type: String, default: "No Status" },
    closingStatus: { type: String },
    closingAction: { type: String, default: null },

    // Follow-up
    followUpFlag: { type: Boolean, default: false },

    // Additional Information

    reasonCollectedFromStore: { type: String }, // For Loss of Sale page
    rating: { type: Number, min: 1, max: 5 }, // For Rent-Out page
    attendedBy: { type: String },
    remarks: { type: String, default: "" },

    // Call Duration (in seconds)
    callDuration: { type: Number, default: 0 },

    // User Tracking
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt: { type: Date },

    // Return-lead only: refund status (snake_case from frontend)
    refund_status: { type: String, default: null },
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

// CRITICAL: Unique partial index for return and bookingconfirmation leads
// Prevents duplicates at database level, even under concurrent syncs
// Only applies to return/bookingconfirmation leads with bookingNo
// UPDATED: Now includes brand and store to allow same BookingNo across different brands/stores
// Only applies to return leads with bookingNo
leadSchema.index(
  { bookingNo: 1, phone: 1, leadType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      leadType: { $in: ["return", "bookingconfirmation"] },
      bookingNo: { $exists: true, $ne: "" }
    },
    name: "unique_booking_return_index"
  }
);

// CRITICAL: Unique partial index for lossOfSale and enquiry leads
// Prevents duplicates at database level, even under concurrent syncs/CSV imports
// Only applies to lossOfSale and enquiry leads
// Index on: name, phone, leadType, store (base duplicate criteria)
leadSchema.index(
  { name: 1, phone: 1, leadType: 1, store: 1 },
  {
    unique: true,
    partialFilterExpression: {
      leadType: { $in: ["lossOfSale", "enquiry"] }
    },
    name: "unique_lossOfSale_general_index" // Keeping name for compatibility or rename if safe? Let's keep name but comment
  }
);

export default mongoose.model("Lead", leadSchema);
