'use strict';

const debug          = require('debug')('sections');
const assign         = require('object-assign');
const Boom           = require('boom');
const getPermissions = require('../../lib/permissions').figure;

module.exports = function (cfg) {
  const db = cfg.storiesdb;

  let model = {};

  model.save = function (username, body) {
    debug('saving section: ', body.title);

    const doc = {
      _id:   body.id,
      type:  'section',
      title: body.title || '',
      read:  body.read  || [username],
      write: body.write || [username]
    };

    /* eslint-disable camelcase */

    return db
      .getAsync(doc._id, { revs_info: true })
      .then(function (saved) {
        const updated = assign(saved, doc);

        if(!getPermissions(saved, username).write)
          throw Boom.unauthorized();

        return db.insertAsync(updated);
      })
      .catch(function (err) {
        if(err.error === 'not_found')
          return db.insertAsync(doc);
      });

      /* eslint-enable camelcase */
  };

  model.get = function (username, id) {
    debug('getting setion: ', id);

    return db
      .getAsync(id)
      .then(function (doc) {
        if(!getPermissions(doc, username).read)
          throw Boom.unauthorized();

        return doc;
      });
  };

  model.destroy = function (username, id) {
    debug('removing section: ', id);

    /* eslint-disable camelcase */

    return db
      .getAsync(id, { revs_info: true })
      .then(function (doc) {
        if(!getPermissions(doc, username).write)
          throw Boom.unauthorized();

        return db
          .destroyAsync(id, doc._rev);
      });

      /* eslint-enable camelcase */
  };

  return model;
};