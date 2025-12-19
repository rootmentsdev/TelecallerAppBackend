import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const debugStore = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Find LoS leads
        const leads = await Lead.find({ leadType: "lossOfSale" });

        // Group by Store and Date
        const distribution = {};
        leads.forEach(l => {
            const cDate = l.createdAt ? l.createdAt.toISOString().split('T')[0] : "NULL";
            const store = l.store || "Unknown";
            const key = `${cDate} | ${store}`;
            distribution[key] = (distribution[key] || 0) + 1;
        });

        let output = `Found ${leads.length} Loss of Sale leads.\n`;
        output += "Date | Store Distribution:\n";
        Object.entries(distribution).sort().forEach(([key, count]) => {
            output += `${key}: ${count}\n`;
        });

        fs.writeFileSync("debug_store.txt", output);
        console.log("Written to debug_store.txt");

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

debugStore();
