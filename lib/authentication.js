'use strict';

var jwt        = require('jsonwebtoken');
var pbkdf2     = require('crypto').pbkdf2;
var async      = require('async');

module.exports = function (cfg) {
  var db         = cfg.usersdb;
  var privateKey = cfg.tokenSecret;
  var expiration = cfg.tokenExpiration;

  // Authenticate the user with reference to database and generate a token

  var authenticateUser = function (credentials, cb) {

    var jobs = [

      function getUser (done) {
        var key = 'org.couchdb.user:' + credentials.username;

        db.get(key, function (err, body) {

          if (err) return done(err);

          return done(null, body);
        });
      },

      function hash (userDoc, done) {
        pbkdf2(credentials.password, userDoc.salt, userDoc.iterations, 20, function (err, key) {
          if(err) done(err);

          done(null, userDoc, key);
        });
      },

      function authenticate (userDoc, key, done) {

        if(userDoc.derived_key === key.toString('hex')) {

          var token = jwt.sign({ user: userDoc.name }, privateKey, { expiresInMinutes: expiration });

          done(null, token);

        } else {

          done(new Error('Invalid password'));

        }
      }

    ];

    async.waterfall(jobs, function (err, token) {

      if(err) return cb(err);

      return cb(null, token);

    });
  };

  return authenticateUser;
};
