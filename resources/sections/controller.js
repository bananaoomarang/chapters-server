'use strict';

const debug    = require('debug')('sections');
const Boom     = require('boom');
const Bluebird = require('bluebird');
const Joi      = require('joi');
const schema   = require('../../lib/schemas').section;

Bluebird.promisifyAll(Joi);

module.exports = function (cfg) {
  const sections = require('./model')(cfg);

  let controller = {};

  controller.post = function (req, reply) {
    const username = req.auth.credentials.name;
    const body     = req.payload;

    const doc = {
      id:          [req.params.id, body.title].join('!'),
      read:        body.read        || [username],
      write:       body.write       || [username],
      title:       body.title,
      chapters:    body.chapters    || [],
      description: body.description || '???'
    };

    Joi.validateAsync(doc, schema)
      .then(sections.save.bind(null, username, doc))
      .then(function () {
        reply({ id: doc.id });
      })
      .catch(function (e) {
        debug(e);
        reply(Boom.wrap(e));
      });
  };

  controller.patch = function (req, reply) {
    const username = req.auth.credentias.name;
    const delta    = req.payload;

    sections.update(username, delta)
      .spread(function (doc) {
        reply({ id: doc.id });
      })
      .catch(function (e) {
        if(e.error === 'not_found')
          return reply(Boom.notFound(e));

        debug(e);
        reply(Boom.wrap(e));
      });
  };

  controller.get = function (req, reply) {
    const username = req.auth.credentias.name;
    const id       = [req.params.id, req.payload.title].join('!');

    sections.get(username, id)
      .spread(function (doc) {
        reply(doc);
      })
      .catch(function (e) {
        if(e.error === 'not_found')
          return reply(Boom.notFound(e));

        debug(e);
        reply(Boom.wrap(e));
      });
  };

  controller.destroy = function (req, reply) {
    const username = req.auth.credentias.name;
    const id       = [req.params.id, req.payload.title].join('!');

    sections.destroy(username, id)
      .spread(function (doc) {
        reply({ id: doc.id });
      })
      .catch(function (e) {
        if(e.error === 'not_found')
          return reply(Boom.notFound(e));

        debug(e);
        reply(Boom.wrap(e));
      });
  };

  return controller;
};
