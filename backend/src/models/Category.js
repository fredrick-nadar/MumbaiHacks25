const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  keywords: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  icon: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true,
    match: /^#[0-9A-F]{6}$/i
  },
  // For Indian context
  isEssential: {
    type: Boolean,
    default: false
  },
  taxDeductible: {
    type: Boolean,
    default: false
  },
  section: {
    type: String, // 80C, 80D, etc.
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance - name already has unique: true
// categorySchema.index({ name: 1 }); // Removed duplicate
categorySchema.index({ type: 1 });

module.exports = mongoose.model('Category', categorySchema);