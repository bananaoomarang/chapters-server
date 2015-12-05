var Joi = require('joi');

module.exports = {
  user: {
    username: Joi.string().trim().max(16).regex(/^[A-z]|[1-9]+$/).lowercase().required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).required()
  },

  chapter: {
    title:       Joi.string().trim().required(),
    author:      Joi.string().trim(),
    description: Joi.string().trim(),
    markdown:    Joi.string().required(),
    ordered:     Joi.boolean(),
    public:      Joi.boolean(),
    read:        Joi.array(),
    write:       Joi.array()
  },

  patchChapter: {
    title:       Joi.string().trim(),
    author:      Joi.string().trim(),
    description: Joi.string().trim(),
    markdown:    Joi.string(),
    ordered:     Joi.boolean(),
    public:      Joi.boolean(),
    read:        Joi.array(),
    write:       Joi.array()
  }
};
