'use strict';

var Hapi       = require('hapi');
var async      = require('async');
var Bluebird   = require('bluebird');

var usersdb    = require('nano')('http://localhost:5984/_users');

var orientServer = require('./lib/orient');

var chaptersdb = orientServer.use('chapters');

var server = module.exports = new Hapi.Server();

var cfg = {
  server:          server,
  usersdb:         Bluebird.promisifyAll(usersdb),
  chaptersdb:      chaptersdb,
  tokenSecret:     'QIrNlsLVNbaWbUILlGBdrwwLuiPah9IvYOFQcwcoh66sMOQ47v7jl44oxzd+a1shxVc+3MFlr+kjQs5O/zZvFDPDuGY04hFYUyJMgDcWYTb6ZycIV155OXSqdOvF5mN+hSh/02sMpVnZrWmlhEzwKeUyxaH0YNlEFhDnsv92l20=', // XXX Replace with secret for JWT validation
  tokenExpiration: '60m' // Token expiration timeout in minutes
};

var routes  = require('./lib/routes')(cfg);
var plugins = require('./lib/plugins')(cfg);

server.connection({ port: 8888 });

server.register(plugins.definitions, function next (err) {
  if(err)
    throw err;

  async.parallel(plugins.jobsPostLoad);
});

server.route(routes);
