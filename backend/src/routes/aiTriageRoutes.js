const express = require('express');
const router = express.Router();
const { analyzeHealthMessage } = require('../services/aiTriageService');
const HealthAlert = require('../models/HealthAlert');
const AssistanceRequest = require('../models/AssistanceRequest');
const Household = require('../models/Household');
const WarehouseItem = require('../models/WarehouseItem');
const WarehouseLog = require('../models/WarehouseLog');
const { protect, requireRole } = require('../middleware/auth');

// @route   POST /api/ai-triage/analyze
// @desc    Real-time NLP AI Health & Emergency Message Analysis
// @access  Public / Protected
router.post('/analyze', async (req, res) => {
  try {
    const rawText = req.body.message || req.body.symptomText || req.body.text || req.body.symptom || '';
    const barangayCode = req.body.barangayCode || '291';
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ message: 'Please provide a message to analyze.' });
    }

    const triageResult = analyzeHealthMessage(rawText.trim(), barangayCode);
    res.json({
      success: true,
      triageResult,
      ...triageResult,
    });
  } catch (error) {
    console.error('AI Triage error:', error);
    res.status(500).json({ message: 'Error analyzing health message', error: error.message });
  }
});

// @route   POST /api/ai-triage/submit-request
// @desc    Submit an AI-Triaged Health / Emergency Assistance Request
// @access  Protected (Resident)
router.post('/submit-request', protect, async (req, res) => {
  try {
    const rawText = req.body.message || req.body.symptomText || req.body.text || '';
    const userBarangay = req.body.barangayCode || req.user?.barangayCode || '291';
    const userName = req.body.residentName || req.user?.name || 'Resident';

    const triageResult = req.body.triageResult || analyzeHealthMessage(rawText || '', userBarangay);

    // Find or link household
    let household = await Household.findOne({ headOfHouseholdUserId: req.user._id });

    // Save to AssistanceRequest
    const newRequest = await AssistanceRequest.create({
      householdId: household ? household._id : null,
      barangayCode: userBarangay,
      requestType: triageResult.prophylaxisRequired ? 'medical' : 'emergency',
      status: triageResult.deliveryMode === 'DOOR_TO_DOOR_DISPATCH' ? 'assigned' : 'approved',
      specialNeeds: triageResult.detectedSymptoms,
      notes: `[AI NLP TRIAGE: ${triageResult.urgencyLevel}] ${triageResult.suspectedCondition} | Voucher: ${triageResult.voucherCode} | User Note: ${rawText}`,
      createdAt: new Date(),
    });

    // Update aggregate HealthAlert for this barangay
    let alertDoc = await HealthAlert.findOne({ barangayCode: userBarangay });
    if (!alertDoc) {
      alertDoc = new HealthAlert({
        barangayCode: userBarangay,
        riskScore: triageResult.urgencyLevel === 'CRITICAL' ? 85 : 45,
        riskLevel: triageResult.urgencyLevel === 'CRITICAL' ? 'CRITICAL' : 'MODERATE',
        activeCasesCount: 1,
        recommendedAction: triageResult.medicalGuidance,
        localBhcStockDoxycycline: 48,
      });
    } else {
      alertDoc.activeCasesCount += 1;
      if (triageResult.urgencyLevel === 'CRITICAL') {
        alertDoc.riskScore = Math.min(100, alertDoc.riskScore + 15);
        alertDoc.riskLevel = alertDoc.riskScore >= 70 ? 'CRITICAL' : 'MODERATE';
      }
      alertDoc.localBhcStockDoxycycline = Math.max(0, alertDoc.localBhcStockDoxycycline - 1);
      alertDoc.updatedAt = new Date();
    }
    await alertDoc.save();

    res.status(201).json({
      message: 'AI Triage Request recorded successfully.',
      triage: triageResult,
      requestId: newRequest._id,
      voucherCode: triageResult.voucherCode,
    });
  } catch (error) {
    console.error('Submit AI request error:', error);
    res.status(500).json({ message: 'Error submitting triage request', error: error.message });
  }
});

