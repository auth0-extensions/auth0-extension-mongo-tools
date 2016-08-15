const tape = require('tape');
const MongoClient = require('mongodb').MongoClient;
const ArgumentError = require('auth0-extension-tools').ArgumentError;
const NotFoundError = require('auth0-extension-tools').NotFoundError;
const ValidationError = require('auth0-extension-tools').ValidationError;

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

tape('MongoRecordProvider#getAll should return all records', function(t) {
  MongoClient.connect('mongodb://mongodb/test1', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
      .then(function() {
        const ctx = new MongoRecordProvider('mongodb://mongodb/test1');
        ctx.getAll('users')
          .then(function(users) {
            t.ok(users);
            t.equal(users.length, 2);
            t.equal(users[1].name, 'Jane');
            db.close();
            ctx.closeConnection();
            t.end();
          });
      });
  });
});

tape('MongoRecordProvider#getAll should return empty array if collection does not exist', function(t) {
  MongoClient.connect('mongodb://mongodb/test2', function(err, db) {
    const ctx = new MongoRecordProvider('mongodb://mongodb/test2');
    ctx.getAll('users')
      .then(function(data) {
        t.ok(data);
        t.equal(data.length, 0);
        db.close();
        ctx.closeConnection();
        t.end();
      });
  });
});

tape('MongoRecordProvider#get should return a record by its id', function(t) {
  MongoClient.connect('mongodb://mongodb/test3', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const ctx = new MongoRecordProvider('mongodb://mongodb/test3');
      ctx.get('users', 23)
        .then(function(user) {
          t.ok(user);
          t.equal(user.name, 'Jane');
          db.close();
          ctx.closeConnection();
          t.end();
        });
    });
  });
});

tape('MongoRecordProvider#get should return a NotFound error if record does not exist', function(t) {
  MongoClient.connect('mongodb://mongodb/test4', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const ctx = new MongoRecordProvider('mongodb://mongodb/test4');
      ctx.get('users', 545)
        .catch(function(e) {
          t.ok(e);
          t.ok(e instanceof NotFoundError);
          db.close();
          ctx.closeConnection();
          t.end();
        });
    });
  });
});

tape('MongoRecordProvider#create should add a new record to the collection', function(t) {
  MongoClient.connect('mongodb://mongodb/test5', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const ctx = new MongoRecordProvider('mongodb://mongodb/test5');
      ctx.create('users', { _id: 5, name: 'User 5' })
        .then(function(user) {
          t.ok(user);
          t.equal(user._id, 5);
          t.equal(user.name, 'User 5');

          db.collection('users').findOne({ _id: 5 })
            .then(function(dbUser) {
              t.equal(dbUser._id, 5);
              t.equal(dbUser.name, 'User 5');
              db.close();
              ctx.closeConnection();
              t.end();
            });
        });
    });
  });
});

tape('MongoRecordProvider#create should generate its own id if not provided', function(t) {
  MongoClient.connect('mongodb://mongodb/test6', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const ctx = new MongoRecordProvider('mongodb://mongodb/test6');
      ctx.create('users', { name: 'User 5' })
        .then(function(user) {
          t.ok(user);
          t.equal(user._id.length, 36);
          t.equal(user.name, 'User 5');

          db.collection('users').findOne({ _id: user._id })
            .then(function(dbUser) {
              t.equal(dbUser._id, user._id);
              t.equal(dbUser.name, 'User 5');
              db.close();
              ctx.closeConnection();
              t.end();
            });
        });
    });
  });
});

tape('MongoRecordProvider#create should not allow duplicate identifiers', function(t) {
  MongoClient.connect('mongodb://mongodb/test7', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const ctx = new MongoRecordProvider('mongodb://mongodb/test7');
      ctx.create('users', { _id: 1, name: 'User 5' })
        .catch(function(err) {
          t.ok(err);
          t.ok(err instanceof ValidationError);
          db.close();
          ctx.closeConnection();
          t.end();
        });
    });
  });
});

tape('MongoRecordProvider#create should handle errors when connection is closed', function(t) {
  MongoClient.connect('mongodb://mongodb/test15', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const provider = new MongoRecordProvider('mongodb://mongodb/test15');
      db.close();
      provider.closeConnection();
      provider.create('users', { _id: 1, name: 'User 5' })
        .catch(function(e) {
          t.ok(e);
          t.end();
        });
    });
  });
});

tape('MongoRecordProvider#update should handle errors when connection is closed', function(t) {
  MongoClient.connect('mongodb://mongodb/test14', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const provider = new MongoRecordProvider('mongodb://mongodb/test14');
      db.close();
      provider.closeConnection();
      provider.update('users', 23, { name: 'User 6', foo: 'bar' })
        .catch(function(e) {
          t.ok(e);
          t.end();
        });
    });
  });
});

