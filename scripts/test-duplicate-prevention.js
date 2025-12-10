import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Report from "../models/Report.js";
import { saveToMongo } from "../sync/utils/saveToMongo.js";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const testDuplicatePrevention = async () => {
  try {
    await connectDB();

    console.log("=".repeat(70));
    console.log("🧪 TESTING DUPLICATE PREVENTION LOGIC");
    console.log("=".repeat(70));
    console.log();

    // Test 1: API Import - Booking Confirmation (should skip duplicates)
    console.log("📋 Test 1: API Import - Booking Confirmation");
    console.log("-".repeat(70));
    
    const bookingLead1 = {
      name: "Test Booking Customer",
      phone: "9876543210",
      store: "Suitor Guy - Edappally",
      leadType: "bookingConfirmation",
      bookingNo: "TEST001",
      source: "Booking",
      enquiryDate: new Date(),
      functionDate: new Date(),
    };

    console.log("Creating first booking lead...");
    const result1 = await saveToMongo(bookingLead1);
    console.log("Result:", result1);
    
    console.log("\nTrying to create duplicate booking lead (same bookingNo + phone)...");
    const result2 = await saveToMongo(bookingLead1);
    console.log("Result:", result2);
    
    if (result2.skipped && result2.reason === "Already exists") {
      console.log("✅ PASS: Duplicate booking correctly skipped");
    } else {
      console.log("❌ FAIL: Duplicate booking was not skipped");
    }

    // Cleanup
    await Lead.deleteOne({ bookingNo: "TEST001" });
    console.log();

    // Test 2: API Import - Rent-Out (should skip duplicates)
    console.log("📋 Test 2: API Import - Rent-Out");
    console.log("-".repeat(70));
    
    const rentOutLead1 = {
      name: "Test Rent-Out Customer",
      phone: "9876543211",
      store: "Zorucci - Kottayam",
      leadType: "rentOutFeedback",
      bookingNo: "RENT001",
      source: "Rent-out",
      enquiryDate: new Date(),
      returnDate: new Date(),
    };

    console.log("Creating first rent-out lead...");
    const result3 = await saveToMongo(rentOutLead1);
    console.log("Result:", result3);
    
    console.log("\nTrying to create duplicate rent-out lead (same bookingNo + phone)...");
    const result4 = await saveToMongo(rentOutLead1);
    console.log("Result:", result4);
    
    if (result4.skipped && result4.reason === "Already exists") {
      console.log("✅ PASS: Duplicate rent-out correctly skipped");
    } else {
      console.log("❌ FAIL: Duplicate rent-out was not skipped");
    }

    // Cleanup
    await Lead.deleteOne({ bookingNo: "RENT001" });
    console.log();

    // Test 3: CSV Import - Loss of Sale (should UPDATE duplicates)
    console.log("📋 Test 3: CSV Import - Loss of Sale");
    console.log("-".repeat(70));
    
    const lossOfSaleLead1 = {
      name: "Test Loss of Sale Customer",
      phone: "9876543212",
      store: "Suitor Guy - Manjeri",
      leadType: "lossOfSale",
      source: "Loss of Sale",
      enquiryDate: new Date("2024-01-15"),
      reason: "Price too high",
    };

    console.log("Creating first loss of sale lead...");
    const result5 = await saveToMongo(lossOfSaleLead1);
    console.log("Result:", result5);
    const firstId = result5.leadId;
    
    const lossOfSaleLead2 = {
      ...lossOfSaleLead1,
      reason: "Updated reason - Changed mind",
      remarks: "Updated remarks",
    };

    console.log("\nTrying to create duplicate loss of sale lead (same phone + name + store + enquiryDate)...");
    const result6 = await saveToMongo(lossOfSaleLead2);
    console.log("Result:", result6);
    
    if (result6.updated && result6.leadId && result6.leadId.toString() === firstId.toString()) {
      console.log("✅ PASS: Duplicate loss of sale correctly updated");
      
      // Verify the update
      const updated = await Lead.findById(firstId);
      if (updated.reason === "Updated reason - Changed mind") {
        console.log("✅ PASS: Update was applied correctly");
      } else {
        console.log("❌ FAIL: Update was not applied correctly");
      }
    } else {
      console.log("❌ FAIL: Duplicate loss of sale was not updated (may have created duplicate)");
    }

    // Cleanup
    await Lead.deleteOne({ _id: firstId });
    console.log();

    // Test 4: CSV Import - General/Walk-in (should UPDATE duplicates)
    console.log("📋 Test 4: CSV Import - General/Walk-in");
    console.log("-".repeat(70));
    
    const walkinLead1 = {
      name: "Test Walk-in Customer",
      phone: "9876543213",
      store: "Suitor Guy - Kottayam",
      leadType: "general",
      source: "Walk-in",
      enquiryDate: new Date("2024-01-20"),
    };

    console.log("Creating first walk-in lead...");
    const result7 = await saveToMongo(walkinLead1);
    console.log("Result:", result7);
    const walkinId = result7.leadId;
    
    const walkinLead2 = {
      ...walkinLead1,
      remarks: "Updated remarks from re-import",
    };

    console.log("\nTrying to create duplicate walk-in lead (same phone + name + store + enquiryDate)...");
    const result8 = await saveToMongo(walkinLead2);
    console.log("Result:", result8);
    
    if (result8.updated && result8.leadId && result8.leadId.toString() === walkinId.toString()) {
      console.log("✅ PASS: Duplicate walk-in correctly updated");
      
      // Verify the update
      const updated = await Lead.findById(walkinId);
      if (updated.remarks === "Updated remarks from re-import") {
        console.log("✅ PASS: Update was applied correctly");
      } else {
        console.log("❌ FAIL: Update was not applied correctly");
      }
    } else {
      console.log("❌ FAIL: Duplicate walk-in was not updated (may have created duplicate)");
    }

    // Cleanup
    await Lead.deleteOne({ _id: walkinId });
    console.log();

    // Test 5: Report Collection Check (should skip if in reports)
    console.log("📋 Test 5: Report Collection Check");
    console.log("-".repeat(70));
    
    const reportLead = {
      name: "Test Report Customer",
      phone: "9876543214",
      store: "Suitor Guy - Edappally",
      leadType: "bookingConfirmation",
      bookingNo: "REPORT001",
      source: "Booking",
    };

    // Create a report entry (simulating a lead moved to reports)
    // Create a report entry (simulating a lead moved to reports)
    const report = await Report.create({
      leadData: {
        id: mongoose.Types.ObjectId(),
        lead_name: reportLead.name,
        phone_number: reportLead.phone,
        store: reportLead.store,
        lead_type: reportLead.leadType,
        booking_number: reportLead.bookingNo,
      },
      editedBy: mongoose.Types.ObjectId(),
    });

    console.log("Created report entry for lead...");
    
    console.log("\nTrying to import lead that exists in reports...");
    const result9 = await saveToMongo(reportLead);
    console.log("Result:", result9);
    
    if (result9.skipped && result9.reason === "Lead exists in reports (moved after edit)") {
      console.log("✅ PASS: Lead in reports correctly skipped");
    } else {
      console.log("❌ FAIL: Lead in reports was not skipped");
    }

    // Cleanup
    await Report.deleteOne({ _id: report._id });
    console.log();

    // Test 6: Check actual duplicates in database
    console.log("📋 Test 6: Check for Actual Duplicates in Database");
    console.log("-".repeat(70));
    
    // Check booking duplicates
    const bookingDuplicates = await Lead.aggregate([
      {
        $match: {
          leadType: "bookingConfirmation",
          bookingNo: { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: {
            bookingNo: "$bookingNo",
            phone: "$phone",
            leadType: "$leadType"
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`Booking duplicates found: ${bookingDuplicates.length}`);
    if (bookingDuplicates.length > 0) {
      console.log("⚠️  WARNING: Found duplicate booking records!");
      bookingDuplicates.slice(0, 5).forEach(dup => {
        console.log(`   - BookingNo: ${dup._id.bookingNo}, Phone: ${dup._id.phone}, Count: ${dup.count}`);
      });
    } else {
      console.log("✅ No booking duplicates found");
    }

    // Check rent-out duplicates
    const rentOutDuplicates = await Lead.aggregate([
      {
        $match: {
          leadType: "rentOutFeedback",
          bookingNo: { $exists: true, $ne: "" }
        }
      },
      {
        $group: {
          _id: {
            bookingNo: "$bookingNo",
            phone: "$phone",
            leadType: "$leadType"
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`\nRent-out duplicates found: ${rentOutDuplicates.length}`);
    if (rentOutDuplicates.length > 0) {
      console.log("⚠️  WARNING: Found duplicate rent-out records!");
      rentOutDuplicates.slice(0, 5).forEach(dup => {
        console.log(`   - BookingNo: ${dup._id.bookingNo}, Phone: ${dup._id.phone}, Count: ${dup.count}`);
      });
    } else {
      console.log("✅ No rent-out duplicates found");
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ Testing complete");
    console.log("=".repeat(70));

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

testDuplicatePrevention();

