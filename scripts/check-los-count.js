import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const countLOS = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const count = await Lead.countDocuments({ leadType: "lossOfSale" });
        const sample = await Lead.find({ leadType: "lossOfSale" }).limit(5);

        let output = `Total Loss of Sale leads: ${count}\n\n`;
        output += "Samples:\n" + JSON.stringify(sample, null, 2);

        fs.writeFileSync("los_count_output.txt", output);
        console.log("Output written to los_count_output.txt");

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

countLOS();
