'use strict';

function match(str1, str2) {
  return str1 === str2;
}

module.exports = {
  // Returns whether user can read and write this object
  figure: function (doc, username) {
    const boundMatch = match.bind(null, username);

    let returns = {
      read:  false,
      write: false
    };

    if(doc.read[0] === 'all')
      returns.read = true;
    else
      returns.read = doc.read.some(boundMatch);

    if(doc.write[0] === 'all')
      returns.write = true;
    else
      returns.write = doc.write.some(boundMatch);

    return returns;
  }
};
