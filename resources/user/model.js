'use strict';

var async = require('async');
var debug = require('debug')('accounts');

module.exports = function (cfg) {
  var authenticate = require('../../lib/authentication')(cfg);

  var model = {};
  var db    = cfg.usersdb;

  model.add = function (user, cb) {

    debug('creating %s', user.username);

    // TODO joi validate
    var doc = {
      _id:      'org.couchdb.user:' + user.username,
      name:     user.username,
      type:     'user',
      roles:    [],
      password: user.password,
      stories:  {}
    };

    db.insert(doc, function couchInsert (err, body) {

      if (err) return cb(err);

      return cb(null, body);

    });

  };

  model.destroy = function (username, cb) {

    debug('removing: %s', username);

    var jobs = [

      function getLatestRevision (done) {

      /* eslint-disable camelcase */

        db.get('org.couchdb.user:' + username, { revs_info: true  }, function (err, body) {

      /* eslint-enable camelcase */

          if (err) return done(err);

          return done(null, body._rev);

        });

      },

      function deleteDocument (revision, done) {

        db.destroy('org.couchdb.user:' + username, revision, function (err, body) {

          if (err) return done(err);

          return done(null, body);

        });
      }

    ];

    async.waterfall(jobs, function asyncFinished (err, result) {

      debug(err);

      if (err) return cb(err);

      return cb(null, result);
    });

  };

  model.get = function (username, cb) {

    debug('getting: %s', username);

    db.get('org.couchdb.user:' + username, function (err, body) {

      if (err) return cb(err);

      cb(null, body);

    });

  };

  model.list = function (cb) {

    db.list(function getDBList (err, body) {

      if(err) return cb(err);

      cb(null, body);

    });

  };

  model.getToken = function (user, cb) {

    authenticate(user, function (err, token) {

      if(err) return cb(err);

      return cb(null, token);

    });

  };

  return model;

};
