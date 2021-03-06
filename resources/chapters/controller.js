'use strict';

const debug              = require('debug')('chapters');
const Boom               = require('boom');
const Bluebird           = require('bluebird');
const Joi                = require('joi');
const chapterSchema      = require('../../lib/schemas').chapter;
const patchChapterSchema = require('../../lib/schemas').patchChapter;
const isRid              = require('../../lib/is-rid');

Bluebird.promisifyAll(Joi);

function trimExtension (filename) {
  var split = filename.split('.');

  split.pop();

  return split.join('.');
}

function parseMdStream (stream, doc) {
  return new Bluebird(function (resolve, reject) {
    stream.on('data', function (d) {
      doc.markdown += d.toString();
    })
    .on('error', function (err) {
      reject(err);
    })
    .on('end', function () {
      resolve();
    });
  });
}

function defaults(chapter, opts) {
  chapter.read      = chapter.read      || opts.read;
  chapter.write     = chapter.write     || opts.write;
  chapter.author    = chapter.author    || opts.author;
  chapter.ordered   = chapter.ordered   || [];
  chapter.unordered = chapter.unordered || [];
}


module.exports = function (cfg) {
  const chapters = require('./model')(cfg);

  let controller = {};

  function createOrPatch(username, chapter) {
    if (typeof chapter === 'object') {
      const id = chapter.id;
      delete chapter.id;

      if (id) {
        return Joi
          .validateAsync(chapter, patchChapterSchema)
          .then(chapters.patch.bind(null, username, id, chapter, chapter.author))
          .then(c => c.id);
      }

      return Joi
        .validateAsync(chapter, chapterSchema)
        .then(chapters.save.bind(null, username, chapter.author, chapter))
        .then(c => c.id);
    }

    return chapter;
  }

  // Receive JSON payload from our editor
  controller.post = function (req, reply) {
    const username = req.auth.credentials.name;
    const from     = req.params ? req.params.id : false;
    const author   = req.payload.author || username;

    if(req.payload.ordered) {
      req.payload.ordered = req.payload.ordered
        .map(chapter => {
          chapter.isOrdered = true;
          defaults(chapter, { author, read: [username], write: [username] });

          return createOrPatch(username, chapter);
        });
    }

    if(req.payload.unordered) {
      req.payload.unordered = req.payload.unordered
        .map(chapter => {
          chapter.isOrdered = false;
          defaults(chapter, { author, read: [username], write: [username] });

          return createOrPatch(username, chapter);
        });
    }

    const doc = {
      read:        req.payload.read      || [username],
      write:       req.payload.write     || [username],

      title:       req.payload.title,
      markdown:    req.payload.markdown,
      ordered:     Bluebird.all(req.payload.ordered   || []),
      unordered:   Bluebird.all(req.payload.unordered || []),
      isOrdered:   !!req.payload.isOrdered,
    };

    if(!doc.markdown)
      delete doc.markdown;

    return Bluebird
      .props(doc)
      .then(function (chapter) {
        return Joi
          .validateAsync(chapter, chapterSchema)
          .then(chapters.save.bind(null, username, from ? author : null, chapter))
      })
      .tap(function (chapter) {
        // POST /chapters/{id} links to id as the parent
        if(from)
          return chapters.link(username, from, chapter.id, doc.isOrdered)
      })
      .then(function (chapter) {
        reply(null, { id: chapter.id })
          .code(201);
      })
      .catch(function (e) {
        debug(e);

        if(e.name === 'ValidationError')
          return reply(Boom.badRequest(e.message));

        reply(Boom.wrap(e));
      });
  };

  // Multipart file upload
  controller.put = function (req, reply) {
    const username  = req.auth.credentials.name;
    const author    = req.payload.author || username;
    const id        = req.headers['x-chapter-id'];
    const title     = req.headers['x-chapter-title'];

    const doc = {
      read:      req.payload.read      || [username],
      write:     req.payload.write     || [username],
      title:     title                 || trimExtension(req.payload.file.hapi.filename),
      ordered:   req.payload.ordered   || [],
      unordered: req.payload.unordered || [],

      markdown: ''
    };

    parseMdStream(req.payload.file, doc)
      .then(function () {
        return id ?
          Joi
            .validateAsync(doc, patchChapterSchema)
            .then(chapters.patch.bind(null, username, id, doc, author))
          :
          Joi
            .validateAsync(doc, chapterSchema)
            .then(chapters.save.bind(null, username, author, doc));
      })
      .then(function (chapter) {
        reply(null, { id: chapter.id } )
          .code(201);
      })
      .catch(function (e) {
        debug(e);

        if(e.name === 'ValidationError')
          return reply(Boom.badRequest());

        reply(Boom.wrap(e));
      });
  };

  controller.patch  = function (req, reply) {
    const username = req.auth.credentials.name;
    const author   = req.payload.author || username;

    if(!isRid(req.params.id))
      return reply(Boom.notFound('Invalid chapter ID'));

    if(!req.payload.read)
      req.payload.read = [username];

    if(!req.payload.write)
      req.payload.write = [username];

    if(req.payload.ordered) {
      req.payload.ordered = req.payload.ordered
        .map(chapter => {
          chapter.isOrdered = true;
          defaults(chapter, { author, read: [username], write: [username] });

          return createOrPatch(username, chapter);
        });
    }

    if(req.payload.unordered) {
      req.payload.unordered = req.payload.unordered
        .map(chapter => {
          chapter.isOrdered = false;
          defaults(chapter, { author, read: [username], write: [username] });

          return createOrPatch(username, chapter);
        });
    }

    const doc = Object.assign({}, req.payload, {
      ordered:   Bluebird.all(req.payload.ordered  || []),
      unordered: Bluebird.all(req.params.unordered || [])
    });

    return Bluebird
      .props(doc)
      .then(function (chapter) {
        return Joi
          .validateAsync(chapter, patchChapterSchema)
          .then(chapters.patch.bind(null, username, req.params.id, chapter, author));
      })
      .then(function (record) {
        reply(null, { id: record.id });
      })
      .catch(function (e) {
        debug(e);

        if(e.name === 'ValidationError')
          return reply(Boom.badRequest(e));

        if(e.message === 'Cannot update record -  record ID is not specified or invalid.')
          return reply(Boom.notFound(e));

        return reply(Boom.wrap(e));
      });
  };

  controller.list = function (req, reply) {
    const username = req.auth.credentials ? req.auth.credentials.name : null;

    chapters
      .list(username, req.query.title)
      .then(function (list) {
        reply(list)
          .code(200);
      })
      .catch(function (e) {
        debug('Could not list chapters: ', e);

        reply(Boom.wrap(e));
      });
  }

  controller.listStories = function (req, reply) {
    const username = req.auth.credentials ? req.auth.credentials.name : null;

    chapters
      .listStories(username, req.query.title)
      .then(function (list) {
        reply(list)
          .code(200);
      })
      .catch(function (e) {
        debug('Could not list stories: ', e);

        reply(Boom.wrap(e));
      });
  }

  controller.get = function (req, reply) {
    const username = req.auth.credentials ? req.auth.credentials.name : null;
    const parse = req.query.parse ? (req.query.parse === '1' ? true : false) : true;

    if(!isRid(req.params.id))
      return reply(Boom.notFound('Invalid chapter ID'));

    chapters
      .get(username, req.params.id, parse)
      .then(function (doc) {
        if(doc.read) {
          return reply(doc)
            .code(200);
        }

        return reply(Boom.unauthorized())
      })
      .catch(function (e) {
        debug(e);

        if(e.message === 'Cannot update record -  record ID is not specified or invalid.')
          return reply(Boom.notFound(e));

        return reply(Boom.wrap(e));
      });
  };

  controller.destroy = function (req, reply) {
    const username = req.auth.credentials.name;

    if(!isRid(req.params.id))
      return reply(Boom.notFound('Invalid chapter ID'));

    chapters
      .destroy(username, req.params.id)
      .then(function (id) {
        reply(id)
          .code(200)
      })
      .catch(function (e) {
        if(e.message === 'Cannot update record -  record ID is not specified or invalid.')
          return reply(Boom.notFound(e));

        debug(e);
        reply(Boom.wrap(e));
      });
  };

  controller.createLead = function (req, reply) {
    const username = req.auth.credentials.name;

    if(!isRid(req.params.id) || !isRid(req.params.id2))
      return reply(Boom.notFound('Invalid chapter ID'));

    chapters
      .link(username, req.params.id, req.params.id2)
      .then(function () {
        reply();
      })
      .catch(function (e) {
        debug('Could not link %s to %s:', req.params.id, req.params.id2, e);

        reply(Boom.wrap(e));
      });
  };

  controller.destroyLead = function (req, reply) {
    reply('TODO')
      .code(501);
  };

  return controller;
};