tape('MongoRecordProvider#update should update records correctly', function(t) {
  MongoClient.connect('mongodb://mongodb/test8', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const provider = new MongoRecordProvider('mongodb://mongodb/test8');
      provider.update('users', 23, { name: 'User 6', foo: 'bar' })
        .then(function(user) {
          t.ok(user);
          t.ok(user._id);
          t.equal(user.foo, 'bar');
          t.equal(user.name, 'User 6');

          db.collection('users').findOne({ _id: 23 })
            .then(function(dbUser) {
              t.equal(dbUser._id, user._id);
              t.equal(dbUser.name, 'User 6');
              db.close();
              provider.closeConnection();
              t.end();
            });
        });
    });
  });
});

tape('MongoRecordProvider#update should merge records correctly', function(t) {
  MongoClient.connect('mongodb://mongodb/test18', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane', nickname: 'jane' } ])
    .then(function() {
      const provider = new MongoRecordProvider('mongodb://mongodb/test18');
      provider.update('users', 23, { name: 'User 6', foo: 'bar' })
        .then(function(user) {
          t.ok(user);
          t.ok(user._id);
          t.equal(user.foo, 'bar');
          t.equal(user.name, 'User 6');
          t.equal(user.nickname, 'jane');

          db.collection('users').findOne({ _id: 23 })
            .then(function(dbUser) {
              t.equal(dbUser._id, user._id);
              t.equal(dbUser.name, 'User 6');
              t.equal(dbUser.nickname, 'jane');
              db.close();
              provider.closeConnection();
              t.end();
            });
        });
    });
  });
});

tape('MongoRecordProvider#update should upsert records correctly', function(t) {
  MongoClient.connect('mongodb://mongodb/test9', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const provider = new MongoRecordProvider('mongodb://mongodb/test9');
      provider.update('users', 24, { name: 'User 6', foo: 'bar' }, true)
        .then(function(user) {
          t.ok(user);
          t.ok(user._id);
          t.equal(user.foo, 'bar');
          t.equal(user.name, 'User 6');

          db.collection('users').findOne({ _id: 24 })
            .then(function(dbUser) {
              t.equal(dbUser._id, user._id);
              t.equal(dbUser.name, 'User 6');
              db.close();
              provider.closeConnection();
              t.end();
            });
        });
    });
  });
});

tape('MongoRecordProvider#update should throw error if record does not exist', function(t) {
  MongoClient.connect('mongodb://mongodb/test10', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const provider = new MongoRecordProvider('mongodb://mongodb/test10');
      provider.update('users', 24, { name: 'User 6', foo: 'bar' })
        .catch(function(err) {
          t.ok(err);
          t.ok(err instanceof NotFoundError);
          db.close();
          provider.closeConnection();
          t.end();
        });
    });
  });
});

tape('MongoRecordProvider#delete should handle errors when connection is closed', function(t) {
  MongoClient.connect('mongodb://mongodb/test13', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const provider = new MongoRecordProvider('mongodb://mongodb/test13');
      db.close();
      provider.closeConnection();
      provider.delete('users', 23)
        .catch(function(e) {
          t.ok(e);
          t.end();
        });
    });
  });
});

tape('MongoRecordProvider#delete should return true if record exists', function(t) {
  MongoClient.connect('mongodb://mongodb/test11', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const provider = new MongoRecordProvider('mongodb://mongodb/test11');
      provider.delete('users', 23)
        .then(function(deleted) {
          t.ok(deleted);

          db.collection('users').find({ })
            .toArray(function(dbError, users) {
              t.equal(users.length, 1);
              t.equal(users[0]._id, 1);
              t.equal(users[0].name, 'John');
              db.close();
              provider.closeConnection();
              t.end();
            });
        });
    });
  });
});

tape('MongoRecordProvider#delete should return false if record does not exist', function(t) {
  MongoClient.connect('mongodb://mongodb/test12', function(err, db) {
    db.collection('users').insertMany([ { _id: 1, name: 'John' }, { _id: 23, name: 'Jane' } ])
    .then(function() {
      const provider = new MongoRecordProvider('mongodb://mongodb/test12');
      provider.delete('users', 24)
        .then(function(deleted) {
          t.notOk(deleted);

          db.collection('users').find({ })
            .toArray(function(dbError, users) {
              t.equal(users.length, 2);
              t.equal(users[0]._id, 1);
              t.equal(users[0].name, 'John');
              db.close();
              provider.closeConnection();
              t.end();
            });
        });
    });
  });
});
