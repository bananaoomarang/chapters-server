'use strict';

var fs          = require('fs');
var path        = require('path');
var debug       = require('debug')('stories');
var async       = require('async');
var marked      = require('marked');
var mkdirp      = require('mkdirp');
var updateCouch = require('../../lib/update-couch-doc');

module.exports = function (cfg) {
  var model   = {};
  var db      = cfg.storiesdb;

  model.save = function (username, key, title, text, cb) {

    var saveLoc = path.join('data', 'stories', username, key);
    var saveDir = path.dirname(saveLoc);

    var doc = {
      _id:     key,
      owner:   username,
      depends: [],
      path:    saveLoc
    };

    if(title) doc.title = title;

    var jobs = [
      function createDirectory (done) {
        mkdirp(saveDir, function (err) {

          if (err) {

            done(err);

          } else {

            done();

          }

        });
      },

      function toDisk (done) {
        fs.writeFile(saveLoc, text, function (err) {
          if (err) return done(err);

          done(null);
        });

      },

      function saveStory(done) {
        updateCouch(key, db, doc, function (err) {
          if (err) return done(err);

          done();
        });
      }

    ];


    async.series(jobs, function asyncFinished (err) {

      if (err) return cb(err);

      debug('Successfully saved %s', title);

      cb();

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

      function readFile (doc, done) {
        var location = doc.path;
        var read     = fs.createReadStream(location, { encoding: 'utf-8' });
        var text     = '';

        read.on('error', function (err) {

          done(err);

        })
        .on('data', function (data) {

          text += data.toString();

        })
        .on('end', function () {

          doc.text = text;

          done(null, doc);

        });

      },

      function returnBody (doc, done) {

        if (parse) {

          marked(doc.text, function (err, html) {
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

      return cb(null, result);

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

          return done(null, doc);

        });

      },

      function deleteFromDisk (doc, done) {
        fs.unlink(doc.path, function (err) {
          if (err) return done(err);

          done(null, doc);
        });
      },

      function deleteFromDb (doc, done) {

        db.destroy(id, doc._rev, function (err, body) {

          if (err) return done(err);

          return done(null, body);

        });
      }

    ];

    async.waterfall(removeStory, function (err, result) {

      if (err) return cb(err);

      cb(null, result);

    });

  };

  model.list = function (title, cb) {

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

  };

  model.search = function (author, title, cb) {

    db.view('story', 'byUser', { key: author }, function (err, body) {
      if (err) return cb(err);

      var list = body.rows.map(function (value) {
        return {
          id:    value.id.split('!')[1],
          title: value.value
        };
      });

      cb(null, list);
    });

  };

  return model;

};
