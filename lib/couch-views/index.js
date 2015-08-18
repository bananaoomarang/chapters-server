'use strict';

var storiesdb = require('nano')('http://localhost:5984/stories');

var viewDoc = {
  _id:      '_design/story',
  language: 'javascript',
  views:    {
    byUser:  require('./story-by-user'),
    byTitle: require('./story-by-title')
  }
};

module.exports = {

  // Generates views
  init: function () {
    storiesdb.insert(viewDoc, function (err) {
      if (err) return console.error(err);

      console.log('Successfully created story views');
    });
  }

};
