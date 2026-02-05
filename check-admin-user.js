
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const checkAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");

        const admins = await User.find({
            role: { $in: ['admin', 'super_admin'] }
        }).select('name email employeeId role');

        if (admins.length === 0) {
            console.log("❌ No admins found in database.");
        } else {
            console.log(`✅ Found ${admins.length} admin(s):`);
            admins.forEach(admin => {
                console.log(`- [${admin.role}] ${admin.name} (ID: ${admin.employeeId}, Email: ${admin.email})`);
            });
        }

    } catch (err) {
        console.error("Error checking admins:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
        process.exit(0);
    }
};

checkAdmins();
