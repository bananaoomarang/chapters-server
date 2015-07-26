'use strict';

var chaptersdb  = require('nano')('http://localhost:5984/chapters');

var viewDoc = {
  _id:      '_design/chapter',
  language: 'javascript',
  views:    {
    byUser:  require('./chapter-by-user.js'),
    byTitle: require('./chapter-by-title.js')
  }
};

module.exports = {

  // Generates views
  init: function () {
    chaptersdb.insert(viewDoc, function (err) {
      if (err) return console.error(err);

      console.log('Successfully created chapter views');
    });
  }

};
