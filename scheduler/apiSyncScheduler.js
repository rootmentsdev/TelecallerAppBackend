// API-Only Sync Scheduler
// Automatically runs API sync every 5 minutes
// Does NOT affect CSV imports (remain manual)

import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SYNC_TIME = process.env.API_SYNC_TIME || '*/5 * * * *'; // Default: Every 5 minutes
const SYNC_ENABLED = process.env.API_SYNC_ENABLED !== 'false'; // Default: enabled
const SYNC_TIMEZONE = process.env.API_SYNC_TIMEZONE || 'UTC'; // Default: UTC

let isRunning = false;

const runApiSync = async () => {
  if (isRunning) {
    console.log('⚠️  API sync already running, skipping scheduled execution');
    return;
  }

  isRunning = true;
  const startTime = new Date();
  
  console.log('🕐 Starting automatic API sync at:', startTime.toISOString());

  try {
    // Import and run API-only sync (no CSV imports)
    const { runApiOnlySync } = await import('../sync/apiOnly.js');
    await runApiOnlySync();
    
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('✅ Automatic API sync completed successfully');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📅 Next sync: ${getNextRunTime()}`);
    
  } catch (error) {
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.error('❌ Automatic API sync failed:', error.message);
    console.log(`⏱️  Duration: ${duration} seconds (failed)`);
  } finally {
    isRunning = false;
  }
};

const getNextRunTime = () => {
  try {
    const task = cron.schedule(SYNC_TIME, () => { }, { scheduled: false, timezone: SYNC_TIMEZONE });
    return task.nextDate().toISOString();
  } catch (error) {
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
  console.log(`   Schedule: ${SYNC_TIME} (${SYNC_TIMEZONE})`);
  console.log(`   Next run: ${getNextRunTime()}`);
  console.log('   Scope: External APIs only (CSV imports remain manual)');
  console.log('   Frequency: Every 5 minutes');

  // Validate cron expression
  if (!cron.validate(SYNC_TIME)) {
    console.error('❌ Invalid cron expression:', SYNC_TIME);
    console.error('   Using default: */5 * * * * (Every 5 minutes)');
    return null;
  }

  // Schedule the task
  const task = cron.schedule(SYNC_TIME, runApiSync, {
    scheduled: true,
    timezone: SYNC_TIMEZONE
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