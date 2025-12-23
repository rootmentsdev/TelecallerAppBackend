import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SyncLog from '../models/SyncLog.js';

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected');

        const logs = await SyncLog.find().sort({ createdAt: -1 }).limit(20);

        console.log('📋 Recent Sync Logs:');
        logs.forEach(log => {
            console.log(`[${log.createdAt.toISOString()}] Type: ${log.syncType} | Trigger: ${log.trigger} | Status: ${log.status} | LastSyncAt: ${log.lastSyncAt ? log.lastSyncAt.toISOString() : 'N/A'}`);
        });

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};
check();
