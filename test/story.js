'use strict';

/* eslint-disable no-unused-expressions */

var Lab       = require('lab');
var Code      = require('code');
var supertest = require('supertest');
var async     = require('async');
var server    = require('../');

var lab    = exports.lab = Lab.script();
var expect = Code.expect;
var app    = supertest('http://localhost:8888');

lab.experiment('story', function () {

  var story = {
    name: 'mock-story',
    path: 'test/fixtures/mock-story.md'
  };

  var user = {
    username: 'testuser',
    password: 'password',
    token:    ''
  };

  lab.before(function (done) {

    var userForRegistration = {
      username: user.username,
      password: 'password',
      email:    'reallycool@hotmail.com'
    };

    var jobs = [
      function startServer(cb) {
        server.start(function (err) {
          if (err) return cb(err);

          cb(null);
        });
      },
      function createUser(cb) {
        app
          .post('/user/create')
          .send(userForRegistration)
          .set('Accept', 'application/json')
          .end(function(err) {

            if (err) return cb(err);

            cb(null);

          });
      },
      function getToken(cb) {
        app
          .post('/user/login')
          .send(user)
          .end(function (err, res) {

            if (err) return cb(res.body.message);

            user.token = res.text;

            cb(null);

        });
      }
    ];

    async.series(jobs, function (err) {
      if (err) return done(err);

      done(null);
    });
  });

  lab.test('upload story', function (done) {
    app
      .post('/story/upload')
      .attach('file', story.path)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(201)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;

        done(null);

      });

  });

  lab.test('user owns story', function (done) {
    app
      .get('/user/' + user.username)
      .end(function (err, res) {

        if (err) return done(err);

        var doc = res.body;

        expect(doc.stories[story.name]).to.be.true();

        done();
      });
  });

  lab.test('get story', function (done) {

    app
      .get('/story/' + story.name)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;

        done(null);

      });

  });

  lab.test('delete story', function (done) {

    app
      .delete('/story/' + story.name)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;

        done(null);

      });

  });

  lab.test('user doesn\'t own story', function (done) {
    app
      .get('/user/' + user.username)
      .end(function (err, res) {

        if (err) return done(err);

        var doc = res.body;

        expect(doc.stories[story.name]).to.be.undefined();

        done();
      });
  });

  lab.after(function (done) {

    app
      .delete('/user/' + user.username)
      .set('Accept', 'application/json')
      .end(function(deleteErr) {

        if (deleteErr) return done(deleteErr);

        server.stop(function (stopServerErr) {
          if (stopServerErr) return done(stopServerErr);

          done(null);
        });

      });

  });

});
