import { postAPI } from "../sync/utils/apiClient.js";
import dotenv from "dotenv";

dotenv.config();

const testApi = async () => {
    const baseUrl = "http://15.207.90.158:5000";
    const endpoint = "/api/Reports/GetBookingReport";
    const apiUrl = `${baseUrl}${endpoint}`;

    // Request for last month (known to have data)
    const requestBody = {
        bookingNo: "",
        dateFrom: "", // Empty to use 'months'
        dateTo: "",
        months: "1", // Last 1 month
        userName: "",
        fromLocation: "",
        userID: "",
        locationID: "1" // Check store 1 specificially
    };

    console.log(`Testing API: ${apiUrl}`);
    console.log("Params:", JSON.stringify(requestBody));

    try {
        const data = await postAPI(apiUrl, requestBody, {
            headers: { "Content-Type": "application/json-patch+json" }
        });

        if (data && (data.dataSet || data.data)) {
            const list = data.dataSet ? (data.dataSet.data || data.dataSet) : data.data;
            console.log("✅ Success! API returned data.");
            console.log(`📊 Found ${list.length} records in the last 1 month for Location 1.`);
            if (list.length > 0) {
                console.log("Sample Record:", JSON.stringify(list[0], null, 2)); // Show one record
            }
        } else {
            console.log("⚠️ API returned no data (or unexpected format).");
            console.log("Response:", JSON.stringify(data).substring(0, 500));
        }

    } catch (error) {
        console.error("❌ API Request Failed:", error.message);
    }
};

testApi();
