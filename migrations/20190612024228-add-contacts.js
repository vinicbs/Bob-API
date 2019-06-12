'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  db.createTable('contacts', {
    id: {
      type: 'int',
      unsigned: true,
      notNull: true,
      primaryKey: true,
      autoIncrement: true
    },
    device_id:
    {
      type: 'int',
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: 'contacts_devices_id_fk',
        table: 'devices',
        rules: {
          onDelete: 'CASCADE',
          onUpdate: 'RESTRICT'
        },
        mapping: {
          device_id: 'id'
        }
      }
    },
    name: {
      type: 'string',
      notNull: true,
      length: 150
    },
    email: {
      type: 'string',
      notNull: true,
      length: 150
    },
    message: {
      type: 'string',
      length: 300
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
  db.dropTable('contacts')
  return null;
};
exports._meta = {
  "version": 1
};
