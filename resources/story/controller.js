'use strict';

function trimExtension (filename) {
  var split = filename.split('.');

  split.pop();

  return split.join('.');
}

module.exports = function (cfg) {
  var controller = {};
  var story      = require('./model')(cfg);

  controller.get = function (req, reply) {
    story.get(req.params.title, function (err, text) {

      if (err) return reply(err);

      return reply(text);

    });
  }

  controller.upload = function (req, reply) {
    var file  = req.payload.file;
    var title = trimExtension(file.hapi.filename);

    story.save(req.payload.file, title, function (err) {

      if (err) return reply(err);

      return reply('Successfully saved story');

    });

  }

  return controller;
}
