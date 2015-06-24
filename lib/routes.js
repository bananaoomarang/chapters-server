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

    // List user's stories
    {
      method:  'GET',
      path:    '/users/{name}/stories',
      handler: r.users.getStories
    },

    // Convenience route to list logged in user's stories
    {
      method: 'GET',
      path:   '/users/current/stories',
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
    // Story endpoints
    //

    // Import story from frontend editor
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

    // Upload story from file
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

    // Update existing story from frontend editor
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

    // List stories on system or perform search
    {
      method: 'GET',
      path:   '/stories',
      config: {
        validate: {
          query: {
            title: Joi.string()
          }
        }
      },
      handler: r.stories.list
    },

    // Get specific story
    {
      method:  'GET',
      path:    '/stories/{id}',
      handler: r.stories.get
    },

    // Delete specific story
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
