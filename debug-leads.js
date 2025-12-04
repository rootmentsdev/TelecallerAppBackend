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

const debugLeads = async () => {
  await connectDB();

  console.log("\n" + "=".repeat(60));
  console.log("🔍 DEBUGGING LOSS OF SALE LEADS");
  console.log("=".repeat(60) + "\n");

  // 1. Check all loss of sale leads (any leadType variation)
  console.log("1️⃣  Checking all possible loss of sale variations:\n");
  
  const variations = [
    { leadType: "lossOfSale" },
    { leadType: "lossofsale" },
    { leadType: "loss-of-sale" },
    { source: "Loss of Sale" },
    { source: /loss.*sale/i }
  ];

  for (const query of variations) {
    const count = await Lead.countDocuments(query);
    if (count > 0) {
      console.log(`   ✅ Found ${count} leads with:`, query);
      const sample = await Lead.findOne(query).select("name phone store leadType source").lean();
      console.log(`      Sample: ${sample.name} | Store: ${sample.store} | leadType: ${sample.leadType} | source: ${sample.source}`);
    } else {
      console.log(`   ❌ No leads with:`, query);
    }
  }

  // 2. Check what leadType values actually exist
  console.log("\n2️⃣  All unique leadType values in database:\n");
  const leadTypes = await Lead.distinct("leadType");
  leadTypes.forEach(async (lt) => {
    const count = await Lead.countDocuments({ leadType: lt });
    console.log(`   • ${lt}: ${count} leads`);
  });

  // 3. Check what source values exist for loss of sale
  console.log("\n3️⃣  Checking 'Loss of Sale' source:\n");
  const lossOfSaleBySource = await Lead.countDocuments({ source: "Loss of Sale" });
  console.log(`   Total leads with source='Loss of Sale': ${lossOfSaleBySource}`);
  
  if (lossOfSaleBySource > 0) {
    const sample = await Lead.findOne({ source: "Loss of Sale" })
      .select("name phone store leadType source")
      .lean();
    console.log(`   Sample: ${sample.name} | Store: ${sample.store} | leadType: ${sample.leadType} | source: ${sample.source}`);
  }

  // 4. Check store names for loss of sale
  console.log("\n4️⃣  Store names for loss of sale leads:\n");
  const stores = await Lead.distinct("store", { 
    $or: [
      { leadType: "lossOfSale" },
      { source: "Loss of Sale" }
    ]
  });
  console.log(`   Stores with loss of sale: ${stores.join(", ")}`);

  // 5. Check if leads are assigned
  console.log("\n5️⃣  Assignment status:\n");
  const assigned = await Lead.countDocuments({ 
    $or: [
      { leadType: "lossOfSale" },
      { source: "Loss of Sale" }
    ],
    assignedTo: { $ne: null }
  });
  const unassigned = await Lead.countDocuments({ 
    $or: [
      { leadType: "lossOfSale" },
      { source: "Loss of Sale" }
    ],
    assignedTo: null
  });
  console.log(`   Assigned: ${assigned}`);
  console.log(`   Unassigned: ${unassigned}`);

  // 6. Show sample query that API would use
  console.log("\n6️⃣  Testing API query (lossOfSale, no store filter):\n");
  const apiQuery = { leadType: "lossOfSale" };
  const apiCount = await Lead.countDocuments(apiQuery);
  console.log(`   Query:`, apiQuery);
  console.log(`   Result: ${apiCount} leads`);
  
  if (apiCount > 0) {
    const samples = await Lead.find(apiQuery)
      .limit(3)
      .select("name phone store leadType assignedTo")
      .lean();
    samples.forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.name} | Store: ${lead.store} | Assigned: ${lead.assignedTo || "None"}`);
    });
  }

  // 7. Test with store filter
  console.log("\n7️⃣  Testing with store='Z- Edapally':\n");
  const storeQuery = { leadType: "lossOfSale", store: "Z- Edapally" };
  const storeCount = await Lead.countDocuments(storeQuery);
  console.log(`   Query:`, storeQuery);
  console.log(`   Result: ${storeCount} leads`);
  
  if (storeCount > 0) {
    const samples = await Lead.find(storeQuery)
      .limit(3)
      .select("name phone store leadType assignedTo")
      .lean();
    samples.forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.name} | Assigned: ${lead.assignedTo || "None"}`);
    });
  }

  // 8. Check all users and their roles
  console.log("\n8️⃣  All users and their roles:\n");
  const users = await User.find({}).select("employeeId name role store").lean();
  users.forEach((user) => {
    console.log(`   • ${user.name} (${user.employeeId}): ${user.role} | Store: ${user.store}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("✅ Debug complete!");
  console.log("=".repeat(60) + "\n");

  await mongoose.disconnect();
};

debugLeads().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});

