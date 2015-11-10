'use strict';

module.exports = function (cfg) {
  const db = cfg.chaptersdb;

  let returns = {};

  // Returns whether user can read and write this object
  // XXX This is ugly as poo
  returns.figure = function (doc, username) {
    if(doc.owner && doc.owner.couchId === 'org.couchdb.user:' + username)
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
  };

  // Currently this only supports using the internal couchdb users,
  // probably should not expose that functionality so watch this space etc
  // but the abstraction is there.
  returns.getIdentity = function (username) {
    return db
      .select()
      .from('Identity')
      .where({ couchId: 'org.couchdb.user:' + username})
      .one();
  };

  return returns;
};
