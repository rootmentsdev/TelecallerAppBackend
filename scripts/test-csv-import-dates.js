import mongoose from "mongoose";
import { readCSV } from "../sync/utils/csvReader.js";
import { mapLossOfSale } from "../sync/utils/dataMapper.js";
import { saveToMongo } from "../sync/utils/saveToMongo.js";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const runCsvTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const testPhone = "9998881111";
        const csvPath = path.resolve("scripts/test_import.csv");

        // Clean up previous test data
        await Lead.deleteMany({ phone: testPhone });
        console.log(`Cleaned up leads with phone ${testPhone}`);

        // Read the mock CSV
        console.log(`Reading CSV from: ${csvPath}`);
        const data = await readCSV(csvPath);
        console.log(`Found ${data.length} rows in CSV`);

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            // Simulate the store name being added (usually done by import script)
            const rowWithStore = { ...row, store: "Suitor Guy - Kottakkal" };

            const mapped = mapLossOfSale(rowWithStore);
            console.log(`\nProcessing Row ${i + 1}: Visit Date ${mapped.visitDate?.toISOString()}`);

            const result = await saveToMongo(mapped);
            if (result.saved) console.log("✅ Result: Saved as new record");
            if (result.updated) console.log("⚠️ Result: Updated existing record (This should NOT happen if dates are different)");
            if (result.skipped) console.log("⏭️ Result: Skipped");
        }

        const finalCount = await Lead.countDocuments({ phone: testPhone });
        console.log(`\nFinal count in DB for ${testPhone}: ${finalCount}`);

        if (finalCount === 2) {
            console.log("\n✨ TEST PASSED: Both rows from CSV were saved because they have different dates!");
        } else {
            console.log("\n❌ TEST FAILED: Overwriting still occurred.");
        }

        // Cleanup
        await Lead.deleteMany({ phone: testPhone });
        await mongoose.disconnect();
    } catch (error) {
        console.error("Test Error:", error);
    }
};

runCsvTest();
