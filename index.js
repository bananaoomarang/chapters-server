'use strict';

var Hapi      = require('hapi');
var async     = require('async');
var usersdb   = require('nano')('http://localhost:5984/_users');
var storiesdb = require('nano')('http://localhost:5984/stories');

var server = module.exports = new Hapi.Server();

var cfg = {
  server:           server,
  usersdb:          usersdb,
  storiesdb:        storiesdb,
  tokenSecret:      'PLEASEREPLACEME', // XXX Replace with secret for JWT validation
  tokenExpiration:  20 // Token expiration timeout in minutes
};

var routes  = require('./lib/routes')(cfg);
var plugins = require('./lib/plugins')(cfg);

server.connection({ port: 8888 });

server.register(plugins.definitions, function next (err) {

  if (err) throw err;

  async.parallel(plugins.jobsPostLoad);

});

server.route(routes);
