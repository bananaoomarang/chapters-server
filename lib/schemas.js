var Joi = require('joi');

module.exports = {
  user: {
    username: Joi.string().trim().max(16).regex(/^[A-z]|[1-9]+$/).lowercase().required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).required()
  },

  story: {
    title:    Joi.string().required(),
    author:   Joi.string().required(),
    owner:    Joi.string().required(),
    chapters: Joi.array(), // These are instead of sections here, for unorganised stories
    sections: Joi.array(),
    read:     Joi.array(),
    write:    Joi.array()
  },

  patchStory: {
    title:    Joi.string(),
    author:   Joi.string(),
    owner:    Joi.string(),
    chapters: Joi.array(), // These are instead of sections here, for unorganised stories
    sections: Joi.array(),
    read:     Joi.array(),
    write:    Joi.array()
  },

  section: {
    id:          Joi.string().required(),
    title:       Joi.string().required(),
    chapters:    Joi.array().items(Joi.string()),
    description: Joi.string(),
    read:        Joi.array(),
    write:       Joi.array()
  },

  patchSection: {
    id:          Joi.string().required(),
    title:       Joi.string(),
    chapters:    Joi.array().items(Joi.string()),
    description: Joi.string(),
    read:        Joi.array(),
    write:       Joi.array()
  },

  chapter: {
    id:       Joi.string().trim(),
    title:    Joi.string().trim().required(),
    author:   Joi.string().trim().required(),
    markdown: Joi.string().required(),
    read:     Joi.array(),
    write:    Joi.array()
  },

  patchChapter: {
    id:       Joi.string().required(),
    title:    Joi.string().trim(),
    author:   Joi.string().trim(),
    markdown: Joi.string().required(),
    read:     Joi.array(),
    write:    Joi.array()
  }
};
