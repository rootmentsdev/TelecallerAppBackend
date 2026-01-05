// API-Only Sync Scheduler
// Automatically runs API sync every 20 minutes
// Does NOT affect CSV imports (remain manual)

import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SYNC_TIME = process.env.API_SYNC_TIME || '*/20 * * * *'; // Default: Every 20 minutes
const SYNC_ENABLED = process.env.API_SYNC_ENABLED !== 'false'; // Default: enabled
const SYNC_TIMEZONE = process.env.API_SYNC_TIMEZONE || 'Asia/Kolkata'; // Default: Asia/Kolkata

let isRunning = false;

const runApiSync = async () => {
  if (isRunning) {
    console.log('⚠️  API sync already running, skipping scheduled execution');
    return;
  }

  isRunning = true;
  
  // Add runtime verification log
  console.log("⏱️ API sync triggered at:", new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata"
  }));

  try {
    // Import and run API-only sync (no CSV imports)
    const { runApiOnlySync } = await import('../sync/apiOnly.js');
    const result = await runApiOnlySync();
    
    if (result && result.skipped) {
      console.log('⏭️  Sync skipped - global lock is active');
      console.log('   Another sync cycle is already running');
    } else if (result && result.success) {
    console.log('✅ Automatic API sync completed successfully');
    } else if (result && !result.success) {
      console.log(`⚠️  Automatic API sync completed with ${result.failures || 0} error(s)`);
    } else {
      console.log('✅ Automatic API sync completed');
    }
    
    console.log(`📅 Next sync: ${getNextRunTime()}`);
    
  } catch (error) {
    console.error('❌ Automatic API sync failed:', error.message);
  } finally {
    isRunning = false;
  }
};

const getNextRunTime = () => {
  try {
    // Calculate next run time manually for */20 * * * * pattern
    const now = new Date();
    const nextRun = new Date(now);
    
    // Round up to next 20-minute interval
    const minutes = now.getMinutes();
    const nextMinutes = Math.ceil(minutes / 20) * 20;
    
    if (nextMinutes >= 60) {
      nextRun.setHours(now.getHours() + 1);
      nextRun.setMinutes(0);
    } else {
      nextRun.setMinutes(nextMinutes);
    }
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);
    
    return nextRun.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata"
    });
  } catch (error) {
    console.error('Error calculating next run time:', error.message);
    return 'Unable to calculate next run time';
  }
};

const startScheduler = () => {
  if (!SYNC_ENABLED) {
    console.log('📅 API sync scheduler is DISABLED (API_SYNC_ENABLED=false)');
    console.log('   To enable: set API_SYNC_ENABLED=true in environment');
    return null;
  }

  console.log('📅 Starting API sync scheduler...');
  console.log(`   Schedule: ${SYNC_TIME} (Asia/Kolkata)`);
  console.log(`   Frequency: Every 20 minutes`);
  console.log(`   Next run: ${getNextRunTime()}`);
  console.log('   Scope: External APIs only (CSV imports remain manual)');
  console.log('   Lock: Global sync lock enabled (atomic execution)');

  // Validate cron expression
  if (!cron.validate(SYNC_TIME)) {
    console.error('❌ Invalid cron expression:', SYNC_TIME);
    console.error('   Using default: */20 * * * * (Every 20 minutes)');
    return null;
  }

  // Schedule the task with timezone support
  const task = cron.schedule(SYNC_TIME, runApiSync, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log('✅ API sync scheduler started successfully');

  return task;
};

const stopScheduler = (task) => {
  if (task) {
    task.stop();
    console.log('🛑 API sync scheduler stopped');
  }
};

// Export functions for use in server.js
export { startScheduler, stopScheduler, runApiSync };

// Auto-start if called directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testing API sync scheduler...');
  startScheduler();

  // Keep process alive for testing
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down scheduler...');
    process.exit(0);
  });
}