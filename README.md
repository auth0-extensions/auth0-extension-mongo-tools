# Auth0 Extension Tools for MongoDB

A set of tools and utilities to simplify the development of Auth0 Extensions for MongoDB.

## Usage

```js
const tools = require('auth0-extension-mongo-tools');
```

### Records

A record provider exposes CRUD capabilities which makes it easy to interact with records from an Extension (eg: delete a record, update a record, ...). Depending on the underlying storage you may or may not have support for concurrency.

```js
const db = new tools.MongoRecordProvider('mongodb://foo.bar.tld:1000');
db.getRecords('documents')
  .then(function (documents) {
    console.log('All documents:', documents);
  });

db.getRecord('documents', '12345')
  .then(function (doc) {
    console.log('Document:', doc);
  });

db.create('documents', { name: 'my-foo.docx' })
  .then(function (doc) {
    console.log('Document:', doc);
  });

db.create('documents', { _id: 'my-custom-id', name: 'my-foo.docx' })
  .then(function (doc) {
    console.log('Document:', doc);
  });

// Update document with id 1939393
db.update('documents', 1939393, { name: 'my-foo.docx' })
  .then(function (doc) {
    console.log('Document:', doc);
  });

// Update document with id 1939393. If it doesn't exist, create it (upsert).
const upsert = true;
db.update('documents', 1939393, { name: 'my-foo.docx' }, upsert)
  .then(function (doc) {
    console.log('Document:', doc);
  });

db.delete('documents', 1939393)
  .then(function(hasBeenDeleted) {

  });
```
