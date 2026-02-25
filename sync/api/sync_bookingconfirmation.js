import { postAPI } from "../utils/apiClient.js";
import { mapBookingConfirmation } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import SyncLog from "../../models/SyncLog.js";
import { LEAD_API_ID_MAP } from "../utils/storeMap.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for booking confirmation sync");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const run = async () => {
  console.log("🔄 Starting Booking Confirmation API sync...");

  await connectDB();

  const baseUrl = process.env.RETURN_API_BASE_URL || "https://rentalapi.rootments.live";
  const endpoint = process.env.BOOKING_CONFIRMATION_ENDPOINT || "/api/Reports/GetBookingReport";
  const apiUrl = `${baseUrl}${endpoint}`;
  const apiToken = process.env.RETURN_API_KEY || process.env.API_TOKEN;

  const LOCATION_ID_TO_STORE_NAME = LEAD_API_ID_MAP;

  let lastSyncAt = null;
  let syncLog = await SyncLog.findOne({ syncType: "bookingconfirmation", status: "success" }).sort({ lastSyncAt: -1 });
  if (syncLog && syncLog.lastSyncAt) {
    lastSyncAt = syncLog.lastSyncAt;
    console.log(`📅 Last sync: ${lastSyncAt.toISOString()}`);
  } else {
    console.log(`📅 First sync - will fetch all records`);
  }

  let dateFrom = process.env.BOOKING_DATE_FROM || process.env.RETURN_DATE_FROM || "";
  let dateTo = process.env.BOOKING_DATE_TO || process.env.RETURN_DATE_TO || "";
  let months = process.env.BOOKING_MONTHS || process.env.RETURN_MONTHS || "";

  if (!dateFrom && !dateTo && !months) {
    if (lastSyncAt) {
      const incrementalDays = parseInt(process.env.API_SYNC_INCREMENTAL_DAYS) || 7;
      const today = new Date();
      const daysAgo = new Date(today.getTime() - incrementalDays * 24 * 60 * 60 * 1000);
      dateFrom = daysAgo.toISOString().split("T")[0];
      dateTo = today.toISOString().split("T")[0];
      months = "1";
      console.log(`   Using ${incrementalDays}-DAY incremental sync: FROM ${dateFrom} TO ${dateTo}`);
    } else {
      months = "12";
      console.log(`   Using default: last 12 months (first sync)`);
    }
  }

  console.log(`📡 Using API: ${apiUrl}`);
  if (apiToken) console.log(`🔑 Using authentication token`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let locationsProcessed = 0;
  const locationIds = Object.keys(LOCATION_ID_TO_STORE_NAME);
  const CONCURRENCY_LIMIT = parseInt(process.env.SYNC_CONCURRENCY) || 5;
  const results = [];

  for (let i = 0; i < locationIds.length; i += CONCURRENCY_LIMIT) {
    const batch = locationIds.slice(i, i + CONCURRENCY_LIMIT);
    const batchPromises = batch.map(async (locationId) => {
      const storeName = LOCATION_ID_TO_STORE_NAME[locationId];
      console.log(`\n📍 Processing Location ID: ${locationId} (Store: ${storeName})`);

      let finalDateFrom = dateFrom;
      let finalDateTo = dateTo;
      let finalMonths = months;
      if (!finalDateFrom && !finalDateTo && !finalMonths && !lastSyncAt) finalMonths = "12";

      const requestBody = {
        bookingNo: "",
        dateFrom: finalDateFrom || "",
        dateTo: finalDateTo || "",
        userName: "",
        months: finalMonths || "",
        fromLocation: "",
        userID: "",
        locationID: String(locationId),
      };

      const data = await postAPI(apiUrl, requestBody, {
        headers: {
          Authorization: apiToken ? `Bearer ${apiToken}` : undefined,
          "Content-Type": "application/json-patch+json",
          accept: "text/plain",
        },
      });

      if (!data) {
        console.log(`   ⚠️  API returned null/undefined for location ID ${locationId}`);
        return { saved: 0, skipped: 0, errors: 0 };
      }
      if (data.status === false) {
        console.log(`   ℹ️  API returned status=false for location ID ${locationId}`);
        return { saved: 0, skipped: 0, errors: 0 };
      }

      let dataArray = null;
      if (!Array.isArray(data)) {
        if (data.dataSet) {
          if (data.dataSet === null) {
            console.log(`   ℹ️  dataSet is null - no booking data available`);
            return { saved: 0, skipped: 0, errors: 0 };
          }
          if (data.dataSet.data && Array.isArray(data.dataSet.data)) dataArray = data.dataSet.data;
          else if (Array.isArray(data.dataSet)) dataArray = data.dataSet;
        } else if (data.data && Array.isArray(data.data)) {
          dataArray = data.data;
        } else if (data.result && Array.isArray(data.result)) {
          dataArray = data.result;
        } else {
          console.warn(`   ⚠️  Invalid response format`);
          return { saved: 0, skipped: 0, errors: 1 };
        }
      } else {
        dataArray = data;
      }

      if (!dataArray || dataArray.length === 0) {
        console.log(`   ℹ️  No data for location ID ${locationId}`);
        return { saved: 0, skipped: 0, errors: 0 };
      }

      console.log(`   📊 Found ${dataArray.length} booking records for location ID ${locationId}`);

      let saved = 0;
      let skipped = 0;
      let errors = 0;
      for (let j = 0; j < dataArray.length; j++) {
        const row = dataArray[j];
        const rowWithStore = { ...row, store: storeName };
        const mapped = mapBookingConfirmation(rowWithStore);
        if (mapped) {
          const result = await saveToMongo(mapped);
          if (result.saved) saved++;
          else if (result.skipped) skipped++;
          else if (result.error) errors++;
          else skipped++;
        } else skipped++;
      }

      console.log(`   ✅ New records saved: ${saved}, ⏭️  Skipped: ${skipped}, ❌ Errors: ${errors}`);
      return { saved, skipped, errors };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    console.log(`\n✅ Completed batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(locationIds.length / CONCURRENCY_LIMIT)}`);
  }

  results.forEach((r) => {
    totalSaved += r.saved;
    totalSkipped += r.skipped;
    totalErrors += r.errors;
    locationsProcessed++;
  });

  const syncEndTime = new Date();
  const trigger = process.env.SYNC_TRIGGER || "auto";
  try {
    await SyncLog.create({
      syncType: "bookingconfirmation",
      trigger,
      lastSyncAt: syncEndTime,
      lastSyncCount: totalSaved,
      status: totalErrors > 0 ? "partial" : "success",
      errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : null,
    });
    console.log(`📝 Sync log saved`);
  } catch (error) {
    console.error("❌ Error saving sync log:", error.message);
  }

  console.log(`\n✅ Booking Confirmation sync completed!`);
  console.log(`   📊 Locations processed: ${locationsProcessed}/${locationIds.length}`);
  console.log(`   💾 Total new records saved: ${totalSaved}`);
  console.log(`   ⏭️  Total skipped: ${totalSkipped}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
};

export { run };

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("sync_bookingconfirmation.js")) {
  run().catch((err) => {
    console.error("❌ Booking Confirmation sync failed:", err.message);
    process.exit(1);
  });
}
