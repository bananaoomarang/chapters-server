'use strict';

module.exports = {
  map: function (doc) {

    emit(doc.title, doc);

  }
};

