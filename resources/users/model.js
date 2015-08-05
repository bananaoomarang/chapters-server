'use strict';

const debug = require('debug')('users');
const Boom  = require('boom');

Object.assign = require('object-assign');

module.exports = function (cfg) {
  const authenticate = require('../../lib/authentication')(cfg);

  const db           = cfg.usersdb;
  const chaptersdb   = cfg.chaptersdb;

  let model = {};

  model.add = function (user) {
    debug('creating %s', user.username);

    const doc = {
      _id:      'org.couchdb.user:' + user.username,
      name:     user.username,
      type:     'user',
      roles:    [],
      scope:    [],
      password: user.password
    };

    return db.insertAsync(doc);
  };

  model.update = function (username, toUpdate, delta) {
    debug('updating: %s', toUpdate);

    /* eslint-disable camelcase */
    return db
      .getAsync('org.couchdb.user:' + toUpdate, { revs_info: true })
      .spread(function (saved) {
        if(username !== saved.name)
          throw Boom.unauthorized();

        const updated = Object.assign(saved, delta);

        return db.insertAsync(updated);
      })
      .catch(function (err) {
        if(err.error === 'not_found')
          throw Boom.notFound();

        throw err;
      });
      /* eslint-enable camelcase */
  };

  model.destroy = function (username) {
    const id = 'org.couchdb.user:' + username;

    debug('removing: %s', username);

    /* eslint-disable camelcase */
    return db
      .getAsync(id, { revs_info: true })
      .spread(function (doc) {
        if(username !== doc.name)
          throw Boom.unauthorized();

        return db
          .destroyAsync(id, doc._rev);
      });
    /* eslint-enable camelcase */
  };

  model.get = function (username) {
    const id = 'org.couchdb.user:' + username;

    debug('getting: %s', username);

    return db.getAsync(id);
  };

  model.getStories = function (username, userToList) {
    debug('getting chapters for %s', userToList);

    return chaptersdb
      .viewAsync('chapter', 'byUser', { key: userToList })
      .spread(function (body) {
        return body.rows;
      })
      .map(function (doc) {
        return {
          id:    doc.id,
          title: doc.value.title
        };
      });
  };

  model.list = function () {
    return db
      .listAsync()
      .spread(function (body) {
        return body.rows;
      })
      .filter(function (val) {
        return val.id.match(/^org\.couchdb\.user:+/);
      })
      .map(function (val) {
        return {
          id: val.id.split(':')[1]
        };
      });
  };

  model.getToken = function (user) {
    return authenticate(user);
  };

  return model;
};
