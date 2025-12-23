import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    const url = 'https://rentalapi.rootments.live/api/Location/LocationList';
    console.log(`Fetching from ${url}...`);

    try {
        const response = await axios.get(url);
        const stores = response.data;

        console.log("Raw Store List:");
        if (Array.isArray(stores)) {
            stores.forEach(s => {
                console.log(`ID: ${s.locCode || s.LocCode || s.code}, Name: ${s.locName || s.LocName || s.name}, Brand: ${s.brand || s.Brand || 'N/A'}`);
            });
        } else if (stores.dataSet && stores.dataSet.data) {
            stores.dataSet.data.forEach(s => {
                console.log(`ID: ${s.locCode || s.LocCode || s.code}, Name: ${s.locName || s.LocName || s.name}, Brand: ${s.brand || s.Brand || 'N/A'}`);
            });
        } else {
            console.log(JSON.stringify(stores, null, 2));
        }

    } catch (error) {
        console.error("Error fetching stores:", error.message);
    }
};

run();
