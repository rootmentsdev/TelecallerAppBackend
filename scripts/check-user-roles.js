import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const employeesToCheck = ["Emp138", "Emp188", "Emp233", "Emp345", "Emp410", "Emp436"];

        const users = await User.find({ employeeId: { $in: employeesToCheck } });

        let output = "Found users:\n";
        users.forEach(u => {
            output += `- ${u.name} (ID: ${u.employeeId}, Role: ${u.role}, Store: ${u.store})\n`;
        });

        const admins = await User.find({ role: "admin" });
        output += "\nAdmin users:\n";
        admins.forEach(u => {
            output += `- ${u.name} (ID: ${u.employeeId}, Role: ${u.role})\n`;
        });

        fs.writeFileSync("user_check_output.txt", output);
        console.log("Output written to user_check_output.txt");

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkUsers();
