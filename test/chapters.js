'use strict';

/* eslint-disable no-unused-expressions */

var Lab            = require('lab');
var Code           = require('code');
var supertest      = require('supertest');
var async          = require('async');
var path           = require('path');
var server         = require('../');
var chapterFixture = require('./fixtures/chapter.json');
var storyFixture   = require('./fixtures/story.json');
var sectionFixture = require('./fixtures/section.json');

var lab    = exports.lab = Lab.script();
var expect = Code.expect;
var app    = supertest('http://localhost:8888');

lab.experiment('chapter', function () {

  var chapterFromDisk = {
    id:   null,
    name: 'mock-chapter',
    path: 'test/fixtures/chapter.md'
  };

  var user = {
    username: 'testuser-chapter',
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
      },
      function uploadStory(cb) {
        app
          .post('/stories')
          .send(storyFixture)
          .set('Accept', 'application/json')
          .set('Authorization', 'Bearer ' + user.token)
          .end(function (err, res) {
            if (err) return cb(err);

            storyFixture.id = res.body.id;

            cb(null);
          });
      },
      function uploadSection(cb) {
        app
          .post('/stories/' + storyFixture.id)
          .send(sectionFixture)
          .set('Accept', 'application/json')
          .set('Authorization', 'Bearer ' + user.token)
          .end(function (err, res) {
            if (err) return cb(err);

            sectionFixture.id = res.body.id;

            cb(null);
          });
      }
    ];

    async.series(jobs, function (err) {
      if (err) return done(err);

      done(null);
    });

  });

  lab.test('Create chapter by uploading markdown file', function (done) {

    const url = path.join('/stories', storyFixture.id, sectionFixture.id);
    app
      .put(url)
      .attach('file', chapterFromDisk.path)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(201)
      .end(function (err, res) {
        if (err) return done(err);

        expect(res).to.be.ok;
        expect(res.body.id);

        chapterFromDisk.id = res.body.id;

        done(null);

      });

  });

  lab.test('Create chapter from JSON (ie, exported from frontend editor)', function (done) {

    const url = path.join('/stories', storyFixture.id, sectionFixture.id);

    chapterFixture.title = 'Not the Old One';

    app
      .post(url)
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .send(chapterFixture)
      .expect(201)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;
        expect(res.body.id);

        // TODO  Dirty.
        chapterFixture.id = res.body.id;

        done(null);

      });

  });

  lab.test('edit non-existing chapter', function (done) {

    const url = path.join('/stories', storyFixture.id, sectionFixture.id, 'fake_id');

    app
      .patch(url)
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .send(chapterFixture)
      .expect(404)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).not.to.be.ok;

        done(null);

      });

  });

  lab.test('edit chapter', function (done) {
    const url = path.join('/stories', storyFixture.id, sectionFixture.id, chapterFixture.id);

    app
      .patch(url)
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .send(chapterFixture)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;
        expect(res.body.id);

        done(null);

      });

  });


  lab.test('get chapter', function (done) {
    const url = path.join('/stories', storyFixture.id, sectionFixture.id, chapterFixture.id);

    app
      .get(url)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;
        expect(res.text).to.be.string;

        done(null);

      });

  });

  lab.test('delete chapter', function (done) {
    const url = path.join('/stories', storyFixture.id, sectionFixture.id, chapterFixture.id);

    app
      .delete(url)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;

        done(null);

      });

  });

  lab.after(function (done) {
    // TODO multiple chapter delete should be part of test
    const url = path.join('/stories', storyFixture.id, sectionFixture.id, chapterFromDisk.id);

    app
      .del(url)
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
