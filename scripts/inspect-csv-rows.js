import { readCSV } from "./sync/utils/csvReader.js";
import fs from "fs";
import { join } from "path";

const run = async () => {
    const dataDir = join(process.cwd(), "data");
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith("lossofsale"));

    for (const file of files) {
        const data = await readCSV(join(dataDir, file));
        console.log(`${file}: ${data.length} records`);

        // Check for suspicious rows (e.g. Total, Grand Total, etc)
        const suspicious = data.filter(row => {
            const values = Object.values(row).join(" ").toLowerCase();
            return values.includes("total") || values.includes("grand");
        });

        if (suspicious.length > 0) {
            console.log(`  Suspicious rows found in ${file}:`);
            suspicious.forEach(r => console.log(`    ${JSON.stringify(r)}`));
        }
    }
};

run();
