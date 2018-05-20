const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let GroupPolicy = new Schema({
  group_name: {
    type: String,
    unique: true,
    required: true
  },
  privilage_code: {
    type: Number,
    required: true,
    unique: true
  },
  permissions: {
    r_UserAuth: {
      type: Boolean,
      default: false
    },
    w_UserAuth: {
      type: Boolean,
      default: false
    },
    d_UserAuth: {
      type: Boolean,
      default: false
    },
    r_SuperAdmin: {
      type: Boolean,
      default: false
    },
    w_SuperAdmin: {
      type: Boolean,
      default: false
    },
    d_SuperAdmin: {
      type: Boolean,
      default: false
    },
    r_GroupPolicy: {
      type: Boolean,
      default: false
    },
    w_GroupPolicy: {
      type: Boolean,
      default: false
    },
    d_GroupPolicy: {
      type: Boolean,
      default: false
    }
  }
});

module.exports = mongoose.model('GroupPolicy', GroupPolicy);
