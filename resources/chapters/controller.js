'use strict';

const debug         = require('debug')('chapters');
const Boom          = require('boom');
const uuid          = require('uuid');
const Bluebird      = require('bluebird');
const Joi           = require('joi');
const chapterSchema = require('../../lib/schemas').chapter;

Bluebird.promisifyAll(Joi);

function trimExtension (filename) {
  var split = filename.split('.');

  split.pop();

  return split.join('.');
}

function parseMdStream (stream, doc) {
  return new Bluebird(function (resolve, reject) {
    stream.on('data', function (d) {
      doc.markdown += d.toString();
    })
    .on('error', function (err) {
      reject(err);
    })
    .on('end', function () {
      resolve();
    });
  });
}


module.exports = function (cfg) {
  let controller = {};
  let chapters   = require('./model')(cfg);

  // Receive JSON payload from our editor
  controller.post = function (req, reply) {
    const username = req.auth.credentials.name;

    const doc = {
      id:       [req.params.id, encodeURIComponent(req.params.section), encodeURIComponent(req.payload.title)].join('!'),
      read:     req.payload.read  || [username],
      write:    req.payload.write || [username],
      title:    req.payload.title,
      author:   req.payload.author || username,
      markdown: req.payload.markdown
    };

    chapters.save(username, doc)
      .then(function () {
        reply({ id: doc.id })
          .code(201);
      })
      .catch(function (e) {
        if(e.error === 'not_found')
          return reply(Boom.notFound(e));

        debug(e);
        reply(Boom.wrap(e));
      });
  };

  // Multipart file upload
  controller.put = function (req, reply) {
    const username = req.auth.credentials.name;

    let doc = {
      id:       uuid.v4(),
      read:     req.payload.read  || [username],
      write:    req.payload.write || [username],
      title:    trimExtension(req.payload.file.hapi.filename),
      author:   username,
      markdown: ''
    };

    return parseMdStream(req.payload.file, doc)
      .then(chapters.save.bind(null, username, doc))
      .then(function () {
        reply(null, { id: doc.id })
          .code(201);
      })
      .catch(function (e) {
        debug(e);
        reply(Boom.wrap(e));
      });
  };

  controller.patch  = function (req, reply) {
    const username = req.auth.credentials.name;

    const doc = {
      id:       req.params.chapter,
      title:    req.payload.title,
      author:   username,
      markdown: req.payload.markdown
    };

    Joi.validateAsync(doc, chapterSchema)
      .then(chapters.get.bind(null, username, doc.id))
      .then(chapters.save.bind(null, username, doc))
      .then(function () {
        reply(null, { id: doc.id });
      })
      .catch(function (e) {
        if(e.error === 'not_found')
          return reply(Boom.notFound(e));

        debug(e);
        return reply(Boom.wrap(e));
      });
  };

  controller.get = function (req, reply) {
    const id       = [req.params.id, encodeURIComponent(req.params.section), encodeURIComponent(req.params.chapter)].join('!');
    const username = req.auth.credentials ? req.auth.credentials.name : null;

    // Parse markdown by default
    // XXX This is some bullshit code right here bro
    let parse = true;

    switch (req.query.parse) {
      case 'html':
        parse = true;
        break;
      case 'false':
        parse = false;
        break;
      default:
        break;
    }

    chapters
      .get(username, id, parse)
      .then(function (doc) {
        doc.id = doc._id.split('!')[2];
        delete doc._id;

        reply(doc);
      })
      .catch(function (e) {
        if(e.error === 'not_found')
          return reply(Boom.notFound(e));

        debug(e);
        return reply(Boom.wrap(e));
      });
  };

  controller.destroy = function (req, reply) {
    const username = req.auth.credentials.name;
    const id       = [req.params.id, encodeURIComponent(req.params.section), encodeURIComponent(req.params.chapter)].join('!');

    chapters.destroy(username, id)
      .then(function () {
        reply();
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
