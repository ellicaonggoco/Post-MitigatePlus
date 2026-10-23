const mongoose = require('C:/Capstone Final Project/backend/node_modules/mongoose');
const uri = 'mongodb+srv://mitigateplus:mitigateplus@mitigateplus.zcblqbq.mongodb.net/mitigateplus?retryWrites=true&w=majority';

async function testConcurrency() {
  await mongoose.connect(uri);
  const Distribution = mongoose.connection.collection('distributions');
  const Household = mongoose.connection.collection('households');
  const DistributionEvent = mongoose.connection.collection('distributionevents');

  console.log('================================================================');
  console.log('MITIGATEPLUS CONCURRENCY & RACE-CONDITION TEST SUITE (TC-CONC-01)');
  console.log('================================================================');

  // Find a test household and active event
  const household = await Household.findOne({ verificationStatus: 'verified' });
  const event = await DistributionEvent.findOne({ status: 'Ongoing' });

  if (!household || !event) {
    console.log('No verified household or active ongoing event found.');
    process.exit(1);
  }

  console.log(`Test Subject Household: ${household.address} (ID: ${household._id})`);
  console.log(`Test Distribution Event: ${event.title} (ID: ${event._id})`);

  // Ensure no prior claim exists for this test pair
  await Distribution.deleteMany({ distributionEventId: event._id, householdId: household._id });
  console.log('Cleaned up any previous claim for this test pair.');

  console.log('\n--- SIMULATING SIMULTANEOUS SCAN AT GATE 1 AND GATE 2 (t = 0ms) ---');
  const startTime = Date.now();

  // Function to simulate a relief release attempt
  const attemptRelease = async (gateName, staffName) => {
    try {
      // 1. Check existing claim
      const existing = await Distribution.findOne({ distributionEventId: event._id, householdId: household._id });
      if (existing) {
        return {
          gate: gateName,
          status: 409,
          success: false,
          message: 'DUPLICATE CLAIM BLOCKED: Household already claimed relief.',
          blockedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime
        };
      }

      // 2. Insert into database (protected by compound unique index)
      const res = await Distribution.insertOne({
        distributionEventId: event._id,
        householdId: household._id,
        itemType: event.itemType,
        baseUnitsGiven: 1,
        topUpUnitsGiven: 0,
        householdSizeAtDistribution: household.memberCount || 4,
        releasedBy: staffName,
        releasedAt: new Date(),
      });

      return {
        gate: gateName,
        status: 200,
        success: true,
        receiptId: `RCPT-${new Date().getFullYear()}-${res.insertedId.toString().slice(-6).toUpperCase()}`,
        message: 'RELIEF RELEASE CONFIRMED',
        releasedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      if (err.code === 11000) {
        return {
          gate: gateName,
          status: 409,
          success: false,
          isDuplicate: true,
          code: 11000,
          message: 'DUPLICATE CLAIM BLOCKED (E11000 Unique Index Collision)',
          blockedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime
        };
      }
      return {
        gate: gateName,
        status: 500,
        success: false,
        error: err.message
      };
    }
  };

  // Execute both simultaneously using Promise.all
  const results = await Promise.all([
    attemptRelease('Gate 1 (Covered Court North)', 'Field Officer Juan Santos'),
    attemptRelease('Gate 2 (Covered Court South)', 'Field Officer Maria Reyes')
  ]);

  console.log('\n--- CONCURRENCY EXECUTION RESULTS ---');
  results.forEach((r, idx) => {
    console.log(`[THREAD ${idx + 1}] ${r.gate}`);
    console.log(`  HTTP Status: ${r.status} ${r.status === 200 ? 'OK' : 'CONFLICT'}`);
    console.log(`  Success:     ${r.success}`);
    console.log(`  Message:     ${r.message}`);
    if (r.receiptId) console.log(`  Receipt:     ${r.receiptId}`);
    console.log(`  Latency:     ${r.durationMs}ms`);
    console.log('');
  });

  // Verify DB state
  const finalClaims = await Distribution.find({ distributionEventId: event._id, householdId: household._id }).toArray();
  console.log('--- DATABASE INTEGRITY CHECK ---');
  console.log(`Total records in MongoDB for this household & event: ${finalClaims.length} (Expected: exactly 1)`);
  if (finalClaims.length === 1 && results.some(r => r.status === 200) && results.some(r => r.status === 409)) {
    console.log('>> TEST RESULT: PASSED! Zero double-dipping, race condition successfully intercepted.');
  } else {
    console.log('>> TEST RESULT: FAILED');
  }

  process.exit(0);
}

testConcurrency().catch(err => {
  console.error(err);
  process.exit(1);
});
