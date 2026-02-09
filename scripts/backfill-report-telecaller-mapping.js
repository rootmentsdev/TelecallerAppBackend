#!/usr/bin/env node
/**
 * Backfill script: Fix reports with missing createdByEmpId/createdByName
 *
 * Reports created before the telecaller mapping fix lack createdByEmpId and createdByName.
 * This script backfills them from the editedBy User reference.
 *
 * Usage:
 *   node scripts/backfill-report-telecaller-mapping.js          # Dry run (preview only)
 *   node scripts/backfill-report-telecaller-mapping.js --live   # Apply updates
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Report from '../models/Report.js';
import User from '../models/User.js';

dotenv.config();

const isLive = process.argv.includes('--live');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

const run = async () => {
  console.log('='.repeat(60));
  console.log('📋 BACKFILL: Report Telecaller Mapping (createdByEmpId/createdByName)');
  console.log('='.repeat(60));
  console.log(`Mode: ${isLive ? '🔴 LIVE (will update)' : '🔵 DRY RUN (preview only)'}`);
  console.log();

  await connectDB();

  // Find reports missing createdByEmpId or createdByName but have editedBy
  const query = {
    editedBy: { $exists: true, $ne: null },
    $or: [
      { createdByEmpId: { $in: [null, undefined, ''] } },
      { createdByName: { $in: [null, undefined, ''] } },
    ],
  };

  const reports = await Report.find(query).lean();
  console.log(`Found ${reports.length} report(s) with missing telecaller mapping\n`);

  if (reports.length === 0) {
    console.log('Nothing to backfill.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Get unique editedBy IDs to batch-fetch users
  const userIds = [...new Set(reports.map((r) => r.editedBy?.toString()).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const report of reports) {
    const editedById = report.editedBy?.toString?.() || report.editedBy;
    const user = editedById ? userMap[editedById] : null;

    if (!user) {
      console.log(`  ⚠️  Report ${report._id}: editedBy User not found (${editedById})`);
      skipped++;
      continue;
    }

    const updates = {};
    if (!report.createdByEmpId || report.createdByEmpId.trim() === '') {
      updates.createdByEmpId = user.employeeId || user.empId || '';
    }
    if (!report.createdByName || report.createdByName.trim() === '') {
      updates.createdByName = user.name || '';
    }
    if (!report.editedByEmpId || report.editedByEmpId.trim() === '') {
      updates.editedByEmpId = user.employeeId || user.empId || '';
    }
    if (!report.editedByName || report.editedByName.trim() === '') {
      updates.editedByName = user.name || '';
    }

    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }

    console.log(`  Report ${report._id} (leadType: ${report.leadType || '?'}) → ${user.name} (${user.employeeId})`);

    if (isLive) {
      try {
        await Report.updateOne({ _id: report._id }, { $set: updates });
        updated++;
      } catch (err) {
        console.error(`    ❌ Failed: ${err.message}`);
        failed++;
      }
    } else {
      updated++;
    }
  }

  console.log();
  console.log('-'.repeat(60));
  console.log(`Summary: ${updated} would be updated, ${skipped} skipped, ${failed} failed`);
  if (!isLive && updated > 0) {
    console.log('\nRun with --live to apply changes.');
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
