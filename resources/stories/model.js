'use strict';

var fs          = require('fs');
var path        = require('path');
var debug       = require('debug')('stories');
var async       = require('async');
var marked      = require('marked');
var mkdirp      = require('mkdirp');
var sanitize    = require('../../lib/sanitize-string');
var updateCouch = require('../../lib/update-couch-doc');

module.exports = function (cfg) {
  var model   = {};
  var db      = cfg.storiesdb;

  model.save = function (username, text, title, cb) {

    var saveLoc = path.join('data', 'stories', username, title);
    var saveDir = path.dirname(saveLoc);
    var storyId = username + '!' + sanitize(title);

    var doc = {
      _id:     storyId,
      title:   title,
      owner:   username,
      depends: [],
      path:    saveLoc
    };

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
        updateCouch(storyId, db, doc, function (err) {
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

  model.get = function (username, title, parse, cb) {

    var jobs = [

      function fetchFromDb (done) {
        var key = [username, title].join('!');

        db.get(key, function (err, doc) {

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

          done(null, text);

        });

      },

      function returnBody (string, done) {

        if (parse) {

          marked(string, function (err, html) {
            if (err) return done(err);

            return done(null, html);
          });

        } else {

          done(null, string);

        }

      }

    ];

    async.waterfall(jobs, function (err, result) {

      if (err) return cb(err);

      return cb(null, result);

    });

  };

  model.destroy = function (username, title, cb) {
    debug('removing story: %s', title);

    var storyDbKey = [username, title].join('!');

    var removeStory = [

      function getLatestRevision (done) {

        /* eslint-disable camelcase */

        db.get(storyDbKey, { revs_info: true  }, function (err, doc) {

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

        db.destroy(storyDbKey, doc._rev, function (err, body) {

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

  model.list = function (username, cb) {

    db.view('story', 'byUser', { key: username }, function (err, body) {
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
