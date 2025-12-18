import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const stores = await Lead.distinct("store", { store: /Edappally/i });
        console.log("Unique store names containing 'Edappally':");
        stores.forEach(s => console.log(`'${s}'`));

        console.log("\nSample leads for Edappally:");
        const leads = await Lead.find({ store: /Edappally/i }).limit(5).select("store name leadType");
        leads.forEach(l => console.log(`Store: '${l.store}', Name: ${l.name}, Type: ${l.leadType}`));

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

run();
