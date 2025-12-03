import { fetchAPI, postAPI } from "../utils/apiClient.js";
import { saveStoreToMongo } from "../utils/saveToMongo.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
  console.log("🔄 Starting Store List API sync...");
  
  // Use full URL or construct from base URL + endpoint
  // API: /api/Location/LocationList
  const baseUrl = process.env.API_BASE_URL || "http://15.207.90.158:5000";
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
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of dataArray) {
    // Map API response fields to Store model
    // API fields: locName, locCode, city, status, etc.
    const storeData = {
      name: (
        row.locName || row.LocName || row.LOCNAME ||
        row.name || row.Name || row.storeName || row.StoreName || ""
      ).trim(),
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

    const result = await saveStoreToMongo(storeData);
    if (result.saved) {
      saved++;
    } else if (result.updated) {
      updated++;
    } else if (result.skipped) {
      skipped++;
    } else {
      errors++;
    }
  }

  console.log(`✅ Store List sync completed: ${saved} saved, ${updated} updated, ${skipped} skipped, ${errors} errors`);
};

run().catch((error) => {
  console.error("❌ Store List sync failed:", error.message);
  process.exit(1);
});

