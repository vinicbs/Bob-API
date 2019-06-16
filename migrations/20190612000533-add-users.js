'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  db.createTable('users', {
    id: {
      type: 'int',
      unsigned: true,
      notNull: true,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: 'string',
      notNull: true,
      length: 150
    },
    email: {
      type: 'string',
      unique: true,
      notNull: true,
      length: 150
    },
    password: {
      type: 'string',
      notNull: true,
      length: 150
    },
    country: {
      type: 'string',
      notNull: true,
      length: 150
    },
    state: {
      type: 'string',
      length: 150
    },
    city: {
      type: 'string',
      length: 150
    },
    address: {
      type: 'string',
      length: 150
    },
    phone: {
      type: 'string',
      notNull: true,
      length: 50
    }
  })
  return null;
};

exports.down = function (db) {
  db.dropTable('users')
  return null;
};

exports._meta = {
  "version": 1
};
