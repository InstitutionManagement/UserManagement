const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const upload = require('express-fileupload');
const _AppMiddlewareService = require('../../utility/app.middleware');
const appConstants = require('../../app.constants');
const appUtils = require('../../utility/app.utils');
const storage = require('azure-storage');
const streamifier = require('streamifier');

//User models
const _SuperAdminModel = require('../super-admin/super.admin.model');
const _TrustAdminModel = require('../trust/trust-admin/trust.admin.model');
const _UserAuthModel = require('../shared/user.auth.model');
const _InstitutionAdmin = require('../institution/institution-admin/institution.admin.model');
const _AuthConfig = require('../../config/auth.config');


const blobStorage = storage.createBlobService(
  _AuthConfig.DISPLAY_PIC_STORAGE_ACCOUNT_NAME,
  _AuthConfig.DISPLAY_PIC_STORAGE_ACCOUNT_KEY
);

const imageUploadRouter = express.Router();
imageUploadRouter.use(upload());
imageUploadRouter.use(_AppMiddlewareService.verifyToken);
imageUploadRouter
  .route('/upload')
  .post(imageUploadRouter);

imageUploadHandler = (req, res) => {
  let auth_id = appUtils.DecodeToken(req.headers['x-access-token']).id;
  let dataout = new appUtils.DataModel();
  let displayPic = req.files.displayPic;
  let _id = req.body._id;
  _UserAuthModel.findById(auth_id, (err, user) => {
    if (err) {
      dataout.error = err;
      res.json(dataout);
    } else if (user.registered_id != _id) {
      dataout.error = appConstants.AUTHENTICATION_FAILURE;
      res.json(dataout);
    } else {
      let user_ype = req.body.user_type;
      let _name = _id + path.extname(displayPic.name);
      let _stream = streamifier.createReadStream(displayPic.data);
      blobStorage.createBlockBlobFromStream(_AuthConfig.DISPLAY_PIC_STORAGE_CONTAINER, _name, _stream, displayPic.data.byteLength,
      (err, resolve)=>{
        if(err){
          dataout.error = err;
          res.json(dataout);
        }
        else{
          if (displayPic) {
            let url = _name;
              switch (user_ype) {
                case 'SuperAdmin':
                  {
                    _SuperAdminModel.findByIdAndUpdate(
                      _id,
                      {
                        $set: {
                          image_url: url
                        }
                      },
                      (err, success) => {
                        if (err) {
                          dataout.error = err;
                          res.json(dataout);
                        } else {
                          dataout.data = appConstants.SUPER_ADMIN_UPDATE_SUCCESS;
                          res.json(dataout);
                        }
                      }
                    );
                  }
                  break;
                case 'TrustAdmin':
                  {
                    _TrustAdminModel.findByIdAndUpdate(
                      _id,
                      {
                        $set: {
                          image_url: url
                        }
                      },
                      (err, success) => {
                        if (err) {
                          dataout.error = err;
                          res.json(dataout);
                        } else {
                          dataout.data = appConstants.TRUST_ADMIN_UPDATE_SUCCESS;
                          res.json(dataout);
                        }
                      }
                    );
                  }
                  break;
                case 'InstitutionAdmin':
                  {
                    _InstitutionAdmin.findByIdAndUpdate(
                      _id,
                      {
                        $set: {
                          image_url: url
                        }
                      },
                      (err, success) => {
                        if (err) {
                          dataout.error = err;
                          res.json(dataout);
                        } else {
                          dataout.data = appConstants.TRUST_ADMIN_UPDATE_SUCCESS;
                          res.json(dataout);
                        }
                      }
                    );
                  }  
                  break;
                default: {
                  dataout.error = 'Failed';
                  res.json(dataout);
                }
              }
          } else {
            dataout.error = 'Failed';
            res.json(dataout);
          }
        }
      });
    }
  });
}


module.exports = imageUploadRouter;
