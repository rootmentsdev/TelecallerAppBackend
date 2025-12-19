import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const simulateApi = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Simulate: GET /api/pages/leads?leadType=lossOfSale&page=1&limit=100
        // No store filter (Admin view)

        const query = { leadType: "lossOfSale" };

        const leads = await Lead.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .select("store createdAt visitDate enquiryDate");

        console.log(`Fetched ${leads.length} leads (Page 1).`);

        const dateCounts = {};
        leads.forEach(l => {
            const d = l.createdAt ? l.createdAt.toISOString().split('T')[0] : "NULL";
            dateCounts[d] = (dateCounts[d] || 0) + 1;
        });

        console.log("Date distribution on Page 1:");
        console.log(JSON.stringify(dateCounts, null, 2));

        // Check if 17th is present
        const has17 = leads.some(l => l.createdAt && l.createdAt.toISOString().startsWith("2025-12-17"));
        console.log("Has 17th data?", has17);

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

simulateApi();
