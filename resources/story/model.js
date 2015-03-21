'use strict';

var fs     = require('fs');
var path   = require('path');
var debug  = require('debug')('story');
var async  = require('async');
var marked = require('marked');

module.exports = function (cfg) {
  var model = {};
  var db    = cfg.storiesdb;

  model.save = function (username, text, title, cb) {

    var saveLoc = path.join('data', 'stories', username, title);
    var saveDir = path.dirname(saveLoc);

    var doc = {
      _id:     username + '!' + title,
      owner:   username,
      depends: [],
      path:    saveLoc
    };

    var jobs = [
      function mkdirp (done) {
        fs.mkdir(saveDir, function (err) {

          if (err && err.code !== 'EEXIST') {

            done(err);

          } else {

            done();

          }

        });
      },
      function toDisk (done) {
        fs.writeFile(saveLoc, text, function (err) {
          if (err) return done(err);

          done(null, 'File saved successfully');
        });
      },

      function toDB (done) {
        db.insert(doc, function couchInsert (err, body) {

          if (err) return done(err);

          done(null, body);

        });
      }
    ];

    async.parallel(jobs, function (err) {
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

    var dbKey = [username, title].join('!');

    var jobs = [

      function getLatestRevision (done) {

        /* eslint-disable camelcase */

        db.get(dbKey, { revs_info: true  }, function (err, doc) {

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

        db.destroy(dbKey, doc._rev, function (err, body) {

          if (err) return done(err);

          return done(null, body);

        });
      }

    ];

    async.waterfall(jobs, function asyncFinished (err, result) {

      if (err) return cb(err);

      return cb(null, result);

    });

  };

  return model;

};
