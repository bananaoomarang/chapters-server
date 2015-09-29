'use strict';

const debug       = require('debug')('chapters');
const Bluebird    = require('bluebird');
const marked      = Bluebird.promisify(require('marked'));
const Boom        = require('boom');
const permissions = require('../../lib/permissions');
const processId   = require('../../lib/processId');

module.exports = function (cfg) {
  const getPermissions = permissions(cfg).figure;
  const getIdentity    = permissions(cfg).getIdentity;

  const db = cfg.chaptersdb;

  let model = {};

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

  model.addPersona = function (username, name, persona) {
    debug('%s adding new persona %s written by %s', username, name, (persona || username));

    let doc = Object.create(null);

    doc.title       = name;
    doc.author      = persona ? model.getPersona(persona) : getIdentity(username);
    doc.description = 'bio';
    doc.owner       = getIdentity(username);

    return Bluebird
      .all([doc.author, doc.owner])
      .map(function (thing) {
        if(thing)
          return thing['@rid'];
      })
      .spread(function (authorRID, ownerRID) {
        doc.author = authorRID;
        doc.owner  = ownerRID;
      })
      .return(db.class.get('Persona'))
      .call('create', doc);
  };

  model.getPersona = function (username, name, owner) {
    if(!owner)
      owner = username;

    const RIDToList = getIdentity(owner);

    return RIDToList
      .then(function (RID) {
        return db
          .select()
          .from('Persona')
          .fetch('*:1')
          .where({ title: name, owner: RID })
          .one();
      });
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

    return model
      .get(username, id, false)
      .then(function (doc) {
        if(getPermissions(doc, username).write)
          return db
            .update('#' + id)
            .set(diff)
            .one();

        throw Boom.unauthorized();
      });
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

  model.listPersonas = function (username, name) {
    return db
      .class
      .get('Persona')
      .call('list')
      .filter(function (li) {
        return name ? (new RegExp(name)).test(li.title) : true;
      })
      .map(function (li) {
        return processId(li);
      });
  }

  // TODO A story is defined as a top-level Chapter which is not a Persona 
  // ie direct descendents of authors
  model.listStories = function (username, title) {
    return db
      .select()
      .from('Persona')
      .fetch('out():1')
      .all()
      .map(function (doc) {
        console.log(doc)
        return doc;
      })
      .filter(function (li) {
        return (title ? (new RegExp(title)).test(li.title) : true)
      });

    return db
      .class
      .get('Persona')
      .call('list')
  }

  model.link = function (username, from, to) {
    return db
      .create('EDGE', 'Leads')
      .from('#' + from)
      .to('#' + to)
      .one();
  };

  return model;
};
