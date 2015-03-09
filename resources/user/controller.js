'use strict';

module.exports = function (cfg) {
  var user         = require('./model')(cfg);

  var controller   = {};

  controller.create = function (req, reply) {
    var newUser = req.payload;

    user.add(newUser, function confirmUserAdded (err, body) {
      if (err) return reply(err);

      return reply(body);
    });
  };

  controller.login = function (req, reply) {
    var credentials = req.payload;

    user.getToken(credentials, function (err, token) {
      if (err) return reply(err);

      return reply(null, token);
    });
  };

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

  };

  controller.remove = function (req, reply) {

    user.remove(req.params.name, function removeUser (err, body) {
      if (err) return reply(err);

      return reply(body);
    });

  };

  return controller;

};
