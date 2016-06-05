'use strict';


module.exports = function (cfg) {
  var server      = cfg.server;
  var privateKey  = cfg.tokenSecret;

  var jwtValidate = require('./jwt-validate')(cfg);

  var plugins = [

    //
    // Good monitoring
    //

    {
      register: require('good'),
      options:  {
        reporters: {
          console: [{
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{log: '*', response: '*'}]
          }, {
            module: 'good-console'
          }, 'stdout']
        }
      }
    },

    //
    // Json Web Token authentication
    //

    {
      register: require('hapi-auth-jwt')
    }

  ];

  var jobsPostLoad = [
    function setAuthentication (done) {

      server.auth.strategy('token', 'jwt', {
        key:          privateKey,
        validateFunc: jwtValidate,
        mode:         'optional'
      });

      done(null);
    }
  ];

  return {
    definitions:  plugins,
    jobsPostLoad: jobsPostLoad
  };
};
