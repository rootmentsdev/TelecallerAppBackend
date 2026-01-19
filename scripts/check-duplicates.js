import mongoose from "mongoose";
import dotenv from "dotenv";
import Lead from "../models/Lead.js";
import FollowUp from "../models/FollowUp.js";
import Report from "../models/Report.js";

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

const checkDuplicates = async () => {
  try {
    await connectDB();

    console.log("\n" + "=".repeat(80));
    console.log("🔍 DUPLICATE LEAD ANALYSIS");
    console.log("=".repeat(80) + "\n");

    const results = {
      leads: {
        booked: { duplicates: [], total: 0, duplicateCount: 0 },
        return: { duplicates: [], total: 0, duplicateCount: 0 },
        lossOfSale: { duplicates: [], total: 0, duplicateCount: 0 },
        enquiry: { duplicates: [], total: 0, duplicateCount: 0 },
      },
      followUps: { duplicates: [], total: 0, duplicateCount: 0 },
      reports: { duplicates: [], total: 0, duplicateCount: 0 },
    };

    // ==================== CHECK BOOKED LEADS ====================
    console.log("📋 Checking Booked leads...");
    const bookingLeads = await Lead.find({ leadType: "booked" }).lean();
    results.leads.booked.total = bookingLeads.length;

    // Group by bookingNo + phone + leadType
    const bookingByBookingNo = {};
    const bookingByNamePhone = {};

    for (const lead of bookingLeads) {
      // Check duplicates by bookingNo
      if (lead.bookingNo && lead.bookingNo.trim() !== "") {
        const key = `${lead.bookingNo.trim()}_${lead.phone}_${lead.leadType}`;
        if (!bookingByBookingNo[key]) {
          bookingByBookingNo[key] = [];
        }
        bookingByBookingNo[key].push(lead);
      }

      // Check duplicates by name + phone + leadType + store
      const nameKey = `${lead.name}_${lead.phone}_${lead.leadType}_${lead.store}`;
      if (!bookingByNamePhone[nameKey]) {
        bookingByNamePhone[nameKey] = [];
      }
      bookingByNamePhone[nameKey].push(lead);
    }

    // Find duplicates
    for (const [key, leads] of Object.entries(bookingByBookingNo)) {
      if (leads.length > 1) {
        results.leads.booked.duplicates.push({
          criteria: "bookingNo + phone + leadType",
          key,
          count: leads.length,
          ids: leads.map(l => l._id),
          details: leads.map(l => ({
            id: l._id,
            name: l.name,
            phone: l.phone,
            bookingNo: l.bookingNo,
            store: l.store,
            createdAt: l.createdAt,
          })),
        });
        results.leads.booked.duplicateCount += leads.length - 1;
      }
    }

    for (const [key, leads] of Object.entries(bookingByNamePhone)) {
      if (leads.length > 1) {
        // Check if this duplicate set is already reported
        const existing = results.leads.booked.duplicates.find(
          d => d.ids.some(id => leads.some(l => l._id.toString() === id.toString()))
        );
        if (!existing) {
          results.leads.booked.duplicates.push({
            criteria: "name + phone + leadType + store",
            key,
            count: leads.length,
            ids: leads.map(l => l._id),
            details: leads.map(l => ({
              id: l._id,
              name: l.name,
              phone: l.phone,
              bookingNo: l.bookingNo || "N/A",
              store: l.store,
              createdAt: l.createdAt,
            })),
          });
          results.leads.booked.duplicateCount += leads.length - 1;
        }
      }
    }

    // ==================== CHECK RETURN LEADS ====================
    console.log("📋 Checking Return leads...");
    const returnLeads = await Lead.find({ leadType: "return" }).lean();
    results.leads.return.total = returnLeads.length;

    const returnByBookingNo = {};
    const returnByNamePhone = {};

    for (const lead of returnLeads) {
      if (lead.bookingNo && lead.bookingNo.trim() !== "") {
        const key = `${lead.bookingNo.trim()}_${lead.phone}_${lead.leadType}`;
        if (!returnByBookingNo[key]) {
          returnByBookingNo[key] = [];
        }
        returnByBookingNo[key].push(lead);
      }

      const nameKey = `${lead.name}_${lead.phone}_${lead.leadType}_${lead.store}`;
      if (!returnByNamePhone[nameKey]) {
        returnByNamePhone[nameKey] = [];
      }
      returnByNamePhone[nameKey].push(lead);
    }

    for (const [key, leads] of Object.entries(returnByBookingNo)) {
      if (leads.length > 1) {
        results.leads.return.duplicates.push({
          criteria: "bookingNo + phone + leadType",
          key,
          count: leads.length,
          ids: leads.map(l => l._id),
          details: leads.map(l => ({
            id: l._id,
            name: l.name,
            phone: l.phone,
            bookingNo: l.bookingNo,
            store: l.store,
            createdAt: l.createdAt,
          })),
        });
        results.leads.return.duplicateCount += leads.length - 1;
      }
    }

    for (const [key, leads] of Object.entries(returnByNamePhone)) {
      if (leads.length > 1) {
        const existing = results.leads.return.duplicates.find(
          d => d.ids.some(id => leads.some(l => l._id.toString() === id.toString()))
        );
        if (!existing) {
          results.leads.return.duplicates.push({
            criteria: "name + phone + leadType + store",
            key,
            count: leads.length,
            ids: leads.map(l => l._id),
            details: leads.map(l => ({
              id: l._id,
              name: l.name,
              phone: l.phone,
              bookingNo: l.bookingNo || "N/A",
              store: l.store,
              createdAt: l.createdAt,
            })),
          });
          results.leads.return.duplicateCount += leads.length - 1;
        }
      }
    }

    // ==================== CHECK LOSS OF SALE LEADS ====================
    console.log("📋 Checking Loss of Sale leads...");
    const lossOfSaleLeads = await Lead.find({ leadType: "lossOfSale" }).lean();
    results.leads.lossOfSale.total = lossOfSaleLeads.length;

    const lossOfSaleGroups = {};

    for (const lead of lossOfSaleLeads) {
      const key = `${lead.name}_${lead.phone}_${lead.leadType}_${lead.store}`;
      if (!lossOfSaleGroups[key]) {
        lossOfSaleGroups[key] = [];
      }
      lossOfSaleGroups[key].push(lead);
    }

    for (const [key, leads] of Object.entries(lossOfSaleGroups)) {
      if (leads.length > 1) {
        results.leads.lossOfSale.duplicates.push({
          criteria: "name + phone + leadType + store",
          key,
          count: leads.length,
          ids: leads.map(l => l._id),
          details: leads.map(l => ({
            id: l._id,
            name: l.name,
            phone: l.phone,
            store: l.store,
            enquiryDate: l.enquiryDate,
            visitDate: l.visitDate,
            createdAt: l.createdAt,
          })),
        });
        results.leads.lossOfSale.duplicateCount += leads.length - 1;
      }
    }

    // ==================== CHECK ENQUIRY LEADS ====================
    console.log("📋 Checking Enquiry leads...");
    const generalLeads = await Lead.find({ leadType: "enquiry" }).lean();
    results.leads.enquiry.total = generalLeads.length;

    const generalGroups = {};

    for (const lead of generalLeads) {
      const key = `${lead.name}_${lead.phone}_${lead.leadType}_${lead.store}`;
      if (!generalGroups[key]) {
        generalGroups[key] = [];
      }
      generalGroups[key].push(lead);
    }

    for (const [key, leads] of Object.entries(generalGroups)) {
      if (leads.length > 1) {
        results.leads.enquiry.duplicates.push({
          criteria: "name + phone + leadType + store",
          key,
          count: leads.length,
          ids: leads.map(l => l._id),
          details: leads.map(l => ({
            id: l._id,
            name: l.name,
            phone: l.phone,
            store: l.store,
            enquiryDate: l.enquiryDate,
            createdAt: l.createdAt,
          })),
        });
        results.leads.enquiry.duplicateCount += leads.length - 1;
      }
    }



    // ==================== CHECK FOLLOW-UPS ====================
    console.log("📋 Checking FollowUps...");
    const followUps = await FollowUp.find({}).lean();
    results.followUps.total = followUps.length;

    const followUpGroups = {};

    for (const followUp of followUps) {
      const key = `${followUp.name}_${followUp.phone}_${followUp.leadType}_${followUp.store}`;
      if (!followUpGroups[key]) {
        followUpGroups[key] = [];
      }
      followUpGroups[key].push(followUp);
    }

    for (const [key, leads] of Object.entries(followUpGroups)) {
      if (leads.length > 1) {
        results.followUps.duplicates.push({
          criteria: "name + phone + leadType + store",
          key,
          count: leads.length,
          ids: leads.map(l => l._id),
          details: leads.map(l => ({
            id: l._id,
            name: l.name,
            phone: l.phone,
            store: l.store,
            leadType: l.leadType,
            createdAt: l.createdAt,
          })),
        });
        results.followUps.duplicateCount += leads.length - 1;
      }
    }

    // ==================== PRINT RESULTS ====================
    console.log("\n" + "=".repeat(80));
    console.log("📊 DUPLICATE ANALYSIS RESULTS");
    console.log("=".repeat(80) + "\n");

    let totalDuplicates = 0;
    let totalDuplicateGroups = 0;

    // Leads
    console.log("📁 LEADS COLLECTION:");
    for (const [leadType, data] of Object.entries(results.leads)) {
      if (data.duplicates.length > 0) {
        console.log(`\n  ⚠️  ${leadType.toUpperCase()}:`);
        console.log(`     Total: ${data.total}`);
        console.log(`     Duplicate Groups: ${data.duplicates.length}`);
        console.log(`     Duplicate Records: ${data.duplicateCount}`);
        totalDuplicates += data.duplicateCount;
        totalDuplicateGroups += data.duplicates.length;

        // Show first 5 duplicate groups
        data.duplicates.slice(0, 5).forEach((dup, idx) => {
          console.log(`\n     Group ${idx + 1} (${dup.criteria}):`);
          dup.details.forEach((detail, i) => {
            console.log(`       ${i + 1}. ID: ${detail.id}`);
            console.log(`          Name: ${detail.name}, Phone: ${detail.phone}`);
            if (detail.bookingNo) console.log(`          Booking No: ${detail.bookingNo}`);
            console.log(`          Store: ${detail.store}`);
            console.log(`          Created: ${detail.createdAt}`);
          });
        });
        if (data.duplicates.length > 5) {
          console.log(`     ... and ${data.duplicates.length - 5} more duplicate groups`);
        }
      } else {
        console.log(`\n  ✅ ${leadType.toUpperCase()}: ${data.total} leads, no duplicates`);
      }
    }

    // FollowUps
    console.log("\n📁 FOLLOWUPS COLLECTION:");
    if (results.followUps.duplicates.length > 0) {
      console.log(`\n  ⚠️  Total: ${results.followUps.total}`);
      console.log(`     Duplicate Groups: ${results.followUps.duplicates.length}`);
      console.log(`     Duplicate Records: ${results.followUps.duplicateCount}`);
      totalDuplicates += results.followUps.duplicateCount;
      totalDuplicateGroups += results.followUps.duplicates.length;
    } else {
      console.log(`\n  ✅ Total: ${results.followUps.total}, no duplicates`);
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📈 SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Duplicate Groups: ${totalDuplicateGroups}`);
    console.log(`Total Duplicate Records: ${totalDuplicates}`);
    console.log(`Total Unique Records to Remove: ${totalDuplicates}`);

    if (totalDuplicates > 0) {
      console.log("\n⚠️  DUPLICATES FOUND! Consider running cleanup script.");
    } else {
      console.log("\n✅ NO DUPLICATES FOUND!");
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

checkDuplicates();
