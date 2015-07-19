'use strict';

module.exports = function (cfg) {

  var db = cfg.usersdb;

  function verify (decodedToken, cb) {
    var username = decodedToken.user;
    var key      = 'org.couchdb.user:' + username;

    db.get(key, function (err, doc) {

      if(err) return cb(err, false, doc);

      return cb(null, true, doc);

    });

  }

  return verify;

};
