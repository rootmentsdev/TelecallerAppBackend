import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "../models/Lead.js";

dotenv.config();

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const createUniqueIndex = async () => {
  try {
    await connectDB();

    console.log("\n" + "=".repeat(80));
    console.log("🔧 CREATING UNIQUE INDEXES FOR ALL LEAD TYPES");
    console.log("=".repeat(80) + "\n");

    const indexes = await Lead.collection.getIndexes();
    const bookingReturnIndexName = "unique_booking_return_index";
    const lossOfSaleGeneralIndexName = "unique_lossOfSale_general_index";
    
    let createdBookingReturn = false;
    let createdLossOfSaleGeneral = false;

    // ==================== INDEX 1: Booking & Return ====================
    console.log("📋 INDEX 1: Booking & Return Leads");
    console.log("-".repeat(80));
    
    if (indexes[bookingReturnIndexName]) {
      console.log(`⚠️  Index "${bookingReturnIndexName}" already exists. Skipping.\n`);
    } else {
      console.log("   Fields: bookingNo, phone, leadType");
      console.log("   Unique: true");
      console.log("   Partial Filter: leadType in ['bookingConfirmation', 'return'] AND bookingNo exists and not empty");
      console.log("\n   This index will:");
      console.log("   ✅ Prevent duplicates for bookingConfirmation and return leads");
      console.log("   ✅ Only apply when bookingNo is present");
      console.log("   ❌ NOT affect lossOfSale, general, or justDial leads\n");

      console.log("🔄 Creating index...");
      await Lead.collection.createIndex(
        { bookingNo: 1, phone: 1, leadType: 1 },
        {
          unique: true,
          partialFilterExpression: {
            leadType: { $in: ["bookingConfirmation", "return"] },
            bookingNo: { $exists: true, $ne: "" }
          },
          name: bookingReturnIndexName
        }
      );
      console.log("✅ Index created successfully!\n");
      createdBookingReturn = true;
    }

    // ==================== INDEX 2: Loss of Sale & General ====================
    console.log("📋 INDEX 2: Loss of Sale & General Leads");
    console.log("-".repeat(80));
    
    if (indexes[lossOfSaleGeneralIndexName]) {
      console.log(`⚠️  Index "${lossOfSaleGeneralIndexName}" already exists. Skipping.\n`);
    } else {
      console.log("   Fields: name, phone, leadType, store");
      console.log("   Unique: true");
      console.log("   Partial Filter: leadType in ['lossOfSale', 'general']");
      console.log("\n   This index will:");
      console.log("   ✅ Prevent duplicates for lossOfSale and general leads");
      console.log("   ✅ Prevent race conditions during CSV imports");
      console.log("   ✅ Works with existing upsert logic");
      console.log("   ❌ NOT affect bookingConfirmation, return, or justDial leads\n");

      console.log("🔄 Creating index...");
      await Lead.collection.createIndex(
        { name: 1, phone: 1, leadType: 1, store: 1 },
        {
          unique: true,
          partialFilterExpression: {
            leadType: { $in: ["lossOfSale", "general"] }
          },
          name: lossOfSaleGeneralIndexName
        }
      );
      console.log("✅ Index created successfully!\n");
      createdLossOfSaleGeneral = true;
    }

    // ==================== VERIFICATION ====================
    console.log("=".repeat(80));
    console.log("✅ VERIFICATION");
    console.log("=".repeat(80) + "\n");

    const newIndexes = await Lead.collection.getIndexes();
    
    if (newIndexes[bookingReturnIndexName]) {
      console.log(`✅ ${bookingReturnIndexName}: EXISTS`);
      if (createdBookingReturn) {
        console.log(`   Index definition:`, JSON.stringify(newIndexes[bookingReturnIndexName], null, 2));
      }
    } else {
      console.log(`❌ ${bookingReturnIndexName}: NOT FOUND`);
    }
    
    console.log();
    
    if (newIndexes[lossOfSaleGeneralIndexName]) {
      console.log(`✅ ${lossOfSaleGeneralIndexName}: EXISTS`);
      if (createdLossOfSaleGeneral) {
        console.log(`   Index definition:`, JSON.stringify(newIndexes[lossOfSaleGeneralIndexName], null, 2));
      }
    } else {
      console.log(`❌ ${lossOfSaleGeneralIndexName}: NOT FOUND`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 NEXT STEPS");
    console.log("=".repeat(80));
    console.log("1. Run cleanup to remove existing duplicates:");
    console.log("   npm run cleanup:duplicates:live");
    console.log("\n2. Test the indexes:");
    console.log("   - For API sync: npm run sync:api (run twice)");
    console.log("   - For CSV import: Upload same CSV twice");
    console.log("\n3. Verify no new duplicates were created:");
    console.log("   npm run check:duplicates");
    console.log("\n" + "=".repeat(80) + "\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating index:", error.message);
    
    if (error.code === 85) {
      console.error("\n⚠️  Index creation failed due to existing duplicate data.");
      console.error("   You must clean up existing duplicates first:");
      console.error("   npm run cleanup:duplicates:live");
      console.error("\n   Then run this script again.\n");
    } else if (error.code === 86) {
      console.error("\n⚠️  Index creation failed - index with different options already exists.");
      console.error("   Drop the existing index first, then run this script again.\n");
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
};

createUniqueIndex();

