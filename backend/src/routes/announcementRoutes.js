const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect, requireRole } = require('../middleware/auth');

// @route   GET /api/announcements
// @desc    Get announcements for residents / officials (filtered by barangayCode or city-wide)
router.get('/', async (req, res) => {
  try {
    let query = {};
    if (req.query.barangayCode) {
      query = {
        $or: [
          { barangayCode: req.query.barangayCode },
          { barangayCode: null },
        ],
      };
    }

    const announcements = await Announcement.find(query)
      .populate('postedBy', 'name role')
      .sort({ postedAt: -1 });

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching announcements', error: error.message });
  }
});

// @route   POST /api/announcements
// @desc    Create announcement (Admin / Official)
router.post('/', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin', 'lgu_super_admin'), async (req, res) => {
  try {
    const { title, body, barangay, barangayCode, category, scope, isUrgent, tag, targetTab } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required.' });
    }

    let resolvedBrgy = null;
    let resolvedScope = 'city-wide';

    if (req.user.role === 'barangay_official') {
      // Barangay Official: strictly locked to their own barangay
      resolvedBrgy = String(req.user.barangayCode || '291').trim();
      resolvedScope = 'barangay';
    } else {
      // LGU Admin / Superadmin: Option for City-Wide or Specific Barangay
      if (scope === 'barangay' && (barangayCode || barangay) && barangayCode !== 'ALL' && barangay !== 'City-Wide') {
        resolvedBrgy = String(barangayCode || barangay).trim();
        resolvedScope = 'barangay';
      } else {
        resolvedBrgy = null;
        resolvedScope = 'city-wide';
      }
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      body: body.trim(),
      barangayCode: resolvedBrgy,
      postedBy: req.user._id,
      category: category || 'general',
      scope: resolvedScope,
      isUrgent: !!isUrgent,
      tag: tag || 'Public Notice',
      targetTab: targetTab || null,
      edited: false,
    });

    await announcement.populate('postedBy', 'name role');

    const io = req.app.get('io');
    if (io) {
      io.emit('new_announcement', announcement);
    }

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Error creating announcement', error: error.message });
  }
});

// @route   PUT /api/announcements/:id
// @desc    Update existing announcement (Sets edited: true without duplicating)
router.put('/:id', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const { title, body, barangay, barangayCode, category, scope, isUrgent, tag, targetTab } = req.body;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    if (title) announcement.title = title.trim();
    if (body) announcement.body = body.trim();
    if (scope !== undefined) {
      announcement.scope = scope;
      announcement.barangayCode = scope === 'city-wide' || barangay === 'City-Wide' ? null : (barangayCode || barangay || announcement.barangayCode);
    }
    if (category !== undefined) announcement.category = category;
    if (isUrgent !== undefined) announcement.isUrgent = !!isUrgent;
    if (tag !== undefined) announcement.tag = tag;
    if (targetTab !== undefined) announcement.targetTab = targetTab;

    announcement.edited = true;
    announcement.editedAt = new Date();

    await announcement.save();
    await announcement.populate('postedBy', 'name role');

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement_updated', announcement);
    }

    res.json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Error updating announcement', error: error.message });
  }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement
router.delete('/:id', protect, requireRole('barangay_official', 'lgu_admin', 'lgu_superadmin'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement_deleted', { id: req.params.id });
    }

    res.json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting announcement', error: error.message });
  }
});

module.exports = router;
