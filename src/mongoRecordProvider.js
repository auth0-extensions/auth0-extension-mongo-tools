const url = require('url');
const uuid = require('node-uuid');
const Promise = require('bluebird');
const ArgumentError = require('auth0-extension-tools').ArgumentError;
const NotFoundError = require('auth0-extension-tools').NotFoundError;
const ValidationError = require('auth0-extension-tools').ValidationError;

const getDbFactory = require('./getDb');

/**
 * Create a new MongoRecordProvider.
 * @param {string} connectionString The connection string.
 * @param {Object} options The MongoDB connection options.
 * @constructor
 */
function MongoRecordProvider(connectionString, options) {
  if (connectionString === null || connectionString === undefined) {
    throw new ArgumentError('Must provide a connectionString');
  }

  if (typeof connectionString !== 'string' || connectionString === 0) {
    throw new ArgumentError('The provided connectionString is invalid: ' + connectionString);
  }

  if (options === null || options === undefined) {
    const replicaSet = url.parse(connectionString, true).query.replicaSet;
    const connectionOptions = {
      server: {
        auto_reconnect: true,
        socketOptions: {
          connectTimeoutMS: 2000,
          keepAlive: 300
        }
      }
    };

    if (replicaSet) {
      connectionOptions.replSet = {
        rs_name: replicaSet,
        socketOptions: {
          connectTimeoutMS: 2000,
          keepAlive: 300
        }
      };
      connectionString = connectionString.slice(0, url.parse(connectionString, true).search.length * -1);
    }

    options = connectionOptions;
  }

  this.getDb = getDbFactory(connectionString, options);
}

/**
 * Get all records for a collection.
 * @param {string} collectionName The name of the collection.
 * @return {Array} The records.
 */
MongoRecordProvider.prototype.getAll = function(collectionName) {
  const getDb = this.getDb;
  return new Promise(function(resolve, reject) {
    getDb(function(err, db) {
      if (err) {
        return reject(err);
      }

      return db.collection(collectionName)
        .find({ })
        .toArray(function(dbError, records) {
          if (dbError) {
            return reject(dbError);
          }

          return resolve(records);
        });
    });
  });
};

/**
 * Get a single record from a collection.
 * @param {string} collectionName The name of the collection.
 * @param {string} identifier The identifier of the record.
 * @return {Object} The record.
 */
MongoRecordProvider.prototype.get = function(collectionName, identifier) {
  const getDb = this.getDb;
  return new Promise(function(resolve, reject) {
    getDb(function(err, db) {
      if (err) {
        return reject(err);
      }

      return db.collection(collectionName)
        .find({ _id: identifier })
        .toArray(function(dbError, records) {
          if (dbError) {
            return reject(dbError);
          }

          if (!records || records.length === 0) {
            return reject(new NotFoundError('The record ' + identifier + ' in ' + collectionName + ' does not exist.'));
          }

          return resolve(records[0]);
        });
    });
  });
};

/**
 * Create a record in a collection.
 * @param {string} collectionName The name of the collection.
 * @param {Object} record The record.
 * @return {Object} The record.
 */
MongoRecordProvider.prototype.create = function(collectionName, record) {
  const getDb = this.getDb;
  return new Promise(function(resolve, reject) {
    getDb(function(err, db) {
      if (err) {
        return reject(err);
      }

      if (!record._id) {
        record._id = uuid.v4();
      }

      return db.collection(collectionName)
        .insertOne(record, function(dbError) {
          if (dbError && dbError.name === 'MongoError' && dbError.code === 11000) {
            return reject(
              new ValidationError('The record ' + record._id + ' in ' + collectionName + ' already exists.')
            );
          } else if (dbError) {
            return reject(dbError);
          }

          return resolve(record);
        });
    });
  });
};

/**
 * Update a record in a collection.
 * @param {string} collectionName The name of the collection.
 * @param {string} identifier The identifier of the record to update.
 * @param {Object} record The record.
 * @param {boolean} upsert Flag allowing to upsert if the record does not exist.
 * @return {Object} The record.
 */
MongoRecordProvider.prototype.update = function(collectionName, identifier, record, upsert) {
  const getDb = this.getDb;
  return new Promise(function(resolve, reject) {
    getDb(function(err, db) {
      if (err) {
        return reject(err);
      }

      if (!record._id) {
        record._id = identifier;
      }

      return db.collection(collectionName)
        .update({ _id: identifier }, { $set: record }, { upsert: !!upsert }, function(dbError, status) {
          if (dbError) {
            return reject(dbError);
          }

          if (status && status.result && (status.result.nModified === 0 && (status.result.upserted && status.result.upserted.length === 0))) {
            return reject(new NotFoundError('The record ' + record._id + ' in ' + collectionName + ' does not exist.'));
          }

          return db.collection(collectionName)
            .find({ _id: identifier })
            .toArray(function(dbError, records) {
              if (dbError) {
                return reject(dbError);
              }

              if (records && records.length) {
                return resolve(records[0]);
              }

              return reject(new NotFoundError('The record ' + record._id + ' in ' + collectionName + ' does not exist.'));
            });
        });
    });
  });
};

/**
 * Delete a record in a collection.
 * @param {string} collectionName The name of the collection.
 * @param {string} identifier The identifier of the record to update.
 */
MongoRecordProvider.prototype.delete = function(collectionName, identifier) {
  const getDb = this.getDb;
  return new Promise(function(resolve, reject) {
    getDb(function(err, db) {
      if (err) {
        return reject(err);
      }

      return db.collection(collectionName)
        .removeOne({ _id: identifier })
        .then(function(status) {
          resolve(status && status.result && status.result.ok && status.result.n);
        })
        .catch(reject);
    });
  });
};

/**
 * Close the connection to the database.
 */
MongoRecordProvider.prototype.closeConnection = function() {
  const getDb = this.getDb;
  return new Promise(function(resolve, reject) {
    getDb(function(err, db) {
      if (err) {
        return reject(err);
      }

      return db.close(function() {
        return resolve();
      });
    });
  });
};

/**
 * Module exports.
 * @type {function}
 */
module.exports = MongoRecordProvider;
