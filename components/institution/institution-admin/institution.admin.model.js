const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let InstitutionAdmin = new Schema({
  name: {
    type: String,
    required: true,
    unique: false
  },
  username: {
    type: String,
    required: true,
    unique:true
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
  image_url: {
    type: String,
    required: false,
    default: 'https://expressjs.com/images/express-mw.png'
  },
  address: {
    type: String,
    required: true,
    unique: false
  },
  auth_id: {
    type: Schema.Types.ObjectId,
    required: false,
    unique: false
  },
  parent_trust_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Trust',
    unique: false
  },
  parent_institution_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Institute',
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

module.exports = mongoose.model('InstitutionAdmin', InstitutionAdmin);
