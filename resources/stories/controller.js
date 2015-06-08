'use strict';

var Boom        = require('boom');
var async       = require('async');
var uuid        = require('uuid');
//var Joi         = require('joi');
//var storySchema = require('../../lib/schemas').story;

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
    var username = req.auth.credentials.name;
    var id       = req.params.id;
    var title    = req.payload.title;
    var text     = req.payload.text;

    var jobs = [
      function checkExistance (done) {
        stories.get(username, id, false, function (err) {

          if (err) return done(err);

          return done(null);

        });
      },

      function updateStory (done) {
        stories.save(username, id, title, text, function (err) {

          if (err) return done(err);

          return done(null);

        });
      }
    ];

    async.series(jobs, function (err) {
      if (err) {

        if(err.error === 'not_found') return reply( Boom.notFound(err) );

        return reply( Boom.wrap(err) );
      }

      return reply(null, { id: id });
    });

  };

  // Receive JSON payload from our editor
  controller.import = function (req, reply) {
    var payload  = req.payload;
    var username = req.auth.credentials.name;
    var key      = payload.id || uuid.v4();
    var title    = payload.title;
    var text     = payload.text;

    stories.save(username, key, title, text, function (err) {

      if (err) return reply(Boom.wrap(err));

      return reply(null, { id: key })
        .code(201);

    });
  };

  // Multipart file upload
  controller.upload = function (req, reply) {

    var payload = req.payload;

    var username = req.auth.credentials.name;
    var stream   = payload.file;
    var title    = trimExtension(payload.file.hapi.filename);
    var key      = uuid.v4();
    var text     = '';

    var jobs = [
      function parseStream (done) {

        stream.on('data', function (d) {
          text += d.toString();
        })
        .on('error', function (err) {
          reply( Boom.wrap(err) );
        })
        .on('end', function () {
          done();
        });

      },

      function saveData (done) {
        stories.save(username, key, title, text, function (err) {

          if (err) return done(err);

          return done();

        });
      }
    ];

    async.series(jobs, function (err) {

      if (err) return reply( Boom.wrap(err) );

      return reply(null, { id: key })
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
    var id       = req.params.id;

    // TODO Authenticate here
    stories.destroy(id, function (err) {

      if (err) return reply( Boom.wrap(err) );

      reply();

    });

  };

  return controller;
};
