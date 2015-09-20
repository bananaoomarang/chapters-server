var Joi = require('joi');

module.exports = {
  user: {
    username: Joi.string().trim().max(16).regex(/^[A-z]|[1-9]+$/).lowercase().required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).required()
  },

  chapter: {
    title:       Joi.string().trim().required(),
    author:      Joi.string().trim().required(),
    description: Joi.string().trim(),
    markdown:    Joi.string().required(),
    read:        Joi.array(),
    write:       Joi.array(),
    owner:       Joi.string().required()
  },

  patchChapter: {
    title:       Joi.string().trim(),
    author:      Joi.string().trim(),
    description: Joi.string().trim(),
    markdown:    Joi.string(),
    read:        Joi.array(),
    write:       Joi.array()
  }
};
