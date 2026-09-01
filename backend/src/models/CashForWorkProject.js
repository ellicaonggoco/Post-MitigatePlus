const mongoose = require('mongoose');

const CashForWorkProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    barangayCode: {
      type: String,
      required: true,
      trim: true,
    },
    targetWorksite: {
      type: String,
      required: true,
      trim: true,
    },
    proposedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dailyWageRate: {
      type: Number,
      default: 500,
    },
    durationDays: {
      type: Number,
      default: 10,
    },
    totalSlots: {
      type: Number,
      default: 25,
    },
    filledSlots: {
      type: Number,
      default: 0,
    },
    allocatedBudget: {
      type: Number,
      default: 0,
    },
    availableCategories: [
      {
        type: String,
        default: 'Debris & Mud Clearing',
      },
    ],
    status: {
      type: String,
      enum: ['pending_lgu_approval', 'approved_active', 'ongoing_work', 'completed', 'rejected'],
      default: 'pending_lgu_approval',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CashForWorkProject', CashForWorkProjectSchema);
