import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../models/Lead.js';
import Store from '../models/Store.js';
import { normalizeStoreName } from '../sync/utils/storeMap.js';

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Migrate Stores
        console.log('\n🔄 Migrating Stores...');
        const stores = await Store.find({});
        let storesUpdated = 0;

        for (const store of stores) {
            const normalized = normalizeStoreName(store.name);
            if (normalized && normalized !== store.name) {
                console.log(`   Update Store: "${store.name}" -> "${normalized}"`);
                store.name = normalized;
                await store.save();
                storesUpdated++;
            }
        }
        console.log(`✅ Stores updated: ${storesUpdated}`);

        // 2. Migrate Leads
        console.log('\n🔄 Migrating Leads (this may take a while)...');

        // We can't iterate all leads if there are millions, but we can iterate by distinct store name
        const distinctStores = await Lead.distinct('store');
        console.log(`   Found ${distinctStores.length} distinct store names in Leads`);

        let leadsUpdatedTotal = 0;

        for (const storeName of distinctStores) {
            const normalized = normalizeStoreName(storeName);

            if (normalized && normalized !== storeName) {
                console.log(`   Migrating leads with store "${storeName}" -> "${normalized}"`);

                const result = await Lead.updateMany(
                    { store: storeName },
                    { $set: { store: normalized } }
                );

                console.log(`   -> Modified ${result.modifiedCount} leads`);
                leadsUpdatedTotal += result.modifiedCount;
            }
        }

        console.log(`✅ Leads migration completed. Total modified: ${leadsUpdatedTotal}`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

migrate();
