var Joi = require('joi');

module.exports = {
  user: {
    username: Joi.string().trim().required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).required()
  },

  chapter: {
    id:       Joi.string().trim(),
    read:     Joi.array().required(),
    write:    Joi.array().required(),
    title:    Joi.string().trim().required(),
    author:   Joi.string().trim().required(),
    markdown: Joi.string().required()
  }
};
