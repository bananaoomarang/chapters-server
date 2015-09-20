'use strict';

const debug = require('debug')('users');
const Boom  = require('boom');

Object.assign = require('object-assign');

module.exports = function (cfg) {
  const authenticate = require('../../lib/authentication')(cfg);

  const db         = cfg.usersdb;
  const chaptersdb = cfg.chaptersdb

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

    // Insert new identity into graph
    return chaptersdb
      .class
      .get('Identity')
      .call('create', { couchId: doc._id })

   // Save user to couch
      .return(db.insertAsync(doc));
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
    const chapters = require('../chapters/model')(cfg);

    debug('%s getting chapters for %s', username, userToList);

    // XXX This should be O(1), interface with db directly
    return chapters
      .list(username, userToList)
      .map(function (doc) {
        debug(doc);
        return {
          id:    doc.id,
          title: doc.title
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
