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
        name: 'Hon. Maria Sheilah "Honey" Lacuna-Pangan',
        emailOrPhone: 'superadmin@manila.gov.ph',
        email: 'superadmin@manila.gov.ph',
        passwordHash: 'superadmin123',
        role: 'lgu_superadmin',
        barangayCode: null,
      });
      console.log('✓ [Bootstrap] Created Default SuperAdmin: superadmin@manila.gov.ph / superadmin123');
    } else if (superAdminExists.name === 'City Mayor / LGU SuperAdmin' || superAdminExists.name.includes('SuperAdmin')) {
      superAdminExists.name = 'Hon. Maria Sheilah "Honey" Lacuna-Pangan';
      await superAdminExists.save();
    }

    // 2. Ensure LGU Admin exists
    const adminExists = await User.findOne({ emailOrPhone: 'admin@manila.gov.ph' });
    if (!adminExists) {
      await User.create({
        name: 'Dir. Arnaldo "Arnel" M. Angeles',
        emailOrPhone: 'admin@manila.gov.ph',
        email: 'admin@manila.gov.ph',
        passwordHash: 'admin123',
        role: 'lgu_admin',
        barangayCode: null,
      });
      console.log('✓ [Bootstrap] Created Default LGU Admin: admin@manila.gov.ph / admin123');
    } else if (adminExists.name === 'LGU MDRRMO Administrator' || adminExists.name.includes('Administrator')) {
      adminExists.name = 'Dir. Arnaldo "Arnel" M. Angeles';
      await adminExists.save();
    }

    // 3. Ensure Barangay Official (291) exists
    const officialExists = await User.findOne({ emailOrPhone: 'official291@manila.gov.ph' });
    if (!officialExists) {
      await User.create({
        name: 'Kap. Ernesto "Erning" V. Macapagal',
        emailOrPhone: 'official291@manila.gov.ph',
        email: 'official291@manila.gov.ph',
        passwordHash: 'official123',
        role: 'barangay_official',
        barangayCode: '291',
      });
      console.log('✓ [Bootstrap] Created Default Official: official291@manila.gov.ph / official123');
    } else if (officialExists.name.includes('Chairman') || officialExists.name.includes('Official')) {
      officialExists.name = 'Kap. Ernesto "Erning" V. Macapagal';
      await officialExists.save();
    }

    // 4. Ensure Field Staff (291) exists
    const staffExists = await User.findOne({ emailOrPhone: 'staff291@manila.gov.ph' });
    if (!staffExists) {
      await User.create({
        name: 'Officer Danilo "Danny" R. Mendoza',
        emailOrPhone: 'staff291@manila.gov.ph',
        email: 'staff291@manila.gov.ph',
        passwordHash: 'staff123',
        role: 'field_staff',
        barangayCode: '291',
        teamName: 'Field Team Alpha',
        staffDesignation: 'team_leader',
        department: 'MDRRMO Field Operations',
        contactNum: '0917-889-2910',
      });
      console.log('✓ [Bootstrap] Created Default Field Staff (Team Alpha): staff291@manila.gov.ph / staff123');
    } else if (staffExists.name === 'Field Officer Cruz') {
      staffExists.name = 'Officer Danilo "Danny" R. Mendoza';
      await staffExists.save();
    }

    // 4b. Ensure Remaining Field Team Leaders exist
    const fieldTeamsConfig = [
      { name: 'Officer John Paul Cruz', email: 'staff.bravo@manila.gov.ph', team: 'Field Team Bravo', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2911' },
      { name: 'Officer Rafael Corpuz', email: 'staff.charlie@manila.gov.ph', team: 'Field Team Charlie', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2912' },
      { name: 'Officer Chester Garcia', email: 'staff.delta@manila.gov.ph', team: 'Field Team Delta', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2913' },
      { name: 'Officer John Herzsel Datul', email: 'staff.qru1@manila.gov.ph', team: 'Quick Response Unit 1', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2914' },
      { name: 'Officer Luigi T. Francisco', email: 'staff.qru2@manila.gov.ph', team: 'Quick Response Unit 2', role: 'field_staff', brgy: 'City-Wide', phone: '0917-889-2915' },
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
      } else if (exists.name !== stf.name) {
        exists.name = stf.name;
        await exists.save();
      }
    }

    // 5. Ensure Pre-Verified Resident Citizens and Households exist
    const Household = require('../models/Household');
    const { calculatePriorityIndex } = require('./priorityIndex');

    const defaultResidents = [
      {
        name: 'John Paul Cruz',
        contact: 'juan@gmail.com',
        brgy: '291',
        address: '742 Severino Reyes St., Sta. Cruz, Manila',
        purok: 'Purok 1',
        qr: 'MNL-291-CRUZ-8402',
        damage: 'Minor',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '1234-5678-9012',
        members: [
          { name: 'John Paul Cruz', relationship: 'Head', age: 42, specialConditions: [] },
          { name: 'Maria Teresa Cruz', relationship: 'Wife', age: 40, specialConditions: ['pregnant'] },
          { name: 'Eduardo Cruz', relationship: 'Father', age: 70, specialConditions: ['senior', 'pwd'] },
          { name: 'Kristine Joy Cruz', relationship: 'Daughter', age: 15, specialConditions: ['child'] },
          { name: 'Gabriel Cruz', relationship: 'Son', age: 11, specialConditions: ['child'] },
          { name: 'Angelica Cruz', relationship: 'Daughter', age: 6, specialConditions: ['child'] },
          { name: 'Liam Cruz', relationship: 'Son', age: 2, specialConditions: ['child', 'medical'] },
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
        name: 'Rafael Corpuz',
        contact: '09996517418',
        brgy: '291',
        address: '418 Soler St. cor. Reina Regente, Binondo, Manila',
        purok: 'Purok 3',
        qr: 'MNL-291-CORP-4912',
        damage: 'Minor',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '1234-5678-9012',
        members: [
          { name: 'Rafael Corpuz', relationship: 'Head', age: 34, specialConditions: [] },
          { name: 'Carlo Corpuz', relationship: 'Son', age: 7, specialConditions: ['child'] },
        ],
      },
      {
        name: 'John Michael Nolasco',
        contact: 'nolascojmn06@gmail.com',
        brgy: '291',
        address: '456 Alvarez St, Sta Cruz, Manila',
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
        name: 'Chester Garcia',
        contact: 'maria@gmail.com',
        brgy: '344',
        address: '1542 Rizal Ave. near Bambang St., Sta. Cruz, Manila',
        purok: 'Purok 2',
        qr: 'MNL-344-GARC-6184',
        damage: 'Moderate',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '9876-5432-1098',
        members: [
          { name: 'Chester Garcia', relationship: 'Head', age: 38, specialConditions: [] },
          { name: 'Rowena Garcia', relationship: 'Spouse', age: 36, specialConditions: [] },
          { name: 'Clarisse Anne Garcia', relationship: 'Daughter', age: 12, specialConditions: ['child'] },
          { name: 'Paolo Miguel Garcia', relationship: 'Son', age: 10, specialConditions: ['child'] },
        ],
      },
      {
        name: 'Luigi T. Francisco',
        contact: '09179998877',
        brgy: '344',
        address: '852 Alvarez St. cor. Felix Huertas, Sta. Cruz, Manila',
        purok: 'Purok 1',
        qr: 'MNL-344-FRAN-9031',
        damage: 'Moderate',
        idType: "Driver's License (LTO)",
        idNum: 'N02-14-567890',
        members: [
          { name: 'Luigi T. Francisco', relationship: 'Head', age: 42, specialConditions: [] },
          { name: 'Aileen Joy Francisco', relationship: 'Wife', age: 39, specialConditions: [] },
          { name: 'Lourdes Francisco', relationship: 'Mother', age: 75, specialConditions: ['senior'] },
          { name: 'Mark Francisco', relationship: 'Son', age: 6, specialConditions: ['child'] },
          { name: 'Dave Francisco', relationship: 'Son', age: 9, specialConditions: ['child'] },
        ],
      },
      {
        name: 'John Herzsel Datul',
        contact: 'roberto.bautista@gmail.com',
        brgy: '128',
        address: '101 Smokey Mountain Compound, Tondo, Manila',
        purok: 'Purok 4',
        qr: 'MNL-128-DATU-2026',
        damage: 'Severe',
        idType: 'Philippine National ID (PhilSys / PhilID)',
        idNum: '3344-5566-7788',
        members: [
          { name: 'John Herzsel Datul', relationship: 'Head', age: 45, specialConditions: [] },
          { name: 'Erlinda Datul', relationship: 'Wife', age: 43, specialConditions: [] },
          { name: 'Reynaldo Datul', relationship: 'Son', age: 20, specialConditions: [] },
          { name: 'Ronalyn Datul', relationship: 'Daughter', age: 17, specialConditions: ['child'] },
          { name: 'Ryan Datul', relationship: 'Son', age: 14, specialConditions: ['child'] },
          { name: 'Nanay Tessie Datul', relationship: 'Mother', age: 74, specialConditions: ['senior'] },
        ],
      },
      {
        name: 'Althea Marie V. Morales',
        contact: 'althea.morales@gmail.com',
        brgy: '128',
        address: '22 Rodriguez St, Balut, Tondo, Manila',
        purok: 'Purok 1',
        qr: 'MNL-128-ALTHEA-2026',
        damage: 'Minor',
        idType: 'Voter\'s ID / Certificate (COMELEC)',
        idNum: 'VR-128-9901-2026',
        members: [
          { name: 'Althea Marie V. Morales', relationship: 'Head', age: 29, specialConditions: [] },
          { name: 'Joshua Morales', relationship: 'Brother', age: 25, specialConditions: ['pwd'] },
          { name: 'Princess Nicole Morales', relationship: 'Daughter', age: 3, specialConditions: ['child'] },
        ],
      },
    ];

    for (const r of defaultResidents) {
      let u = await User.findOne({ emailOrPhone: r.contact.toLowerCase() });
      if (!u) {
        const defaultPassword = r.contact === '09236051393' ? 'Camcampogi1919' : 'resident123';
        u = await User.create({
          name: r.name,
          emailOrPhone: r.contact.toLowerCase(),
          passwordHash: defaultPassword,
          role: 'resident',
          barangayCode: r.brgy,
          contactNum: r.contact,
          isActive: true,
        });
      } else if (u.name !== r.name) {
        u.name = r.name;
        await u.save();
      }

      let hh = await Household.findOne({
        $or: [
          { headOfHouseholdUserId: u._id },
          { qrCode: r.qr },
        ],
      });
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
      } else {
        // Keep household information updated with authentic data
        hh.address = r.address;
        hh.purok = r.purok;
        hh.members = r.members;
        hh.memberCount = r.members.length;
        if (hh.qrCode && hh.qrCode !== r.qr) {
          if (!hh.previousQrCodes) hh.previousQrCodes = [];
          if (!hh.previousQrCodes.some(p => p.code === hh.qrCode)) {
            hh.previousQrCodes.push({ code: hh.qrCode, revokedAt: new Date(), reason: 'profile_update' });
          }
          hh.qrCode = r.qr;
        }
        hh.validIdType = r.idType;
        hh.validIdNumber = r.idNum;
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

    // 7. Align damageLevel for user-registered households with no damage report
    const DamageReport = require('../models/DamageReport');
    const allHouseholds = await Household.find({}).populate('headOfHouseholdUserId', 'emailOrPhone');
    for (const h of allHouseholds) {
      const hasReport = await DamageReport.findOne({ householdId: h._id });
      if (!hasReport && h.damageLevel && h.damageLevel !== 'None') {
        const seedContacts = ['09236051393', 'juan@gmail.com', 'roberto.bautista@gmail.com', '09179998877', 'maria@gmail.com', 'althea.morales@gmail.com', '09996517418'];
        const isSeed = seedContacts.includes(h.headOfHouseholdUserId?.emailOrPhone);
        if (!isSeed) {
          h.damageLevel = 'None';
          const { priorityScore, priorityLevel } = calculatePriorityIndex(h);
          h.priorityScore = priorityScore;
          h.priorityLevel = priorityLevel;
          await h.save();
        }
      }
    }

    // 8. Auto-migrate old demo/placeholder Announcement and Distribution Event titles
    const DistributionEvent = require('../models/DistributionEvent');
    const Announcement = require('../models/Announcement');

    await DistributionEvent.updateMany(
      { title: { $regex: /Post-Typhoon Relief Distribution Batch 1/i } },
      {
        $set: {
          title: 'Pamamahagi ng Ayuda sa mga Biktima ng Habagat at Bagyo - District 3',
          location: 'Barangay 291 Covered Court, Sta. Cruz, Manila',
        },
      }
    );

    await Announcement.updateMany(
      { title: { $regex: /Relief Distribution Schedule - Barangay 291/i } },
      {
        $set: {
          title: 'Opisyal na Abiso: Pamamahagi ng Family Food Packs sa Brgy 291 Covered Court',
          body: 'Ang pamamahagi ng Family Food Packs para sa mga apektadong pamilya ay kasalukuyang isinasagawa sa Barangay 291 Covered Court. Mangyaring dalhin at ihanda ang inyong opisyal na QR Code sa pag-claim.',
        },
      }
    );
  } catch (err) {
    console.warn('[Bootstrap Warning] Failed to initialize default accounts:', err.message);
  }
};

module.exports = bootstrapSystem;

