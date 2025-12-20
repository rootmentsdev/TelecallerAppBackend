import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from './models/Lead.js';

dotenv.config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const total = await Lead.countDocuments();
        const bookings = await Lead.countDocuments({ leadType: 'bookingConfirmation' });
        const returns = await Lead.countDocuments({ leadType: 'rentOutFeedback' });
        const lossOfSale = await Lead.countDocuments({ leadType: 'lossOfSale' });

        console.log('--- Database Stats ---');
        console.log(`Total Leads: ${total}`);
        console.log(`Bookings: ${bookings}`);
        console.log(`Returns: ${returns}`);
        console.log(`Loss of Sale: ${lossOfSale}`);

        if (bookings > 0) {
            const sample = await Lead.findOne({ leadType: 'bookingConfirmation' });
            console.log('\n--- Sample Booking ---');
            console.log(`Name: ${sample.name}`);
            console.log(`Phone: ${sample.phone}`);
            console.log(`Store: ${sample.store}`);
            console.log(`LeadType: ${sample.leadType}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

checkData();
