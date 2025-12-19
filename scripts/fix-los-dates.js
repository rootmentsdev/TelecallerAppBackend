import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const fixDates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const leads = await Lead.find({ leadType: "lossOfSale", enquiryDate: null });
        console.log(`Found ${leads.length} leads to fix.`);

        let fixedCount = 0;
        for (const lead of leads) {
            if (lead.visitDate) {
                lead.enquiryDate = lead.visitDate;
                await lead.save();
                fixedCount++;
            }
        }

        console.log(`Updated ${fixedCount} Loss of Sale leads.`);

        await mongoose.connection.close();
    } catch (err) {
        console.error("Error:", err);
    }
};

fixDates();
