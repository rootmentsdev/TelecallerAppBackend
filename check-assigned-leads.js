import mongoose from "mongoose";
import Lead from "./models/Lead.js";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const checkAssignedLeads = async (employeeId) => {
  await connectDB();

  console.log("\n" + "=".repeat(60));
  console.log("📊 CHECKING ASSIGNED LEADS FOR USER");
  console.log("=".repeat(60) + "\n");

  // Find user by employeeId
  const user = await User.findOne({ employeeId });
  if (!user) {
    console.error(`❌ User with employeeId "${employeeId}" not found`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`👤 User: ${user.name} (${user.employeeId})`);
  console.log(`   User ID: ${user._id}\n`);

  // Count all assigned leads
  const totalAssigned = await Lead.countDocuments({
    assignedTo: user._id
  });

  // Count by lead type
  const lossOfSaleAssigned = await Lead.countDocuments({
    assignedTo: user._id,
    leadType: "lossOfSale"
  });

  const bookingAssigned = await Lead.countDocuments({
    assignedTo: user._id,
    leadType: "bookingConfirmation"
  });

  const rentOutAssigned = await Lead.countDocuments({
    assignedTo: user._id,
    leadType: "rentOutFeedback"
  });

  const walkinAssigned = await Lead.countDocuments({
    assignedTo: user._id,
    leadType: "general",
    source: "Walk-in"
  });

  console.log("📊 ASSIGNED LEADS SUMMARY:");
  console.log("   " + "-".repeat(50));
  console.log(`   Total Assigned: ${totalAssigned}`);
  console.log(`   Loss of Sale: ${lossOfSaleAssigned}`);
  console.log(`   Booking Confirmation: ${bookingAssigned}`);
  console.log(`   Rent-Out: ${rentOutAssigned}`);
  console.log(`   Walk-in: ${walkinAssigned}`);
  console.log("   " + "-".repeat(50) + "\n");

  // Show sample assigned leads
  const sampleLeads = await Lead.find({
    assignedTo: user._id,
    leadType: "lossOfSale"
  })
  .limit(10)
  .select("name phone store leadType assignedAt")
  .sort({ assignedAt: -1 });

  if (sampleLeads.length > 0) {
    console.log("📋 Sample Assigned Loss of Sale Leads (latest 10):");
    sampleLeads.forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.name} (${lead.phone}) - ${lead.store}`);
    });
    if (lossOfSaleAssigned > 10) {
      console.log(`   ... and ${lossOfSaleAssigned - 10} more`);
    }
    console.log();
  }

  console.log("=".repeat(60));
  console.log("✅ Check complete!");
  console.log("=".repeat(60) + "\n");

  console.log("💡 API ENDPOINT INFO:");
  console.log(`   To fetch all ${lossOfSaleAssigned} Loss of Sale leads:`);
  console.log(`   GET /api/pages/leads?leadType=lossOfSale&limit=${lossOfSaleAssigned}`);
  console.log(`   OR use pagination:`);
  console.log(`   Page 1: ?leadType=lossOfSale&page=1&limit=50`);
  console.log(`   Page 2: ?leadType=lossOfSale&page=2&limit=50`);
  if (lossOfSaleAssigned > 100) {
    console.log(`   Page 3: ?leadType=lossOfSale&page=3&limit=50`);
  }
  console.log();

  await mongoose.disconnect();
};

// Get employeeId from command line argument
const employeeId = process.argv[2];

if (!employeeId) {
  console.error("Usage: node check-assigned-leads.js <employeeId>");
  console.error("Example: node check-assigned-leads.js Emp188");
  process.exit(1);
}

checkAssignedLeads(employeeId).catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});

