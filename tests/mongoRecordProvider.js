const tape = require('tape');
const ArgumentError = require('auth0-extension-tools').ArgumentError;

const tools = require('../src');
const MongoRecordProvider = require('../src/mongoRecordProvider');

tape('module should expose the MongoRecordProvider', function(t) {
  t.ok(MongoRecordProvider === tools.MongoRecordProvider);
  t.end();
});

tape('MongoRecordProvider#constructor should throw error if connectionString is not provided', function(t) {
  try {
    const ctx = new MongoRecordProvider();
  } catch (e) {
    t.ok(e);
    t.ok(e instanceof ArgumentError);
    t.end();
  }
});

tape('MongoRecordProvider#constructor should throw error if connectionString is invalid', function(t) {
  try {
    const ctx = new MongoRecordProvider(123);
  } catch (e) {
    t.ok(e);
    t.ok(e instanceof ArgumentError);
    t.end();
  }
});

tape('MongoRecordProvider#getAll should throw error if connection fails', function(t) {
  const ctx = new MongoRecordProvider('mongodb://foo.bar.tld:1000');
  ctx.getAll('users')
    .catch(function(e) {
      t.ok(e);
      t.ok(e.name);
      t.equal(e.name, 'MongoError');
      t.end();
    });
});
