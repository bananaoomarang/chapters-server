'use strict';

const debug       = require('debug')('chapters');
const Bluebird    = require('bluebird');
const marked      = Bluebird.promisify(require('marked'));
const Boom        = require('boom');
const permissions = require('../../lib/permissions');
const processId   = require('../../lib/processId');

function pruneRecord (record) {
  const testJex = /^(in_|out_|@)/;

  Object
    .keys(record)
    .forEach(function (key) {
      if(testJex.test(key))
        delete record[key];


      if(record[key] instanceof Array)
        return record[key].forEach(pruneRecord);

      if(typeof record[key] === 'object')
        return pruneRecord(record[key]);
    });

  return record;
}

module.exports = function (cfg) {
  const getPermissions = permissions(cfg).figure;
  const getIdentity    = permissions(cfg).getIdentity;

  const db = cfg.chaptersdb;

  let model = {};


  function resolvePermissions (doc) {
    function mapper(name) {
      return getIdentity(name)
        .get('@rid');
    }

    doc.read  = Bluebird.map(doc.read, mapper);
    doc.write = Bluebird.map(doc.write, mapper);

    return doc.read
      .tap(function (readRID) {
        doc.read = readRID;
      })

      .return(doc.write)
      .tap(function (writeRID) {
        doc.write = writeRID;
      });
  }

  function setOwns (parent, child) {
    return db
      .create('EDGE', 'Owns')
      .from(parent)
      .to(child)
      .one();
  }

  function mapId (arr) {
    return arr.map(id => '#' + id);
  }

  function mapIds (doc) {
    if(doc.read)
      doc.read      = mapId(doc.read);

    if(doc.write)
      doc.write     = mapId(doc.write);

    if(doc.ordered)
      doc.ordered   = mapId(doc.ordered);

    if(doc.unordered)
      doc.unordered = mapId(doc.unordered);
  }

  function getOrCreatePersona (username, author) {
    return model
      .getPersona(username, author)
      .then(function (persona) {
        if(!persona) {
          debug('No persona exists for this author, creating %s', author);

          return model
            .addPersona(username, author)
        }

        return persona;
      });
  }

  model.save = function (username, author, doc) {
    debug('saving chapter: %s', doc.title);

    return resolvePermissions(doc)
      .return(db.class.get('Chapter'))
      .call('create', doc)
      .then(processId)

      //
      // Set ownership
      //
      .tap(function (chapter) {
        return getIdentity(username)
          .get('@rid')
          .then(function (ownerRID) {
            return setOwns(ownerRID, chapter.id);
          });
      })
      .then(function (chapter) {
        //
        // Create Persona if need be
        //
        return getOrCreatePersona(username, author)
          .then(function (persona) {
            return db
              .create('EDGE', 'Wrote')
              .from('#' + persona.id)
              .to('#' + chapter.id)
              .one()
              .return(chapter);
          });
      });
  };

  model.addPersona = function (username, name, persona) {
    debug('%s adding new persona %s written by %s', username, name, (persona || username));

    let doc = Object.create(null);

    doc.title       = name;
    doc.description = 'bio';
    doc.ordered     = [];
    doc.unordered   = [];
    doc.read        = [username];
    doc.write       = [username];

    return resolvePermissions(doc)
      .then(function () {
        return db
          .class
          .get('Persona')
          .call('create', doc)
          .then(function (personaRecord) {
            return getIdentity(username)
              .then(function (identity) {
                return setOwns(identity['@rid'], personaRecord['@rid'])
              })
              .then(function () {
                return processId(personaRecord);
              });
          });
      });
  };

  model.getPersona = function (username, name, owner) {
    if(!owner)
      owner = username;

    return db
      .select()
      .from('Persona')
      .where('\'org.couchdb.user:' + owner + '\' IN in(\'Owns\').couchId AND title=:title', { title: name })
      .one()
      .then(function (result) {
        if(result && result['@rid'])
          return processId(result);
      });
  };

  model.get = function (username, id, parse) {
    debug('getting chapter: %s', id);

    function getWriter(id) {
      return db
        .select("expand( in('Wrote') )")
        .from('#' + id)
        .one();
    };

    return db
      .select()
      .from('#' + id)

      // Fetch one level deep
      .fetch('*:1')

      // We fetched by rid so there can only be one
      .one()

      .then(function (chapter) {
        if(parse && chapter.markdown) {
          return marked(chapter.markdown)
            .then(function (html) {
              chapter.html = html;

              return processId(chapter);
            }); 
        }

        return processId(chapter);
      })

      // Get the writer, can't get this to work more efficiently?
      .then(function (chapter) {
        pruneRecord(chapter);

        return getWriter(chapter.id)
          .then(function (writer) {
            const rw = getPermissions(chapter, username);

            return {
              id:          chapter.id,
              title:       chapter.title,
              author:      writer.title,
              description: chapter.description,
              markdown:    chapter.markdown,
              html:        chapter.html,
              public:      chapter.public,
              ordered:     chapter.ordered ? chapter.ordered.filter(c => getPermissions(c, username).read).map(processId) : [],
              unordered:   chapter.unordered ? chapter.unordered.filter(c => getPermissions(c, username).read).map(processId) : [],
              read:        rw.read,
              write:       rw.write
            }
          });
      });
  };

  model.patch = function (username, id, diff, author) {
    debug('updating chapter: %s', id);

    mapIds(diff);

    return model
      .get(username, id, false)
      .then(function (doc) {
        if(!doc.write) throw Boom.unauthorized();

        return db
          .update('#' + id)
          .set(diff)
          .one()
          .then(function (chapter) {
            return getOrCreatePersona(username, author)
              .then(function (persona) {
                return {
                  chapter,
                  persona
                };
              });
          });
      });
  };

  model.destroy = function (username, id) {
    debug('removing chapter: %s', id);

    return model
      .get(username, id, false)
      .then(function (doc) {
        if(doc.write)
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
          return processId(li);
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

  model.listStories = function (username, title) {
    debug('%s fetching stories', username || 'anonymous');

    return db
      .select()
      .from('Persona')
      .fetch('*:1')
      .all()
      .filter(function (chapter) {
        const rw = getPermissions(chapter, username);

        if(!rw.read) return false;

        return (title ? (new RegExp(title)).test(chapter.title) : true)
      })
      .map(c => c.ordered.concat(c.unordered))
      .spread()
      .map(function (chapter) {
        const rw = getPermissions(chapter, username);

        return db
          .select("expand( in('Wrote') )")
          .from(chapter['@rid'])
          .one()
          .then(function (writer) {
            chapter = processId(chapter);

            return {
              id:          chapter.id,
              title:       chapter.title,
              author:      writer.title,
              description: chapter.description,
              markdown:    chapter.markdown,
              html:        chapter.html,
              read:        rw.read,
              write:       rw.write
            }
          });
      });
  }

  model.link = function (username, from, to, ordered) {
    debug('%s linking %s to %s', username, from, to);

    const toRID      = db.select().from(to).one().get('@rid');
    const fromRecord = db.select().fetch('*:1').from(from).one();

    Bluebird
      .props({ toRID, fromRecord })
      .then(function ({ toRID, fromRecord }) {
        let diff = {};

        if(ordered) {
          let arr = fromRecord.ordered;

          arr.push(toRID);

          diff.ordered = arr;
        } else {
          let arr = fromRecord.unordered;

          arr.push(toRID);

          diff.unordered = arr;
        }

        if(fromRecord['@class'] === 'Persona')
          return model.patch(username, processId(fromRecord).id, diff, fromRecord.title);

        return model.patch(username, processId(fromRecord).id, diff, fromRecord.author.title)
      });
  };

  return model;
};
