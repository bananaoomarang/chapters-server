'use strict';

const Bluebird = require('bluebird');
const jwtSign  = require('jsonwebtoken').sign;
const pbkdf2   = Bluebird.promisify(require('crypto').pbkdf2);

module.exports = function (cfg) {
  const db         = cfg.usersdb;
  const privateKey = cfg.tokenSecret;
  const expiration = cfg.tokenExpiration;

  //
  // Authenticate the user with reference to database and generate a token
  //
  return function authenticateUser(credentials) {
    const id = 'org.couchdb.user:' + credentials.username;

    return db
      .getAsync(id)
      .then(function hash (doc) {
        return pbkdf2(credentials.password, doc.salt, doc.iterations, 20, 'sha1')
          .then(function check (key) {
            if(doc.derived_key === key.toString('hex')) {
              return jwtSign({ user: doc.name }, privateKey, { expiresIn: expiration });
            } else {
              throw new Error('Invalid password');
            }
          });
      });
  };
};
