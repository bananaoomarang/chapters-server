var Joi = require('joi');

module.exports = {
  user: {
    username: Joi.string().trim().required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }
};
