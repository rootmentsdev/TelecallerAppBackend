import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const debugLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Check latest Rent-Out Lead
        const latestRentOut = await Lead.findOne({ leadType: "rentOutFeedback" }).sort({ createdAt: -1 });

        if (latestRentOut) {
            console.log("\n📊 Latest Rent-Out Lead:");
            console.log(`- ID: ${latestRentOut._id}`);
            console.log(`- Name: ${latestRentOut.name}`);
            console.log(`- Lead Type: ${latestRentOut.leadType}`);
            console.log(`- Store: ${latestRentOut.store}`);
            console.log(`- Assigned To: ${latestRentOut.assignedTo}`);
            console.log(`- Created At: ${latestRentOut.createdAt}`);
            console.log(`- Booking No: ${latestRentOut.bookingNo}`);
        } else {
            console.log("\n⚠️ No Rent-Out leads found!");
        }

        // 2. Check latest Booking Lead
        const latestBooking = await Lead.findOne({ leadType: "bookingConfirmation" }).sort({ createdAt: -1 });

        if (latestBooking) {
            console.log("\n📊 Latest Booking Lead:");
            console.log(`- ID: ${latestBooking._id}`);
            console.log(`- Name: ${latestBooking.name}`);
            console.log(`- Lead Type: ${latestBooking.leadType}`);
            console.log(`- Store: ${latestBooking.store}`);
            console.log(`- Assigned To: ${latestBooking.assignedTo}`);
            console.log(`- Created At: ${latestBooking.createdAt}`);
            console.log(`- Booking No: ${latestBooking.bookingNo}`);
        } else {
            console.log("\n⚠️ No Booking leads found!");
        }

        // 3. Check for specific problematic record if known (from user's screenshot or logs)
        // User mentioned deleting 2 records. 
        // They are likely unassigned.

        await mongoose.connection.close();
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
};

debugLeads();
