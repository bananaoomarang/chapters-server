'use strict';

module.exports = function (cfg) {
  var controller = {};
  var user       = require('./model')(cfg);

  controller.create = function (req, reply) {
    var new_user = req.payload;

    user.add(new_user, function confirmUserAdded (err, body) {
      if (err) return reply(err);

      return reply(body);
    });
  }

  controller.login = function (req, reply) {
    var credentials = req.payload;

    var jobs = [

      function getUser (done) {
        user.get(credentials.username, function getUser (err, body) {
          if (err) return done(err);

          return done(null, body);
        });
      },

      function hash (user_doc, done) {
        crypto.pbkdf2(credentials.password, user_doc.salt, user_doc.iterations, 20, function (err, key) {
          if(err) done(err);

          done(null, user_doc, key);
        });
      },

      function authenticate (user_doc, key, done) {

        if(user_doc.derived_key === key.toString('hex')) {

          var token = jwt.sign({ user: user_doc.name }, privateKey, { expiresInMinutes: 10 });

          done(null, token);

        } else {

          done('Invalid Password');

        }
      }

    ];

    async.waterfall(jobs, function (err, result) {

      if(err) return reply(err);

      return reply(null, result);

    });

  }

  controller.list = function (req, reply) {

    user.list(function getUserList (err, body) {
      if (err) return reply(err);

      return reply(body);
    });

  };

  controller.get = function (req, reply) {

    user.get(req.params.name, function getUser (err, body) {
      if (err) return reply(err);

      return reply(body);
    });

  }

  return controller;
}
