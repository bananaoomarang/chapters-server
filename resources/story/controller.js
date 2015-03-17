'use strict';

var Boom           = require('boom');

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

    var text;
    var title;

    if(req.payload.file) {

      text  = payload.file;
      title = trimExtension(payload.filename);

    } else {

      text  = payload.text;
      title = payload.title;

    }

    story.save(text, title, function (err) {

      if (err) return reply( Boom.wrap(err) );

      return reply('Successfully saved story')
        .code(201);

    });


  };

  return controller;
};
