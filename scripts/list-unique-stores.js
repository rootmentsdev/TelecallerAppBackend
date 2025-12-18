import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const stores = await Lead.distinct("store");
        console.log("Unique stores in database:");
        stores.sort().forEach(s => console.log(`'${s}'`));
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

run();
