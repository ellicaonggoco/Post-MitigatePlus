const assert = require('assert');
const { calculatePriorityIndex } = require('../src/utils/priorityIndex');
const { calculateReliefAllocation } = require('../src/utils/reliefAllocation');
const { detectAssistanceGaps } = require('../src/utils/gapDetection');

console.log('--- Running Core Business Logic Engine Unit Tests ---');

// Test 1: Right-Sized Relief Allocation Math Engine
console.log('Test 1: Right-Sized Relief Allocation for 7 family members (Base coverage: 5 pax)...');
const alloc7 = calculateReliefAllocation(7, 5, 'headcount_scaled');
assert.strictEqual(alloc7.basePacks, 1, '7 members should get 1 base pack');
assert.strictEqual(alloc7.topUpUnits, 2, '7 members should get 2 top-up units');
console.log('✓ Test 1 Passed:', alloc7.explanation);

console.log('Test 2: Right-Sized Relief Allocation for 12 family members (Base coverage: 5 pax)...');
const alloc12 = calculateReliefAllocation(12, 5, 'headcount_scaled');
assert.strictEqual(alloc12.basePacks, 2, '12 members should get 2 base packs');
assert.strictEqual(alloc12.topUpUnits, 2, '12 members should get 2 top-up units');
console.log('✓ Test 2 Passed:', alloc12.explanation);

console.log('Test 3: Right-Sized Relief Allocation for 3 family members (Base coverage: 5 pax)...');
const alloc3 = calculateReliefAllocation(3, 5, 'headcount_scaled');
assert.strictEqual(alloc3.basePacks, 1, '3 members should get 1 base pack');
assert.strictEqual(alloc3.topUpUnits, 0, '3 members should get 0 top-up units');
console.log('✓ Test 3 Passed:', alloc3.explanation);

// Test 4: Priority Index Formula Engine
console.log('Test 4: Priority Score calculation for severe damage + vulnerable family...');
const sampleHousehold = {
  damageLevel: 'Severe', // damageWeight = 3 -> 30 pts
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days pending -> 5 pts
  members: [
    { name: 'Grandpa', specialConditions: ['senior', 'pwd'] }, // 5 + 5 = 10 pts
    { name: 'Mom', specialConditions: ['pregnant'] }, // 5 pts
    { name: 'Kid', specialConditions: ['child', 'medical'] }, // 3 + 5 = 8 pts
  ],
};
const priorityResult = calculatePriorityIndex(sampleHousehold);
// Expected score: (3 * 10) + (10 + 5 + 8) + 5 - 0 = 30 + 23 + 5 = 58 pts -> High Priority
assert.strictEqual(priorityResult.priorityScore, 58, 'Score should be 58');
assert.strictEqual(priorityResult.priorityLevel, 'High', 'Level should be High');
console.log(`✓ Test 4 Passed: Score = ${priorityResult.priorityScore}, Level = ${priorityResult.priorityLevel}`);

// Test 5: Assistance Gap Detector
console.log('Test 5: Assistance Gap Detection...');
const sampleRequests = [{ itemType: 'Family Food Pack', status: 'released' }];
const sampleDistributions = [{ itemType: 'Family Food Pack' }];
const gapResult = detectAssistanceGaps(sampleRequests, sampleDistributions);
assert.strictEqual(gapResult.totalGaps, 6, '6 items should remain as unfulfilled gaps');
console.log(`✓ Test 5 Passed: ${gapResult.totalGaps} unfulfilled assistance gaps detected out of 7 standard items.`);

console.log('\n==========================================');
console.log('ALL CORE BUSINESS LOGIC TESTS PASSED 100%!');
console.log('==========================================');
