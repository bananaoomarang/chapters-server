'use strict';

const debug      = require('debug')('users');
const Boom       = require('boom');
const Joi        = require('joi');
const Bluebird   = require('bluebird');
const userSchema = require('../../lib/schemas').user;

Bluebird.promisifyAll(Joi);

module.exports = function (cfg) {
  const users = require('./model')(cfg);

  let controller = {};

  controller.post = function (req, reply) {
    const doc = {
      username: req.payload.username.toLowerCase(),
      email:    req.payload.email,
      password: req.payload.password
    };

    Joi.validateAsync(doc, userSchema)
      .then(users.add.bind(null, doc))
      .spread(function (result) {
        reply({ id: result.id })
          .code(201);
      })
      .catch(function (e) {
        if (e.error === 'conflict')
          return reply(Boom.badRequest('User already exists'));

        debug(e);

        reply(Boom.wrap(e));
      });
  };

  controller.login = function (req, reply) {
    const credentials = req.payload;

    users
      .getToken(credentials)
      .then(function (token) {
          reply(token);
      })
      .catch(function (e) {
        switch(e.message) {
          case 'missing':
            return reply(Boom.unauthorized('User not found'));

          case 'Invalid password':
            return reply(Boom.unauthorized('Invalid password'));

          default:
            debug(e);

            reply(Boom.wrap(e));
        }
      });
  };

  controller.patch = function (req, reply) {
    const username = req.auth.credentials.name;
    const doc      = req.payload;

    users
      .update(username, username, doc)
      .then(function (saved) {
        reply({ id: saved._id });
      })
      .catch(function (e) {
          debug(e);

          return reply(Boom.wrap(e));
      });
  };

  controller.list = function (req, reply) {
    users
      .list()
      .then(function (list) {
        reply(list);
      })
      .catch(function (e) {
          debug(e);

          reply(Boom.wrap(e));
      });
  };

  controller.get = function (req, reply) {
    const id = req.params.name;

    users
      .get(id)
      .then(function (user) {
        reply({
          name:  user.name,
          roles: user.roles,
          scope: user.scope
        });
      })
      .catch(function (e) {
        reply(Boom.wrap(e));
      });
  };

  controller.getChapters= function (req, reply) {
    const username   = req.auth.credentials ? req.auth.credentials.name : '';
    const userToList = req.params.name;

    users
      .getStories(username, userToList)
      .then(function (list) {
        reply(list);
      })
      .catch(function (e) {
        reply(Boom.wrap(e));
      });
  };

  controller.getUserStories = function (req, reply) {
    const username   = req.auth.credentials ? req.auth.credentials.name : '';
    const userToList = req.params.user;

    users
      .getStories(username, userToList)
      .then(function (list) {
        reply(list);
      })
      .catch(function (e) {
        debug(e);

        reply(Boom.wrap(e));
      });
  };

  controller.getUserPersonas = function (req, reply) {
    const username   = req.auth.credentials ? req.auth.credentials.name : '';
    const userToList = req.params.user;

    users
      .getPersonas(username, userToList)
      .then(function (list) {
        reply(list);
      })
      .catch(function (e) {
        debug(e);

        reply(Boom.wrap(e));
      });
  };

  controller.destroy = function (req, reply) {
    const userToDestroy = req.params.name;

    users
      .destroy(userToDestroy)
      .spread(function (body) {
        reply(body);
      })
      .catch(function (e) {
        debug(e);

        reply(Boom.wrap(e));
      });
  };

  // This just serves as a quick token test
  controller.validate = function (req, reply) {
    reply(req.auth.credentials.name);
  };

  return controller;
};
