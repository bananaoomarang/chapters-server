'use strict';

/* eslint-disable no-unused-expressions */

var Lab          = require('lab');
var Code         = require('code');
var supertest    = require('supertest');
var async        = require('async');
var server       = require('../');
var chapterFixture = require('./fixtures/chapter.json');

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
      }
    ];

    async.series(jobs, function (err) {
      if (err) return done(err);

      done(null);
    });

  });

  lab.test('Create chapter by uploading markdown file', function (done) {

    app
      .post('/chapters/upload')
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

    chapterFixture.title = 'Not the Old One';

    app
      .post('/chapters')
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

    app
      .patch('/chapters/fake_id')
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

    app
      .patch('/chapters/' + chapterFixture.id)
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

    app
      .get('/chapters/' + chapterFixture.id)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;
        expect(res.text).to.be.string;

        done(null);

      });

  });

  lab.test('List chapters by title', function (done) {

    app
      .get('/chapters?title=' + chapterFixture.title)
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function (err, res) {

        if (err) return done(err);

        expect(res).to.be.ok;

        var doc = res.body;

        expect(doc).to.be.array;
        expect(doc[0].title).to.equal(chapterFixture.title);

        done(null);

      });

  });

  lab.test('delete chapter', function (done) {

    app
      .delete('/chapters/' + chapterFromDisk.id)
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
    app
      .del('/chapters/' + chapterFixture.id)
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
