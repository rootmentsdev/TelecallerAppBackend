import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "./models/Lead.js";
import Store from "./models/Store.js";
import User from "./models/User.js";
import SyncLog from "./models/SyncLog.js";

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

    console.log("=".repeat(70));
    console.log("📊 COMPREHENSIVE DATABASE SYNC VERIFICATION");
    console.log("=".repeat(70));
    console.log();

    // ========== LEADS VERIFICATION ==========
    console.log("=".repeat(70));
    console.log("📈 LEADS COLLECTION");
    console.log("=".repeat(70));
    console.log();

    const totalLeads = await Lead.countDocuments();
    console.log(`   Total Leads: ${totalLeads.toLocaleString()}`);
    console.log();

    // Count by leadType
    const returnCount = await Lead.countDocuments({ leadType: "return" });
    const walkinCount = await Lead.countDocuments({ leadType: "general", source: "Walk-in" });
    const lossOfSaleCount = await Lead.countDocuments({ leadType: "lossOfSale" });
    const justDialCount = await Lead.countDocuments({ leadType: "justDial" });
    const otherCount = totalLeads - returnCount - walkinCount - lossOfSaleCount - justDialCount;

    console.log("   📋 Leads by Type:");
    console.log(`      ✅ Return: ${returnCount.toLocaleString()}`);
    console.log(`      ✅ Walk-in: ${walkinCount.toLocaleString()}`);
    console.log(`      ✅ Loss of Sale: ${lossOfSaleCount.toLocaleString()}`);
    console.log(`      ✅ Just Dial: ${justDialCount.toLocaleString()}`);
    console.log(`      ⚠️  Other: ${otherCount.toLocaleString()}`);
    console.log();

    // Count by source
    const returnSource = await Lead.countDocuments({ source: "Return" });
    const walkinSource = await Lead.countDocuments({ source: "Walk-in" });
    const lossOfSaleSource = await Lead.countDocuments({ source: "Loss of Sale" });

    console.log("   📋 Leads by Source:");
    console.log(`      Return: ${returnSource.toLocaleString()}`);
    console.log(`      Walk-in: ${walkinSource.toLocaleString()}`);
    console.log(`      Loss of Sale: ${lossOfSaleSource.toLocaleString()}`);
    console.log();

    // Check for duplicates in return
    const returnDuplicates = await Lead.aggregate([
      { $match: { leadType: "return", bookingNo: { $exists: true, $ne: "" } } },
      { $group: { _id: { bookingNo: "$bookingNo", phone: "$phone" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "duplicateSets" }
    ]);

    console.log("   🔍 Duplicate Check:");
    console.log(`      Return duplicates: ${returnDuplicates[0]?.duplicateSets || 0}`);
    if ((returnDuplicates[0]?.duplicateSets || 0) > 0) {
      console.log(`      ⚠️  Run: npm run cleanup:duplicates`);
    }
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
      console.log("   🔄 Duplicate Phone Numbers (for revisits):");
      duplicatePhones.forEach((dup) => {
        console.log(`      Phone: ${dup._id} - ${dup.count} leads`);
      });
      console.log();
    }

    // ========== STORES VERIFICATION ==========
    console.log("=".repeat(70));
    console.log("🏪 STORES COLLECTION");
    console.log("=".repeat(70));
    console.log();

    const totalStores = await Store.countDocuments();
    const activeStores = await Store.countDocuments({ isActive: true });
    console.log(`   Total Stores: ${totalStores}`);
    console.log(`   Active Stores: ${activeStores}`);
    console.log();

    // ========== USERS VERIFICATION ==========
    console.log("=".repeat(70));
    console.log("👥 USERS COLLECTION");
    console.log("=".repeat(70));
    console.log();

    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: "admin" });
    const teamLeadUsers = await User.countDocuments({ role: "teamlead" });
    const telecallerUsers = await User.countDocuments({ role: "telecaller" });
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Admin: ${adminUsers}`);
    console.log(`   Team Lead: ${teamLeadUsers}`);
    console.log(`   Telecaller: ${telecallerUsers}`);
    console.log();

    // ========== SYNCLOG VERIFICATION ==========
    console.log("=".repeat(70));
    console.log("🔄 SYNC LOG STATUS");
    console.log("=".repeat(70));
    console.log();

    const syncLogs = await SyncLog.find({}).sort({ syncType: 1 }).lean();
    if (syncLogs.length === 0) {
      console.log("   ⚠️  No sync logs found (no syncs have been run yet)");
      console.log("   💡 Run: npm run sync:all");
    } else {
      syncLogs.forEach((log) => {
        const lastSync = new Date(log.lastSyncAt).toLocaleString();
        const statusIcon = log.status === "success" ? "✅" : log.status === "partial" ? "⚠️" : "❌";
        console.log(`   ${statusIcon} ${log.syncType.toUpperCase()}:`);
        console.log(`      Last Sync: ${lastSync}`);
        console.log(`      Records: ${log.lastSyncCount.toLocaleString()}`);
        console.log(`      Status: ${log.status}`);
        if (log.errorMessage) {
          console.log(`      Error: ${log.errorMessage}`);
        }
        console.log();
      });
    }
    console.log();

    // ========== SAMPLE DATA ==========
    console.log("=".repeat(70));
    console.log("📋 SAMPLE DATA (First record of each type)");
    console.log("=".repeat(70));
    console.log();

    // Sample Booking


    // Sample Return
    const sampleReturn = await Lead.findOne({ leadType: "return" })
      .select("name phone store bookingNo returnDate securityAmount attendedBy")
      .lean();
    if (sampleReturn) {
      console.log("   ✅ Return Sample:");
      console.log(`      Name: ${sampleReturn.name}`);
      console.log(`      Phone: ${sampleReturn.phone}`);
      console.log(`      Store: ${sampleReturn.store}`);
      console.log(`      Booking No: ${sampleReturn.bookingNo || "N/A"}`);
      console.log(`      Return Date: ${sampleReturn.returnDate ? new Date(sampleReturn.returnDate).toLocaleDateString() : "N/A"}`);
      console.log();
    }

    // Sample Walk-in
    const sampleWalkin = await Lead.findOne({ source: "Walk-in" })
      .select("name phone store enquiryDate functionDate attendedBy")
      .lean();
    if (sampleWalkin) {
      console.log("   ✅ Walk-in Sample:");
      console.log(`      Name: ${sampleWalkin.name}`);
      console.log(`      Phone: ${sampleWalkin.phone}`);
      console.log(`      Store: ${sampleWalkin.store}`);
      console.log(`      Enquiry Date: ${sampleWalkin.enquiryDate ? new Date(sampleWalkin.enquiryDate).toLocaleDateString() : "N/A"}`);
      console.log();
    }

    // ========== SUMMARY ==========
    console.log("=".repeat(70));
    console.log("✅ VERIFICATION SUMMARY");
    console.log("=".repeat(70));
    console.log();

    const allSynced = syncLogs.length >= 1 &&
      syncLogs.some(log => log.syncType === "return");

    if (allSynced) {
      console.log("   ✅ All major syncs completed!");
      console.log(`   ✅ Total Leads: ${totalLeads.toLocaleString()}`);
      console.log(`   ✅ Active Stores: ${activeStores}`);
      console.log(`   ✅ Users: ${totalUsers}`);
    } else {
      console.log("   ⚠️  Some syncs may be missing:");
      if (!syncLogs.some(log => log.syncType === "return")) {
        console.log("      ❌ Return sync not run - Run: npm run sync:return");
      }
      console.log("   💡 Run full sync: npm run sync:all");
    }
    console.log();

    console.log("=".repeat(70));
    console.log("✅ Verification Complete!");
    console.log("=".repeat(70));

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

verifyData();

