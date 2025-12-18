import fs from 'fs';
import csvParser from 'csv-parser';
import path from 'path';

async function inspectCsv() {
    const dataDir = path.resolve('data');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));

    if (files.length === 0) {
        console.log("No CSV files found in data/");
        return;
    }

    const firstFile = path.join(dataDir, files[0]);
    console.log(`Inspecting: ${firstFile}`);

    const rows = [];
    await new Promise((resolve) => {
        fs.createReadStream(firstFile)
            .pipe(csvParser())
            .on('data', (row) => rows.push(row))
            .on('end', resolve);
    });

    console.log("Keys found in row 0:", Object.keys(rows[0] || {}));
    console.log("\nFirst 3 rows of data:");
    console.log(rows.slice(0, 3));
}

inspectCsv();
