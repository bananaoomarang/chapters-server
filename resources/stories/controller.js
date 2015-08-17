'use strict';

const debug    = require('debug')('stories');
const Boom     = require('boom');
const Bluebird = require('bluebird');
const Joi      = require('joi');
const schema   = require('../../lib/schemas').story;

Bluebird.promisifyAll(Joi);

module.exports = function (cfg) {
  const stories  = require('./model')(cfg);

  let controller = {};

  controller.post = function (req, reply) {
    const username = req.auth.credentials ? req.auth.credentials.name : null;
    const body     = req.payload;

    const doc = {
      read:     body.read     || [username],
      write:    body.write    || [username],
      title:    body.title,
      author:   body.author   || username,
      owner:    username,
      sections: body.sections,
      chapters: body.chapters
    };

    debug(doc);

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
    const username = req.auth.credentials ? req.auth.credentials.name : null;
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
    const username = req.auth.credentials ? req.auth.credentials.name : null;
    const id       = req.params.id;

    debug('getting story %s as %s', id, username);

    stories.get(username, id)
      .then(function (doc) {
        doc.sections
          .forEach(function (section) {
            section.id = section._id.split('!')[1];
            delete section._id;
          });

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
