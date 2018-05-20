//Libs
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const passwordGen = require('password-generator');
//Services
const _UserAuthModel = require('../shared/user.auth.model');
const _SuperAdminModel = require('../super-admin/super.admin.model');
const _AppMiddlewareService = require('../../utility/app.middleware');
const _GroupPolicyModel = require('../shared/group.policy.model');
//Utility
const authConfig = require('../../config/auth.config');
const appUtils = require('../../utility/app.utils');
const appConst = require('../../app.constants');

const superAdminRouter = express.Router();
superAdminRouter.use(bodyParser.json());
superAdminRouter.use(_AppMiddlewareService.verifyToken);

//Register a new SuperAdmin
superAdminRouter
  .route('/register')
  .post(_AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/register']), (req, res, next) => {
    let dataout = new appUtils.DataModel();
    let decodedToken = jwt.decode(req.headers['x-access-token']);
    // Create the user in SuperAdmin Model
    _UserAuthModel.create(
      {
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, authConfig.saltRounds),
        user_type: 'SuperAdmin',
        status: {
          tag: 'ACTIVE',
          toggled_by: {
            username: decodedToken.username,
            userAuth_id: decodedToken.id
          }
        }
      },
      (err, user) => {
        if (err) {
          dataout.error = err;
          res.json(dataout);
        } else {
          // If success then update auth id in SuperAdmin Model
          _SuperAdminModel.create(
            {
              name: req.body.name,
              username: req.body.username,
              email: req.body.email,
              phone: req.body.phone,
              address: req.body.address,
              auth_id: user._id,
              status: {
                tag: 'ACTIVE',
                toggled_by: {
                  username: decodedToken.username,
                  userAuth_id: decodedToken.id
                }
              }
            },
            (err, superadmin) => {
              if (err) {
                _UserAuthModel.findByIdAndRemove(user._id, (error, success) => {
                  if (error) {
                    dataout.error = error;
                    res.json(dataout);
                  } else {
                    dataout.error = err;
                    res.json(dataout);
                  }
                });
              } else {
                //If success then create the user in UserAuth Model
                _UserAuthModel.findByIdAndUpdate(
                  user._id,
                  {
                    $set: {
                      registered_id: superadmin._id
                    }
                  },
                  (err, success) => {
                    if (err) {
                      dataout.error = err;
                      res.json(dataout);
                    } else {
                      dataout.data = appConst.SUPER_ADMIN_CREATION_SUCCESS;
                      res.json(dataout);
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  });

//Get all SuperAdmin
superAdminRouter
  .route('/getSuperAdmins')
  .post(
    _AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/getAllSuperAdmins']),
    (req, res, next) => {
      let condition = {};
      if (!appUtils.IsEmpty(req.body) && !appUtils.IsEmpty(req.body.condition)) {
        condition = req.body.condition;
      }
      _SuperAdminModel.find(condition, (err, superadmins) => {
        let dataout = new appUtils.DataModel();
        if (err) {
          dataout.error = err;
          res.json(dataout);
        } else {
          dataout.data = [];
          superadmins.forEach(sa => {
            dataout.data.push(new appUtils.SuperAdmin(sa, 'STATUS_REQUIRED'));
          });
          res.json(dataout);
        }
      });
    }
  );

//Loophole to register dev as SuperAdmin
superAdminRouter.route('/loophole/register').post((req, res, next) => {
  let dataout = new appUtils.DataModel();
  // Create the user in SuperAdmin Model
  _SuperAdminModel.create(
    {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      username: req.body.username
    },
    (err, superadmin) => {
      if (err) {
        dataout.error = err;
        res.json(dataout);
      } else {
        //If success then create the user in UserAuth Model
        _UserAuthModel.create(
          {
            username: req.body.username,
            password: bcrypt.hashSync(req.body.password, authConfig.saltRounds),
            registered_id: superadmin._id,
            user_type: 'SuperAdmin',
            privilage_code: [0]
          },
          (err, user) => {
            if (err) {
              dataout.error = err;
              res.json(dataout);
            } else {
              _SuperAdminModel.findByIdAndUpdate(
                superadmin._id,
                {
                  $set: {
                    auth_id: user._id
                  }
                },
                (err, success) => {
                  if (err) {
                    dataout.error = err;
                    res.json(dataout);
                  } else {
                    dataout.data = appConst.USER_CREATION_SUCCESS;
                    res.json(dataout);
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

//Delete a SuperAdmin
superAdminRouter
  .route('/deleteSuperAdmin/:authid/:superadminid')
  .delete(
    _AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/deleteSuperAdmin/:userid']),
    (req, res, next) => {
      let dataout = new appUtils.DataModel();
      let authid = req.params.authid;
      let decodedToken = jwt.decode(req.headers['x-access-token']);
      _UserAuthModel.findByIdAndUpdate(
        authid,
        {
          $set: {
            status: {
              tag: 'DELETED',
              toggled_by: {
                username: decodedToken.username,
                userAuth_id: decodedToken.id
              }
            }
          }
        },
        (err, success) => {
          if (err) {
            dataout.error = err;
            res.json(dataout);
          } else if (success.nModified == 0) {
            dataout.error = appConst.DB_CODES.db001;
            res.json(dataout);
          } else {
            _SuperAdminModel.findByIdAndUpdate(
              req.params.superadminid,
              {
                $set: {
                  status: {
                    tag: 'DELETED',
                    toggled_by: {
                      username: decodedToken.username,
                      userAuth_id: decodedToken.id
                    }
                  }
                }
              },
              (err, success) => {
                if (err) {
                  dataout.error = err;
                  res.json(dataout);
                } else {
                  dataout.data = appConst.DB_CODES.db002;
                  res.json(dataout);
                }
              }
            );
          }
        }
      );
    }
  );

//Update the profile data of SuperAdmin by himself
superAdminRouter
  .route('/updateSuperAdmin')
  .post(
    _AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/updateSuperAdmin']),
    (req, res, next) => {
      let dataout = new appUtils.DataModel();
      let registered_id = appUtils.DecodeToken(req.headers['x-access-token']).id;
      _SuperAdminModel.findByIdAndUpdate(
        registered_id,
        {
          $set: {
            name: req.body.name,
            phone: req.body.phone,
            address: req.body.address
          }
        },
        (err, superadmin) => {
          if (err) {
            dataout.error = err;
            res.json(dataout);
          } else if (!superadmin) {
            dataout.error = appConst.DB_CODES.db001;
            res.json(dataout);
          } else {
            dataout.data = superadmin;
            res.json(dataout);
          }
        }
      );
    }
  );

//Update credintials
superAdminRouter
  .route('/admin/resetPassword')
  .post(_AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/register']), (req, res, next) => {
    let authId = req.body.auth_id;
    let dataout = new appUtils.DataModel();
    let _password = passwordGen(8, false);
    _UserAuthModel.findByIdAndUpdate(
      authId,
      {
        $set: {
          password: bcrypt.hashSync(_password, authConfig.saltRounds)
        }
      },
      (err, user) => {
        if (err) {
          dataout.error = err;
          res.json(dataout);
        } else {
          dataout.data = appConst.DB_CODES.db008;
          //send password to email and sms
          res.json(dataout);
        }
      }
    );
  });
//Create a new group policy
superAdminRouter
  .route('/newGroupPolicy')
  .post(_AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/newGroupPolicy']), (req, res, next) => {
    let dataout = new appUtils.DataModel();
    _GroupPolicyModel.create(
      {
        group_name: req.body.group_name,
        privilage_code: req.body.privilage_code,
        permissions: req.body.permissions
      },
      (err, grouppolicy) => {
        if (err) {
          dataout.error = err;
          res.json(dataout);
        } else {
          dataout.data = grouppolicy;
          res.json(dataout);
        }
      }
    );
  });

//Update an existing group policy
superAdminRouter
  .route('/updateGroupPolicy')
  .post(
    _AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/updateGroupPolicy']),
    (req, res, next) => {
      let dataout = new appUtils.DataModel();
      _GroupPolicyModel.findByIdAndUpdate(
        req.body.grppolicy_id,
        {
          $set: {
            group_name: req.body.group_name,
            privilage_code: req.body.privilage_code,
            permissions: req.body.permissions
          }
        },
        (err, grouppolicy) => {
          if (err) {
            dataout.error = err;
            res.json(dataout);
          } else if (!grouppolicy) {
            dataout.error = appConst.DB_CODES.db003;
            res.json(dataout);
          } else {
            dataout.data = grouppolicy;
            res.json(dataout);
          }
        }
      );
    }
  );

//Get all group policies with or without group code
superAdminRouter
  .route('/getAllGroupPolicy')
  .post(
    _AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/getAllGroupPolicy']),
    (req, res, next) => {
      let dataout = new appUtils.DataModel();
      let condition = {};
      if (!appUtils.IsEmpty(res.body.grpcd)) {
        condition.grpcd = req.body.grpcd;
      }
      _GroupPolicyModel.find(condition, (err, grouppolicy) => {
        if (err) {
          dataout.error = err;
          res.json(dataout);
        } else {
          dataout.data = grouppolicy;
          res.json(dataout);
        }
      });
    }
  );

//Remove group policy
superAdminRouter
  .route('/removeGroupPolicy/:grpcd')
  .delete(
    _AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/removeGroupPolicy']),
    (req, res, next) => {
      let dataout = new appUtils.DataModel();
      _GroupPolicyModel.findOneAndRemove({ privilage_code: req.body.grpcd }, (err, grouppolicy) => {
        if (err) {
          dataout.error = err;
          res.json(dataout);
        } else {
          dataout.data = appConst.DB_CODES.db004;
          res.json(dataout);
        }
      });
    }
  );

//Attach group code to super admin
superAdminRouter
  .route('/setgroup')
  .post(_AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/setgroup']), (req, res, next) => {
    let dataout = new appUtils.DataModel();
    let updates = req.body;
    Object.keys(updates).forEach(key => {
      _UserAuthModel.find(
        {
          _id: mongoose.Types.ObjectId(key.toString())
        },
        (err, user) => {
          if (err) {
            dataout.error[key] = err;
          } else if (!user) {
            dataout.error[key] = appConst.DB_CODES.db001;
          } else {
            _UserAuthModel.update(
              {
                _id: mongoose.Types.ObjectId(key.toString())
              },
              {
                $set: {
                  privilage_code: updates[key]
                }
              },
              (err, res) => {
                if (err) {
                  dataout.error[key] = err;
                } else {
                  dataout.data[key] = res;
                }
              }
            );
          }
        }
      );
    });
    res.json(dataout);
  });

//Export module
module.exports = superAdminRouter;
