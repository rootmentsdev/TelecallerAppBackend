const mongoose = require('mongoose');

async function dropDB() {
    try {
        await mongoose.connect('mongodb+srv://abhijithgkaimal0240_db_user:brynex2025@cluster0.cqgqioc.mongodb.net/TelecallerDB?retryWrites=true&w=majority');
        console.log("Connected to TelecallerDB. Dropping database...");
        await mongoose.connection.db.dropDatabase();
        console.log("TelecallerDB dropped successfully.");
        await mongoose.disconnect();
    } catch (err) {
        console.error("Error dropping database", err);
        process.exit(1);
    }
}

dropDB();
