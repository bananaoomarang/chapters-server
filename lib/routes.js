'use strict';

var Joi = require('joi');

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
      method: 'PUT',
      path:   '/users/{name}',
      config: {
        auth: 'token'
      },
      handler: r.users.update
    },
    {
      method: 'GET',
      path:   '/users',
      config: {
        auth: {
          strategy: 'token',
          scope:    ['god']
        }
      },
      handler: r.users.list
    },
    {
      method: 'GET',
      path:   '/users/{name}',
      config: {
        auth: 'token'
      },
      handler: r.users.get
    },
    {
      method: 'GET',
      path:   '/users/{name}/stories',
      config: {
        auth: 'token'
      },
      handler: r.users.getStories
    },
    {
      method: 'GET',
      path:   '/users/validate',
      config: {
        auth: 'token'
      },
      handler: r.users.validate
    },
    {
      method: 'DELETE',
      path:   '/users/{name}',
      config: {
        auth: 'token'
      },
      handler: r.users.destroy
    },

    //
    // Story endpoints
    //

    {
      method: 'POST',
      path:   '/stories/import',
      config: {
          auth:    'token',
          payload: {
            parse: true
          }
      },

      handler: r.stories.import
    },
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
      method: 'POST',
      path:   '/stories/{id}',
      config: {
        auth:    'token',
        payload: {
          parse: true
        }
      },

      handler: r.stories.edit
    },
    {
      method: 'GET',
      path:   '/stories/{id}',
      config: {
        auth: 'token'
      },

      handler: r.stories.get
    },
    {
      method: 'GET',
      path:   '/stories',
      config: {
        auth:     'token',
        validate: {
          query: {
            title:  Joi.string(),
            author: Joi.string()
          }
        }
      },

      handler: r.stories.list
    },
    {
      method: 'DELETE',
      path:   '/stories/{id}',
      config: {
        auth: 'token'
      },

      handler: r.stories.destroy
    }

  ];

  return routes;
};