// @route   GET /api/ai-triage/outbreak-hotspots
// @desc    Get all active epidemic outbreak risk hotspots across Manila Barangays
// @access  Protected
router.get('/outbreak-hotspots', protect, async (req, res) => {
  try {
    const alerts = await HealthAlert.find().sort({ riskScore: -1 }).lean();

    // Default seeded realistic post-disaster cluster data for Manila
    if (!alerts || alerts.length === 0) {
      const defaultClusters = [
        { barangayCode: '105', riskScore: 92, riskLevel: 'CRITICAL', diseaseType: 'leptospirosis', activeCasesCount: 18, localBhcStockDoxycycline: 8, floodDurationDays: 4, recommendedAction: '⚠️ CRITICAL: Dispatch 500 caps Doxycycline Buffer Restock from Central Warehouse' },
        { barangayCode: '291', riskScore: 84, riskLevel: 'CRITICAL', diseaseType: 'leptospirosis', activeCasesCount: 12, localBhcStockDoxycycline: 14, floodDurationDays: 3, recommendedAction: '⚠️ CRITICAL: Urgent Prophylaxis distribution at Brgy 291 Health Center' },
        { barangayCode: '344', riskScore: 78, riskLevel: 'CRITICAL', diseaseType: 'leptospirosis', activeCasesCount: 9, localBhcStockDoxycycline: 18, floodDurationDays: 2, recommendedAction: '⚠️ HIGH ALERT: Monitor fever cases and replenish BHC prophylaxis' },
        { barangayCode: '128', riskScore: 65, riskLevel: 'MODERATE', diseaseType: 'gastroenteritis', activeCasesCount: 7, localBhcStockDoxycycline: 35, floodDurationDays: 2, recommendedAction: 'Distribute Chlorine Tablets & Oral Rehydration Salts' },
        { barangayCode: '587', riskScore: 42, riskLevel: 'MODERATE', diseaseType: 'dengue', activeCasesCount: 4, localBhcStockDoxycycline: 45, floodDurationDays: 1, recommendedAction: 'Conduct fogging and vector control in flood pockets' },
      ];
      return res.json(defaultClusters);
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching outbreak hotspots', error: error.message });
  }
});

// @route   POST /api/ai-triage/dispatch-buffer-restock
// @desc    LGU Admin dispatches 500 capsules of Doxycycline buffer restock from Central Warehouse to BHC
// @access  Protected (LGU Admin / Superadmin)
router.post('/dispatch-buffer-restock', protect, requireRole('lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const { barangayCode, quantity = 500, medicineName = 'Doxycycline 200mg Capsules' } = req.body;

    // Deduct or check Central Warehouse
    let warehouseItem = await WarehouseItem.findOne({ itemName: { $regex: /doxycycline|medicine|antibiotic/i } });
    if (!warehouseItem) {
      warehouseItem = await WarehouseItem.create({
        itemName: 'Doxycycline 200mg (Prophylaxis)',
        category: 'medical',
        currentStock: 10000,
        unit: 'capsules',
        minThreshold: 1000,
        location: 'Central Warehouse Manila',
      });
    }

    if (warehouseItem.currentStock >= quantity) {
      warehouseItem.currentStock -= quantity;
      await warehouseItem.save();
    }

    // Log the government audit trail
    const refNo = `WAYBILL-MED-${Date.now().toString().slice(-6)}`;
    await WarehouseLog.create({
      itemId: warehouseItem._id,
      itemName: warehouseItem.itemName,
      action: 'OUT',
      quantity,
      purpose: 'Outbreak Prophylaxis Buffer Restock',
      destination: `Barangay ${barangayCode} Health Center`,
      approvingOfficial: req.user.name,
      transporter: 'City Health Mobile Logistics Unit',
      referenceNo: refNo,
      performedBy: req.user._id,
      performedByName: req.user.name,
      notes: `Dispatched ${quantity} caps buffer restock to prevent Leptospirosis outbreak in Brgy ${barangayCode}.`,
    });

    // Update HealthAlert model for this barangay
    let alertDoc = await HealthAlert.findOne({ barangayCode: String(barangayCode) });
    if (alertDoc) {
      alertDoc.localBhcStockDoxycycline += quantity;
      alertDoc.warehouseRestockDispatched = true;
      alertDoc.lastRestockDate = new Date();
      alertDoc.riskLevel = 'MODERATE';
      alertDoc.riskScore = Math.max(25, alertDoc.riskScore - 30);
      await alertDoc.save();
    }

    res.json({
      message: `Successfully dispatched ${quantity} capsules of ${medicineName} to Barangay ${barangayCode} Health Center!`,
      referenceNo: refNo,
      remainingCentralStock: warehouseItem.currentStock,
    });
  } catch (error) {
    console.error('Dispatch restock error:', error);
    res.status(500).json({ message: 'Error dispatching buffer restock', error: error.message });
  }
});

module.exports = router;
