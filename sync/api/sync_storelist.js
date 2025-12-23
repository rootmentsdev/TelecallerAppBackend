import { fetchAPI, postAPI } from "../utils/apiClient.js";
import { saveStoreToMongo } from "../utils/saveToMongo.js";
import { normalizeStoreName } from "../utils/storeMap.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
  console.log("🔄 Starting Store List API sync...");

  // Use full URL or construct from base URL + endpoint
  // API: /api/Location/LocationList
  const baseUrl = process.env.API_BASE_URL || "https://rentalapi.rootments.live";
  const endpoint = "/api/Location/LocationList";
  const apiUrl = process.env.STORE_LIST_API_URL || `${baseUrl}${endpoint}`;
  const apiToken = process.env.STORE_API_KEY || process.env.API_TOKEN;
  const usePost = process.env.STORE_USE_POST === "true" || false;

  console.log(`📡 Calling API: ${apiUrl}`);
  console.log(`🔐 Method: ${usePost ? "POST" : "GET"}`);
  if (apiToken) console.log(`🔑 Using authentication token`);

  let data;
  if (usePost) {
    data = await postAPI(
      apiUrl,
      {},
      {
        headers: {
          "Authorization": apiToken ? `Bearer ${apiToken}` : undefined,
          "Content-Type": "application/json",
          "accept": "text/plain",
        },
      }
    );
  } else {
    data = await fetchAPI(apiUrl, {
      headers: {
        "Authorization": apiToken ? `Bearer ${apiToken}` : undefined,
        "Content-Type": "application/json",
        "accept": "text/plain",
      },
    });
  }

  if (!data) {
    console.error("❌ No data received from API");
    return;
  }

  // Handle different response formats: direct array or wrapped in object
  let dataArray = data;
  if (!Array.isArray(data)) {
    // Check for dataSet.data structure (Location API format)
    if (data.dataSet && data.dataSet.data && Array.isArray(data.dataSet.data)) {
      dataArray = data.dataSet.data;
    } else if (data.data && Array.isArray(data.data)) {
      dataArray = data.data;
    } else if (data.result && Array.isArray(data.result)) {
      dataArray = data.result;
    } else if (Array.isArray(data)) {
      dataArray = data;
    } else {
      console.error("❌ Invalid API response format. Expected array or object with 'dataSet.data'/'data'/'result' array.");
      console.error("Response structure:", JSON.stringify(data, null, 2).substring(0, 500));
      return;
    }
  }

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of dataArray) {
    // Map API response fields to Store model
    const rawName = (
      row.locName || row.LocName || row.LOCNAME ||
      row.name || row.Name || row.storeName || row.StoreName || ""
    ).trim();

    // Normalize name
    const normalizedName = normalizeStoreName(rawName);

    const storeData = {
      name: normalizedName || rawName, // Fallback to raw if empty (shouldn't happen)
      code: (
        row.locCode || row.LocCode || row.LOCCODE ||
        row.code || row.Code || row.storeCode || row.StoreCode || ""
      ).trim(),
      brand: (row.brand || row.Brand || "").trim(),
      city: (
        row.city || row.City || row.CITY || ""
      ).trim(),
      // Map status: 1 = active, 0 or null = inactive
      isActive: row.status !== undefined
        ? (row.status === 1 || row.status === "1" || row.status === true)
        : (row.isActive !== undefined ? row.isActive : (row.active !== undefined ? row.active : true)),
    };

    // Skip if no name (required field)
    if (!storeData.name) {
      skipped++;
      continue;
    }

    // Pass normalized name to save function
    const result = await saveStoreToMongo(storeData);
    if (result.saved) {
      saved++;
    } else if (result.skipped) {
      // Store already exists - skipped (not updated)
      skipped++;
    } else {
      errors++;
    }
  }

  // Create sync log entry
  const syncEndTime = new Date();
  const trigger = process.env.SYNC_TRIGGER || "auto";

  try {
    const { default: SyncLog } = await import("../../models/SyncLog.js");
    await SyncLog.create({
      syncType: "store",
      trigger: trigger,
      lastSyncAt: syncEndTime,
      lastSyncCount: saved,
      status: errors > 0 ? "partial" : "success",
      errorMessage: errors > 0 ? `${errors} errors occurred` : null,
    });
    console.log(`📝 Sync log saved`);
  } catch (error) {
    console.error("❌ Error saving sync log:", error.message);
  }

  console.log(`✅ Store List sync completed: ${saved} new saved, ${skipped} skipped (already exists), ${errors} errors`);

  return {
    saved,
    skipped,
    errors
  };
};

// Export run function for use in runAll.js
export { run };

// Auto-run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('sync_storelist.js')) {
  run().catch((error) => {
    console.error("❌ Store List sync failed:", error.message);
    process.exit(1);
  });
}

