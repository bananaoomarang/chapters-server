'use strict';

module.exports = function (cfg) {
  var controller = {};
  var story      = require('./model')(cfg);

  controller.get = function (req, reply) {
    reply('TODO');
  }

  controller.upload = function (req, reply) {
    reply('TODO');
  }

  return controller;
}
