'use strict';

module.exports = {
  map: function (doc) {

    emit(doc.owner, doc.title);

  }
};

