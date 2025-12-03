import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "./models/Lead.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const verifyData = async () => {
  try {
    await connectDB();

    console.log("=".repeat(60));
    console.log("📊 MongoDB Data Verification");
    console.log("=".repeat(60));
    console.log();

    // Get total count
    const totalLeads = await Lead.countDocuments();
    console.log(`📈 Total Leads in Database: ${totalLeads}`);
    console.log();

    // Count by source
    const walkinCount = await Lead.countDocuments({ source: "Walk-in" });
    const lossOfSaleCount = await Lead.countDocuments({ source: "Loss of Sale" });
    const otherCount = totalLeads - walkinCount - lossOfSaleCount;

    console.log("📋 Leads by Source:");
    console.log(`   Walk-in: ${walkinCount}`);
    console.log(`   Loss of Sale: ${lossOfSaleCount}`);
    console.log(`   Other: ${otherCount}`);
    console.log();

    // Count by leadType
    const generalCount = await Lead.countDocuments({ leadType: "general" });
    const lossOfSaleTypeCount = await Lead.countDocuments({ leadType: "lossOfSale" });

    console.log("📋 Leads by Type:");
    console.log(`   General: ${generalCount}`);
    console.log(`   Loss of Sale: ${lossOfSaleTypeCount}`);
    console.log();

    // Get sample walk-in leads
    console.log("=".repeat(60));
    console.log("👤 Sample Walk-in Leads (first 3):");
    console.log("=".repeat(60));
    const walkinLeads = await Lead.find({ source: "Walk-in" })
      .limit(3)
      .select("name phone store source leadType enquiryType enquiryDate functionDate attendedBy closingStatus remarks")
      .lean();

    if (walkinLeads.length === 0) {
      console.log("   ⚠️  No walk-in leads found");
    } else {
      walkinLeads.forEach((lead, index) => {
        console.log(`\n   Lead ${index + 1}:`);
        console.log(`   Name: ${lead.name}`);
        console.log(`   Phone: ${lead.phone}`);
        console.log(`   Store: ${lead.store}`);
        console.log(`   Source: ${lead.source}`);
        console.log(`   Lead Type: ${lead.leadType}`);
        console.log(`   Enquiry Type: ${lead.enquiryType || "N/A"}`);
        console.log(`   Enquiry Date: ${lead.enquiryDate ? new Date(lead.enquiryDate).toLocaleDateString() : "N/A"}`);
        console.log(`   Function Date: ${lead.functionDate ? new Date(lead.functionDate).toLocaleDateString() : "N/A"}`);
        console.log(`   Attended By: ${lead.attendedBy || "N/A"}`);
        console.log(`   Closing Status: ${lead.closingStatus || "N/A"}`);
        console.log(`   Remarks: ${lead.remarks || "N/A"}`);
      });
    }

    console.log();
    console.log("=".repeat(60));
    console.log("💰 Sample Loss of Sale Leads (first 3):");
    console.log("=".repeat(60));
    const lossOfSaleLeads = await Lead.find({ source: "Loss of Sale" })
      .limit(3)
      .select("name phone store source leadType enquiryType reason closingStatus remarks")
      .lean();

    if (lossOfSaleLeads.length === 0) {
      console.log("   ⚠️  No loss of sale leads found");
    } else {
      lossOfSaleLeads.forEach((lead, index) => {
        console.log(`\n   Lead ${index + 1}:`);
        console.log(`   Name: ${lead.name}`);
        console.log(`   Phone: ${lead.phone}`);
        console.log(`   Store: ${lead.store}`);
        console.log(`   Source: ${lead.source}`);
        console.log(`   Lead Type: ${lead.leadType}`);
        console.log(`   Enquiry Type: ${lead.enquiryType || "N/A"}`);
        console.log(`   Reason: ${lead.reason || "N/A"}`);
        console.log(`   Closing Status: ${lead.closingStatus || "N/A"}`);
        console.log(`   Remarks: ${lead.remarks || "N/A"}`);
      });
    }

    console.log();
    console.log("=".repeat(60));
    console.log("🔍 Field Verification:");
    console.log("=".repeat(60));

    // Check for specific fields
    const leadsWithAttendedBy = await Lead.countDocuments({ attendedBy: { $exists: true, $ne: null } });
    const leadsWithReason = await Lead.countDocuments({ reason: { $exists: true, $ne: null } });
    const leadsWithEnquiryDate = await Lead.countDocuments({ enquiryDate: { $exists: true, $ne: null } });
    const leadsWithFunctionDate = await Lead.countDocuments({ functionDate: { $exists: true, $ne: null } });

    console.log(`   Leads with 'attendedBy' field: ${leadsWithAttendedBy} (Walk-in specific)`);
    console.log(`   Leads with 'reason' field: ${leadsWithReason} (Loss of Sale specific)`);
    console.log(`   Leads with 'enquiryDate' field: ${leadsWithEnquiryDate}`);
    console.log(`   Leads with 'functionDate' field: ${leadsWithFunctionDate}`);
    console.log();

    // Check for duplicate phones (should be allowed now)
    const duplicatePhones = await Lead.aggregate([
      {
        $group: {
          _id: "$phone",
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    if (duplicatePhones.length > 0) {
      console.log("=".repeat(60));
      console.log("🔄 Duplicate Phone Numbers (for revisits):");
      console.log("=".repeat(60));
      duplicatePhones.forEach((dup) => {
        console.log(`   Phone: ${dup._id} - ${dup.count} leads`);
      });
      console.log();
    }

    console.log("=".repeat(60));
    console.log("✅ Verification Complete!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

verifyData();

