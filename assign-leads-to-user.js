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

const VALID_LEAD_TYPES = ["lossOfSale", "rentOutFeedback", "bookingConfirmation", "justDial", "general"];

const getLeadTypeDisplayName = (leadType) => {
  const displayNames = {
    lossOfSale: "Loss of Sale",
    rentOutFeedback: "Rent-Out Feedback",
    bookingConfirmation: "Booking Confirmation",
    justDial: "Just Dial",
    general: "General"
  };
  return displayNames[leadType] || leadType;
};

const assignLeadsToUser = async (employeeId, limit = 50, leadType = "lossOfSale") => {
  await connectDB();

  // Validate leadType
  if (!VALID_LEAD_TYPES.includes(leadType)) {
    console.error(`❌ Invalid leadType: "${leadType}"`);
    console.error(`   Valid types: ${VALID_LEAD_TYPES.join(", ")}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📋 ASSIGNING ${getLeadTypeDisplayName(leadType).toUpperCase()} LEADS TO USER`);
  console.log("=".repeat(60) + "\n");

  // Find user by employeeId
  const user = await User.findOne({ employeeId });
  if (!user) {
    console.error(`❌ User with employeeId "${employeeId}" not found`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`👤 User: ${user.name} (${user.employeeId})`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Store: ${user.store}`);
  console.log(`   User ID: ${user._id}\n`);

  // Build query based on leadType
  const query = {
    leadType: leadType,
    assignedTo: null
  };

  // For "general" leads, also filter by source if needed (e.g., Walk-in)
  // This can be extended if needed
  if (leadType === "general") {
    console.log("ℹ️  Note: 'general' leads include all general leads regardless of source");
    console.log("   To filter by source, modify the query in the script\n");
  }

  // Find unassigned leads of the specified type
  const unassignedLeads = await Lead.find(query)
    .limit(limit)
    .select("_id name phone store leadType bookingNo");

  if (unassignedLeads.length === 0) {
    console.log(`⚠️  No unassigned ${getLeadTypeDisplayName(leadType).toLowerCase()} leads found`);
    await mongoose.disconnect();
    return;
  }

  console.log(`📊 Found ${unassignedLeads.length} unassigned ${getLeadTypeDisplayName(leadType).toLowerCase()} leads`);
  console.log(`   Assigning them to ${user.name}...\n`);

  // Assign leads to user
  const leadIds = unassignedLeads.map(lead => lead._id);
  const result = await Lead.updateMany(
    { _id: { $in: leadIds } },
    {
      $set: {
        assignedTo: user._id,
        assignedAt: new Date(),
      },
    }
  );

  console.log(`✅ Successfully assigned ${result.modifiedCount} leads to ${user.name}`);
  console.log(`\n📋 Sample assigned leads:`);
  unassignedLeads.slice(0, 5).forEach((lead, i) => {
    const bookingInfo = lead.bookingNo ? ` [Booking: ${lead.bookingNo}]` : "";
    console.log(`   ${i + 1}. ${lead.name} (${lead.phone}) - ${lead.store}${bookingInfo}`);
  });

  if (unassignedLeads.length > 5) {
    console.log(`   ... and ${unassignedLeads.length - 5} more`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Assignment complete!");
  console.log("=".repeat(60) + "\n");
  console.log(`Now you can see these leads in the API:`);
  console.log(`   GET /api/pages/leads?leadType=${leadType}`);

  await mongoose.disconnect();
};

// Get arguments from command line
const employeeId = process.argv[2];
const limit = parseInt(process.argv[3]) || 50;
const leadType = process.argv[4] || "lossOfSale"; // Default to lossOfSale for backward compatibility

if (!employeeId) {
  console.error("Usage: node assign-leads-to-user.js <employeeId> [limit] [leadType]");
  console.error("");
  console.error("Arguments:");
  console.error("  employeeId  - Required. Employee ID of the user (e.g., Emp188)");
  console.error("  limit       - Optional. Number of leads to assign (default: 50)");
  console.error("  leadType    - Optional. Type of leads to assign (default: lossOfSale)");
  console.error("");
  console.error("Valid leadTypes:");
  console.error("  - lossOfSale          (default)");
  console.error("  - bookingConfirmation");
  console.error("  - rentOutFeedback");
  console.error("  - justDial");
  console.error("  - general");
  console.error("");
  console.error("Examples:");
  console.error("  node assign-leads-to-user.js Emp188 100");
  console.error("  node assign-leads-to-user.js Emp188 100 bookingConfirmation");
  console.error("  node assign-leads-to-user.js Emp188 50 rentOutFeedback");
  console.error("  node assign-leads-to-user.js Emp188 100 lossOfSale");
  process.exit(1);
}

assignLeadsToUser(employeeId, limit, leadType).catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});

