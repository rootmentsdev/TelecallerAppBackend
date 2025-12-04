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

const assignLeadsToUser = async (employeeId, limit = 50) => {
  await connectDB();

  console.log("\n" + "=".repeat(60));
  console.log("📋 ASSIGNING LOSS OF SALE LEADS TO USER");
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

  // Find unassigned loss of sale leads
  const unassignedLeads = await Lead.find({
    leadType: "lossOfSale",
    assignedTo: null
  })
  .limit(limit)
  .select("_id name phone store");

  if (unassignedLeads.length === 0) {
    console.log("⚠️  No unassigned loss of sale leads found");
    await mongoose.disconnect();
    return;
  }

  console.log(`📊 Found ${unassignedLeads.length} unassigned loss of sale leads`);
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
    console.log(`   ${i + 1}. ${lead.name} (${lead.phone}) - ${lead.store}`);
  });

  if (unassignedLeads.length > 5) {
    console.log(`   ... and ${unassignedLeads.length - 5} more`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Assignment complete!");
  console.log("=".repeat(60) + "\n");
  console.log(`Now you can see these leads in the API:`);
  console.log(`   GET /api/pages/leads?leadType=lossOfSale`);

  await mongoose.disconnect();
};

// Get employeeId from command line argument
const employeeId = process.argv[2];
const limit = parseInt(process.argv[3]) || 50;

if (!employeeId) {
  console.error("Usage: node assign-leads-to-user.js <employeeId> [limit]");
  console.error("Example: node assign-leads-to-user.js Emp188 50");
  console.error("         node assign-leads-to-user.js Emp188 100");
  process.exit(1);
}

assignLeadsToUser(employeeId, limit).catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});

