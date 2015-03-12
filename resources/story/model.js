'use strict';

var fs    = require('fs');
var debug = require('debug')('story');

module.exports = function () {
  var model = {};

  model.save = function (text, title, cb) {

    var saveLocation = ['data', 'stories', title].join('/');

    fs.writeFile(saveLocation, text, function (err) {
      if (err) return cb(err);

      return cb(null, 'File saved successfully');
    });
  };

  model.get = function (title, cb) {

    var location = ['data', 'stories', title].join('/');
    var read     = fs.createReadStream(location, { encoding: 'utf-8' });
    var text     = '';

    read.on('error', function (err) {

      cb(err);

    })
    .on('data', function (data) {

      text += data.toString();

    })
    .on('end', function () {

      cb(null, text);

    });
  };

  return model;

};
