'use strict';

module.exports = function (cfg) {
  var r = require('../resources')(cfg);

  var routes = [

    //
    // Serve public directory
    //

    {
      method: 'GET',
      path: '/{param*}',
      handler: {
        directory: {
          path: 'public'
        }
      }
    },

    //
    // User endpoints
    //

    {
      method: 'POST',
      path: '/user/create',
      handler: r.user.create
    },
    {
      method: 'POST',
      path: '/user/login',
      handler: r.user.login
    },
    {
      method: 'GET',
      path: '/user',
      handler: r.user.list
    },
    {
      method: 'GET',
      path: '/user/{name}',
      handler: r.user.get
    },
    {
      method: 'DELETE',
      path: '/user/{name}',
      handler: r.user.remove
    },

    //
    // Story endpoints
    //

    {
      method: 'POST',
      path: '/story/upload',
      config: {
        auth: 'token',
        payload: {
          output: 'stream',
          parse : true
        }
      },
      handler: r.story.upload
    },
    {
      method: 'GET',
      path: '/story/{title}',
      config: {
        //auth: 'token'
      },
      handler: r.story.get
    }

  ];

  return routes;
};
