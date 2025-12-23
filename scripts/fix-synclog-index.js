import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const collection = mongoose.connection.collection('synclogs');

        // Check existing indexes
        const indexes = await collection.indexes();
        console.log('📋 Existing indexes:', indexes.map(i => i.name));

        // Look for unique index on syncType
        const uniqueIndex = indexes.find(i => i.key && i.key.syncType === 1 && i.unique);

        if (uniqueIndex) {
            console.log(`🗑️  Dropping unique index: ${uniqueIndex.name}`);
            await collection.dropIndex(uniqueIndex.name);
            console.log('✅ Index dropped successfully');
        } else {
            console.log('ℹ️  No unique index found on syncType');
        }

        console.log('✅ Schema fix completed');
    } catch (error) {
        console.error('❌ Error fixing index:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected');
    }
};

fixIndex();
