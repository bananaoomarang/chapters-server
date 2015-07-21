'use strict';

var Boom        = require('boom');
var async       = require('async');
var uuid        = require('uuid');
var Joi         = require('joi');
var storySchema = require('../../lib/schemas').story;

function trimExtension (filename) {
  var split = filename.split('.');

  split.pop();

  return split.join('.');
}

module.exports = function (cfg) {
  var controller = {};
  var stories      = require('./model')(cfg);

  controller.get = function (req, reply) {

    var username = null;
    var id       = req.params.id;

    if(req.auth.credentials) username = req.auth.credentials.name;

    // Parse markdown by default
    var parse = true;

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

    stories.get(username, id, parse, function (err, doc) {

      if (err) return reply( Boom.wrap(err) );

      return reply(null, doc);

    });

  };

  controller.edit = function (req, reply) {
    const username = req.auth.credentials.name;

    const doc = {
      id:       req.params.id,
      title:    req.payload.title,
      author:   username,
      markdown: req.payload.markdown
    };

    const jobs = [
      function validate(done) {
        Joi.validate(doc, storySchema, function (err) {
          console.log(err);
          if (err) return done(err);

          done();
        });
      },
      function checkExistance (done) {
        stories.get(username, doc.id, false, function (err) {
          if (err) return done(err);

          done(null);
        });
      },

      function updateStory (done) {
        stories.save(username, doc, function (err) {
          if (err) return done(err);

          done(null);
        });
      }
    ];

    async.series(jobs, function (err) {
      if (err) {

        if(err.error === 'not_found') return reply( Boom.notFound(err) );

        return reply( Boom.wrap(err) );
      }

      reply(null, { id: doc.id });
    });

  };

  // Receive JSON payload from our editor
  controller.import = function (req, reply) {
    const username = req.auth.credentials.name;

    const doc = {
      id:       req.payload.id || uuid.v4(),
      title:    req.payload.title,
      author:   req.auth.credentials.name,
      markdown: req.payload.markdown
    };

    stories.save(username, doc, function (err) {

      if (err) return reply(Boom.wrap(err));

      return reply(null, { id: doc.id })
        .code(201);

    });
  };

  // Multipart file upload
  controller.upload = function (req, reply) {
    const username = req.auth.credentials.name;

    let doc = {
      id:       uuid.v4(),
      title:    trimExtension(req.payload.file.hapi.filename),
      markdown: ''
    };

    let stream = req.payload.file;

    var jobs = [
      function parseStream (done) {

        stream.on('data', function (d) {
          doc.markdown += d.toString();
        })
        .on('error', function (err) {
          reply( Boom.wrap(err) );
        })
        .on('end', function () {
          done();
        });

      },

      function saveData (done) {
        stories.save(username, doc, function (err) {

          if (err) return done(err);

          return done();

        });
      }
    ];

    async.series(jobs, function (err) {

      if (err) return reply( Boom.wrap(err) );

      return reply(null, { id: doc.id })
        .code(201);

    });

  };

  // Can search based on query, reply with array of IDs
  controller.list = function (req, reply) {
    var username = null;
    var query = req.query;

    if(req.auth.credentials) username = req.auth.credentials.name;

    stories.list(username, query.title, function (err, list) {

      if (err) return reply( Boom.wrap(err) );

      reply(null, list);

    });

  };

  controller.destroy = function (req, reply) {
    const username = req.auth.credentials.name;
    const id       = req.params.id;

    stories.destroy(username, id, function (err) {
      if (err) return reply( Boom.wrap(err) );

      reply();

    });

  };

  return controller;
};
