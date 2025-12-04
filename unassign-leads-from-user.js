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

const unassignLeadsFromUser = async (employeeId) => {
  await connectDB();

  console.log("\n" + "=".repeat(60));
  console.log("📋 UNASSIGNING LEADS FROM USER");
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

  // Count currently assigned leads
  const assignedCount = await Lead.countDocuments({
    assignedTo: user._id
  });

  if (assignedCount === 0) {
    console.log("ℹ️  No leads currently assigned to this user");
    await mongoose.disconnect();
    return;
  }

  console.log(`📊 Found ${assignedCount} leads assigned to ${user.name}`);
  console.log(`   Unassigning all leads...\n`);

  // Unassign all leads from user
  const result = await Lead.updateMany(
    { assignedTo: user._id },
    {
      $set: {
        assignedTo: null,
        assignedAt: null,
      },
    }
  );

  console.log(`✅ Successfully unassigned ${result.modifiedCount} leads from ${user.name}`);

  // Verify
  const remainingCount = await Lead.countDocuments({
    assignedTo: user._id
  });
  console.log(`   Remaining assigned leads: ${remainingCount}`);

  console.log("\n" + "=".repeat(60));
  console.log("✅ Unassignment complete!");
  console.log("=".repeat(60) + "\n");

  await mongoose.disconnect();
};

// Get employeeId from command line argument
const employeeId = process.argv[2];

if (!employeeId) {
  console.error("Usage: node unassign-leads-from-user.js <employeeId>");
  console.error("Example: node unassign-leads-from-user.js Emp188");
  process.exit(1);
}

unassignLeadsFromUser(employeeId).catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});

