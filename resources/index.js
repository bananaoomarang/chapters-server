'use strict';

module.exports = function (cfg) {
  return {
    user:  require('./user/controller')(cfg),
    story: require('./story/controller')(cfg)
  }
}
