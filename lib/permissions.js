'use strict';

module.exports = {
  // Returns whether user can read and write this object
  // XXX This is ugly as poo
  figure: function (doc, username) {
    if(doc.owner.couchId === 'org.couchdb.user:' + username)
      return {
        read:  true,
        write: true
      };


    let returns = {
      read:  false,
      write: false
    };

    if(doc.read[0] === 'all')
      returns.read = true;
    else
      doc.read.forEach(function (user) {
        if(user.couchId === 'org.couchdb.user:' + username)
          returns.read = true;
      });

    if(doc.write[0] === 'all')
      returns.write = true;
    else
      doc.write.forEach(function (user) {
        if(user.couchId === 'org.couchdb.user:' + username)
          returns.write = true;
      });

    return returns;
  }
};
