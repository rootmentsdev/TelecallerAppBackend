import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const checkLeadsByDate = async (startDate, endDate) => {
  try {
    await connectDB();

    // Parse dates (YYYY-MM-DD format)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Start of day
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day

    console.log("=".repeat(60));
    console.log(`📊 Checking Leads from ${startDate} to ${endDate}`);
    console.log("=".repeat(60));
    console.log(`Start: ${start.toISOString()}`);
    console.log(`End: ${end.toISOString()}`);
    console.log();

    // Query leads by createdAt date range
    const query = {
      createdAt: {
        $gte: start,
        $lte: end
      }
    };

    // Get total count
    const totalCount = await Lead.countDocuments(query);
    console.log(`📈 Total Leads: ${totalCount}`);
    console.log();

    // Get count by leadType
    const byLeadType = await Lead.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$leadType",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log("📋 Breakdown by Lead Type:");
    console.log("-".repeat(60));
    byLeadType.forEach(item => {
      console.log(`   ${item._id || "N/A"}: ${item.count}`);
    });
    console.log();

    // Get count by store (top 10)
    const byStore = await Lead.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$store",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    console.log("🏪 Top 10 Stores:");
    console.log("-".repeat(60));
    byStore.forEach(item => {
      console.log(`   ${item._id || "N/A"}: ${item.count}`);
    });
    console.log();

    // Get count by source
    const bySource = await Lead.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log("📊 Breakdown by Source:");
    console.log("-".repeat(60));
    bySource.forEach(item => {
      console.log(`   ${item._id || "N/A"}: ${item.count}`);
    });
    console.log();

    // Get sample leads (first 5)
    const sampleLeads = await Lead.find(query)
      .select("name phone store leadType source createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log("📝 Sample Leads (first 5, newest first):");
    console.log("-".repeat(60));
    if (sampleLeads.length === 0) {
      console.log("   No leads found in this date range");
    } else {
      sampleLeads.forEach((lead, index) => {
        console.log(`\n   ${index + 1}. ${lead.name}`);
        console.log(`      Phone: ${lead.phone}`);
        console.log(`      Store: ${lead.store}`);
        console.log(`      Type: ${lead.leadType || "N/A"}`);
        console.log(`      Source: ${lead.source || "N/A"}`);
        console.log(`      Created: ${new Date(lead.createdAt).toLocaleString()}`);
      });
    }

    console.log();
    console.log("=".repeat(60));
    console.log("✅ Query completed");
    console.log("=".repeat(60));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error checking leads:", error.message);
    process.exit(1);
  }
};

// Get dates from command line arguments or use defaults
const startDate = process.argv[2] || "2026-01-05";
const endDate = process.argv[3] || "2026-01-07";

console.log(`\n🔍 Checking leads from ${startDate} to ${endDate}\n`);

checkLeadsByDate(startDate, endDate);

