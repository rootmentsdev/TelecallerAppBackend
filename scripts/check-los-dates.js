import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

const checkEnquiryDate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const countTotal = await Lead.countDocuments({ leadType: "lossOfSale" });
        const countWithEnquiry = await Lead.countDocuments({ leadType: "lossOfSale", enquiryDate: { $ne: null } });
        const countWithVisit = await Lead.countDocuments({ leadType: "lossOfSale", visitDate: { $ne: null } });

        console.log(`Total Loss of Sale leads: ${countTotal}`);
        console.log(`Leads with enquiryDate: ${countWithEnquiry}`);
        console.log(`Leads with visitDate: ${countWithVisit}`);

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkEnquiryDate();
