const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let  Institution = new Schema({
  name: {
    type: String,
    required: true,
    unique: false
  },
  parent_trust_id: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: false
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: false,
    unique: false
  },
  created_by: {
    name: {
      type: String,
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    created_on: {
      type: Date,
      default: Date.now
    }
  },
  website: {
    type: String,
    required: false,
    unique: false
  },
  document_link: {
    type: String,
    required: false,
    unique: false
  },
  status: {
    tag: {
      type: String,
      enum: ['ACTIVE', 'DELETED'],
      default: 'ACTIVE'
    },
    toggled_by: {
      username: String,
      userAuth_id: Schema.Types.ObjectId
    }
  }
});

module.exports = mongoose.model('Institution',  Institution);
