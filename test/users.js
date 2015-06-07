'use strict';

/* eslint-disable no-unused-expressions */

var Lab       = require('lab');
var Code      = require('code');
var supertest = require('supertest');
var server    = require('../');

var lab    = exports.lab = Lab.script();
var expect = Code.expect;
var app    = supertest('http://localhost:8888');

lab.experiment('user', function () {

  var user = {
    username: 'testuser-user',
    password: 'password',
    token:    ''
  };

  var userForRegistration = {
    username: user.username,
    password: user.password,
    email:    'reallycool@hotmail.com'
  };

  lab.before(function (done) {
    server.start();

    done();
  });

  lab.test('Create user', function (done) {

    app
      .post('/users/create')
      .send(userForRegistration)
      .set('Accept', 'application/json')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(201)
      .end(function(err, res) {

        if (err) return done(err);

        var doc = res.body;

        expect(doc.ok).to.be.true();
        expect(doc.id).to.equal('org.couchdb.user:' + user.username);

        done(null);

      });

  });

  lab.test('Attempt login with non-existant user', function (done) {

    app
      .post('/users/login')
      .send({ username: 'whereami', password: user.password })
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(401)
      .end(function(err, res) {

        if (err) return done(err);

        var doc = res.body;

        expect(doc.message).to.equal('User not found');

        done(null);

      });

  });

  lab.test('Login user', function (done) {

    app
      .post('/users/login')
      .send(user)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) return done(err);

        var doc = res.text;

        expect(doc).to.be.string();

        user.token = doc;

        done(null);

      });

  });

  lab.test('Validate totken', function (done) {

    app
      .get('/users/validate')
      .set('Authorization', 'Bearer ' + user.token)
      .expect(200)
      .end(function(err, res) {

        if (err) return done(err);

        var doc = res.body;

        expect(doc).to.be.object();

        done(null);

      });

  });

  lab.test('Update user', function (done) {

    app
      .put('/users/' + user.username)
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .send({ scope: ['god']})
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) return done(err);

        var doc = res.body;

        expect(doc).to.be.ok;

        done(null);

      });

  });

  lab.test('Get user', function (done) {

    app
      .get('/users/' + user.username)
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) return done(err);

        var doc = res.body;

        expect(doc).to.be.object();

        done(null);

      });

  });

  lab.test('List user\'s stories', function (done) {

    app
      .get('/users/' + user.username + '/stories')
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) return done(err);

        var doc = res.body;

        expect(doc).to.be.array();

        done(null);

      });

  });

  lab.test('List users', function (done) {

    app
      .get('/users')
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) return done(err);

        var doc = res.body;

        expect(doc).to.be.array();

        done(null);

      });

  });

  lab.test('Delete user', function (done) {

    app
      .del('/users/' + user.username)
      .set('Authorization', 'Bearer ' + user.token)
      .set('Accept', 'application/json')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect(200)
      .end(function(err, res) {

        if (err) return done(err);

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
