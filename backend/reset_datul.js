const mongoose = require('mongoose');
require('dotenv').config();

async function resetRecovery() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Household = mongoose.model('Household', new mongoose.Schema({}, { strict: false }));
  const RecoveryStatus = mongoose.model('RecoveryStatus', new mongoose.Schema({}, { strict: false }));

  const user = await User.findOne({ name: /Herzsel Datul/i, barangayCode: '344' });
  if (user) {
    const hh = await Household.findOne({ headOfHouseholdUserId: user._id });
    if (hh) {
      let rec = await RecoveryStatus.findOne({ householdId: hh._id });
      if (!rec) {
        rec = new RecoveryStatus({ householdId: hh._id });
      }
      rec.status = 'allocated';
      rec.updatedAt = new Date();
      await rec.save();
      console.log('Successfully updated RecoveryStatus for Herzsel Datul (Brgy 344) to allocated!');
    }
  }
  await mongoose.disconnect();
}
resetRecovery().catch(console.error);
