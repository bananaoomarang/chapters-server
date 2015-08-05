'use strict';

const debug          = require('debug')('chapters');
const Bluebird       = require('bluebird');
const marked         = Bluebird.promisify(require('marked'));
const assign         = require('object-assign');
const Boom           = require('boom');
const getPermissions = require('../../lib/permissions').figure;

module.exports = function (cfg) {
  const db = cfg.chaptersdb;

  let model = {};

  model.save = function (username, body) {
    debug('saving chapter: %s', body.title);

    const doc = {
      _id:      body.id,
      title:    body.title || '',
      read:     body.read  || [username],
      write:    body.write || [username],
      author:   body.author,
      markdown: body.markdown
    };

    /* eslint-disable camelcase */

    return db
      .getAsync(doc._id, { revs_info: true })
      .spread(function (saved) {
        const updated = assign(saved, doc);

        if(!getPermissions(saved, username).write) throw Boom.unauthorized();

        return db.insertAsync(updated);
      })
      .catch(function (err) {
        if(err.error === 'not_found')
          return db.insertAsync(doc);

        throw err;
      });

      /* eslint-enable camelcase */
  };

  model.get = function (username, id, parse) {
    debug('getting chapter: %s', id);

    return db
      .getAsync(id)
      .spread(function (doc) {
        if(!getPermissions(doc, username).read) throw new Error('Unauthorized');

        if(parse)
          return marked(doc.markdown)
            .then(function (html) {
              doc.html = html;

              return doc;
            });

        return doc;
      });
  };

  model.destroy = function (username, id) {
    debug('removing chapter: %s', id);

    /* eslint-disable camelcase */

    return db
      .getAsync(id, { revs_info: true })
      .spread(function (doc) {
        if(!getPermissions(doc, username).write)
          throw new Error('Unauthorized');

        return db
          .destroyAsync(id, doc._rev);
      });

      /* eslint-enable camelcase */
  };

  model.list = function (username, title) {

    if(title)
      return db
        .viewAsync('chapter', 'byTitle', { key: title })
        .filter(function (value) {
          return getPermissions(value.value, username).read;
        })
        .map(function (value) {
          return {
            id:     value.id,
            title:  value.value.title,
            author: value.value.author
          };
        });
    else
      // Just list them all
      /* eslint-disable camelcase */
      return db
        .listAsync({ include_docs: true })
        .filter(function (value) {
          return (value.id.match(/^_design+/) && getPermissions(value.value, username).read);
        })
        .map(function (value) {
          return {
            id:     value.id,
            title:  value.value.title,
            author: value.value.author
          };
        });

      /* eslint-enable camelcase */
  };

  return model;

};
