const async = require('async');
const MongoClient = require('mongodb').MongoClient;

const MemoizedConnect = async.memoize(function(connectionString, options, callback) {
  MongoClient.connect.apply(MongoClient.connect, [ connectionString, options, callback ]);
});

module.exports = function(connectionString, options) {
  return function(callback) {
    const done = function(err, db) {
      callback(err, db);
    };

    MemoizedConnect(connectionString, options, function(err, db) {
      if (err) {
        return done(err);
      }

      return done(null, db);
    });
  };
};
