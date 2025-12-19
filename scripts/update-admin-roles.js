import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const updateRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const adminIds = ["Emp188", "Emp233", "Emp345", "Emp410", "Emp436"];

        const result = await User.updateMany(
            { employeeId: { $in: adminIds } },
            { $set: { role: "admin" } }
        );

        console.log(`Updated ${result.modifiedCount} users to admin role.`);

        const users = await User.find({ employeeId: { $in: adminIds } });
        console.log("Current state of requested users:");
        users.forEach(u => {
            console.log(`- ${u.name} (ID: ${u.employeeId}, Role: ${u.role})`);
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

updateRoles();
