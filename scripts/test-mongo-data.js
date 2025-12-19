import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const testMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Count total Rent-Out leads and show the most recent one
        const rentoutCount = await Lead.countDocuments({ leadType: "rentOutFeedback" });
        const latestRentout = await Lead.findOne({ leadType: "rentOutFeedback" }).sort({ createdAt: -1 });

        // Count total Booking leads and show the most recent one
        const bookingCount = await Lead.countDocuments({ leadType: "bookingConfirmation" });
        const latestBooking = await Lead.findOne({ leadType: "bookingConfirmation" }).sort({ createdAt: -1 });

        console.log(`\n📊 Rent-Out Leads: ${rentoutCount}`);
        if (latestRentout) {
            console.log(`   Latest Record Date: ${latestRentout.createdAt}`);
            console.log(`   Sample Name: ${latestRentout.name}`);
        }

        console.log(`\n📊 Booking Leads: ${bookingCount}`);
        if (latestBooking) {
            console.log(`   Latest Record Date: ${latestBooking.createdAt}`);
            console.log(`   Sample Name: ${latestBooking.name}`);
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
};

testMongo();
