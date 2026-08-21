const mongoose = require('mongoose');
const path = require('path');

// Models
const User = require('../models/User');
const Household = require('../models/Household');
const Distribution = require('../models/Distribution');
const DistributionEvent = require('../models/DistributionEvent');
const AuditLog = require('../models/AuditLog');
const PolicyConfig = require('../models/PolicyConfig');
const WarehouseItem = require('../models/WarehouseItem');
const WarehouseLog = require('../models/WarehouseLog');
const RecoveryStatus = require('../models/RecoveryStatus');
const Announcement = require('../models/Announcement');
const DamageReport = require('../models/DamageReport');
const AssistanceRequest = require('../models/AssistanceRequest');

// Algorithms & Calculation Engines
const { calculateReliefAllocation } = require('../utils/reliefAllocation');
const { calculatePriorityIndex } = require('../utils/priorityIndex');
const { detectAssistanceGaps } = require('../utils/gapDetection');

console.log('================================================================');
console.log('MITIGATEPLUS COMPLETE FEATURE INTEGRITY & VERIFICATION TEST');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// 1. RELIEF FORMULA VERIFICATION
console.log('--- 1. RELIEF ALLOCATION & PRIORITY SCORING ENGINES ---');

const sampleHousehold = {
  memberCount: 7,
  damageLevel: 'Severe',
  priorityScore: 85,
  members: [
    { name: 'Maria', age: 70, specialConditions: ['senior'] },
    { name: 'Pedro', age: 35, specialConditions: ['pwd'] },
    { name: 'Ana', age: 28, specialConditions: ['pregnant'] },
    { name: 'Juanito', age: 2, specialConditions: ['child'] },
    { name: 'Baby', age: 0, specialConditions: ['child'] },
  ]
};

const alloc = calculateReliefAllocation(sampleHousehold.memberCount, 5, 'headcount_scaled');
assert(alloc !== null && typeof alloc === 'object', 'calculateReliefAllocation returned valid object');
assert(alloc.basePacks === 1, `Base units calculated correctly (7 pax / 5 = 1 base pack): ${alloc.basePacks}`);
assert(alloc.topUpUnits === 2, `Remainder top-ups calculated correctly (7 - 5 = 2 top-ups): ${alloc.topUpUnits}`);

// Priority score calculation check
const priorityResult = calculatePriorityIndex(sampleHousehold);
assert(typeof priorityResult === 'object' && priorityResult.priorityScore > 0, `calculatePriorityIndex computed valid score: ${priorityResult.priorityScore} (${priorityResult.priorityLevel})`);

// 2. ASSISTANCE GAP DETECTION ENGINE
console.log('\n--- 2. ASSISTANCE GAP DETECTION & RISK HEATMAP ---');
const sampleRequests = [{ itemType: 'Water', status: 'pending' }];
const sampleDistributions = [{ itemType: 'Family Food Pack' }];
const gapResult = detectAssistanceGaps(sampleRequests, sampleDistributions);
assert(gapResult && Array.isArray(gapResult.gaps) && gapResult.gaps.length === 7, `detectAssistanceGaps evaluated all 7 disaster relief categories (${gapResult.gaps.length} categories, ${gapResult.totalGaps} gaps)`);
assert(gapResult.gaps.find(g => g.itemType === 'Family Food Pack')?.status === 'Received', 'Food Pack marked as Received');
assert(gapResult.gaps.find(g => g.itemType === 'Water')?.status === 'Pending Review', 'Water marked as Pending Review');
assert(gapResult.gaps.find(g => g.itemType === 'Medicine')?.status === 'Needed', 'Medicine marked as Needed');

// 3. BACKEND ROUTE & CONTROLLER EXPORTS
console.log('\n--- 3. BACKEND ROUTE MODULES & SECURITY MIDDLEWARE ---');
const authRoutes = require('../routes/authRoutes');
const householdRoutes = require('../routes/householdRoutes');
const distributionRoutes = require('../routes/distributionRoutes');
const reportRoutes = require('../routes/reportRoutes');
const auditLogRoutes = require('../routes/auditLogRoutes');
const policyRoutes = require('../routes/policyRoutes');
const recoveryRoutes = require('../routes/recoveryRoutes');
const warehouseRoutes = require('../routes/warehouseRoutes');

assert(authRoutes !== undefined, 'Auth routes intact');
assert(householdRoutes !== undefined, 'Household routes intact');
assert(distributionRoutes !== undefined, 'Distribution routes intact');
assert(reportRoutes !== undefined, 'Report routes intact');
assert(auditLogRoutes !== undefined, 'Audit log routes intact');
assert(policyRoutes !== undefined, 'Policy routes intact');
assert(recoveryRoutes !== undefined, 'Recovery routes intact');
assert(warehouseRoutes !== undefined, 'Warehouse routes intact');

// 4. FRAUD DETECTION CONSTRAINTS
console.log('\n--- 4. ANTI-DUPLICATE CLAIM & FRAUD INTERCEPTION CONSTRAINT ---');
const distIndexes = Distribution.schema.indexes();
const hasUniqueCompoundIndex = distIndexes.some(idx => {
  const fields = Object.keys(idx[0]);
  return fields.includes('distributionEventId') && fields.includes('householdId') && idx[1]?.unique === true;
});
assert(hasUniqueCompoundIndex, 'Compound unique index on (distributionEventId, householdId) is active for fraud protection');

console.log('\n================================================================');
console.log(`FEATURE INTEGRITY RESULTS: ${passed}/${passed + failed} CHECKS PASSED (${failed} FAILED)`);
console.log('================================================================');

if (failed > 0) process.exit(1);
else process.exit(0);
