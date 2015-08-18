'use strict';

const debug          = require('debug')('stories');
const uuid           = require('uuid');
const Boom           = require('boom');
const Bluebird       = require('bluebird');
const getPermissions = require('../../lib/permissions').figure;

Object.assign        = require('object-assign');

module.exports = function (cfg) {
  const db       = cfg.storiesdb;

  let model = {};

  model.save = function (username, body) {
    debug('saving story: ', body.title);

    const doc = {
      _id:    uuid.v4(),
      type:   'story',
      title:  body.title || '',
      read:   body.read  || [username],
      write:  body.write || [username],
      author: body.author,
      owner:  body.owner,
      sections: body.sections,
      chapters: body.chapters
    };

    /* eslint-disable camelcase */

    return db
      .getAsync(doc._id, { revs_info: true })
      .spread(function (saved) {
        const updated = Object.assign(saved, doc);

        if(!getPermissions(saved, username).write)
          throw Boom.unauthorized();

        return db.insertAsync(updated);
      })
      .catch(function (e) {
        if(e.error === 'not_found')
          return db.insertAsync(doc);

        throw e;
      });

      /* eslint-enable camelcase */
  };

  model.addSection = function (username, sectionId) {
    debug('adding section %s', sectionId);

    const storyId    = sectionId.split('!')[0];

    /* eslint-disable camelcase */

    return db
      .getAsync(storyId, { revs_info: true })
      .spread(function (saved) {
        const updated = Object.assign(saved, {
          sections: saved.sections.concat(sectionId)
        });

        if(!getPermissions(saved, username).write)
          throw Boom.unauthorized();

        return db.insertAsync(updated);
      });

      /* eslint-enable camelcase */
  };

  model.get = function (username, id) {
    const sections = require('../sections/model')(cfg);

    debug('getting story: ', id);

    return db
      .getAsync(id)
      .spread(function (doc) {
        if(!getPermissions(doc, username).read)
          throw Boom.unauthorized();

        const storySections = doc.sections
          .map(function (sectionId) {
            return sections
              .get(username, sectionId);
          });

        return Bluebird.all(storySections)
          .then(function (results) {
            doc.sections = results;

            return doc;
          });
      });
  };

  model.destroy = function (username, id) {
    debug('removing story: ', id);

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

  model.list = function (username, userToList) {
    /* eslint-disable camelcase */

    if(userToList)
     return db
        .viewAsync('story', 'byUser', { key: userToList })
        .spread(function (body) {
          return body.rows;
        })
        .filter(function (value) {
          return (value.value.type === 'story' && getPermissions(value.value, username).read);
        })
        .map(function (value) {
          return {
            id:     value.id,
            title:  value.value.title,
            author: value.value.author
          };
        });
    else
      return db
        .listAsync({ include_docs: true })
        .spread(function (body) {
          return body.rows;
        })
        .filter(function (value) {
          return (value.doc.type === 'story' && getPermissions(value.doc, username).read);
        })
        .map(function (value) {
          debug(value);
          return {
            id:     value.id,
            title:  value.doc.title,
            author: value.doc.author
          };
        });

      /* eslint-enable camelcase */
  }

  return model;
};
