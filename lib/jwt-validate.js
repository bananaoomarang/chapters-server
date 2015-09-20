'use strict';

module.exports = function (cfg) {
  const db = cfg.usersdb;

  function verify (request, decoded, cb) {
    const key = 'org.couchdb.user:' + decoded.user;

    db.get(key, function (err, doc) {
      if(err)
        return cb(err, false, doc);

      return cb(null, true, doc);
    });
  }

  return verify;
};
