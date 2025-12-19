import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const debugDates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Find LoS leads
        const leads = await Lead.find({ leadType: "lossOfSale" }).sort({ createdAt: -1 });

        // Group by createdAt
        const distribution = {};
        leads.forEach(l => {
            const cDate = l.createdAt ? l.createdAt.toISOString().split('T')[0] : "NULL";
            distribution[cDate] = (distribution[cDate] || 0) + 1;
        });

        let output = `Found ${leads.length} Loss of Sale leads.\n`;
        output += "CreatedAt Distribution:\n";
        Object.entries(distribution).forEach(([key, count]) => {
            output += `${key}: ${count}\n`;
        });

        fs.writeFileSync("debug_createdat.txt", output);
        console.log("Written to debug_createdat.txt");

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

debugDates();
