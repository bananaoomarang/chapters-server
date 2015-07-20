'use strict';

var debug       = require('debug')('stories');
var async       = require('async');
var marked      = require('marked');
var updateCouch = require('../../lib/update-couch-doc');

module.exports = function (cfg) {
  var model   = {};
  var db      = cfg.storiesdb;

  model.save = function (username, key, title, text, cb) {
    var doc = {
      _id:      key,
      title:    '',
      author:   username,
      markdown: text,
      depends:  []
    };

    if(title) doc.title = title;

    updateCouch(key, db, doc, function (err) {
      if (err) return cb(err);

      cb(null, doc);
    });
  };

  model.get = function (username, id, parse, cb) {

    var jobs = [

      function fetchFromDb (done) {
        db.get(id, function (err, doc) {
          if (err) return done(err);

          done(null, doc);

        });
      },

      function returnBody (doc, done) {
        if (parse) {

          marked(doc.markdown, function (err, html) {
            if (err) return done(err);

            doc.html = html;

            return done(null, doc);
          });

        } else {

          done(null, doc);

        }

      }

    ];

    async.waterfall(jobs, function (err, result) {
      if (err) return cb(err);

      cb(null, result);

    });

  };

  model.destroy = function (id, cb) {
    debug('removing story: %s', id);

    var removeStory = [

      function getLatestRevision (done) {

        /* eslint-disable camelcase */

        db.get(id, { revs_info: true  }, function (err, doc) {

        /* eslint-enable camelcase */

          if (err) return done(err);

          done(null, doc);

        });

      },

      function deleteFromDb (doc, done) {

        db.destroy(id, doc._rev, function (err, body) {

          if (err) return done(err);

          done(null, body);

        });
      }

    ];

    async.waterfall(removeStory, function (err, result) {

      if (err) return cb(err);

      cb(null, result);

    });

  };

  model.list = function (username, title, cb) {

    if(title) {

      db.view('story', 'byTitle', { key: title }, function (err, body) {
        if (err) return cb(err);

        var list = body.rows.map(function (value) {
          return {
            id:    value.id,
            title: value.value.title
          };
        });

        cb(null, list);
      });

    } else {


      // Just list them all

      /* eslint-disable camelcase */

      db.list({ include_docs: true }, function (err, body) {

      /* eslint-enable camelcase */

        if(err) return cb(err);

        var list = body.rows.filter(function (val) {

          if(val.id.match(/^_design+/)) {
            return false;
          } else {
            return true;
          }

        })
        .map(function (val) {

          return {
            title: val.doc.title,
            id:    val.id
          };

        });

        cb(null, list);

      });
    }


  };

  return model;

};
