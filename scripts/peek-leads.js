import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const peekLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const leads = await Lead.find({}).limit(5);
        console.log(JSON.stringify(leads, null, 2));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

peekLeads();
