//Libs
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

//Services
const _UserAuthModel = require('../shared/user.auth.model');
const _SuperAdminModel = require('../super-admin/super.admin.model');
const _AppMiddlewareService = require('../../utility/app.middleware');
const _GroupPolicyModel = require('../shared/group.policy.model');
const _TrustModel = require('../trust/trust.model');

//Utility
const authConfig = require('../../config/auth.config');
const appUtils = require('../../utility/app.utils');
const appConst = require('../../app.constants');

const trustRouter = express.Router();
trustRouter.use(bodyParser.json());
trustRouter.use(_AppMiddlewareService.verifyToken);

//Register a Trust
trustRouter.route('/register').post(_AppMiddlewareService.verifyAccess([0, 1]), (req, res, next) => {
  let dataout = new appUtils.DataModel();
  let decodedToken = appUtils.DecodeToken(req.headers['x-access-token']);
  _TrustModel.create(
    {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      created_by: req.body.created_by,
      website: req.body.website,
      document_link: req.body.document_link,
      status: {
        tag: 'ACTIVE',
        toggled_by: {
          username: decodedToken.username,
          userAuth_id: decodedToken.id
        }
      }
    },
    (err, trust) => {
      if (err) {
        dataout.error = err;
        res.json(dataout);
      } else {
        dataout.data = trust;
        res.json(dataout);
      }
    }
  );
});

//Update trust
trustRouter.route('/update').post(_AppMiddlewareService.verifyAccess([0, 1]), (req, res, next) => {
  let dataout = new appUtils.DataModel();
  _TrustModel.update(
    {
      _id: req.body._id
    },
    {
      $set: {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        created_by: req.body.created_by,
        website: req.body.website,
        document_link: req.body.document_link
      }
    },
    (err, trust) => {
      if (err) {
        dataout.error = err;
        res.json(dataout);
        return;
      } else {
        dataout.data = trust;
        res.json(dataout);
      }
    }
  );
});

//get all trusts
trustRouter.route('/getAllTrusts').post(_AppMiddlewareService.verifyAccess([0, 1]), (req, res, next) => {
  let dataout = new appUtils.DataModel();
  let condition = {};
  if (!appUtils.IsEmpty(req.body.condition)) {
    condition = req.body.condition;
  }
  _TrustModel.find(condition, (err, trusts) => {
    if (err) {
      dataout.error = err;
      res.json(dataout);
    } else {
      dataout.data = [];
      trusts.forEach(trust => {
        dataout.data.push(new appUtils.Trust(trust, 'STATUS_REQUIRED'));
      });
      res.json(dataout);
    }
  });
});

//Delete a trust
trustRouter
  .route('/deleteTrust/:trustid')
  .delete(
    _AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['trust/deleteTrust/:trustId']),
    (req, res, next) => {
      let dataout = new appUtils.DataModel();
      let trustid = req.params.trustId;
      let decodedToken = appUtils.DecodeToken(req.headers['x-access-token']);
      Promise.all([
        TrustDelete(trustid, decodedToken.username, decodedToken.id),
        TrustAdminDelete(trustid, decodedToken.username, decodedToken.id)
      ])
        .then(data => {
          dataout.data = data;
          res.json(dataout);
        })
        .catch(e => {
          dataout.error = e;
          res.json(dataout);
        });
    }
  );

module.exports = trustRouter;

//Service functions
TrustDelete = (_trustId, _username, _auth_id) => {
  return new Promise((resolve, reject) => {
    _TrustModel.findByIdAndUpdate(
      _trustId,
      {
        $set: {
          status: {
            tag: 'DELETED',
            toggled_by: {
              username: _username,
              userAuth_id: _auth_id
            }
          }
        }
      },
      (err, success) => {
        if (err) {
          reject(appConst.TRUST_REMOVE_FAILED);
        } else {
          resolve(appConst.TRUST_REMOVE_SUCCESS);
        }
      }
    );
  });
};

TrustAdminDelete = (_parent_trust_id, _username, _auth_id) => {
  return new Promise((resolve, reject) => {
    _TrustAdminModel.update(
      {
        parent_trust_id: _parent_trust_id
      },
      {
        $set: {
          status: {
            tag: 'DELETED',
            toggled_by: {
              username: _username,
              userAuth_id: _auth_id
            }
          }
        }
      },
      { multi: true },
      (err, success) => {
        if (err) {
          reject(appConst.TRUST_ADMIN_REMOVE_FAILED);
        } else if (success.nModified == 0) {
          reject(appConst.TRUST_ADMIN_REMOVE_FAILED);
        } else {
          _TrustAdminModel.find(
            {
              parent_trust_id: _parent_trust_id
            },
            (err, trustadmins) => {
              if (err) {
                reject(appConst.TRUST_ADMIN_REMOVE_FAILED);
              } else {
                trustadmin_auth_ids = [];
                if (trustadmins.length > 0) {
                  trustadmins.forEach(trustadmin => {
                    trustadmin_auth_ids.push(trustadmin.auth_id);
                  });
                  _UserAuthModel.update(
                    {
                      _id: { $in: trustadmin_auth_ids }
                    },
                    {
                      $set: {
                        status: {
                          tag: 'DELETED',
                          toggled_by: {
                            username: _username,
                            userAuth_id: _auth_id
                          }
                        }
                      }
                    },
                    { multi: true },
                    (err, success) => {
                      if (err) {
                        reject(appConst.TRUST_ADMIN_REMOVE_FAILED);
                      } else if (!success) {
                        reject(appConst.TRUST_ADMIN_REMOVE_FAILED);
                      } else {
                        resolve(appConst.TRUST_ADMIN_REMOVE_SUCCESS);
                      }
                    }
                  );
                } else {
                  reject(appConst.TRUST_ADMIN_REMOVE_FAILED);
                }
              }
            }
          );
        }
      }
    );
  });
};

FetchTrustAdminIds = _parent_trust_id => {
  return new Promise((resolve, reject) => {
    _TrustAdminModel.find(
      {
        parent_trust_id: _parent_trust_id
      },
      (err, trustadmins) => {
        if (err) {
          reject(appConst.TRUST_ADMIN_ID_FETCH_FAILED);
        } else if (trustadmins.length == 0) {
          reject(appConst.TRUST_ADMIN_DOESNOT_EXIST);
        } else {
          let data = [];
          trustadmins.forEach(trustadmin => {
            data.push(new appUtils.IdSet(trustadmin._id, trustadmin.auth_id));
          });
          resolve(data);
        }
      }
    );
  });
};
