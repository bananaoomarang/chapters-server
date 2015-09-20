'use strict';

module.exports = function (cfg) {
  return {
    users:    require('./users/controller')(cfg),
    chapters: require('./chapters/controller')(cfg)
  };
};
