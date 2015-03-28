'use strict';

var fs          = require('fs');
var path        = require('path');
var debug       = require('debug')('story');
var async       = require('async');
var marked      = require('marked');
var sanitize    = require('../../lib/sanitize-string');
var updateCouch = require('../../lib/update-couch-doc');

module.exports = function (cfg) {
  var model   = {};
  var db      = cfg.storiesdb;
  var usersdb = cfg.usersdb;

  model.save = function (username, text, title, cb) {

    var saveLoc = path.join('data', 'stories', username, title);
    var saveDir = path.dirname(saveLoc);

    var doc = {
      _id:     username + '!' + sanitize(title),
      title:   title,
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

          done(null);
        });
      },

      function getForUpdate (done) {
        /* eslint-disable camelcase */

        db.get(doc._id, { revs_info: true }, function (err, serverDoc) {

        /* eslint-disable camelcase */

          if (err) {

            if (err.error === 'not_found') return done(null, null);

            return done(err);

          }

          done(null, serverDoc);

        });
      },

      function toDB (serverDoc, done) {

        if(serverDoc) doc._rev = serverDoc._rev;

        db.insert(doc, function couchInsert (err, body) {

          if (err) return done(err);

          done(null, body);

        });
      }
    ];

    async.parallel([
      function updateUser(done) {

        var userDelta = {
          stories: {}
        };

        userDelta.stories[title] = true;

        updateCouch('org.couchdb.user:' + username, usersdb, userDelta, function (err) {
          if (err) return done(err);

          done();
        });

      },
      function saveStory (done) {

        async.waterfall(jobs, function (err) {
          if (err) return done(err);

          done();
        });

      }
    ], function asyncFinished (err) {

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

    var updateUser = [
      function getUser (done) {
        var dbKey = 'org.couchdb.user:' + username;

        /* eslint-disable camelcase */

        usersdb.get(dbKey, { revs_info: true  }, function (err, currentUser) {

        /* eslint-enable camelcase */

          if (err) return done(err);

          return done(null, currentUser);

        });
      },
      function updateUser (currentUser, done) {

        delete currentUser.stories[title];

        usersdb.insert(currentUser, function (err) {

          if (err) return done(err);

          done();

        });

      }
    ];

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

    async.parallel([

      function (done) {
        async.waterfall(updateUser, function (err, result) {

          if (err) return done(err);

          done(null, result);

        });
      },
      function (done) {
        async.waterfall(removeStory, function (err, result) {

          if (err) return done(err);

          done(null, result);

        });
      }

    ], function asyncFinished (err) {

      if (err) return cb(err);

      debug('Successfully saved %s', title);

      return cb(null);

    });

  };

  model.list = function (username, cb) {

    db.view('story', 'byUser', { key: username }, function (err, body) {
      if (err) return cb(err);

      var list = body.rows.map(function (value) {
        return {
          dbKey: value.id,
          title: value.value
        };
      });

      cb(null, list);
    });

  };

  return model;

};
