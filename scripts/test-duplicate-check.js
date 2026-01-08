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

const testDuplicateCheck = async () => {
  try {
    await connectDB();

    console.log("\n" + "=".repeat(80));
    console.log("🔍 TESTING DUPLICATE CHECK LOGIC");
    console.log("=".repeat(80) + "\n");

    // Test case 1: Check for exact duplicates with bookingNo
    console.log("📋 Test Case 1: Booking lead with bookingNo");
    const testLead1 = {
      name: "SHEHIR",
      phone: "8089012754",
      leadType: "bookingConfirmation",
      store: "Suitor Guy - Chavakkad",
      bookingNo: "202601070120008"
    };

    const normalizedName1 = (testLead1.name || "").trim();
    const normalizedPhone1 = (testLead1.phone || "").trim();
    const normalizedStore1 = (testLead1.store || "").trim();
    const normalizedBookingNo1 = testLead1.bookingNo ? testLead1.bookingNo.trim() : "";

    const duplicateQuery1 = {
      name: normalizedName1,
      phone: normalizedPhone1,
      leadType: testLead1.leadType,
      store: normalizedStore1,
    };

    if (normalizedBookingNo1 !== "") {
      duplicateQuery1.bookingNo = normalizedBookingNo1;
    }

    console.log("   Query:", JSON.stringify(duplicateQuery1, null, 2));
    
    const existing1 = await Lead.findOne(duplicateQuery1);
    if (existing1) {
      console.log(`   ✅ Found ${await Lead.countDocuments(duplicateQuery1)} duplicate(s) with exact match`);
      const duplicates = await Lead.find(duplicateQuery1).limit(5).lean();
      duplicates.forEach((dup, idx) => {
        console.log(`      ${idx + 1}. ID: ${dup._id}, name: "${dup.name}", bookingNo: "${dup.bookingNo || 'N/A'}"`);
      });
    } else {
      console.log("   ❌ No duplicates found with exact match");
      
      // Try case-insensitive
      const caseInsensitiveQuery1 = {
        name: { $regex: new RegExp(`^${normalizedName1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        phone: normalizedPhone1,
        leadType: testLead1.leadType,
        store: { $regex: new RegExp(`^${normalizedStore1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        bookingNo: normalizedBookingNo1
      };
      
      const existing1CaseInsensitive = await Lead.findOne(caseInsensitiveQuery1);
      if (existing1CaseInsensitive) {
        console.log(`   ⚠️  Found ${await Lead.countDocuments(caseInsensitiveQuery1)} duplicate(s) with case-insensitive match`);
        const duplicates = await Lead.find(caseInsensitiveQuery1).limit(5).lean();
        duplicates.forEach((dup, idx) => {
          console.log(`      ${idx + 1}. ID: ${dup._id}, name: "${dup.name}" (case differs), bookingNo: "${dup.bookingNo || 'N/A'}"`);
        });
      } else {
        console.log("   ✅ No duplicates found (case-insensitive)");
      }
    }

    // Test case 2: Check for duplicates without bookingNo
    console.log("\n📋 Test Case 2: Return lead without bookingNo");
    const testLead2 = {
      name: "VIVEK",
      phone: "8667485210",
      leadType: "return",
      store: "Suitor Guy - Chavakkad",
      bookingNo: ""
    };

    const normalizedName2 = (testLead2.name || "").trim();
    const normalizedPhone2 = (testLead2.phone || "").trim();
    const normalizedStore2 = (testLead2.store || "").trim();
    const normalizedBookingNo2 = testLead2.bookingNo ? testLead2.bookingNo.trim() : "";

    const duplicateQuery2 = {
      name: normalizedName2,
      phone: normalizedPhone2,
      leadType: testLead2.leadType,
      store: normalizedStore2,
    };

    if (normalizedBookingNo2 !== "") {
      duplicateQuery2.bookingNo = normalizedBookingNo2;
    }

    console.log("   Query:", JSON.stringify(duplicateQuery2, null, 2));
    
    const existing2 = await Lead.findOne(duplicateQuery2);
    if (existing2) {
      console.log(`   ✅ Found ${await Lead.countDocuments(duplicateQuery2)} duplicate(s)`);
      const duplicates = await Lead.find(duplicateQuery2).limit(5).lean();
      duplicates.forEach((dup, idx) => {
        console.log(`      ${idx + 1}. ID: ${dup._id}, name: "${dup.name}", bookingNo: "${dup.bookingNo || 'N/A'}"`);
      });
    } else {
      console.log("   ✅ No duplicates found");
    }

    // Test case 3: Find all duplicates for a specific lead
    console.log("\n📋 Test Case 3: Find all duplicates for 'SHEHIR' with bookingNo '202601070120008'");
    const allDuplicates = await Lead.find({
      name: { $regex: /^SHEHIR$/i },
      phone: "8089012754",
      leadType: "bookingConfirmation",
      store: { $regex: /^Suitor Guy - Chavakkad$/i },
      bookingNo: "202601070120008"
    }).lean();

    console.log(`   Found ${allDuplicates.length} duplicate(s):`);
    allDuplicates.forEach((dup, idx) => {
      console.log(`      ${idx + 1}. ID: ${dup._id}`);
      console.log(`         name: "${dup.name}", phone: "${dup.phone}"`);
      console.log(`         store: "${dup.store}", bookingNo: "${dup.bookingNo || 'N/A'}"`);
      console.log(`         createdAt: ${dup.createdAt}`);
      console.log();
    });

    // Test case 4: Check for case sensitivity issues
    console.log("📋 Test Case 4: Check for case sensitivity");
    const caseVariations = [
      { name: "SHEHIR", store: "Suitor Guy - Chavakkad" },
      { name: "shehir", store: "suitor guy - chavakkad" },
      { name: "Shehir", store: "Suitor Guy - Chavakkad" },
    ];

    for (const variation of caseVariations) {
      const query = {
        name: { $regex: new RegExp(`^${variation.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        phone: "8089012754",
        leadType: "bookingConfirmation",
        store: { $regex: new RegExp(`^${variation.store.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        bookingNo: "202601070120008"
      };
      const count = await Lead.countDocuments(query);
      console.log(`   Query with name="${variation.name}", store="${variation.store}": ${count} match(es)`);
    }

    console.log("\n" + "=".repeat(80) + "\n");

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testDuplicateCheck();
