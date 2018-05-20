const NodeCache = require( "node-cache" );
const userAuthCache = new NodeCache( { stdTTL: 30, checkperiod: 10 } );

const storeUserInfo = function(id , username){
    cacheObj = { id: id , username: username };
    userAuthCache.set( "userCache", cacheObj , function( err, success ){
    if( !err && success ){
        console.log(success);
      }
    else{
        console.log("error");
      }
    });
}

const returnUserInfo =  function(){
    var returnval;
    userAuthCache.get( "userCache", function( err, value ){
          if( !err ){
            if(value == undefined)
              returnval =  false;
            else
              returnval =  value;
          }
        });
        return returnval; 
    }


module.exports = {
    returnUserInfo: returnUserInfo,
    storeUserInfo: storeUserInfo
  };
  