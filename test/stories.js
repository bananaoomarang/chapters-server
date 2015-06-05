'use strict';

/* eslint-disable no-unused-expressions */

var Lab          = require('lab');
var Code         = require('code');
var supertest    = require('supertest');
var async        = require('async');
var server       = require('../');
var storyFixture = require('./fixtures/story.json');

var lab    = exports.lab = Lab.script();
var expect = Code.expect;
var app    = supertest('http://localhost:8888');


lab.experiment('story', function () {

  var storyFromDisk = {
    id:   null,
    name: 'mock-story',
    path: 'test/fixtures/story.md'
  };

  var user = {
    username: 'testuser-story',
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
          .post('/users/create')
          .send(userForRegistration)
          .set('Accept', 'application/json')
          .end(function(err) {

            if (err) return cb(err);

            cb(null);

          });
      },
      function getToken(cb) {
        app
          .post('/users/login')
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

  lab.test('Create story by uploading markdown file', function (done) {

    app
      .post('/stories/upload')
      .attach('file', storyFromDisk.path)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(201)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;
        expect(res.body.id);

        storyFromDisk.id = res.body.id;

        done(null);

      });

  });

  lab.test('Create story from JSON (ie, exported from frontend editor)', function (done) {

    storyFixture.title = 'Not the Old One';

    app
      .post('/stories/import')
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .send(storyFixture)
      .expect(201)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;
        expect(res.body.id);

        // TODO  Dirty.
        storyFixture.id = res.body.id;

        done(null);

      });

  });

  lab.test('edit non-existing story', function (done) {

    app
      .post('/stories/fake_id')
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .send(storyFixture)
      .expect(404)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).not.to.be.ok;

        done(null);

      });

  });

  lab.test('edit story', function (done) {

    app
      .post('/stories/' + storyFixture.id)
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .send(storyFixture)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;
        expect(res.body.id);

        done(null);

      });

  });


  lab.test('get story', function (done) {

    app
      .get('/stories/' + storyFixture.id)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;
        expect(res.text).to.be.string;

        done(null);

      });

  });

  lab.test('List stories by title', function (done) {

    app
      .get('/stories?title=' + storyFixture.title)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;

        var doc = res.body;

        expect(doc).to.be.array;
        expect(doc[0].title).to.equal(storyFixture.title);

        done(null);

      });

  });

  lab.test('delete story', function (done) {

    app
      .delete('/stories/' + storyFromDisk.id)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;

        done(null);

      });

  });

  lab.after(function (done) {
    // TODO multiple story delete should be part of test
    app
      .del('/stories/' + storyFixture.id)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);

        expect(res).to.be.ok;

        done(null);

      });
  });

  lab.after(function (done) {

    app
      .del('/users/' + user.username)
      .set('Authorization', 'Bearer ' + user.token)
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
