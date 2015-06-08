'use strict';

module.exports = {
  map: function (doc) {

    emit(doc.author, doc);

  }
};

