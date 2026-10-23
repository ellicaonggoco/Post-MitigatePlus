const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Household = mongoose.model('Household', new mongoose.Schema({}, { strict: false }));
  const DistributionEvent = mongoose.model('DistributionEvent', new mongoose.Schema({}, { strict: false }));
  const RecoveryStatus = mongoose.model('RecoveryStatus', new mongoose.Schema({}, { strict: false }));
  const Distribution = mongoose.model('Distribution', new mongoose.Schema({}, { strict: false }));

  const hh = await Household.findById('6aa2d68c3ade42ff6f59ba24');
  console.log('--- HERZSEL DATUL HOUSEHOLD ---');
  console.log('verificationStatus:', hh.verificationStatus);
  console.log('isDormant:', hh.isDormant);
  console.log('consecutiveMissedEvents:', hh.consecutiveMissedEvents);
  console.log('barangayCode:', hh.barangayCode);
  console.log('previousBarangayCode:', hh.previousBarangayCode);
  console.log('dormantAt:', hh.dormantAt);
  console.log('inAppNotifications:', hh.inAppNotifications);

  const u = await User.findById('6aa2d68c3ade42ff6f59ba22');
  console.log('--- HERZSEL DATUL USER ---');
  console.log('barangayCode:', u.barangayCode);
  console.log('isDormant:', u.isDormant);

  const dists = await Distribution.find({ householdId: hh._id });
  console.log('--- DISTRIBUTIONS FOR HERZSEL DATUL ---');
  console.log('Count:', dists.length);
  for (const d of dists) {
    console.log(' - Distribution:', d._id, 'event:', d.distributionEventId, 'date:', d.releasedAt || d.createdAt);
  }

  const events = await DistributionEvent.find({ barangayCode: '344' });
  console.log('--- EVENTS IN 344 ---');
  for (const e of events) {
    console.log(' - Event:', e._id, 'title:', e.title, 'status:', e.status, 'isActive:', e.isActive, 'barangayCode:', e.barangayCode);
  }

  await mongoose.disconnect();
}
check().catch(console.error);
