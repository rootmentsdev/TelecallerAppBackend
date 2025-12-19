import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const checkAssignments = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Check 17th
        const count17 = await Lead.countDocuments({
            leadType: "lossOfSale",
            createdAt: { $gte: new Date("2025-12-17") }
        });
        console.log(`17th Leads: ${count17}`);

        // Check 16th
        const count16 = await Lead.countDocuments({
            leadType: "lossOfSale",
            createdAt: {
                $gte: new Date("2025-12-16"),
                $lt: new Date("2025-12-17")
            }
        });
        console.log(`16th Leads: ${count16}`);

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkAssignments();
