import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const users = await User.find({});

        let output = "All users:\n";
        users.forEach(u => {
            output += `- ${u.name} (EmployeeID: ${u.employeeId}, Role: ${u.role}, Store: ${u.store}, ID: ${u._id})\n`;
        });

        fs.writeFileSync("all_users_output.txt", output);
        console.log("Output written to all_users_output.txt");

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkUsers();
