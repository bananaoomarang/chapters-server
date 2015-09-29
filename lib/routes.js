'use strict';

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
      handler: r.users.post
    },

    // Start session and retrieve user token
    {
      method:  'POST',
      path:    '/users/login',
      handler: r.users.login
    },

    // Update user information
    {
      method: 'PATCH',
      path:   '/users/{name}',
      config: {
        auth: 'token'
      },
      handler: r.users.patch
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
      handler: r.users.getChapters
    },

    // List user's stories
    {
      method: 'GET',
      path:   '/users/{user}/stories',
      config: {
        auth: {
          strategy: 'token',
          mode:     'optional'
        }
      },
      handler: r.users.getUserStories
    },

    // List user's personas
    {
      method: 'GET',
      path:   '/users/{user}/personas',
      config: {
        auth: {
          strategy: 'token',
          mode:     'optional'
        }
      },
      handler: r.users.getUserPersonas
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
          auth: 'token',
          payload: {
            parse: true
          }
      },
      handler: r.chapters.post
    },

    // Upload chapter from file
    {
      method: 'PUT',
      path:   '/chapters',
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
      path:   '/chapters/{id}',
      config: {
        auth:    'token',
        payload: {
          parse: true
        }
      },
      handler: r.chapters.patch
    },

    // Search chapters or list them all
    {
      method:  'GET',
      path:    '/chapters',
      config: {
        auth: {
          strategy: 'token',
          mode:     'optional'
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
    },

    // Link chapter to another
    {
      method: 'POST',
      path:   '/chapters/{id}/leads/{id2}',
      config: {
        auth: 'token'
      },
      handler: r.chapters.createLead
    },

    // Delete link
    {
      method: 'DELETE',
      path:   '/chapters/{id}/leads/{id2}',
      config: {
        auth: 'token'
      },
      handler: r.chapters.destroyLead
    },

    // Convenience for POST /chapters && POST /chapters/{id}/leads/{id2}
    {
      method: 'POST',
      path:   '/chapters/{id}',
      config: {
          auth: 'token',
          payload: {
            parse: true
          }
      },
      handler: r.chapters.post
    },

    // See above
    {
      method: 'PUT',
      path:   '/chapters/{id}',
      config: {
          auth:    'token',
          payload: {
            output: 'stream',
            parse:  true
          }
      },
      handler: r.chapters.put
    },

    {
      method: 'GET',
      path:   '/stories',
      config: {
        auth: {
          strategy: 'token',
          mode:     'optional'
        }
      },
      handler: r.chapters.listStories
    }
  ];

  return routes;
};
