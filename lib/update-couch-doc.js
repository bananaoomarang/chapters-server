'use strict';

var async  = require('async');
var assign = require('object-assign');

module.exports = function (id, db, docDelta, cb) {

  var jobs = [
    function get (done) {
      /* eslint-disable camelcase */

      db.get(id, { revs_info: true  }, function (err, currentDoc) {

      /* eslint-enable camelcase */

        if (err) {

          // Just save it if it doesn't exist
          if (err.error === 'not_found') return done(null, null);

          return done(err);

        }

        return done(null, currentDoc);

      });
    },
    function update (currentDoc, done) {
      const newDoc = currentDoc ? assign(currentDoc, docDelta) : docDelta;

      if(currentDoc) {
        db.insert(newDoc, function (err) {

          if (err) return done(err);

          done();

        });
      } else {
        return done('Unauthorised');
      }
    }

  ];

  async.waterfall(jobs, function (err) {

    if (err) return cb(err);

    cb();

  });

};
