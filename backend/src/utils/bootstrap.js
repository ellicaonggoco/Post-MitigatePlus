const User = require('../models/User');
const ReliefItemType = require('../models/ReliefItemType');

/**
 * Ensures baseline executive accounts and configuration exist in the database.
 * Runs non-destructively: only creates missing accounts, never overwrites existing modified records.
 */
const bootstrapSystem = async () => {
  try {
    // 1. Ensure SuperAdmin exists
    const superAdminExists = await User.findOne({ emailOrPhone: 'superadmin@manila.gov.ph' });
    if (!superAdminExists) {
      await User.create({
        name: 'City Mayor / LGU SuperAdmin',
        emailOrPhone: 'superadmin@manila.gov.ph',
        passwordHash: 'superadmin123',
        role: 'lgu_superadmin',
        barangayCode: null,
      });
      console.log('✓ [Bootstrap] Created Default SuperAdmin: superadmin@manila.gov.ph / superadmin123');
    }

    // 2. Ensure LGU Admin exists
    const adminExists = await User.findOne({ emailOrPhone: 'admin@manila.gov.ph' });
    if (!adminExists) {
      await User.create({
        name: 'LGU MDRRMO Administrator',
        emailOrPhone: 'admin@manila.gov.ph',
        passwordHash: 'admin123',
        role: 'lgu_admin',
        barangayCode: null,
      });
      console.log('✓ [Bootstrap] Created Default LGU Admin: admin@manila.gov.ph / admin123');
    }

    // 3. Ensure Barangay Official (291) exists
    const officialExists = await User.findOne({ emailOrPhone: 'official291@manila.gov.ph' });
    if (!officialExists) {
      await User.create({
        name: 'Hon. Barangay Chairman (Brgy 291)',
        emailOrPhone: 'official291@manila.gov.ph',
        passwordHash: 'official123',
        role: 'barangay_official',
        barangayCode: '291',
      });
      console.log('✓ [Bootstrap] Created Default Official: official291@manila.gov.ph / official123');
    }

    // 4. Ensure Field Staff (291) exists
    const staffExists = await User.findOne({ emailOrPhone: 'staff291@manila.gov.ph' });
    if (!staffExists) {
      await User.create({
        name: 'Field Officer Cruz',
        emailOrPhone: 'staff291@manila.gov.ph',
        passwordHash: 'staff123',
        role: 'field_staff',
        barangayCode: '291',
        teamName: 'Field Team Alpha',
        staffDesignation: 'team_leader',
        department: 'MDRRMO Field Operations',
        contactNum: '0917-889-2910',
      });
      console.log('✓ [Bootstrap] Created Default Field Staff (Team Alpha): staff291@manila.gov.ph / staff123');
    }

    // 4b. Ensure Remaining Field Team Leaders exist
    const fieldTeamsConfig = [
      { name: 'Officer Ramon Santos', email: 'staff.bravo@manila.gov.ph', team: 'Field Team Bravo', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2911' },
      { name: 'Officer Teresa Gomez', email: 'staff.charlie@manila.gov.ph', team: 'Field Team Charlie', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2912' },
      { name: 'Officer Grace Lim', email: 'staff.delta@manila.gov.ph', team: 'Field Team Delta', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2913' },
      { name: 'Officer Mark Reyes', email: 'staff.qru1@manila.gov.ph', team: 'Quick Response Unit 1', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2914' },
      { name: 'Officer Dennis Tan', email: 'staff.qru2@manila.gov.ph', team: 'Quick Response Unit 2', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2915' },
    ];

    for (const stf of fieldTeamsConfig) {
      const exists = await User.findOne({ emailOrPhone: stf.email });
      if (!exists) {
        await User.create({
          name: stf.name,
          emailOrPhone: stf.email,
          passwordHash: 'staff123',
          role: stf.role,
          barangayCode: stf.brgy,
          teamName: stf.team,
          staffDesignation: 'team_leader',
          department: 'MDRRMO Field Operations',
          contactNum: stf.phone,
        });
      }
    }

    // 5. Ensure Pre-Verified Resident Citizens and Households exist
    const Household = require('../models/Household');
    const { calculatePriorityIndex } = require('./priorityIndex');

    const defaultResidents = [
      {
        name: 'Juan Dela Cruz',
        contact: 'juan@gmail.com',
        brgy: '291',
        address: '123 Calle Real, San Nicolas',
        purok: 'Purok 1',
        qr: 'MNL-291-JUAN-DEMO-2026',
        damage: 'Minor',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '1234-5678-9012',
        members: [
          { name: 'Juan Dela Cruz', relationship: 'Head', age: 45, specialConditions: [] },
          { name: 'Maria Dela Cruz', relationship: 'Wife', age: 42, specialConditions: ['pregnant'] },
          { name: 'Pedro Dela Cruz', relationship: 'Father', age: 70, specialConditions: ['senior', 'pwd'] },
          { name: 'Ana Dela Cruz', relationship: 'Daughter', age: 10, specialConditions: ['child'] },
          { name: 'Lito Dela Cruz', relationship: 'Son', age: 8, specialConditions: ['child'] },
          { name: 'Rosa Dela Cruz', relationship: 'Daughter', age: 5, specialConditions: ['child'] },
          { name: 'Baby Dela Cruz', relationship: 'Son', age: 2, specialConditions: ['child', 'medical'] },
        ],
      },
      {
        name: 'Ellica Onggoco',
        contact: '09236051393',
        brgy: '291',
        address: '1959 B Oroquieta St Sta Cruz Manila',
        purok: 'Zone 35',
        qr: 'MNL-291-ELLICA-2026',
        damage: 'Minor',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '7891-2345-6789',
        members: [
          { name: 'Ellica Onggoco', relationship: 'Head', age: 28, specialConditions: [] },
          { name: 'Carmelita Onggoco', relationship: 'Mother', age: 64, specialConditions: ['senior'] },
          { name: 'Antonio Onggoco', relationship: 'Father', age: 67, specialConditions: ['senior'] },
        ],
      },
      {
        name: 'Elena Dela Cruz',
        contact: '09996517418',
        brgy: '291',
        address: '123 Soler St, Binondo',
        purok: 'Purok 3',
        qr: 'MNL-291-ELENA-2026',
        damage: 'Minor',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '1234-5678-9012',
        members: [
          { name: 'Elena Dela Cruz', relationship: 'Head', age: 34, specialConditions: [] },
          { name: 'Carlo Dela Cruz', relationship: 'Son', age: 7, specialConditions: ['child'] },
        ],
      },
      {
        name: 'John Michael Nolasco',
        contact: 'nolascojmn06@gmail.com',
        brgy: '291',
        address: '456 Alvarez St, Sta Cruz',
        purok: 'Purok 3',
        qr: 'MNL-291-JMNN-2026',
        damage: 'Minor',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '4567-8901-2345',
        members: [
          { name: 'John Michael Nolasco', relationship: 'Head', age: 24, specialConditions: [] },
        ],
      },
      {
        name: 'Maria Clara Santos',
        contact: 'maria@gmail.com',
        brgy: '344',
        address: '789 Rizal Avenue, Sta Cruz',
        purok: 'Purok 2',
        qr: 'MNL-344-MARIA-2026',
        damage: 'Moderate',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '9876-5432-1098',
        members: [
          { name: 'Maria Clara Santos', relationship: 'Head', age: 38, specialConditions: [] },
          { name: 'Crisostomo Ibarra', relationship: 'Spouse', age: 40, specialConditions: [] },
          { name: 'Clarita Santos', relationship: 'Daughter', age: 12, specialConditions: ['child'] },
          { name: 'Basilio Santos', relationship: 'Son', age: 10, specialConditions: ['child'] },
        ],
      },
      {
        name: 'Cardo Dalisay',
        contact: '09179998877',
        brgy: '344',
        address: '321 Alvarez St, Sta Cruz',
        purok: 'Purok 1',
        qr: 'MNL-344-CARDO-2026',
        damage: 'Moderate',
        idType: "Driver's License (LTO)",
        idNum: 'N02-14-567890',
        members: [
          { name: 'Cardo Dalisay', relationship: 'Head', age: 42, specialConditions: [] },
          { name: 'Alyana Dalisay', relationship: 'Wife', age: 39, specialConditions: [] },
          { name: 'Lola Flora', relationship: 'Grandmother', age: 78, specialConditions: ['senior'] },
          { name: 'Junior Dalisay', relationship: 'Son', age: 6, specialConditions: ['child'] },
          { name: 'Makmak Dalisay', relationship: 'Son', age: 9, specialConditions: ['child'] },
        ],
      },
      {
        name: 'Roberto Bautista',
        contact: 'roberto.bautista@gmail.com',
        brgy: '128',
        address: '101 Smokey Mountain Compound, Tondo',
        purok: 'Purok 4',
        qr: 'MNL-128-ROBERTO-2026',
        damage: 'Severe',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '3344-5566-7788',
        members: [
          { name: 'Roberto Bautista', relationship: 'Head', age: 50, specialConditions: [] },
          { name: 'Erlinda Bautista', relationship: 'Wife', age: 48, specialConditions: [] },
          { name: 'Reynaldo Bautista', relationship: 'Son', age: 22, specialConditions: [] },
          { name: 'Ronalyn Bautista', relationship: 'Daughter', age: 17, specialConditions: ['child'] },
          { name: 'Ryan Bautista', relationship: 'Son', age: 14, specialConditions: ['child'] },
          { name: 'Lola Teresa', relationship: 'Mother', age: 75, specialConditions: ['senior'] },
        ],
      },
      {
        name: 'Althea Morales',
        contact: 'althea.morales@gmail.com',
        brgy: '128',
        address: '22 Rodriguez St, Balut, Tondo',
        purok: 'Purok 1',
        qr: 'MNL-128-ALTHEA-2026',
        damage: 'Minor',
        idType: 'Voter\'s ID / Certificate (COMELEC)',
        idNum: 'VR-128-9901-2026',
        members: [
          { name: 'Althea Morales', relationship: 'Head', age: 29, specialConditions: [] },
          { name: 'Joshua Morales', relationship: 'Brother', age: 25, specialConditions: ['pwd'] },
          { name: 'Althea Jr Morales', relationship: 'Daughter', age: 3, specialConditions: ['child'] },
        ],
      },
    ];

    for (const r of defaultResidents) {
      let u = await User.findOne({ emailOrPhone: r.contact.toLowerCase() });
      if (!u) {
        u = await User.create({
          name: r.name,
          emailOrPhone: r.contact.toLowerCase(),
          passwordHash: 'resident123',
          role: 'resident',
          barangayCode: r.brgy,
          contactNum: r.contact,
          isActive: true,
        });
      }

      let hh = await Household.findOne({ qrCode: r.qr });
      if (!hh) {
        hh = new Household({
          headOfHouseholdUserId: u._id,
          address: r.address,
          purok: r.purok,
          barangayCode: r.brgy,
          memberCount: r.members.length,
          members: r.members,
          qrCode: r.qr,
          verificationStatus: 'verified',
          validIdType: r.idType,
          validIdNumber: r.idNum,
          damageLevel: r.damage,
        });
        const { priorityScore, priorityLevel } = calculatePriorityIndex(hh);
        hh.priorityScore = priorityScore;
        hh.priorityLevel = priorityLevel;
        await hh.save();
      }
    }
    console.log('✓ [Bootstrap] Ensured Standard Verified Residents Roster.');

    // 6. Ensure Standard Relief Item Configurations exist
    const itemsCount = await ReliefItemType.countDocuments();
    if (itemsCount === 0) {
      await ReliefItemType.create([
        { name: 'Family Food Pack', category: 'headcount_scaled', baseCoverage: 5, topUpUnitSize: 1, unit: 'pack', currentBaseStock: 500, currentTopUpStock: 1000 },
        { name: 'Water', category: 'headcount_scaled', baseCoverage: 5, topUpUnitSize: 1, unit: 'liter', currentBaseStock: 600, currentTopUpStock: 1200 },
        { name: 'Hygiene Kit', category: 'headcount_scaled', baseCoverage: 5, topUpUnitSize: 1, unit: 'kit', currentBaseStock: 400, currentTopUpStock: 800 },
        { name: 'Clothing', category: 'headcount_scaled', baseCoverage: 5, topUpUnitSize: 1, unit: 'set', currentBaseStock: 300, currentTopUpStock: 600 },
        { name: 'Medicine', category: 'fixed_unit', baseCoverage: 1, topUpUnitSize: 0, unit: 'box', currentBaseStock: 200, currentTopUpStock: 0 },
        { name: 'Temporary Shelter', category: 'fixed_unit', baseCoverage: 1, topUpUnitSize: 0, unit: 'tent', currentBaseStock: 100, currentTopUpStock: 0 },
        { name: 'Shelter Repair Materials', category: 'fixed_unit', baseCoverage: 1, topUpUnitSize: 0, unit: 'set', currentBaseStock: 150, currentTopUpStock: 0 },
      ]);
      console.log('✓ [Bootstrap] Initialized Standard Relief Item Configurations.');
    }
  } catch (err) {
    console.warn('[Bootstrap Warning] Failed to initialize default accounts:', err.message);
  }
};

module.exports = bootstrapSystem;

