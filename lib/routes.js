'use strict';

var Joi = require('joi');

module.exports = function (cfg) {
  var r = require('../resources')(cfg);

  var routes = [

    //
    // User endpoints
    //

    // Register new user
    {
      method:  'POST',
      path:    '/users/create',
      handler: r.users.create
    },

    // Start session and retrieve user token
    {
      method:  'POST',
      path:    '/users/login',
      handler: r.users.login
    },

    // Update user information
    {
      method: 'PUT',
      path:   '/users/{name}',
      config: {
        auth: 'token'
      },
      handler: r.users.update
    },

    // List current usernames
    {
      method:  'GET',
      path:    '/users',
      handler: r.users.list
    },

    // Get information for a user based on credentials
    {
      method: 'GET',
      path:   '/users/{name}',
      config: {
        auth: 'token'
      },
      handler: r.users.get
    },

    // List user's chapters
    {
      method:  'GET',
      path:    '/users/{name}/chapters',
      handler: r.users.getStories
    },

    // Convenience route to list logged in user's chapters
    {
      method: 'GET',
      path:   '/users/current/chapters',
      config: {
        auth: 'token'
      },
      handler: r.users.getCurrentUserStories
    },

    // Convenience route to quickly verify user token
    {
      method: 'GET',
      path:   '/users/validate',
      config: {
        auth: 'token'
      },
      handler: r.users.validate
    },

    // Delete user
    {
      method: 'DELETE',
      path:   '/users/{name}',
      config: {
        auth: 'token'
      },
      handler: r.users.destroy
    },

    //
    // Chapter endpoints
    //

    // Import chapter from frontend editor
    {
      method: 'POST',
      path:   '/chapters',
      config: {
          auth:    'token',
          payload: {
            parse: true
          }
      },
      handler: r.chapters.import
    },

    // Upload chapter from file
    {
      method: 'POST',
      path:   '/chapters/upload',
      config: {
          auth:    'token',
          payload: {
            output: 'stream',
            parse:  true
          }
      },
      handler: r.chapters.upload
    },

    // Update existing chapter from frontend editor
    {
      method: 'PATCH',
      path:   '/chapters/{id}',
      config: {
        auth:    'token',
        payload: {
          parse: true
        }
      },
      handler: r.chapters.edit
    },

    // List chapters on system or perform search
    {
      method: 'GET',
      path:   '/chapters',
      config: {
        validate: {
          query: {
            title: Joi.string()
          }
        }
      },
      handler: r.chapters.list
    },

    // Get specific chapter
    {
      method:  'GET',
      path:    '/chapters/{id}',
      config: {
        auth: {
          strategy: 'token',
          mode:     'optional'
        }
      },
      handler: r.chapters.get
    },

    // Delete specific chapter
    {
      method: 'DELETE',
      path:   '/chapters/{id}',
      config: {
        auth: 'token'
      },
      handler: r.chapters.destroy
    }

  ];

  return routes;
};
