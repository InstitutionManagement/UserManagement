//Libs
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

//Services
const _AppMiddlewareService = require('../../utility/app.middleware');
const _InstituteModel = require('../institution/institution.model');
const _TrustModel = require('../trust/trust.model');
//Utility
const appUtils = require('../../utility/app.utils');
const appConst = require('../../app.constants');

const institutionRouter = express.Router();
institutionRouter.use(bodyParser.json());
institutionRouter.use(_AppMiddlewareService.verifyToken);

//register an institution
institutionRouter.route('/register').post(_AppMiddlewareService.verifyAccess([0, 1]), (req, res, next) => {
  let dataout = new appUtils.DataModel();
  let decodedToken = appUtils.DecodeToken(req.headers['x-access-token']);
  _InstituteModel.create(
    {
      name: req.body.name,
      parent_trust_id: req.body.parent_trust_id,
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
    (err, institution) => {
      if (err) {
        dataout.error = err;
        res.json(dataout);
      } else {
        dataout.data = appConst.INSTITUTE_CREATION_SUCCESS;
        res.json(dataout);
      }
    }
  );
});

//get institutions
institutionRouter.route('/getInstitutions').post(_AppMiddlewareService.verifyAccess([0, 1]), (req, res, next) => {
  let dataout = new appUtils.DataModel();
  let condition = {};
  if (!appUtils.IsEmpty(req.body) && !appUtils.IsEmpty(req.body.condition)) {
    condition = req.body.condition;
  }
  _InstituteModel.find(condition, (err, institutions) => {
    if (err) {
      dataout.error = err;
      res.json(dataout);
    } else {
      let trustIds = [];
      institutions.forEach(institution => {
        trustIds.push(institution.parent_trust_id);
      });
      _TrustModel.find(
        {
          _id: {
            $in: trustIds
          }
        },
        (err, trusts) => {
          if (err) {
            dataout.error = err;
            res.json(dataout);
          } else {
            let trustIdNameMap = {};
            trusts.forEach(trust => {
              trustIdNameMap[trust._id] = trust.name;
            });
            dataout.data = [];
            institutions.forEach(institution => {
              dataout.data.push(
                new appUtils.Institution(institution, {
                  status_required: 'STATUS_REQUIRED',
                  trust_name: trustIdNameMap[institution.parent_trust_id]
                })
              );
            });
            res.json(dataout);
          }
        }
      );
    }
  });
});

//Update institution
institutionRouter.route('/update').post(_AppMiddlewareService.verifyAccess([0, 1]), (req, res, next) => {
  let dataout = new appUtils.DataModel();
  _InstituteModel.update(
    {
      _id: req.body._id
    },
    {
      $set: {
        name: req.body.name,
        parent_trust_id: req.parent_trust_id,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        created_by: req.body.created_by,
        website: req.body.website,
        document_link: req.body.document_link
      }
    },
    (err, institution) => {
      if (err) {
        dataout.error = err;
        res.json(dataout);
        return;
      } else {
        dataout.data = institution;
        res.json(dataout);
      }
    }
  );
});

//Delete Institute
institutionRouter.route('/deleteInstitution/:institutionId').delete(
  _AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['institution/deleteInstitution/:institutionId']),
  (req, res, next) => {
    let dataout = new appUtils.DataModel();
      let institutionId = req.params.institutionId;
      let decodedToken = appUtils.DecodeToken(req.headers['x-access-token']);
      Promise.all([
        InstituteDelete(institutionId, decodedToken.username, decodedToken.id),
        InstituteAdminDelete(institutionId, decodedToken.username, decodedToken.id)
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

module.exports = institutionRouter;

//Service functions
InstituteDelete = (_institutionId, _username, _auth_id) => {
  return new Promise((resolve, reject) => {
    _InstituteModel.findByIdAndUpdate(
      _institutionId,
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
          reject(appConst.INSTITUTE_REMOVE_FAILED);
        } else {
          resolve(appConst.INSTITUTE_REMOVE_SUCCESS);
        }
      }
    );
  });
};

InstituteAdminDelete = (_parent_institution_id, _username, _auth_id) => {
  return new Promise((resolve, reject) => {
    _InstituteAdminModel.update(
      {
        parent_institution_id: _parent_institution_id
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
          reject(appConst.INSTITUTE_ADMIN_REMOVE_FAILED);
        } else if (success.nModified == 0) {
          reject(appConst.INSTITUTE_ADMIN_REMOVE_FAILED);
        } else {
          _InstituteAdminModel.find(
            {
              parent_institution_id: _parent_institution_id
            },
            (err, institutionAdmins) => {
              if (err) {
                reject(appConst.INSTITUTE_ADMIN_REMOVE_FAILED);
              } else {
                admin_auth_ids = [];
                if (institutionAdmins.length > 0) {
                  institutionAdmins.forEach(institutionAdmin => {
                    admin_auth_ids.push(institutionAdmin.auth_id);
                  });
                  _UserAuthModel.update(
                    {
                      _id: { $in: admin_auth_ids }
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
                        reject(appConst.INSTITUTE_ADMIN_REMOVE_FAILED);
                      } else if (!success) {
                        reject(appConst.INSTITUTE_ADMIN_REMOVE_FAILED);
                      } else {
                        resolve(appConst.INSTITUTE_ADMIN_REMOVE_SUCCESS);
                      }
                    }
                  );
                } else {
                  reject(appConst.INSTITUTE_ADMIN_REMOVE_FAILED);
                }
              }
            }
          );
        }
      }
    );
  });
};
