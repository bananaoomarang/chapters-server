'use strict';

const debug          = require('debug')('chapters');
const Bluebird       = require('bluebird');
const marked         = Bluebird.promisify(require('marked'));
const Boom           = require('boom');
const getPermissions = require('../../lib/permissions').figure;
const processId      = require('../../lib/processId');

module.exports = function (cfg) {
  const db = cfg.chaptersdb;

  let model = {};

  // Currently this only supports using the internal couchdb users,
  // probably should not expose that functionality so watch this space etc
  // but the abstraction is there.
  function getIdentity(username) {
    return db
      .select()
      .from('Identity')
      .where({ couchId: 'org.couchdb.user:' + username})
      .one();
  }

  model.save = function (username, doc) {
    debug('saving chapter: %s', doc.title);

    function mapper(name) {
      return getIdentity(name)
        .get('@rid');
    }

    doc.read  = Bluebird.map(doc.read, mapper);
    doc.write = Bluebird.map(doc.write, mapper);
    doc.owner = mapper(username);

    return doc.read
      .tap(function (read) {
        doc.read = read;
      })

      .return(doc.write)
      .tap(function (write) {
        doc.write = write;
      })

      .return(doc.owner)
      .tap(function (owner) {
        doc.owner = owner;
      })

      .return(db.class.get('Chapter'))
      .call('create', doc)
      .then(processId);
  };

  model.addAuthor = function (username, name) {
    debug('%s adding new author %s', username, name);

    let doc = Object.create(null);

    doc.title       = name;
    doc.author      = username;
    doc.description = 'bio';
    doc.owner       = getIdentity(username);

    return doc
      .owner
      .then(function (ownerRid) {
        doc.owner = ownerRid;
      })
      .return(db.class.get('Author'))
      .call('create', doc);
  };

  model.get = function (username, id, parse) {
    debug('getting chapter: %s', id);

    return db
      .select()
      .from('#' + id)

      // Fetch one level deep
      .fetch('*:1')

      // We fetched by rid so there can only be one
      .one()

      .then(function (record) {
        if(parse)
          return marked(record.markdown)
            .then(function (html) {
              record.html = html;

              return processId(record);
            });

        return processId(record);
      });
  };

  model.patch = function (username, id, diff) {
    debug('updating chapter: %s', id);

    return db
      .update('#' + id)
      .set(diff)
      .one();
  };

  model.destroy = function (username, id) {
    debug('removing chapter: %s', id);

    return model
      .get(username, id, false)
      .then(function (doc) {
        if(getPermissions(doc, username).write)
          return db
            .record
            .delete('#' + id);

        throw Boom.unauthorized();
      });
  };

  model.list = function (username, title) {
      return db
        .class
        .get('Chapter')
        .call('list')
        .filter(function (li) {
          return title ? (new RegExp(title)).test(li.title) : true;
        })
        .map(function (li) {
          return {
            id:          li['@rid'],
            title:       li.title,
            author:      li.author,
            description: li.description
          }
        });
  };

  model.link = function (username, from, to) {
    return db
      .create('EDGE', 'Leads')
      .from('#' + from)
      .to('#' + to)
      .one();
  };

  return model;
};
