import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const checkLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const assignedLeads = await Lead.find({ assignedTo: { $ne: null } }).populate("assignedTo");

        const stats = {};
        assignedLeads.forEach(l => {
            const empId = l.assignedTo?.employeeId || "Unknown";
            stats[empId] = (stats[empId] || 0) + 1;
        });

        let output = "Leads assignment stats:\n";
        for (const [empId, count] of Object.entries(stats)) {
            output += `- ${empId}: ${count} leads\n`;
        }

        const unassignedCount = await Lead.countDocuments({ assignedTo: null });
        output += `\nUnassigned leads: ${unassignedCount}\n`;

        fs.writeFileSync("lead_assignment_stats.txt", output);
        console.log("Output written to lead_assignment_stats.txt");

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkLeads();
