'use strict';

const debug    = require('debug')('stories');
const Boom     = require('boom');
const Bluebird = require('bluebird');
const Joi      = require('joi');
const schema   = require('../../lib/schemas').story;

Bluebird.promisifyAll(Joi);

module.exports = function (cfg) {
  let controller = {};
  let stories    = require('./model')(cfg);

  controller.post = function (req, reply) {
    const username = req.auth.credentials.name;
    const body     = req.payload;

    const doc = {
      read:     body.read     || [username],
      write:    body.write    || [username],
      title:    body.title,
      author:   body.author   || username,
      owner:    username,
      chapters: body.chapters || []
    };

    Joi.validateAsync(doc, schema)
      .then(stories.save.bind(null, username, doc))
      .spread(function (saved) {
        reply({ id: saved.id });
      })
      .catch(function (e) {
        debug(e);
        reply(Boom.wrap(e));
      });
  };

  controller.patch = function (req, reply) {
    const username = req.auth.credentias.name;
    const delta    = req.payload;

    stories.update(username, delta)
      .then(function (doc) {
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

    stories.get(username, id)
      .then(function (doc) {
        reply(doc);
      })
      .catch(function (e) {
        if(e.error === 'not_found')
          return reply(Boom.notFound(e));

        debug(e);
        reply(Boom.wrap(e));
      });
  };

  // Can search based on query, reply with array of IDs
  controller.list = function (req, reply) {
    const username = req.auth.credentials ? req.auth.credentials.name : null;
    const query    = req.query;

    debug('listing stories as %s', username || 'anonymous');

    stories.list(username, query.title)
      .then(function (list) {
        reply(list);
      })
      .catch(function (e) {
        debug(e);
        reply(Boom.wrap(e));
      });
  };


  controller.destroy = function (req, reply) {
    const username = req.auth.credentias.name;
    const id       = [req.params.id, req.payload.title].join('!');

    stories.destroy(username, id)
      .then(function (doc) {
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
