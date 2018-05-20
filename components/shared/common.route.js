//Libs
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//Services
const _UserAuthModel = require('./user.auth.model');
const _SuperAdminModel = require('../super-admin/super.admin.model');
const _TrustAdminModel = require('../trust/trust-admin/trust.admin.model');
const _AppMiddlewareService = require('../../utility/app.middleware');

//Utilities
const appUtils = require('../../utility/app.utils');
const appConst = require('../../app.constants');
const authConfig = require('../../config/auth.config');

const commonRouter = express.Router();
commonRouter.use(bodyParser.json());
commonRouter.use(_AppMiddlewareService.verifyToken);

commonRouter
  .route('/user/activate/:authId')
  .put(_AppMiddlewareService.verifyAccess(appConst.API_ACCESS_CODE['superadmin/register']), (req, res, next) => {
    let dataout = new appUtils.DataModel();
    let authId = req.params.authId;
    let decodedToken = jwt.decode(req.headers['x-access-token']);
    _UserAuthModel.findByIdAndUpdate(
      authId,
      {
        $set: {
          status: {
            tag: 'ACTIVE',
            toggled_by: {
              username: decodedToken.username,
              userAuth_id: decodedToken.id
            }
          }
        }
      },
      (err, user) => {
        if (err) {
          dataout.error = err;
          res.json(dataout);
        } else {
          let superadmin_id = user.registered_id;
          switch (user.user_type) {
            case 'SuperAdmin':
              {
                _SuperAdminModel.findByIdAndUpdate(
                  superadmin_id,
                  {
                    $set: {
                      status: {
                        tag: 'ACTIVE',
                        toggled_by: {
                          username: decodedToken.username,
                          userAuth_id: decodedToken.id
                        }
                      }
                    }
                  },
                  (err, superadmin) => {
                    if (err) {
                      dataout.error = err;
                      res.json(dataout);
                    } else {
                      dataout.data = appConst.DB_CODES.db006;
                      res.json(dataout);
                    }
                  }
                );
              }
              break;

            default:
              break;
          }
        }
      }
    );
  });

module.exports = commonRouter;
