'use strict';

var db    = require('nano')('http://localhost:5984/_users');
var debug = require('debug')('accounts');

module.exports = function (cfg) {
  var model = {};

  return model;

}
