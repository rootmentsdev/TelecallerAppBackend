import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../models/Lead.js';

dotenv.config();

const checkAssignment = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const total = await Lead.countDocuments({ leadType: 'bookingConfirmation' });
        const unassigned = await Lead.countDocuments({ leadType: 'bookingConfirmation', assignedTo: null });
        const sample = await Lead.findOne({ leadType: 'bookingConfirmation' });

        console.log('--- Booking Data Check ---');
        console.log(`Total Bookings in DB: ${total}`);
        console.log(`Unassigned Bookings: ${unassigned}`);

        if (sample) {
            console.log('\n--- Sample Record Fields ---');
            console.log(`Name: ${sample.name}`);
            console.log(`Store: ${sample.store}`);
            console.log(`LeadType: ${sample.leadType}`);
            console.log(`Source: ${sample.source}`);
        } else {
            console.log('\n❌ No records found with leadType: "bookingConfirmation"');
            const any = await Lead.findOne();
            if (any) console.log(`Note: Found other leads with leadType: "${any.leadType}"`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkAssignment();
