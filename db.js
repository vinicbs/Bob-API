const knex = require('knex')({
    client: 'postgres',
    // Uncomment to enable SQL query logging in console.
    // debug   : true,

    //*** Local
    connection: {
        host: '127.0.0.1',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: 'bob',
        charset: 'utf8',
    }
});

var DB = require('bookshelf')(knex);

module.exports.DB = DB;