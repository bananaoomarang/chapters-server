'use strict';

module.exports = function (cfg) {
  return {
    users:    require('./users/controller')(cfg),
    stories:  require('./stories/controller')(cfg),
    sections: require('./sections/controller')(cfg),
    chapters: require('./chapters/controller')(cfg)
  };
};
