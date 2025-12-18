import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        let output = "";
        const stores = await Lead.distinct("store", { store: /Edappally/i });
        output += "Unique store names containing 'Edappally':\n";
        stores.forEach(s => output += `'${s}'\n`);

        output += "\nSample leads for Edappally:\n";
        const leads = await Lead.find({ store: /Edappally/i }).limit(20).select("store name leadType");
        leads.forEach(l => output += `Store: '${l.store}', Name: ${l.name}, Type: ${l.leadType}\n`);

        fs.writeFileSync("debug_output.txt", output);
        console.log("Results written to debug_output.txt");

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

run();
