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

  function setOwns(parent, child) {
    return db
      .create('EDGE', 'Owns')
      .from(parent)
      .to(child)
      .one();
  }

  model.save = function (username, author, doc) {
    debug('saving chapter: %s', doc.title);

    function mapper(name) {
      return getIdentity(name)
        .get('@rid');
    }

    const owner = mapper(username);

    doc.read  = Bluebird.map(doc.read, mapper);
    doc.write = Bluebird.map(doc.write, mapper);

    return doc.read
      .tap(function (readRID) {
        doc.read = readRID;
      })

      .return(doc.write)
      .tap(function (writeRID) {
        doc.write = writeRID;
      })

      .return(db.class.get('Chapter'))
      .call('create', doc)
      .then(processId)

      //
      // Set ownership
      //
      .tap(function (chapter) {
        return owner
          .then(function (ownerRID) {
            return setOwns(ownerRID, chapter.id);
          });
      })
      .tap(function (chapter) {
        //
        // Create Persona if need be
        //

        return model
          .getPersona(username, author)
          .then(function (persona) {
            if(!persona) {
              debug('No persona exists for this author, creating %s', author);

              return model
                .addPersona(username, author)
            }

            return persona;
          })
          .then(function (persona) {
            console.log(persona);
            return model.link(username, persona.id, chapter.id);
          });
      });
  };

  model.addPersona = function (username, name, persona) {
    debug('%s adding new persona %s written by %s', username, name, (persona || username));

    let doc = Object.create(null);

    doc.title       = name;
    doc.description = 'bio';

    return db
      .class
      .get('Persona')
      .call('create', doc)
      
      .tap(function (newPersona) {
        return getIdentity(username)
          .then(function (identity) {
            return setOwns(identity['@rid'], newPersona['@rid'])
          });
      })

      .then(processId)
  };

  model.getPersona = function (username, name) {
        return db
          .select('expand(in)')
          .from('Persona')
          .where({ title: name })
          .all()
          .all(function (result) {
            if(result['@rid'])
              return processId(result);
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
    debug('%s linking %s to %s', username, from, to);

    return db
      .create('EDGE', 'Leads')
      .from('#' + from)
      .to('#' + to)
      .one();
  };

  return model;
};
