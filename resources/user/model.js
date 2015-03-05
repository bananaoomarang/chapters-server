'use strict';

var debug = require('debug')('accounts');

module.exports = function (cfg) {
  var authenticate = require('../../lib/authentication')(cfg);

  var model = {};
  var db    = cfg.userdb;

  model.add = function (user, cb) {

    debug('creating %s', user.username);

    var doc = {
      _id      : 'org.couchdb.user:' + user.username,
      name     : user.username,
      type     : 'user',
      roles    : [],
      password : user.password
    };


    db.insert(doc, function couchInsert (err, body) {

      if (err) return cb(err);

      return cb(null, body);

    });

  };

  model.remove = function (username, cb) {

    debug('removing: %s', username);

    db.destroy(username, 'revision', function (err, body) {

      if (err) return cb(err);

      return cb(null, body);

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

  model.getToken = function (user, password, cb) {

    authenticate(user, function (err, token) {

      if(err) return cb(err);

      return cb(null, token);

    });

  };

  return model;

};
