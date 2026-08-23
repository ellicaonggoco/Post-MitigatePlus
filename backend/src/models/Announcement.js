const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  barangayCode: { type: String, default: null }, // Null = City-wide
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postedAt: { type: Date, default: Date.now },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  category: { type: String, default: 'general' },
  scope: { type: String, default: 'city-wide' },
  isUrgent: { type: Boolean, default: false },
  tag: { type: String, default: 'Public Notice' },
  targetTab: { type: String, default: null },
});

module.exports = mongoose.model('Announcement', announcementSchema);
