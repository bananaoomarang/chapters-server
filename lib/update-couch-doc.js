'use strict';

var async  = require('async');
var assign = require('object-assign');

module.exports = function (id, db, docDelta, cb) {

  var jobs = [
    function get (done) {
      /* eslint-disable camelcase */

      db.get(id, { revs_info: true  }, function (err, currentDoc) {

      /* eslint-enable camelcase */

        if (err) return done(err);

        return done(null, currentDoc);

      });
    },
    function update (currentDoc, done) {

      var newDoc = assign(currentDoc, docDelta);

      db.insert(newDoc, function (err) {

        if (err) return done(err);

        done();

      });

    }

  ];

  async.waterfall(jobs, function (err) {

    if (err) return cb(err);

    cb();

  });

};
