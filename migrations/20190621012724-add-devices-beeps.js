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
  db.createTable('devices_beeps', {
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
				name: 'devices_beeps_devices_id_fk',
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
		beeped: {
			type: 'int',
			notNull: true,
			defaultValue: 0
		},
		latitude: {
			type: 'string',
			notNull: true,
			length: 150
		},
		longitude: {
			type: 'string',
			notNull: true,
			length: 150
		},
		height: {
			type: 'string',
			length: 150
		},
		direction: {
			type: 'string',
			length: 150
		},
		speed: {
			type: 'string',
			length: 150
		},
		number_satellites: {
			type: 'int',
		},
		timezone: {
			type: 'int',
		},
		created_at: {
			type: 'timestamp',
			notNull: true,
			defaultValue: new String('CURRENT_TIMESTAMP')
		}
	})
	return null;
};

exports.down = function(db) {
  db.dropTable('devices_beeps')
  return null;
};

exports._meta = {
  "version": 1
};
