require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/user.model');
const College = require('./src/models/college.model');
const Vendor = require('./src/models/vendor.model');
const RateCard = require('./src/models/rateCard.model');
const FinishingRate = require('./src/models/finishingRate.model');

async function seedRealVendors() {
    await connectDB();
    console.log('[Seed] Seeding real campus print shops...');

    // 1. Ensure College exists
    let college = await College.findOne({ name: 'Maharaja Institute of Technology Mysore' });
    if (!college) {
        college = await College.create({
            name: 'Maharaja Institute of Technology Mysore',
            location: 'Belawadi',
            city: 'Mysuru',
            state: 'Karnataka',
            domain: 'mitmysore.in',
            coordinates: { lat: 12.3615, lng: 76.6669 }
        });
        console.log('[Seed] Created College: MIT Mysore (12.3615, 76.6669)');
    } else {
        console.log('[Seed] Using existing College: MIT Mysore');
    }

    // 2. Ensure Vendor Owners exist
    let owner1 = await User.findOne({ email: 'keshava.owner@mitmysore.in' });
    if (!owner1) {
        owner1 = await User.create({
            name: 'Keshava Prasad',
            email: 'keshava.owner@mitmysore.in',
            password: 'VendorPassword123!',
            role: 'vendor_owner',
            collegeId: college._id,
            isVerified: true
        });
    }

    let owner2 = await User.findOne({ email: 'campustech.owner@mitmysore.in' });
    if (!owner2) {
        owner2 = await User.create({
            name: 'Mahesh Kumar',
            email: 'campustech.owner@mitmysore.in',
            password: 'VendorPassword123!',
            role: 'vendor_owner',
            collegeId: college._id,
            isVerified: true
        });
    }

    let owner3 = await User.findOne({ email: 'mysuru.express.owner@mitmysore.in' });
    if (!owner3) {
        owner3 = await User.create({
            name: 'Raghu Gowda',
            email: 'mysuru.express.owner@mitmysore.in',
            password: 'VendorPassword123!',
            role: 'vendor_owner',
            collegeId: college._id,
            isVerified: true
        });
    }

    // Ensure 2dsphere index exists on Vendor
    await Vendor.collection.createIndex({ location: '2dsphere' });
    console.log('[Seed] Verified 2dsphere geospatial index on Vendor collection');

    // Remove older test vendors for these owners to have clean records
    await Vendor.deleteMany({ ownerId: { $in: [owner1._id, owner2._id, owner3._id] } });

    // Shop A: 420m away (Within 1 km) - Color + Spiral
    const shopA = await Vendor.create({
        name: 'Keshava Stationery & Xerox',
        ownerId: owner1._id,
        collegeId: college._id,
        address: {
            line1: 'Campus Main Gate, Opposite Admin Block',
            landmark: 'Near MIT Canteen',
            lat: 12.3651,
            lng: 76.6669
        },
        location: {
            type: 'Point',
            coordinates: [76.6669, 12.3651] // [longitude, latitude]
        },
        operatingHours: {
            open: '08:30',
            close: '20:30',
            daysOpen: [0, 1, 2, 3, 4, 5, 6]
        },
        capacity: {
            machineCount: 2,
            pagesPerMinute: 35
        },
        capabilities: {
            colorPrinting: true,
            paperSizes: ['A4', 'A3'],
            bindingTypes: ['spiral', 'comb', 'stapling'],
            lamination: true
        },
        delivery: {
            isAvailable: true,
            fee: 10
        },
        schedulingFee: {
            nextDayFee: 15
        },
        queueInfo: {
            isAcceptingOrders: true,
            maxOrdersPerHour: 60
        },
        rating: {
            average: 4.8,
            count: 142
        },
        status: 'active'
    });
    console.log('[Seed] Created Shop A (420m away):', shopA.name);

    // Shop B: 780m away (Within 1 km) - B&W only
    const shopB = await Vendor.create({
        name: 'Campus Tech Print Hub',
        ownerId: owner2._id,
        collegeId: college._id,
        address: {
            line1: 'Department of CS Block, Ground Floor',
            landmark: 'Adjacent to Library',
            lat: 12.3685,
            lng: 76.6669
        },
        location: {
            type: 'Point',
            coordinates: [76.6669, 12.3685] // [longitude, latitude]
        },
        operatingHours: {
            open: '09:00',
            close: '19:00',
            daysOpen: [1, 2, 3, 4, 5, 6]
        },
        capacity: {
            machineCount: 1,
            pagesPerMinute: 40
        },
        capabilities: {
            colorPrinting: false, // B&W only!
            paperSizes: ['A4'],
            bindingTypes: ['stapling'],
            lamination: false
        },
        delivery: {
            isAvailable: false,
            fee: 0
        },
        schedulingFee: {
            nextDayFee: 15
        },
        queueInfo: {
            isAcceptingOrders: true,
            maxOrdersPerHour: 40
        },
        rating: {
            average: 4.5,
            count: 88
        },
        status: 'active'
    });
    console.log('[Seed] Created Shop B (780m away, B&W only):', shopB.name);

    // Shop C: 1330m (1.33 km away - EXCEEDS 1 km limit)
    const shopC = await Vendor.create({
        name: 'Mysuru Digital Express',
        ownerId: owner3._id,
        collegeId: college._id,
        address: {
            line1: 'Outer Ring Road, Belawadi Junction',
            landmark: 'Near Highway Petrol Pump',
            lat: 12.3735,
            lng: 76.6669
        },
        location: {
            type: 'Point',
            coordinates: [76.6669, 12.3735] // [longitude, latitude]
        },
        operatingHours: {
            open: '10:00',
            close: '21:00',
            daysOpen: [1, 2, 3, 4, 5, 6]
        },
        capacity: {
            machineCount: 3,
            pagesPerMinute: 50
        },
        capabilities: {
            colorPrinting: true,
            paperSizes: ['A4', 'A3', 'Legal'],
            bindingTypes: ['spiral', 'hardbound'],
            lamination: true
        },
        delivery: {
            isAvailable: true,
            fee: 20
        },
        schedulingFee: {
            nextDayFee: 20
        },
        queueInfo: {
            isAcceptingOrders: true,
            maxOrdersPerHour: 80
        },
        rating: {
            average: 4.2,
            count: 65
        },
        status: 'active'
    });
    console.log('[Seed] Created Shop C (1.33 km away - Out of 1km radius):', shopC.name);

    // Add Rate Cards and Finishing Rates for Shop A
    await RateCard.deleteMany({ vendorId: { $in: [shopA._id, shopB._id, shopC._id] } });
    await FinishingRate.deleteMany({ vendorId: { $in: [shopA._id, shopB._id, shopC._id] } });

    // Shop A Rates
    await RateCard.create([
        { vendorId: shopA._id, paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'single', minPages: 1, maxPages: 500, pricePerPage: 2.0 },
        { vendorId: shopA._id, paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'double', minPages: 1, maxPages: 500, pricePerPage: 1.5 },
        { vendorId: shopA._id, paperSize: 'A4', paperType: '70gsm', colorMode: 'Color', sides: 'single', minPages: 1, maxPages: 500, pricePerPage: 10.0 },
        { vendorId: shopA._id, paperSize: 'A4', paperType: '70gsm', colorMode: 'Color', sides: 'double', minPages: 1, maxPages: 500, pricePerPage: 9.0 }
    ]);
    await FinishingRate.create([
        { vendorId: shopA._id, finishingType: 'spiral_binding', price: 25.0, description: 'Plastic spiral binding with transparent sheet' },
        { vendorId: shopA._id, finishingType: 'stapling', price: 5.0, description: 'Corner staple' }
    ]);

    // Shop B Rates (B&W only)
    await RateCard.create([
        { vendorId: shopB._id, paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'single', minPages: 1, maxPages: 500, pricePerPage: 1.5 },
        { vendorId: shopB._id, paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'double', minPages: 1, maxPages: 500, pricePerPage: 1.0 }
    ]);
    await FinishingRate.create([
        { vendorId: shopB._id, finishingType: 'stapling', price: 3.0, description: 'Corner staple' }
    ]);

    // Shop C Rates
    await RateCard.create([
        { vendorId: shopC._id, paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'single', minPages: 1, maxPages: 500, pricePerPage: 2.5 },
        { vendorId: shopC._id, paperSize: 'A4', paperType: '70gsm', colorMode: 'Color', sides: 'single', minPages: 1, maxPages: 500, pricePerPage: 12.0 }
    ]);
    await FinishingRate.create([
        { vendorId: shopC._id, finishingType: 'spiral_binding', price: 30.0, description: 'Spiral binding' }
    ]);

    console.log('✅ Real campus vendors, rate cards, and finishing rates seeded successfully!');
    await mongoose.connection.close();
    process.exit(0);
}

seedRealVendors().catch(err => {
    console.error('❌ Error seeding vendors:', err);
    process.exit(1);
});
