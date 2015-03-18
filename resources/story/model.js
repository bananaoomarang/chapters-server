'use strict';

var fs     = require('fs');
var debug  = require('debug')('story');
var async  = require('async');
var marked = require('marked');

module.exports = function (cfg) {
  var model = {};
  var db    = cfg.storiesdb;

  model.save = function (username, text, title, cb) {

    var saveLocation = ['data', 'stories', title].join('/');

    var doc = {
      _id:      '!' + username + '!' + title,
      owner:    username,
      depends:  [],
      location: saveLocation
    };

    var jobs = [
      function toDisk (done) {
        fs.writeFile(saveLocation, text, function (err) {
          if (err) return done(err);

          return done(null, 'File saved successfully');
        });
      },

      function toDB (done) {
        db.insert(doc, function couchInsert (err, body) {

          if (err) return done(err);

          return done(null, body);

        });
      }
    ];

    async.parallel(jobs, function (err) {
      if (err) return cb(err);

      debug('Successfully saved %s', title);

      return cb(null);
    });
  };

  model.get = function (title, parse, cb) {

    var jobs = [

      function readFile (done) {
        var location = ['data', 'stories', title].join('/');
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

  return model;

};
