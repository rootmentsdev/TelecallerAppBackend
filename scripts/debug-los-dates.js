import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const debugDates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Find LoS leads created/imported recently
        const leads = await Lead.find({ leadType: "lossOfSale" }).sort({ visitDate: 1 });

        const distribution = {};
        leads.forEach(l => {
            const vDate = l.visitDate ? l.visitDate.toISOString().split('T')[0] : "NULL";
            const eDate = l.enquiryDate ? l.enquiryDate.toISOString().split('T')[0] : "NULL";
            const key = `Visit: ${vDate} | Enquiry: ${eDate}`;
            distribution[key] = (distribution[key] || 0) + 1;
        });

        let output = `Found ${leads.length} Loss of Sale leads.\n`;
        Object.entries(distribution).forEach(([key, count]) => {
            output += `${key}: ${count}\n`;
        });

        fs.writeFileSync("debug_dates_output.txt", output);
        console.log("Written to debug_dates_output.txt");

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

debugDates();
