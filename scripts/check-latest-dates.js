import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const checkLatest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const latestBooking = await Lead.findOne({ leadType: "bookingConfirmation" }).sort({ createdAt: -1 });
        const latestRentout = await Lead.findOne({ leadType: "rentOutFeedback" }).sort({ createdAt: -1 });

        console.log("Latest Booking CreatedAt:", latestBooking ? latestBooking.createdAt : "None");
        console.log("Latest Rentout CreatedAt:", latestRentout ? latestRentout.createdAt : "None");

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkLatest();
