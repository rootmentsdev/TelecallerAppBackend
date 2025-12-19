import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const findUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const user = await User.findOne({ employeeId: /138/ });
        if (user) {
            console.log("Found user with 138:", user);
        } else {
            console.log("No user found with 138 in employeeId");

            // Check ALL employee IDs
            const all = await User.find({}, 'employeeId name');
            console.log("All employee IDs:", all);
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

findUser();
