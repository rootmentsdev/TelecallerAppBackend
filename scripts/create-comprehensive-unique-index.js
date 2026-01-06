import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "../models/Lead.js";

dotenv.config();

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const createUniqueIndexes = async () => {
  try {
    await connectDB();

    console.log("\n" + "=".repeat(80));
    console.log("🔧 CREATING COMPREHENSIVE UNIQUE INDEXES FOR DUPLICATE PREVENTION");
    console.log("=".repeat(80) + "\n");

    // Drop existing indexes that might conflict
    console.log("📋 Checking existing indexes...");
    const existingIndexes = await Lead.collection.getIndexes();
    console.log("   Existing indexes:", Object.keys(existingIndexes));

    // Create unique index for booking/return with bookingNo
    // This enforces: name + phone + leadType + store + bookingNo must be unique
    console.log("\n📋 Creating unique index for booking/return leads WITH bookingNo...");
    try {
      await Lead.collection.createIndex(
        { 
          name: 1, 
          phone: 1, 
          leadType: 1, 
          store: 1, 
          bookingNo: 1 
        },
        { 
          unique: true, 
          name: "unique_booking_return_with_bookingno",
          partialFilterExpression: { 
            bookingNo: { $exists: true, $ne: "" },
            leadType: { $in: ["bookingConfirmation", "return"] }
          },
          background: true
        }
      );
      console.log("   ✅ Created unique index: name + phone + leadType + store + bookingNo");
    } catch (error) {
      if (error.code === 11000 || error.codeName === 'DuplicateKey') {
        console.log("   ⚠️  Index already exists or duplicates found. Run cleanup script first.");
      } else {
        console.error("   ❌ Error creating index:", error.message);
      }
    }

    // Create unique index for booking/return WITHOUT bookingNo
    // This enforces: name + phone + leadType + store must be unique
    console.log("\n📋 Creating unique index for booking/return leads WITHOUT bookingNo...");
    try {
      await Lead.collection.createIndex(
        { 
          name: 1, 
          phone: 1, 
          leadType: 1, 
          store: 1 
        },
        { 
          unique: true, 
          name: "unique_booking_return_without_bookingno",
          partialFilterExpression: { 
            $or: [
              { bookingNo: { $exists: false } },
              { bookingNo: "" },
              { bookingNo: null }
            ],
            leadType: { $in: ["bookingConfirmation", "return"] }
          },
          background: true
        }
      );
      console.log("   ✅ Created unique index: name + phone + leadType + store (when bookingNo is empty)");
    } catch (error) {
      if (error.code === 11000 || error.codeName === 'DuplicateKey') {
        console.log("   ⚠️  Index already exists or duplicates found. Run cleanup script first.");
      } else {
        console.error("   ❌ Error creating index:", error.message);
      }
    }

    // Create unique index for other lead types (lossOfSale, general, justDial)
    console.log("\n📋 Creating unique index for other lead types...");
    try {
      await Lead.collection.createIndex(
        { 
          name: 1, 
          phone: 1, 
          leadType: 1, 
          store: 1 
        },
        { 
          unique: true, 
          name: "unique_other_lead_types",
          partialFilterExpression: { 
            leadType: { $in: ["lossOfSale", "general", "justDial"] }
          },
          background: true
        }
      );
      console.log("   ✅ Created unique index: name + phone + leadType + store (for lossOfSale, general, justDial)");
    } catch (error) {
      if (error.code === 11000 || error.codeName === 'DuplicateKey') {
        console.log("   ⚠️  Index already exists or duplicates found. Run cleanup script first.");
      } else {
        console.error("   ❌ Error creating index:", error.message);
      }
    }

    // List all indexes after creation
    console.log("\n📋 Final index list:");
    const finalIndexes = await Lead.collection.getIndexes();
    for (const [indexName, indexDef] of Object.entries(finalIndexes)) {
      console.log(`   - ${indexName}:`, JSON.stringify(indexDef.key));
      if (indexDef.unique) {
        console.log(`     (UNIQUE)`);
      }
      if (indexDef.partialFilterExpression) {
        console.log(`     (Partial filter:`, JSON.stringify(indexDef.partialFilterExpression), `)`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ UNIQUE INDEX CREATION COMPLETE");
    console.log("=".repeat(80));
    console.log("\n💡 Note: If you see 'duplicates found' errors, run the cleanup script first:");
    console.log("   node scripts/cleanup-duplicates.js --live");
    console.log("\n");

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createUniqueIndexes();
