'use strict';

var Lab       = require('lab');
var Code      = require('code');
var supertest = require('supertest');
var server    = require('../');

var lab    = exports.lab = Lab.script();
var expect = Code.expect;
var app    = supertest('http://localhost:8888');

lab.experiment('user', function () {

  var user = {
    username: 'testuser',
    password: 'password'
  };

  lab.before(function (done) {
    server.start();

    done();
  });

  lab.test('Create user', function (done) {

    app
      .post('/user/create')
      .send(user)
      .set('Accept', 'application/json')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(201)
      .end(function(err, res) {

        if (err) done(err);

        var doc = res.body;

        expect(doc.ok).to.be.true();
        expect(doc.id).to.equal('org.couchdb.user:testuser');

        done(null);

      });

  });

  lab.test('Login user', function (done) {

    app
      .post('/user/login')
      .send(user)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) done(err);

        var doc = res.text;

        expect(doc).to.be.string();

        done(null);

      });

  });

  lab.test('Get user', function (done) {

    app
      .get('/user/' + user.username)
      .set('Accept', 'application/json')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) done(err);

        var doc = res.body;

        expect(doc).to.be.object();

        done(null);

      });

  });

  lab.test('List users', function (done) {

    app
      .get('/user')
      .set('Accept', 'application/json')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) done(err);

        var doc = res.body;

        expect(doc).to.be.object();

        done(null);

      });

  });

  lab.test('Delete user', function (done) {

    app
      .delete('/user/' + user.username)
      .set('Accept', 'application/json')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) done(err);

        var doc = res.body;

        expect(doc.ok).to.be.true();

        done(null);

      });
  });

  lab.after(function (done) {
    server.stop();

    done();
  });

});
