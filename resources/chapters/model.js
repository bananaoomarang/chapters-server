'use strict';

const debug       = require('debug')('chapters');
const Bluebird    = require('bluebird');
const marked      = Bluebird.promisify(require('marked'));
const Boom        = require('boom');
const permissions = require('../../lib/permissions');
const processId   = require('../../lib/processId');

function pruneRecord (record) {
  const testJex = /^(in_|out_|@)/;

  let mut = Object.assign({}, record);

  Object
    .keys(mut)
    .forEach(function (key) {
      if(testJex.test(key))
        delete mut[key];

      if(mut[key] instanceof Array)
        mut[key] = mut[key].map(pruneRecord);

      if(typeof mut[key] === 'object')
        return pruneRecord(mut[key]);
    });

  return mut;
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

    let mut = Object.assign({}, doc);
    const rw = {
      r: Bluebird.map(doc.read, mapper),
      w: Bluebird.map(doc.write, mapper),
    };

    return Bluebird.props(rw)
      .then(function ({ r, w }) {
        mut.read  = r;
        mut.write = w;
      })
      .return(mut);
  }

  function setOwns (parent, child) {
    return db
      .create('EDGE', 'Owns')
      .from(parent)
      .to(child)
      .one();
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
      .then(function (chapter) {
        return db
          .class
          .get('Chapter')
          .call('create', chapter);
      })
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
    if(!persona)
      persona = {};

    debug('%s adding new persona %s written by %s', username, name, (persona.name || username));

    let doc = Object.create(null);

    doc.title       = name;
    doc.description = persona.bio || '???';
    doc.ordered     = [];
    doc.unordered   = [];
    doc.read        = [username];
    doc.write       = [username];

    return resolvePermissions(doc)
      .then(function (chapter) {
        return db
          .class
          .get('Persona')
          .call('create', chapter)
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
              ordered:     chapter.ordered.filter(c => getPermissions(c, username).read).map(processId),
              unordered:   chapter.unordered.filter(c => getPermissions(c, username).read).map(processId),
              read:        rw.read,
              write:       rw.write
            }
          })
          .then(pruneRecord);
      });
  };

  model.patch = function (username, id, diff, author) {
    debug('updating chapter: %s', id);

    return model
      .get(username, id, false)
      .then(function (doc) {
        if(!doc.write) throw Boom.unauthorized();

        return resolvePermissions(diff);
      })
      .then(function (resolvedDiff) {
        debug(resolvedDiff)

        return db
          .update('#' + id)
          .set(resolvedDiff)
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
        if(!doc.write)
          throw Boom.unauthorized();

       return db
          .record
          .delete('#' + id);
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
      .map(function (chapter) {
        return db
          .select("expand( out('Wrote') )")
          .from(chapter['@rid'])
          .fetch('*:1')
          .all()
          .filter(c => {
            return getPermissions(c, username).read
          })
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
          })
      })
      // Cheeky flatmap
      .reduce( (prev, curr) => prev.concat(curr));
  }

  model.link = function (username, from, to, ordered) {
    debug('%s linking %s to %s', username, from, to);

    const toRID      = db.select().from(to).one().get('@rid');
    const fromRecord = db.select().from(from).one();
    const fromAuthor = db.select().select("expand( in('Wrote') )").from(from).one();

    Bluebird
      .props({ toRID, fromRecord, fromAuthor })
      .then(function ({ toRID, fromRecord, fromAuthor }) {
        return db
          .update(fromRecord['@rid'])
          .add(ordered ? 'ordered' : 'unordered', toRID)
          .one()
          .then(function (chapter) {
            return getOrCreatePersona(username, fromAuthor.title)
              .then(function (persona) {
                return {
                  chapter,
                  persona
                };
              });
          });
      });
  };

  return model;
};
