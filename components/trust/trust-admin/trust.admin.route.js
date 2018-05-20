//Libs
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//Services
const _UserAuthModel = require('../../shared/user.auth.model');
const _AppMiddlewareService = require('../../../utility/app.middleware');
const _TrustAdminModel = require('./trust.admin.model');
const _TrustModel = require('../trust.model');
//Utility
const authConfig = require('../../../config/auth.config');
const appUtils = require('../../../utility/app.utils');
const appConst = require('../../../app.constants');

const trustAdminRouter = express.Router();
trustAdminRouter.use(bodyParser.json());

trustAdminRouter.use(_AppMiddlewareService.verifyToken);

//Register a trust admin
trustAdminRouter
  .route('/register')
  .post(_AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['trustadmin/register']), (req, res, next) => {
    let dataout = new appUtils.DataModel();
    let decodedToken = jwt.decode(req.headers['x-access-token']);
    // Create the user in TrustAdmin Model
    _UserAuthModel.create(
      {
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, authConfig.saltRounds),
        user_type: 'TrustAdmin',
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
          // If success then return the required data
          _TrustAdminModel.create(
            {
              name: req.body.name,
              username: req.body.username,
              email: req.body.email,
              phone: req.body.phone,
              address: req.body.address,
              parent_trust_id: req.body.parent_trust_id,
              auth_id: user._id,
              status: {
                tag: 'ACTIVE',
                toggled_by: {
                  username: decodedToken.username,
                  userAuth_id: decodedToken.id
                }
              }
            },
            (err, trustadmin) => {
              if (err) {
                _UserAuthModel.findByIdAndRemove(user._id, (error, success) => {
                  if(error){
                    dataout.error = error;
                    res.json(dataout);
                  } else {
                    dataout.error = err;
                    res.json(dataout);
                  }
                })
                dataout.error = err;
                res.json(dataout);
              } else {
                _UserAuthModel.findByIdAndUpdate(
                  user._id,
                  {
                    $set: {
                      registered_id: trustadmin._id
                    }
                  },
                  (err, success) => {
                    if (err) {
                      dataout.error = err;
                      res.json(dataout);
                    } else {
                      dataout.data = appConst.TRUST_ADMIN_CREATION_SUCCESS;
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

trustAdminRouter
  .route('/getTrustAdmin')
  .post(
    _AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['trustadmin/getAllTrustAdmin']),
    (req, res, next) => {
      let condition = {};
      if (!appUtils.IsEmpty(req.body) && !appUtils.IsEmpty(req.body.condition)) {
        condition = req.body.condition;
      }
      _TrustAdminModel.find(condition, (err, trustadmins) => {
        let dataout = new appUtils.DataModel();
        if (err) {
          dataout.error = err;
          res.json(dataout);
        } else {
          dataout.data = [];
          let trustIds = [];
          trustadmins.forEach(ta => {
            trustIds.push(ta.parent_trust_id);
          });
          _TrustModel.find(
            {
              _id:{
                $in:trustIds
              }
            },
            (error, trusts)=>{
              if(error){
                dataout.error = error;
                res.json(dataout);
              } else {
                let trustIdNameMap = {};
                trusts.forEach(trust => {
                  trustIdNameMap[trust._id] = trust.name;
                });
                trustadmins.forEach(trustadmin => {
                  dataout.data.push(new appUtils.TrustAdmin(trustadmin, 
                    {
                      status_required : "STATUS_REQUIRED", 
                      trust_name: trustIdNameMap[trustadmin.parent_trust_id]
                    }
                  ));
                });
                res.json(dataout);
              }
            }
          );
        }
      });
    }
  );

trustAdminRouter.route('/updateTrustAdmin')
.post(_AppMiddlewareService.verifyAccess([0]), (req, res, next)=>{
  
})
module.exports = trustAdminRouter;
