const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Migration] Connected to MongoDB');
  require('../src/models/user.model');
  const Vendor = require('../src/models/vendor.model');

  // 1. Update Sharma's n Son's to active, approved, activated 2 days ago (< 7 days), and correct canteen coordinates
  const sharmaRes = await Vendor.updateOne(
    { name: "Sharma's n Son's" },
    {
      $set: {
        status: 'active',
        isApproved: true,
        source: 'KAMI',
        partnerActivatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Activated 2 days ago
        location: {
          type: 'Point',
          coordinates: [76.6669, 12.3651] // Canteen coordinates: [lng, lat] ~400m from campus center
        },
        address: {
          line1: 'Near MIT Canteen',
          landmark: 'Campus Food Court'
        }
      }
    }
  );
  console.log('[Migration] Sharma update result:', sharmaRes);

  // 2. Mark test/seed vendors as inactive and unapproved
  const testRes = await Vendor.updateMany(
    { name: { $in: ['Sri Krishna Xerox & Prints', 'Keshava Stationery & Xerox', 'Campus Tech Print Hub', 'Mysuru Digital Express'] } },
    {
      $set: {
        status: 'inactive',
        isApproved: false
      }
    }
  );
  console.log('[Migration] Test vendors update result:', testRes);

  // 3. Ensure unverified shops remain unapproved and pending_verification
  const unverifiedRes = await Vendor.updateMany(
    { name: { $in: ['Unverified Shop', 'Sharma Printworks'] } },
    {
      $set: {
        status: 'pending_verification',
        isApproved: false
      }
    }
  );
  console.log('[Migration] Unverified vendors update result:', unverifiedRes);

  // Verify resulting states
  const allVendors = await Vendor.find({}).populate('ownerId', 'name email role isVerified');
  console.log('\n--- VERIFICATION OF VENDORS ---');
  for (const v of allVendors) {
    console.log(`- ${v.name}: status=${v.status}, isApproved=${v.isApproved}, source=${v.source}, owner=${v.ownerId?.email} (verified=${v.ownerId?.isVerified}), coords=${JSON.stringify(v.location?.coordinates)}, activatedAt=${v.partnerActivatedAt}`);
  }

  await mongoose.disconnect();
  console.log('[Migration] Finished successfully.');
}

migrate().catch(err => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
