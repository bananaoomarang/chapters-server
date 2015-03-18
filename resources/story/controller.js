'use strict';

var Boom = require('boom');

function trimExtension (filename) {
  var split = filename.split('.');

  split.pop();

  return split.join('.');
}

module.exports = function (cfg) {
  var controller = {};
  var story      = require('./model')(cfg);

  controller.get = function (req, reply) {

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

    story.get(req.params.title, parse, function (err, text) {

      if (err) return reply( Boom.wrap(err) );

      return reply(text);

    });

  };

  controller.upload = function (req, reply) {
    var payload = req.payload;

    var username = req.auth.credentials.name;
    var text;
    var title;

    if(req.payload.file) {

      text  = payload.file;
      title = trimExtension(payload.filename);

    } else {

      text  = payload.text;
      title = payload.title;

    }

    story.save(username, text, title, function (err) {

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

  return controller;
};
