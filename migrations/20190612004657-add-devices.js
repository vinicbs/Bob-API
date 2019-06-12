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

exports.up = function(db) {
  db.createTable('devices', {
    id: {
      type: 'int',
      unsigned: true,
      notNull: true,
      primaryKey: true,
      autoIncrement: true
    },
    user_id:
    {
      type: 'int',
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: 'devices_users_id_fk',
        table: 'users',
        rules: {
          onDelete: 'CASCADE',
          onUpdate: 'RESTRICT'
        },
        mapping: {
          user_id: 'id'
        }
      }
    },
    name: {
      type: 'string',
      notNull: true,
      length: 150
    },
    imei: {
      type: 'string',
      notNull: true,
      length: 150
    }
  })
  return null;
};

exports.down = function(db) {
  db.dropTable('devices')
  return null;
};

exports._meta = {
  "version": 1
};
