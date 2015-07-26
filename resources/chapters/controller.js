'use strict';

var Boom        = require('boom');
var async       = require('async');
var uuid        = require('uuid');
var Joi         = require('joi');
var chapterSchema = require('../../lib/schemas').chapter;

function trimExtension (filename) {
  var split = filename.split('.');

  split.pop();

  return split.join('.');
}

module.exports = function (cfg) {
  var controller = {};
  var chapters      = require('./model')(cfg);

  controller.get = function (req, reply) {
    const id     = req.params.id;

    let username = null;

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

    chapters.get(username, id, parse, function (err, doc) {

      if (err) return reply( Boom.wrap(err) );

      //
      // Permisions
      //
      if(doc.read[0] === 'all')
        doc.read = true;
      else
        doc.read =
          doc.read
            .some(function (uusername) {
              return uusername === username;
            });

      if(doc.write[0] === 'all')
        doc.write = true;
      else
        doc.write =
          doc.write
            .some(function (uusername) {
              return uusername === username;
            });

      return reply(null, doc);

    });

  };

  controller.edit = function (req, reply) {
    const username = req.auth.credentials.name;

    const doc = {
      id:       req.params.id,
      read:     req.payload.read  || [username],
      write:    req.payload.write || [username],
      title:    req.payload.title,
      author:   username,
      markdown: req.payload.markdown
    };

    const jobs = [
      function validate(done) {
        Joi.validate(doc, chapterSchema, function (err) {
          if (err) return done(err);

          done();
        });
      },
      function checkExistance (done) {
        chapters.get(username, doc.id, false, function (err) {
          if (err) return done(err);

          done(null);
        });
      },

      function updateChapter (done) {
        chapters.save(username, doc, function (err) {
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
      read:     req.payload.read  || [username],
      write:    req.payload.write || [username],
      title:    req.payload.title,
      author:   req.auth.credentials.name,
      markdown: req.payload.markdown
    };

    chapters.save(username, doc, function (err) {

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
      read:     req.payload.read  || [username],
      write:    req.payload.write || [username],
      title:    trimExtension(req.payload.file.hapi.filename),
      author:   username,
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
        chapters.save(username, doc, function (err) {

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

    chapters.list(username, query.title, function (err, list) {

      if (err) return reply( Boom.wrap(err) );

      reply(null, list);

    });

  };

  controller.destroy = function (req, reply) {
    const username = req.auth.credentials.name;
    const id       = req.params.id;

    chapters.destroy(username, id, function (err) {
      if (err) return reply( Boom.wrap(err) );

      reply();

    });

  };

  return controller;
};
