'use strict';

/* eslint-disable no-unused-expressions */

var Lab       = require('lab');
var Code      = require('code');
var supertest = require('supertest');
var server    = require('../');

var lab    = exports.lab = Lab.script();
var expect = Code.expect;
var app    = supertest('http://localhost:8888');

lab.experiment('story', function () {

  var story = {
    name: 'mock-story',
    path: 'test/fixtures/mock-story.md'
  };

  lab.before(function (done) {
    server.start();

    done();
  });

  lab.test('upload story', function (done) {

    app
      .post('/story/upload')
      .attach('story', story.path)
      .expect(201)
      .end(function (err, res) {

        if (err) done(err);

        expect(res).to.be.ok;

        done(null);

      });

  });

  lab.test('get story', function (done) {

    app
      .get('/story/' + story.name)
      .expect(200)
      .end(function (err, res) {

        if (err) done(err);

        expect(res).to.be.ok;

        done(null);

      });

  });

  lab.after(function (done) {
    server.stop();

    done();
  });

});
