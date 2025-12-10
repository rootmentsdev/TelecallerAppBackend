import { postAPI, fetchAPI } from "../utils/apiClient.js";
import { mapBooking } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import Store from "../../models/Store.js";
import Lead from "../../models/Lead.js";
import SyncLog from "../../models/SyncLog.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for booking sync");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const run = async () => {
  console.log("🔄 Starting Booking API sync...");
  
  // Connect to MongoDB
  await connectDB();
  
  // Step 1: Fetch all stores from database
  console.log("📦 Fetching stores from database...");
  const stores = await Store.find({ isActive: true }).select("code name");
  
  if (!stores || stores.length === 0) {
    console.warn("⚠️  No stores found in database. Please sync stores first using: npm run sync:stores");
    return;
  }
  
  console.log(`✅ Found ${stores.length} active stores`);
  
  // Step 2: API configuration
  // Use new API base URL for booking confirmation
  const baseUrl = process.env.BOOKING_API_BASE_URL || process.env.API_BASE_URL || "http://15.207.90.158:5000";
  const endpoint = process.env.BOOKING_API_ENDPOINT || "/api/GetBooking/GetBookingList";
  const apiUrl = `${baseUrl}${endpoint}`;
  const apiToken = process.env.BOOKING_API_KEY || process.env.API_TOKEN;
  const usePost = process.env.BOOKING_USE_POST === "true" || false;
  
  // Step 3: Get last sync time for incremental sync (only fetch new/updated records)
  let lastSyncAt = null;
  let syncLog = await SyncLog.findOne({ syncType: "booking" });
  
  if (syncLog && syncLog.lastSyncAt) {
    lastSyncAt = syncLog.lastSyncAt;
    console.log(`📅 Last sync: ${lastSyncAt.toISOString()}`);
    console.log(`   Will fetch only records updated after this time`);
  } else {
    console.log(`📅 First sync - will fetch all records`);
  }
  
  // Step 4: Date range configuration - use last sync time for incremental sync
  let dateFrom = process.env.BOOKING_DATE_FROM || "";
  let dateTo = process.env.BOOKING_DATE_TO || "";
  let months = process.env.BOOKING_MONTHS || "";

  // Date range configuration - prioritize months parameter for better API compatibility
  if (!dateFrom && !dateTo && !months) {
    if (lastSyncAt) {
      // For incremental sync, use months parameter (more reliable than dateFrom)
      // Calculate months since last sync (minimum 1 month, maximum 12 months)
      const monthsSinceSync = Math.min(12, Math.max(1, Math.floor((Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60 * 24 * 30))));
      months = String(monthsSinceSync);
      console.log(`   Using incremental sync: last ${months} months`);
    } else {
      // First sync - default to last 12 months
      months = "12";
      console.log(`   Using default: last 12 months (first sync)`);
    }
  } else {
    // Use environment variables if specified
    if (dateFrom) console.log(`📅 Date from: ${dateFrom}`);
    if (dateTo) console.log(`📅 Date to: ${dateTo}`);
    if (months) console.log(`📅 Months: ${months}`);
  }
  
  // Location ID to Store Name mapping (same as rent-out)
  const LOCATION_ID_TO_STORE_NAME = {
    '1': 'Z- Edapally',
    '3': 'SG-Edappally',
    '5': 'Trivandrum',
    '6': 'Z- Edapally',
    '7': 'PMNA',
    '8': 'Z.Kottakkal',
    '9': 'Kottayam',
    '10': 'Perumbavoor',
    '11': 'Trissur',
    '12': 'Chavakkad',
    '13': 'CALICUT',
    '14': 'VATAKARA',
    '15': 'SG-Edappally',
    '16': 'PMNA',
    '17': 'KOTTAKAL',
    '18': 'MANJERY',
    '19': 'Palakkad',
    '20': 'KALPETTA',
    '21': 'KANNUR'
  };
  
  console.log(`\n📍 Fetching booking data using location IDs`);
  console.log(`   Will fetch data for each location separately`);
  
  // Try GetBookingList first, but if it returns empty, use GetBookingReport (which we know works)
  const fallbackUrl = `${baseUrl}/api/Reports/GetBookingReport`;
  const locationIds = Object.keys(LOCATION_ID_TO_STORE_NAME);
  
  let allDataArray = [];
  let locationsWithNoData = 0;
  
  // Try GetBookingList API first (GET request without params returns empty, so skip to fallback)
  console.log(`📡 Trying GetBookingList API first...`);
  
  // Since GET returns empty, directly use the fallback API (GetBookingReport) which we know works
  console.log(`📡 Using GetBookingReport API (known working endpoint)`);
  
  for (const locationId of locationIds) {
    const storeName = LOCATION_ID_TO_STORE_NAME[locationId];
    
    console.log(`\n📍 Processing Location ID: ${locationId} (Store: ${storeName})`);
    
    // Use GetBookingReport API (POST) with locationID
    // Note: API prefers months parameter over dateFrom/dateTo
    const requestBody = {
      bookingNo: "",
      dateFrom: dateFrom || "",
      dateTo: dateTo || "",
      userName: "",
      months: months || "", // Prioritize months parameter
      fromLocation: "",
      userID: "",
      locationID: locationId,
    };
    
    console.log(`📡 Calling API: ${fallbackUrl}`);
    console.log(`   📤 Location ID: ${locationId}`);
    
    let data = await postAPI(
      fallbackUrl,
        requestBody,
        {
          headers: {
            "Authorization": apiToken ? `Bearer ${apiToken}` : undefined,
            "Content-Type": "application/json-patch+json",
            "accept": "text/plain",
          },
        }
      );
      
      if (!data) {
      console.log(`   ⚠️  API returned null/undefined for location ID ${locationId}`);
      continue;
    }
    
    // Log response status for debugging
    if (data.status !== undefined) {
      console.log(`   📥 Response status: ${data.status}`);
    }
    if (data.errorDescription) {
      console.log(`   ⚠️  Error: ${data.errorDescription}`);
    }
    
    // Debug: Log response structure for first location
    if (locationId === '1') {
      console.log(`   🔍 Debug - Response structure:`, JSON.stringify(data, null, 2).substring(0, 500));
      console.log(`   🔍 Response keys:`, Object.keys(data || {}));
      if (data.dataSet) {
        console.log(`   🔍 dataSet type:`, typeof data.dataSet);
        console.log(`   🔍 dataSet is array:`, Array.isArray(data.dataSet));
        if (data.dataSet && !Array.isArray(data.dataSet)) {
          console.log(`   🔍 dataSet keys:`, Object.keys(data.dataSet));
        }
      }
    }
    
    // Parse response - handle different response structures
    let locationData = [];
    
    // Check for dataSet.data structure (most common)
        if (data.dataSet) {
          if (data.dataSet === null) {
        console.log(`   ℹ️  dataSet is null for location ID ${locationId}`);
        continue;
          } else if (data.dataSet.data && Array.isArray(data.dataSet.data)) {
        locationData = data.dataSet.data;
          } else if (Array.isArray(data.dataSet)) {
        locationData = data.dataSet;
      } else if (data.dataSet.data && !Array.isArray(data.dataSet.data)) {
        // dataSet.data might be an object, try to extract array from it
        console.log(`   ⚠️  dataSet.data is not an array for location ID ${locationId}`);
          }
        } else if (data.data && Array.isArray(data.data)) {
      locationData = data.data;
        } else if (data.result && Array.isArray(data.result)) {
      locationData = data.result;
    } else if (Array.isArray(data)) {
      locationData = data;
        } else {
      // Log what we actually got
      console.log(`   ⚠️  Unexpected response format for location ID ${locationId}`);
      console.log(`   Response status: ${data.status}, errorDescription: ${data.errorDescription || 'none'}`);
      if (data.errorDescription) {
        console.log(`   Error: ${data.errorDescription}`);
      }
    }
    
    if (locationData.length > 0) {
      // Filter: Only process records that have bookingDate (booking records)
      // The API returns both booking and rent-out records, so we filter for booking only
      const bookingRecords = locationData.filter(row => {
        return row.bookingDate || row.booking_date || row.BookingDate;
      });
      
      // Add store name to each booking record
      bookingRecords.forEach(row => {
        row.store = storeName;
      });
      allDataArray.push(...bookingRecords);
      console.log(`   ✅ Found ${locationData.length} total records, ${bookingRecords.length} booking records for location ID ${locationId}`);
      } else {
      locationsWithNoData++;
      console.log(`   ℹ️  No data for location ID ${locationId} (empty array or null dataSet)`);
      // Log response status for debugging
      if (data.status !== undefined) {
        console.log(`   Response status: ${data.status}`);
      }
      if (data.errorDescription) {
        console.log(`   Error: ${data.errorDescription}`);
      }
    }
    
    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // If all locations returned no data, try fetching all data with empty locationID
  if (allDataArray.length === 0 && locationsWithNoData === locationIds.length) {
    console.log(`\n⚠️  No data received from individual location IDs`);
    console.log(`📡 Trying to fetch all booking data with empty locationID...`);
    
    const requestBody = {
      bookingNo: "",
      dateFrom: dateFrom || "",
      dateTo: dateTo || "",
      userName: "",
      months: months || "",
      fromLocation: "",
      userID: "",
      locationID: "", // Empty locationID to get all data
    };
    
    console.log(`📡 Calling API: ${fallbackUrl}`);
    console.log(`   📤 Location ID: "" (all locations)`);
    
    const allData = await postAPI(
      fallbackUrl,
      requestBody,
      {
        headers: {
          "Authorization": apiToken ? `Bearer ${apiToken}` : undefined,
          "Content-Type": "application/json-patch+json",
          "accept": "text/plain",
        },
      }
    );
    
    if (allData) {
      // Parse response
      let allLocationData = [];
      if (allData.dataSet && Array.isArray(allData.dataSet.data)) {
        allLocationData = allData.dataSet.data;
      } else if (Array.isArray(allData.dataSet)) {
        allLocationData = allData.dataSet;
      } else if (Array.isArray(allData.data)) {
        allLocationData = allData.data;
      } else if (Array.isArray(allData)) {
        allLocationData = allData;
      }
      
      if (allLocationData.length > 0) {
        console.log(`   ✅ Found ${allLocationData.length} total records from all locations`);
        console.log(`   📊 Filtering booking records and mapping location IDs...`);
        
        // Filter: Only process records that have bookingDate (booking records)
        const bookingRecords = allLocationData.filter(row => {
          return row.bookingDate || row.booking_date || row.BookingDate;
        });
        
        // Map location ID from API data to store name
        // The API data should have a location field that we can map
        bookingRecords.forEach(row => {
          // Try to find store name from location ID in the row data
          const rowLocationId = String(row.locationID || row.locationId || row.LocationID || "").trim();
          if (rowLocationId && LOCATION_ID_TO_STORE_NAME[rowLocationId]) {
            row.store = LOCATION_ID_TO_STORE_NAME[rowLocationId];
          } else {
            // If no location ID match, try to match by store name in the data
            const rowStoreName = row.store || row.Store || row.storeName || row.StoreName || row.location || row.Location || "";
            if (rowStoreName) {
              row.store = rowStoreName;
            } else {
              // Default to first store if no match
              row.store = "Default Store";
            }
          }
        });
        
        allDataArray = bookingRecords;
        console.log(`   ✅ Filtered to ${allDataArray.length} booking records and mapped to stores`);
        } else {
        console.log(`   ℹ️  No booking data received even with empty locationID`);
        console.log(`   Response status: ${allData.status}, errorDescription: ${allData.errorDescription || 'none'}`);
      }
    }
  }
  
  if (allDataArray.length === 0) {
    console.log(`\nℹ️  No booking data received from API`);
    console.log(`   This could mean:`);
    console.log(`   • No new bookings in the date range (${dateFrom || 'last 7 days'})`);
    console.log(`   • API is not returning data for the specified parameters`);
    console.log(`   • Check API response in debug logs above`);
    return;
  }
  
  console.log(`\n📊 Found ${allDataArray.length} total records from all locations`);
  console.log(`   Processing records...`);
  console.log(`   This may take a few minutes for large datasets...`);
  
  // Process all collected data with progress indicator
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const totalRecords = allDataArray.length;
  const progressInterval = Math.max(1, Math.floor(totalRecords / 20)); // Show progress every 5%
  let lastProgressTime = Date.now();
  
  for (let i = 0; i < allDataArray.length; i++) {
    const row = allDataArray[i];
    
    // Store name is already added in the loop above
    const mapped = mapBooking(row);
    if (mapped) {
      const result = await saveToMongo(mapped);
      if (result.saved) {
        totalSaved++;
      } else if (result.skipped) {
        // Record already exists - skipped (not updated)
        totalSkipped++;
      } else {
        totalErrors++;
      }
    } else {
      totalSkipped++;
    }
    
    // Show progress AFTER processing (so counters are accurate)
    if (i % progressInterval === 0 || i === allDataArray.length - 1) {
      const progress = ((i + 1) / totalRecords * 100).toFixed(1);
      const elapsed = ((Date.now() - lastProgressTime) / 1000).toFixed(1);
      const rate = progressInterval > 0 ? (progressInterval / (elapsed || 1)).toFixed(0) : 0;
      process.stdout.write(`\r   ⏳ Progress: ${progress}% (${i + 1}/${totalRecords}) | Rate: ~${rate} records/sec | Saved: ${totalSaved}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
      lastProgressTime = Date.now();
    }
  }
  
  // Update sync log with latest sync time
  const syncEndTime = new Date();
  await SyncLog.findOneAndUpdate(
    { syncType: "booking" },
    {
      lastSyncAt: syncEndTime,
      lastSyncCount: totalSaved,
      status: totalErrors > 0 ? "partial" : "success",
      errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : null,
    },
    { upsert: true, new: true }
  );
  
  console.log(`\n✅ Booking sync completed!`);
  console.log(`   📊 Locations processed: ${locationIds.length}`);
  console.log(`   💾 Total new records saved: ${totalSaved}`);
  console.log(`   ⏭️  Total skipped (already exists): ${totalSkipped}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
  console.log(`   📅 Next sync will fetch records updated after: ${syncEndTime.toISOString()}`);
};

// Export run function for use in runAll.js
export { run };

// Auto-run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('sync_booking.js')) {
run().catch((error) => {
  console.error("❌ Booking sync failed:", error.message);
  process.exit(1);
});
}

