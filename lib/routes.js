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
    // Story endpoints
    //

    // New story
    {
      method: 'POST',
      path:   '/stories',
      config: {
          auth:    'token',
          payload: {
            parse: true
          }
      },
      handler: r.stories.post
    },

    // Update existing story
    {
      method: 'PATCH',
      path:   '/stories/{id}',
      config: {
        auth:    'token',
        payload: {
          parse: true
        }
      },
      handler: r.stories.patch
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
      config: {
        auth: {
          strategy: 'token',
          mode:     'optional'
        }
      },
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
    },

    //
    // Section endpoints
    //

    // Create section
    {
      method: 'POST',
      path:   '/stories/{id}',
      config: {
          auth:    'token',
          payload: {
            parse: true
          }
      },
      handler: r.sections.post
    },

    // Update existing section
    {
      method: 'PATCH',
      path:   '/stories/{id}/{section}',
      config: {
        auth:    'token',
        payload: {
          parse: true
        }
      },
      handler: r.sections.patch
    },

    // Get specific section
    {
      method:  'GET',
      path:    '/stories/{id}/{section}',
      config: {
        auth: {
          strategy: 'token',
          mode:     'optional'
        }
      },
      handler: r.sections.get
    },

    // Delete specific section
    {
      method: 'DELETE',
      path:   '/stories/{id}/{section}',
      config: {
        auth: 'token'
      },
      handler: r.sections.destroy
    },

    //
    // Chapter endpoints
    //

    // Import chapter from frontend editor
    {
      method: 'POST',
      path:   '/stories/{id}/{section}',
      config: {
          auth:    'token',
          payload: {
            parse: true
          }
      },
      handler: r.chapters.post
    },

    // Upload chapter from file
    {
      method: 'PUT',
      path:   '/stories/{id}/{section}',
      config: {
          auth:    'token',
          payload: {
            output: 'stream',
            parse:  true
          }
      },
      handler: r.chapters.put
    },

    // Update existing chapter from frontend editor
    {
      method: 'PATCH',
      path:   '/stories/{id}/{section}/{chapter}',
      config: {
        auth:    'token',
        payload: {
          parse: true
        }
      },
      handler: r.chapters.patch
    },

    // Get specific chapter
    {
      method:  'GET',
      path:    '/stories/{id}/{section}/{chapter}',
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
      path:   '/stories/{id}/{section}/{chapter}',
      config: {
        auth: 'token'
      },
      handler: r.chapters.destroy
    }

  ];

  return routes;
};
