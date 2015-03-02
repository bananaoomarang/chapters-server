'use strict';

var Hapi           = require('hapi');
var Good           = require('good');
var goodConsole    = require('good-console');
var jwt            = require('jsonwebtoken');
var hapiJwt        = require('hapi-auth-jwt');
var crypto         = require('crypto');
var async          = require('async');
var routes         = require('./lib/routes')({});

var server = module.exports = new Hapi.Server();

server.connection({ port: 8888 });

server.register({
  register: Good,
  options: {
    reporters: [{
      reporter: goodConsole,
      args: [{ log: '*', response: '*' }]
    }]
  }
}, function (err) {
  if (err) {
    throw err;
  }
});

// XXX
var privateKey = 'BbZJjyoXAdr8BUZuiKKARWimKfrSmQ6fv8kZ7OFfc'

function validate (decodedToken, cb) {

  accountManager.get(decodedToken.user, function getUserCb (err, user_doc) {
    if(err) return cb(err, false, user_doc);

    return cb(null, true, user_doc);
  });

}

server.register({

  register: hapiJwt

}, function (err) {

  if (err) throw err;

  server.auth.strategy('token', 'jwt', {
    key: privateKey,
    validateFunc: validate
  });

});

server.route(routes);
