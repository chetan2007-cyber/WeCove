require('dotenv').config();
const mongoose = require('mongoose');
const College = require('./src/models/college.model');
const connectDB = require('./src/config/db');

const seedColleges = async () => {
    await connectDB();
    try {
        // Check if it already exists to avoid duplicates
        const exists = await College.findOne({ name: 'Maharaja Institute of Technology Mysore' });
        if (!exists) {
            await College.create({
                name: 'Maharaja Institute of Technology Mysore',
                location: 'Belawadi',
                city: 'Mysuru',
                state: 'Karnataka',
                domain: 'mitmysore.in',
                coordinates: { lat: 12.3615, lng: 76.6669 }
            });
            console.log('✅ MIT Mysore added successfully!');
        } else {
            console.log('⚠️ College already exists.');
        }
    } catch (error) {
        console.error('❌ Error seeding college:', error);
    }
    await mongoose.connection.close();
    process.exit(0);
};

seedColleges();