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
router.post('/', protect, requireRole('barangay_official', 'lgu_admin'), async (req, res) => {
  try {
    const { title, body, barangayCode } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required.' });
    }

    const announcement = await Announcement.create({
      title,
      body,
      barangayCode: barangayCode || req.user.barangayCode || null,
      postedBy: req.user._id,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_announcement', announcement);
    }

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Error creating announcement', error: error.message });
  }
});

module.exports = router;
