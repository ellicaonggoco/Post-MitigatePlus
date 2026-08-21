const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, {
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runE2EProductionTests() {
  console.log('====================================================');
  console.log('🚀 MITIGATEPLUS 100% PRODUCTION READINESS E2E AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'online', '1. System Health Check (/api/health)');

    // 2. SuperAdmin Login
    const superAdminRes = await request('POST', '/api/auth/login', {
      emailOrPhone: 'superadmin@manila.gov.ph',
      password: 'superadmin123'
    });
    assert(superAdminRes.status === 200 && superAdminRes.data.token, '2. SuperAdmin Authentication (/api/auth/login)');
    const superAdminToken = superAdminRes.data.token;

    // 3. LGU Admin Login
    const adminRes = await request('POST', '/api/auth/login', {
      emailOrPhone: 'admin@manila.gov.ph',
      password: 'admin123'
    });
    assert(adminRes.status === 200 && adminRes.data.token, '3. LGU Admin Authentication (/api/auth/login)');
    const adminToken = adminRes.data.token;

    // 4. Barangay Official Login
    const officialRes = await request('POST', '/api/auth/login', {
      emailOrPhone: 'official291@manila.gov.ph',
      password: 'official123'
    });
    assert(officialRes.status === 200 && officialRes.data.token, '4. Barangay Official Authentication (/api/auth/login)');
    const officialToken = officialRes.data.token;

    // 5. Field Staff Login
    const staffRes = await request('POST', '/api/auth/login', {
      emailOrPhone: 'staff291@manila.gov.ph',
      password: 'staff123'
    });
    assert(staffRes.status === 200 && staffRes.data.token, '5. Field Staff Authentication (/api/auth/login)');
    const staffToken = staffRes.data.token;

    // 6. Resident Registration
    const testPhone = `0999${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Maria Clara Santos',
      emailOrPhone: testPhone,
      password: 'ResidentPassword123!',
      barangayCode: '291',
      address: `Blk ${Math.floor(Math.random()*50)} Lot 12 Manila St`,
      purok: 'Purok 3',
      idType: 'National ID',
      idNumber: `PH-ID-${Math.floor(100000 + Math.random()*900000)}`,
      memberCount: 6,
      members: [
        { name: 'Maria Clara Santos', relationship: 'Head', age: 42, specialConditions: [] },
        { name: 'Crisostomo Ibarra Santos', relationship: 'Spouse', age: 45, specialConditions: [] },
        { name: 'Tiago Santos', relationship: 'Parent', age: 72, specialConditions: ['senior'] },
        { name: 'Sinang Santos', relationship: 'Child', age: 14, specialConditions: [] },
        { name: 'Basilio Santos', relationship: 'Child', age: 8, specialConditions: ['pwd'] },
        { name: 'Crispin Santos', relationship: 'Child', age: 3, specialConditions: ['child'] }
      ]
    });
    assert(regRes.status === 201 && regRes.data.token, '6. Resident 2-Step Registration (/api/auth/register)');
    const residentToken = regRes.data?.token;
    const householdId = regRes.data?.household?._id;
    const residentQrCode = regRes.data?.household?.qrCode;

    // 7. Resident Profile & Household Check
    let residentQr = residentQrCode;
    if (residentToken) {
      const meRes = await request('GET', '/api/households/me', null, residentToken);
      assert(meRes.status === 200 && meRes.data.household, '7. Resident Profile & Live QR Pass (/api/households/me)');
      if (meRes.data.household && meRes.data.household.qrCode) {
        residentQr = meRes.data.household.qrCode;
      }
    }

    // 8. Barangay Verification Queue
    const queueRes = await request('GET', '/api/households/pending', null, officialToken);
    assert(queueRes.status === 200 && Array.isArray(queueRes.data.households || queueRes.data), '8. Barangay Verification Queue (/api/households/pending)');

    // 9. Household Verification (Approve)
    if (householdId) {
      const verifyRes = await request('POST', `/api/households/${householdId}/verify`, {
        status: 'verified',
        verificationNotes: 'Documents physically inspected and confirmed by Barangay 291 Desk.'
      }, officialToken);
      assert(verifyRes.status === 200 && verifyRes.data.household?.verificationStatus === 'verified', '9. Verification Execution (/api/households/:id/verify)');
    }

    // 10. Damage Report Submission & Priority Recalculation
    if (residentToken) {
      const damageRes = await request('POST', '/api/damage-reports', {
        damageLevel: 'Severe',
        description: 'Roof blown off and walls collapsed during heavy flood.',
        photos: ['https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80']
      }, residentToken);
      assert(damageRes.status === 201, '10. Citizen Damage Report Submission (/api/damage-reports)');
    }

    // 11. Assistance Request Submission
    if (residentToken) {
      const assistRes = await request('POST', '/api/assistance-requests', {
        itemType: 'Family Food Pack',
        notes: 'Family of 6 with 1 senior and 1 PWD requiring food pack assistance.'
      }, residentToken);
      assert(assistRes.status === 201, '11. Assistance Quota Request Submission (/api/assistance-requests)');
    }

    // 12. Distribution Event Creation
    const eventRes = await request('POST', '/api/distributions/events', {
      title: 'Barangay 291 Emergency Flood Relief Distribution Drive',
      itemType: 'Family Food Pack',
      batchId: `BATCH-${Date.now()}`,
      barangayCode: '291',
      location: 'Barangay 291 Covered Court, Zone 27'
    }, adminToken);
    assert(eventRes.status === 201 && eventRes.data._id, '12. Distribution Event Creation (/api/distributions/events)');
    const eventId = eventRes.data?._id;

    // 13. Warehouse Inventory Operations (Restock & Dispatch)
    const whList = await request('GET', '/api/warehouse', null, adminToken);
    assert(whList.status === 200 && Array.isArray(whList.data), '13A. Central Warehouse Listing (/api/warehouse)');
    
    if (whList.data && whList.data.length > 0) {
      const firstItem = whList.data[0];
      const restockRes = await request('POST', `/api/warehouse/${firstItem._id}/restock`, {
        qty: 150,
        note: 'Incoming LGU emergency procurement shipment'
      }, adminToken);
      assert(restockRes.status === 200, '13B. Warehouse Restock (+) Operation');

      const dispatchRes = await request('POST', `/api/warehouse/${firstItem._id}/dispatch`, {
        qty: 10,
        note: 'Dispatched to Barangay 291 distribution booth'
      }, adminToken);
      assert(dispatchRes.status === 200, '13C. Warehouse Dispatch (-) Operation');
    }

    // 14. Field Staff QR Scanner Lookup
    if (residentQr) {
      const scanLookup = await request('GET', `/api/households/qr/${residentQr}`, null, staffToken);
      assert(scanLookup.status === 200 && scanLookup.data.household, '14. Field Staff QR Scanner Lookup (/api/households/qr/:code)');
      
      // 15. Relief Release (First Authorized Claim)
      if (eventId && householdId) {
        const releaseRes = await request('POST', '/api/distributions/release', {
          distributionEventId: eventId,
          householdId: householdId
        }, staffToken);
        assert((releaseRes.status === 200 || releaseRes.status === 201) && releaseRes.data.distribution, '15. Right-Sized Relief Release (/api/distributions/release)');

        // 16. Anti-Duplicate Claim Interception (Second Duplicate Claim Attempt)
        const duplicateAttempt = await request('POST', '/api/distributions/release', {
          distributionEventId: eventId,
          householdId: householdId
        }, staffToken);
        assert(duplicateAttempt.status === 409, '16. Anti-Duplicate Claim Enforcement Engine (HTTP 409 Conflict)');
      }
    }

    // 17. 5-Stage Recovery Progression
    if (householdId) {
      const recoveryUpdate = await request('PUT', `/api/recovery/${householdId}`, {
        status: 'ongoing'
      }, officialToken);
      assert(recoveryUpdate.status === 200, '17. 5-Stage Household Recovery Transition (/api/recovery/:householdId)');
    }

    // 18. Global Policy Engine Configuration
    const policyGet = await request('GET', '/api/policy', null, superAdminToken);
    assert(policyGet.status === 200, '18A. Global Policy Retrieval (/api/policy)');
    const policyPut = await request('PUT', '/api/policy', {
      baseCoverage: 5,
      extraMemberTopUp: 0.5,
      seniorTopUp: 0.5,
      pwdTopUp: 0.5
    }, superAdminToken);
    assert(policyPut.status === 200, '18B. Global Policy Configuration Update (/api/policy)');

    // 19. Executive Disaster Recovery Summary Reports
    const summaryRes = await request('GET', '/api/reports/summary', null, adminToken);
    assert(summaryRes.status === 200 && summaryRes.data.totalHouseholds !== undefined, '19A. Executive KPI Summary Report (/api/reports/summary)');

    const dupReport = await request('GET', '/api/reports/duplicate-attempts', null, adminToken);
    assert(dupReport.status === 200 && Array.isArray(dupReport.data), '19B. Blocked Duplicate Fraud Audit Trail (/api/reports/duplicate-attempts)');

    const gapReport = await request('GET', '/api/reports/gap-analysis', null, adminToken);
    assert(gapReport.status === 200 && Array.isArray(gapReport.data), '19C. City-Wide Relief Gap Matrix (/api/reports/gap-analysis)');

    // 20. Immutable System Audit Logs
    const auditRes = await request('GET', '/api/audit-logs?page=1&limit=20', null, superAdminToken);
    assert(auditRes.status === 200 && Array.isArray(auditRes.data.logs), '20. System Audit Logs Retrieval (/api/audit-logs)');

  } catch (err) {
    console.error('Fatal Test Exception:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runE2EProductionTests();
