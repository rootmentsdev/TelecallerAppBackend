// API-Only Sync Scheduler
// Automatically runs API sync every 10 minutes
// Does NOT affect CSV imports (remain manual)

import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SYNC_TIME = process.env.API_SYNC_TIME || '*/10 * * * *'; // Default: Every 10 minutes
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
    await runApiOnlySync();
    
    console.log('✅ Automatic API sync completed successfully');
    console.log(`📅 Next sync: ${getNextRunTime()}`);
    
  } catch (error) {
    console.error('❌ Automatic API sync failed:', error.message);
  } finally {
    isRunning = false;
  }
};

const getNextRunTime = () => {
  try {
    // Calculate next run time manually for */10 * * * * pattern
    const now = new Date();
    const nextRun = new Date(now);
    
    // Round up to next 10-minute interval
    const minutes = now.getMinutes();
    const nextMinutes = Math.ceil(minutes / 10) * 10;
    
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
  console.log(`   Frequency: Every 10 minutes`);
  console.log(`   Next run: ${getNextRunTime()}`);
  console.log('   Scope: External APIs only (CSV imports remain manual)');

  // Validate cron expression
  if (!cron.validate(SYNC_TIME)) {
    console.error('❌ Invalid cron expression:', SYNC_TIME);
    console.error('   Using default: */10 * * * * (Every 10 minutes)');
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