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
      });
      console.log('✓ [Bootstrap] Created Default Field Staff: staff291@manila.gov.ph / staff123');
    }

    // 5. Ensure Standard Relief Item Configurations exist
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
