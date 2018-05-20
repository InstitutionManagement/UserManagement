//Lib
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
//Services and Models
const _UserAuthModel = require('../components/shared/user.auth.model');
//Utility
const authConfig = require('../config/auth.config');
const appUtils = require('../utility/app.utils');
const appConst = require('../app.constants');


//cacheconst 
const cacheUserInfo = require('../components/shared/cache.user.info')


//Function
const verifyToken = (req, res, next) => {
  let dataout = new appUtils.DataModel();
  var token = req.headers['x-access-token'];
  if (!token) {
    dataout.error = { auth: false, message: 'No token provided.' };
    return res.status(401).json(dataout);
  }

  jwt.verify(token, authConfig.secret, function(err, decoded) {
    if (err) {
      dataout.error = { auth: false, message: 'Failed to authenticate token.' };
      return res.status(500).json(dataout);
    }
    else{
        var userDetails; 
        userDetails = cacheUserInfo.returnUserInfo();
        let id  = jwt.decode(token).id;
        let username = jwt.decode(token).username;
        
        if(userDetails && userDetails.id == id && userDetails.username == username)
            next();
        else{
          _UserAuthModel.findById(id, (err, user) => {
              if(user && user.username == username){
                cacheUserInfo.storeUserInfo(id , username);
                next();
              }
              else {
                dataout.error = appConst.ACCESS_ERRORS.a001;
                res.json(dataout);
            }
          });

        }
      }
  });
};

const verifyAccess = grp_code => {
  return (req, res, next, grp_code) => {
    let token = req.headers['x-access-token'];
    let id = jwt.decode(token).id;
    let dataout = new appUtils.DataModel();
    _UserAuthModel.findById(id, (err, user) => {
      if (err) {
        dataout.error = err;
        res.json(dataout);
      }
      let isUserAuthorized = false;
      grp_code.some(code => {
        if (user.privilage_code.findIndex(cd => cd == code) !== -1) {
          isUserAuthorized = true;
          return isUserAuthorized;
        }
      });
      if (isUserAuthorized) next();
      else {
        dataout.error = appConst.ACCESS_ERRORS.a001;
        res.json(dataout);
      }
    });
  };
};

module.exports = {
  verifyToken: verifyToken,
  verifyAccess: verifyAccess
};
