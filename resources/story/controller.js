'use strict';

var Boom  = require('boom');
var async = require('async');

function trimExtension (filename) {
  var split = filename.split('.');

  split.pop();

  return split.join('.');
}

module.exports = function (cfg) {
  var controller = {};
  var story      = require('./model')(cfg);

  controller.get = function (req, reply) {

    var username = req.auth.credentials.name;

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

    story.get(username, req.params.title, parse, function (err, text) {

      if (err) return reply( Boom.wrap(err) );

      return reply(text);

    });

  };

  controller.upload = function (req, reply) {

    var payload = req.payload;

    var username = req.auth.credentials.name;
    var stream   = null;
    var handler  = null;
    var title    = null;
    var text     = '';

    if(payload.file) {

      // Then it's a multipart file upload

      stream = payload.file;

      handler = function handleFile () {
        title = trimExtension(payload.file.hapi.filename);
      };

    } else {

      // Then it's just JSON, but still a stream...

      stream = payload;

      handler = function handleJSON () {
        var obj = JSON.parse(text);

        title = obj.title;

        text  = obj.text;
      };

    }

    var jobs = [
      function parseStream (done) {

        stream.on('data', function (d) {
          text += d.toString();
        })
        .on('error', function (err) {
          reply( Boom.wrap(err) );
        })
        .on('end', function () {
          handler();

          done();
        });

      },

      function saveData (done) {
        story.save(username, text, title, function (err) {

          if (err) return done(err);

          return done();

        });
      }
    ];

    async.series(jobs, function (err) {

      if (err) return reply( Boom.wrap(err) );

      return reply('Successfully saved story')
        .code(201);

    });

  };

  // Return an array of stories by current user
  controller.list = function (req, reply) {
    // var credentials = req.auth.credentials;

    var list = [
      {
        title: 'Love and Justice in Montana'
      },
      {
        title: 'Visions of Tel Aviv'
      },
      {
        title: 'Polterguests of beverly Hills'
      },
      {
        title: 'The Mystery of the Never Letting On'
      }
    ];

    reply(null, list);
  };

  controller.destroy = function (req, reply) {
    var username = req.auth.credentials.name;
    var title    = req.params.title;

    story.destroy(username, title, function (err) {

      if (err) return reply( Boom.wrap(err) );

      reply();

    });

  };

  return controller;
};
