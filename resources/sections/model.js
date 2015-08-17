'use strict';

const debug          = require('debug')('sections');
const Boom           = require('boom');
const Bluebird       = require('bluebird');
const getPermissions = require('../../lib/permissions').figure;

Object.assign   = require('object-assign');

module.exports = function (cfg) {
  const db      = cfg.storiesdb;

  let model = {};

  model.save = function (username, body) {
    const stories = require('../stories/model')(cfg);

    debug('saving section: ', body.title);

    const doc = {
      _id:         body.id,
      type:        'section',
      title:       body.title || '',
      read:        body.read  || [username],
      write:       body.write || [username],
      description: body.description,
      chapters:    body.chapters
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
          return db
            .insertAsync(doc)
            .then(function () {
              return stories
                .addSection(username, doc._id)
                .then(doc);
            });

        throw e;
      });

      /* eslint-enable camelcase */
  };

  model.addChapter = function (username, chapterId) {
    debug('%s adding chapter %s', username, chapterId);

    const sectionId  = chapterId.split('!').slice(0, -1).join('!');

    /* eslint-disable camelcase */

    return db
      .getAsync(sectionId, { revs_info: true })
      .spread(function (saved) {
        const updated = Object.assign(saved, {
          chapters: saved.chapters.concat(chapterId)
        });

        if(!getPermissions(saved, username).write)
          throw Boom.unauthorized();

        return db.insertAsync(updated);

      });

    /* eslint-enable camelcase */
  };

  model.get = function (username, id) {
    const chapters = require('../chapters/model')(cfg);

    debug('getting section: ', id);

    return db
      .getAsync(id)
      .spread(function (doc) {
        if(!getPermissions(doc, username).read)
          throw Boom.unauthorized();

        const sectionChapters = doc.chapters
          .map(function (chapterId) {
            return chapters
              .get(username, chapterId);
          });

        return Bluebird.all(sectionChapters)
          .then(function (results) {
            doc.chapters = results;

            return doc;
          });
      });
  };

  model.destroy = function (username, id) {
    debug('removing section: ', id);

    /* eslint-disable camelcase */

    return db
      .getAsync(id, { revs_info: true })
      .spread(function (doc) {
        if(!getPermissions(doc, username).write)
          throw Boom.unauthorized();

        return db
          .destroyAsync(id, doc._rev);
      });

      /* eslint-enable camelcase */
  };

  return model;
};
