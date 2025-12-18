import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const stats = await Lead.aggregate([
            { $match: { leadType: "lossOfSale" } },
            { $group: { _id: "$store", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        console.log("Loss of Sale counts by store:");
        stats.forEach(s => console.log(`${s._id}: ${s.count}`));

        const total = stats.reduce((acc, s) => acc + s.count, 0);
        console.log(`\nTotal: ${total}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

run();
