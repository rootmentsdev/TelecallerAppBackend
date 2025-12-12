// Daily API Sync Scheduler
// Automatically runs API sync every day at configured time
// Does NOT affect CSV imports (remain manual)

import cron from 'node-cron';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SYNC_TIME = process.env.API_SYNC_TIME || '0 9 * * *'; // Default: 6:00 AM daily
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
  
  console.log('🕐 Scheduled API sync started at:', startTime.toISOString());
  console.log('📡 Running: npm run sync:all');

  return new Promise((resolve) => {
    // Use spawn to run the existing sync command exactly as it would be run manually
    const syncProcess = spawn('npm', ['run', 'sync:all'], {
      stdio: 'inherit', // Show output in console
      shell: true
    });

    syncProcess.on('close', (code) => {
      const endTime = new Date();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      if (code === 0) {
        console.log('✅ Scheduled API sync completed successfully');
        console.log(`⏱️  Duration: ${duration} seconds`);
        console.log(`📅 Next sync: ${getNextRunTime()}`);
      } else {
        console.error('❌ Scheduled API sync failed with exit code:', code);
        console.log(`⏱️  Duration: ${duration} seconds (failed)`);
      }
      
      isRunning = false;
      resolve(code);
    });

    syncProcess.on('error', (error) => {
      console.error('❌ Failed to start scheduled API sync:', error.message);
      isRunning = false;
      resolve(1);
    });
  });
};

const getNextRunTime = () => {
  try {
    const task = cron.schedule(SYNC_TIME, () => {}, { scheduled: false, timezone: SYNC_TIMEZONE });
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
  console.log('   Scope: API sync only (CSV imports remain manual)');

  // Validate cron expression
  if (!cron.validate(SYNC_TIME)) {
    console.error('❌ Invalid cron expression:', SYNC_TIME);
    console.error('   Using default: 0 6 * * * (6:00 AM daily)');
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