const mongoose = require('mongoose');

const AttendanceRecordSchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true,
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
  },
  timeIn: {
    type: Date,
    default: null,
  },
  timeOut: {
    type: Date,
    default: null,
  },
  scannedByStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  staffName: {
    type: String,
    default: '',
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
});

const CashForWorkApplicationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashForWorkProject',
      required: true,
    },
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
    },
    applicantUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    applicantPhone: {
      type: String,
      required: true,
    },
    barangayCode: {
      type: String,
      required: true,
    },
    selectedCategory: {
      type: String,
      required: true,
    },
    experienceNotes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending_barangay_review', 'approved_for_work', 'active_on_duty', 'completed', 'rejected'],
      default: 'pending_barangay_review',
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    reviewedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    attendanceLogs: [AttendanceRecordSchema],
    totalDaysWorked: {
      type: Number,
      default: 0,
    },
    dailyWageRate: {
      type: Number,
      default: 500,
    },
    totalPayoutEarned: {
      type: Number,
      default: 0,
    },
    payoutVoucherCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    payoutStatus: {
      type: String,
      enum: ['unpaid', 'voucher_issued', 'claimed'],
      default: 'unpaid',
    },
    claimedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a household only registers once per project
CashForWorkApplicationSchema.index({ projectId: 1, householdId: 1 }, { unique: true });

module.exports = mongoose.model('CashForWorkApplication', CashForWorkApplicationSchema);
