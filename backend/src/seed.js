const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Enforce strict TLS in production; allow self-signed local dev bypass only if STRICT_SSL is not true
if (process.env.NODE_ENV === 'development' && process.env.STRICT_SSL !== 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const User = require('./models/User');
const Household = require('./models/Household');
const ReliefItemType = require('./models/ReliefItemType');
const DistributionEvent = require('./models/DistributionEvent');
const RecoveryStatus = require('./models/RecoveryStatus');
const Announcement = require('./models/Announcement');
const { calculatePriorityIndex } = require('./utils/priorityIndex');

const seedData = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mitigateplus';
    console.log(`Connecting to database for seeding: ${connStr.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

    await mongoose.connect(connStr, { serverSelectionTimeoutMS: 8000 });
    console.log('Successfully connected to MongoDB Database!');

    // Clear existing data & drop legacy indexes
    await User.deleteMany({});
    try { await User.collection.dropIndexes(); } catch (e) {}
    await Household.deleteMany({});
    try { await Household.collection.dropIndexes(); } catch (e) {}
    await ReliefItemType.deleteMany({});
    await DistributionEvent.deleteMany({});
    await RecoveryStatus.deleteMany({});
    await Announcement.deleteMany({});

    console.log('Cleared previous database records.');

    // 1. Create Default Users
    const superadmin = await User.create({
      name: 'City Mayor / LGU SuperAdmin',
      emailOrPhone: 'superadmin@manila.gov.ph',
      passwordHash: 'superadmin123',
      role: 'lgu_superadmin',
      barangayCode: null,
    });

    const admin = await User.create({
      name: 'LGU MDRRMO Administrator',
      emailOrPhone: 'admin@manila.gov.ph',
      passwordHash: 'admin123',
      role: 'lgu_admin',
      barangayCode: null,
      createdBy: superadmin._id,
    });

    const official291 = await User.create({
      name: 'Hon. Barangay Chairman (Brgy 291)',
      emailOrPhone: 'official291@manila.gov.ph',
      passwordHash: 'official123',
      role: 'barangay_official',
      barangayCode: '291',
      createdBy: admin._id,
    });

    const staff291 = await User.create({
      name: 'Field Officer Cruz',
      emailOrPhone: 'staff291@manila.gov.ph',
      passwordHash: 'staff123',
      role: 'field_staff',
      barangayCode: '291',
      createdBy: admin._id,
    });

    const residentJuan = await User.create({
      name: 'Juan Dela Cruz',
      emailOrPhone: 'juan@gmail.com',
      passwordHash: 'resident123',
      role: 'resident',
      barangayCode: '291',
    });

    console.log('✓ Created Default Users:');
    console.log('  - LGU SuperAdmin (Mayor/Executive): superadmin@manila.gov.ph / superadmin123');
    console.log('  - LGU Admin (MDRRMO): admin@manila.gov.ph / admin123');
    console.log('  - Barangay Official (291): official291@manila.gov.ph / official123');
    console.log('  - Field Staff (291): staff291@manila.gov.ph / staff123');
    console.log('  - Resident: juan@gmail.com / resident123');

    // 2. Create Sample Household for Juan
    const membersJuan = [
      { name: 'Juan Dela Cruz', relationship: 'Head', age: 45, specialConditions: [] },
      { name: 'Maria Dela Cruz', relationship: 'Wife', age: 42, specialConditions: ['pregnant'] },
      { name: 'Pedro Dela Cruz', relationship: 'Father', age: 70, specialConditions: ['senior', 'pwd'] },
      { name: 'Ana Dela Cruz', relationship: 'Daughter', age: 10, specialConditions: ['child'] },
      { name: 'Lito Dela Cruz', relationship: 'Son', age: 8, specialConditions: ['child'] },
      { name: 'Rosa Dela Cruz', relationship: 'Daughter', age: 5, specialConditions: ['child'] },
      { name: 'Baby Dela Cruz', relationship: 'Son', age: 2, specialConditions: ['child', 'medical'] },
    ];

    const householdJuan = new Household({
      headOfHouseholdUserId: residentJuan._id,
      address: '123 Calle Real',
      purok: 'Purok 4',
      barangayCode: '291',
      memberCount: 7,
      members: membersJuan,
      qrCode: 'MNL-291-JUAN-DEMO-2026',
      verificationStatus: 'verified',
      verifiedBy: official291._id,
      verifiedAt: new Date(),
      damageLevel: 'Severe',
    });

    const { priorityScore, priorityLevel } = calculatePriorityIndex(householdJuan);
    householdJuan.priorityScore = priorityScore;
    householdJuan.priorityLevel = priorityLevel;
    await householdJuan.save();

    await RecoveryStatus.create({
      householdId: householdJuan._id,
      status: 'ongoing',
      updatedBy: staff291._id,
    });

    console.log('✓ Created Household & Recovery Record for Juan Dela Cruz.');

    // 3. Seed Relief Items — names must match gapDetection.js STANDARD_RELIEF_ITEMS exactly
    await ReliefItemType.create([
      { name: 'Family Food Pack', category: 'headcount_scaled', baseCoverage: 5, topUpUnitSize: 1, unit: 'pack', currentBaseStock: 500, currentTopUpStock: 1000 },
      { name: 'Water', category: 'headcount_scaled', baseCoverage: 5, topUpUnitSize: 1, unit: 'liter', currentBaseStock: 600, currentTopUpStock: 1200 },
      { name: 'Hygiene Kit', category: 'headcount_scaled', baseCoverage: 5, topUpUnitSize: 1, unit: 'kit', currentBaseStock: 400, currentTopUpStock: 800 },
      { name: 'Clothing', category: 'headcount_scaled', baseCoverage: 5, topUpUnitSize: 1, unit: 'set', currentBaseStock: 300, currentTopUpStock: 600 },
      { name: 'Medicine', category: 'fixed_unit', baseCoverage: 1, topUpUnitSize: 0, unit: 'box', currentBaseStock: 200, currentTopUpStock: 0 },
      { name: 'Temporary Shelter', category: 'fixed_unit', baseCoverage: 1, topUpUnitSize: 0, unit: 'tent', currentBaseStock: 100, currentTopUpStock: 0 },
      { name: 'Shelter Repair Materials', category: 'fixed_unit', baseCoverage: 1, topUpUnitSize: 0, unit: 'set', currentBaseStock: 150, currentTopUpStock: 0 },
    ]);

    console.log('✓ Created Relief Item Types.');

    // 4. Seed Active Distribution Event
    const event = await DistributionEvent.create({
      title: 'Post-Typhoon Relief Distribution Batch 1',
      itemType: 'Family Food Pack',
      batchId: 'BATCH-2026-08-01',
      barangayCode: '291',
      location: 'Barangay 291 Covered Court',
      openedBy: official291._id,
    });

    console.log(`✓ Created Active Distribution Event: ${event.title}`);

    // 5. Seed Announcement
    await Announcement.create({
      title: 'Relief Distribution Schedule — Barangay 291',
      body: 'Distribution for Family Food Packs is ongoing at the Covered Court. Please present your household QR Code.',
      barangayCode: '291',
      postedBy: official291._id,
    });

    console.log('\n==========================================');
    console.log('DATABASE SEEDING COMPLETED 100% SUCCESSFULLY!');
    console.log('==========================================');
    process.exit(0);
  } catch (error) {
    console.error('\nSeeding Error:', error.message);
    process.exit(1);
  }
};

seedData();
