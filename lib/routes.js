'use strict';

module.exports = function (cfg) {
  var r = require('../resources')(cfg);

  var routes = [

    //
    // Serve public directory
    //

    {
      method:  'GET',
      path:    '/{param*}',
      handler: {
        directory: {
          path: cfg.directoryToServe
        }
      }
    },

    //
    // User endpoints
    //

    {
      method:  'POST',
      path:    '/users/create',
      handler: r.users.create
    },
    {
      method:  'POST',
      path:    '/users/login',
      handler: r.users.login
    },
    {
      method:  'PUT',
      path:    '/users/{name}',
      config:  {
        auth: 'token'
      },
      handler: r.users.update
    },
    {
      method:  'GET',
      path:    '/users',
      config:  {
        auth: {
          strategy: 'token',
          scope:    ['god']
        }
      },
      handler: r.users.list
    },
    {
      method:  'GET',
      path:    '/users/{name}',
      config:  {
        auth: 'token'
      },
      handler: r.users.get
    },
    {
      method:  'GET',
      path:    '/users/validate',
      config:  {
        auth: 'token'
      },
      handler: r.users.validate
    },
    {
      method:  'DELETE',
      path:    '/users/{name}',
      config:  {
        auth: 'token'
      },
      handler: r.users.destroy
    },

    //
    // Story endpoints
    //

    {
      method: 'POST',
      path:   '/stories/upload',
      config: {
          auth:    'token',
          payload: {
            output: 'stream',
            parse:  true
          }
      },

      handler: r.stories.upload
    },
    {
      method: 'GET',
      path:   '/stories/{title}',
      config: {
        auth: 'token'
      },

      handler: r.stories.get
    },
    {
      method: 'GET',
      path:   '/stories',
      config: {
        auth: 'token'
      },

      handler: r.stories.list
    },
    {
      method: 'DELETE',
      path:   '/stories/{title}',
      config: {
        auth: 'token'
      },

      handler: r.stories.destroy
    }

  ];

  return routes;
};
