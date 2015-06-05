'use strict';

var Boom        = require('boom');
var Joi         = require('joi');
var userSchema = require('../../lib/schemas').user;

module.exports = function (cfg) {
  var users         = require('./model')(cfg);

  var controller   = {};

  controller.create = function (req, reply) {

    var newUser = req.payload;

    Joi.validate(newUser, userSchema, function (err) {
      if (err) return reply(Boom.wrap(err));
    });

    users.add(newUser, function confirmUserAdded (err, body) {

      if (err) {

        if (err.error === 'conflict') {
          return reply( Boom.badRequest('User already exists') );
        } else {
          return reply( Boom.wrap(err) );
        }

      }

      return reply(body)
               .code(201);

    });

  };

  controller.login = function (req, reply) {

    var credentials = req.payload;

    users.getToken(credentials, function (err, token) {

      if (err) {

        switch(err.message) {
          case 'missing':
            return reply( Boom.unauthorized('User not found') );
          case 'Invalid password':
            return reply( Boom.unauthorized('Invalid password') );
          default:
            return reply( Boom.wrap(err) );
        }

      }

      return reply(null, token);

    });

  };

  controller.update = function (req, reply) {

    users.update(req.auth.credentials.name, req.payload, function(err) {
      if (err) return reply( Boom.wrap(err) );

      reply('Successfully updated');
    });

  };

  controller.list = function (req, reply) {

    users.list(function getUserList (err, body) {

      if (err) return reply( Boom.wrap(err) );

      return reply(body);

    });

  };

  controller.get = function (req, reply) {

    users.get(req.params.name, function getUser (err, body) {

      if (err) return reply( Boom.wrap(err) );

      return reply(body);

    });

  };

  controller.getStories = function (req, reply) {
    return reply(404);
  };

  controller.destroy = function (req, reply) {
    users.destroy(req.params.name, function removeUser (err, body) {

      if (err) return reply( Boom.wrap(err) );

      return reply(body);

    });

  };

  // This just serves as a quick token test
  controller.validate = function (req, reply) {

    reply('You\'re good to go!');

  };

  return controller;

};
