//Libs
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//Services
const _UserAuthModel = require('../../shared/user.auth.model');
const _AppMiddlewareService = require('../../../utility/app.middleware');
const _InstitutionAdminModel = require('./institution.admin.model');
//Utilities
const appUtils = require('../../../utility/app.utils');
const appConst = require('../../../app.constants');
const authConfig = require('../../../config/auth.config');

const InstitutionAdminRouter = express.Router();
InstitutionAdminRouter.use(bodyParser.json());
InstitutionAdminRouter.use(_AppMiddlewareService.verifyToken);

InstitutionAdminRouter.route('/register')
.post(_AppMiddlewareService.verifyAccess([0]), (req, res) => {
    let dataout = new appUtils.DataModel();
    let decodedToken = jwt.decode(req.headers['x-access-token']);
    _UserAuthModel.create(
        {
            username: req.body.username,
            password: bcrypt.hashSync(req.body.password, authConfig.saltRounds),
            user_type: 'InstitutionAdmin',
            status: {
              tag: 'ACTIVE',
              toggled_by: {
                username: decodedToken.username,
                userAuth_id: decodedToken.id
              }
            }
        },
        (err, user) =>{
            if(err){
                dataout.error = err;
                res.json(dataout);
            } else {
                _InstitutionAdminModel.create(
                    {
                        name: req.body.name,
                        username: req.body.username,
                        email: req.body.email,
                        phone: req.body.phone,
                        address: req.body.address,
                        parent_trust_id: req.body.parentTrustId,
                        parent_institution_id: req.body.parentInstituteId,
                        auth_id: user._id,
                        status: {
                          tag: 'ACTIVE',
                          toggled_by: {
                            username: decodedToken.username,
                            userAuth_id: decodedToken.id
                          }
                        }
                    },
                    (err, institutionadmin) => {
                        if(err){
                            _UserAuthModel.findByIdAndRemove(
                                {
                                    _id: user._id
                                },
                                (error, success)=> {
                                    if(err){
                                        dataout.error = error;
                                        res.json(dataout);
                                    } else {
                                        dataout.error = err;
                                        res.json(dataout);
                                    }
                                }
                            )
                        } else{
                            _UserAuthModel.findByIdAndUpdate(
                                user._id,
                                {
                                  $set: {
                                    registered_id: institutionadmin._id
                                  }
                                },
                                (err, success) => {
                                  if (err) {
                                    dataout.error = err;
                                    res.json(dataout);
                                  } else {
                                    dataout.data = appConst.INSTITUTION_ADMIN_CREATION_SUCCESS;
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

InstitutionAdminRouter.route('/getInstitutionAdmins')
.post(_AppMiddlewareService.verifyAccess([0]), (req, res) => {
    let dataout = new appUtils.DataModel()
    let condition = {};
    if(!appUtils.IsEmpty(req.body) && !appUtils.IsEmpty(req.body.condition)){
        condition = req.body.condition;
    }
    _InstitutionAdminModel.find(
        condition,
        (err, institutionadmins) =>{
            if(err){
                dataout.error = err;
                res.json(dataout);
            } else {
                dataout.data = [];
                institutionadmins.forEach(ia => {
                    dataout.data.push(new appUtils.InstitutionAdmin(ia, req.body.status));
                });
                res.json(dataout);
            }
        }
    )
});
module.exports = InstitutionAdminRouter;