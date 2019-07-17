var express = require('express');
var router = express.Router();
var errorsConstants = require('../utils/errorsConstants')
var useful = require('../utils/useful')

var DB = require('../db').DB,
    knex = DB.knex;

// URL: /contacts/save
// Method: POST
// URL Params: []
/*  Body:
    {
        id: int [dont send for update]
        device_id: int
        name: string
        email: string
        message: string
        phone: string
    }
*/
/*  Response:
        Success:
            data: {
                id
            }
        Error:
            Missing fields:     { errorCode: 2001 }
            Error in query:     { errorCode: 2003 }
*/
router.post('/save', validToken, function (req, res, next) {
    if ((req.body.id == null) || (req.body.id == '')) {
        if ((req.body.name == null) || (req.body.name == "")
            || (req.body.device_id == null) || (req.body.device_id == 0)
            || (req.body.email == null) || (req.body.email == "")
            || (req.body.message == null) || (req.body.message == "")
            || (req.body.phone == null) || (req.body.phone == "")) {

            var fields = '';
            fields += ((req.body.name == null) || (req.body.name == "")) ? 'name' : '';
            fields += ((req.body.email == null) || (req.body.email == "")) ? 'email' : '';
            fields += ((req.body.message == null) || (req.body.message == "")) ? 'message' : '';
            fields += ((req.body.phone == null) || (req.body.phone == "")) ? 'phone' : '';

            res.json({
                success: false,
                errorCode: errorsConstants.ContactsErrors.missingFields,
                data: null,
                message: 'Required fields have not been entered. Fields: ' + fields
            });
        } else {
            knex.insert({
                name: req.body.name, device_id: req.body.device_id, email: req.body.email,
                message: req.body.message, phone: req.body.phone
            }).returning('id').into('contacts').then(function (id) {
                res.json({
                    success: true,
                    errorCode: errorsConstants.noError,
                    data: id[0],
                    message: 'Contact added.'
                });
            }).catch(function (err) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.ContactsErrors.queryError,
                    data: err,
                    message: 'Error accessing information, insert contact'
                });
            })
        }
    } else {
        knex.select().from('contacts').where('id', '=', req.body.id).then(function (result) {

            var name = (((req.body.name == null) || (req.body.name == "")) ? result[0].name : req.body.name);
            var device_id = (((req.body.device_id == null) || (req.body.device_id == "")) ? result[0].device_id : req.body.device_id);
            var email = (((req.body.email == null) || (req.body.email == "")) ? result[0].email : req.body.email);
            var message = (((req.body.message == null) || (req.body.message == "")) ? result[0].message : req.body.message);
            var phone = (((req.body.phone == null) || (req.body.phone == "")) ? result[0].phone : req.body.phone);
            knex('contacts')
                .where('id', '=', req.body.id)
                .update({ name: name, device_id: device_id, email: email, message: message, phone: phone }).then(function (count) {
                    res.json({
                        success: true,
                        errorCode: errorsConstants.noError,
                        data: req.body.id,
                        message: 'Device updated.'
                    });
                }).catch(function (err) {
                    res.json({
                        success: false,
                        errorCode: errorsConstants.ContactsErrors.queryError,
                        data: err,
                        message: 'Error accessing information, update post'
                    });
                });
        }).then(null, function (err) {
            res.json({
                success: false,
                errorCode: errorsConstants.ContactsErrors.queryError,
                data: err,
                message: 'Error accessing information.'
            });
        });
    }
})

// URL: /contacts/list
// Method: GET
// URL Params: [pageSize, page, device_id]
/*  Response:
        Success:
            data: array list of contacts objects
            total: int
        Error:
            Missing fields:     { errorCode: 2001 }
            Error in query:     { errorCode: 2003 }
*/
router.get('/list', validToken, function (req, res, next) {
    var userId = useful.getUserIdInToken(req.headers['x-access-token']);

    // If query doesn't include page or pageSize, insert default values
    var pageSize = ((req.query.pageSize == null) ? 10 : req.query.pageSize);
    var page = ((req.query.page == null) ? 1 : req.query.page);

    // If query doesn't include device_id, return error msg
    if ((req.query.device_id == null) || (req.query.device_id == 0)) {
        res.json({
            success: false,
            errorCode: errorsConstants.ContactsErrors.missingFields,
            data: null,
            message: 'Required field have not been entered. Fields: device_id'
        });
    }
    var deviceId = req.query.device_id;

    // Check if device_id in query exists in user_id provided by the token
    var query = knex('devices').count()
        .where('user_id', '=', userId)
        .where('id', '=', deviceId);
    query.then(function (results) {
        var count = results[0].count;

        if (count > 0) {
            var query = knex('contacts').select('*')
                .where('device_id', '=', deviceId)
                .orderBy('contacts.id', 'desc')
                .limit(pageSize)
                .offset(pageSize * (page - 1));

            query.then(function (results) {
                res.json({
                    success: true,
                    errorCode: errorsConstants.noError,
                    pageSize: pageSize,
                    data: results,
                    message: 'Return OK.'
                });
            }).catch(function (err) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.ContactsErrors.queryError,
                    data: err,
                    message: 'Error accessing information.'
                });
            });
        } else {
            res.json({
                success: false,
                errorCode: errorsConstants.ContactsErrors.deviceNotFound,
                data: null,
                message: 'Device not found.'
            });
        }
    }).catch(function (err) {
        res.json({
            success: false,
            errorCode: errorsConstants.ContactsErrors.queryError,
            data: err,
            message: 'Error accessing information.'
        });
    });
});

// URL: /contacts/list/all
// Method: GET
// URL Params: [device_id]
/*  Response:
        Success:
            data: array list of contacts objects
            total: int
        Error:
            Missing fields:     { errorCode: 2001 }
            Error in query:     { errorCode: 2003 }
*/
router.get('/list/all', validToken, function (req, res, next) {
    console.log('oi')
    var userId = useful.getUserIdInToken(req.headers['x-access-token']);
    // If query doesn't include device_id, return error msg
    if ((req.query.device_id == null) || (req.query.device_id == 0)) {
        res.json({
            success: false,
            errorCode: errorsConstants.ContactsErrors.missingFields,
            data: null,
            message: 'Required field have not been entered. Fields: device_id'
        });
    }
    var deviceId = req.query.device_id;

    // Check if device_id in query exists in user_id provided by the token
    var query = knex('devices').count()
        .where('user_id', '=', userId)
        .where('id', '=', deviceId);
    query.then(function (results) {
        var count = results[0].count;

        if (count > 0) {
            var query = knex('contacts').select('*')
                .where('device_id', '=', deviceId)
                .orderBy('contacts.id', 'desc')

            query.then(function (results) {
                res.json({
                    success: true,
                    errorCode: errorsConstants.noError,
                    data: results,
                    message: 'Return OK.'
                });
            }).catch(function (err) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.ContactsErrors.queryError,
                    data: err,
                    message: 'Error accessing information.'
                });
            });
        } else {
            res.json({
                success: false,
                errorCode: errorsConstants.ContactsErrors.deviceNotFound,
                data: null,
                message: 'Device not found.'
            });
        }
    }).catch(function (err) {
        res.json({
            success: false,
            errorCode: errorsConstants.ContactsErrors.queryError,
            data: err,
            message: 'Error accessing information.'
        });
    });
});

// URL: /contacts/delete
// Method: GET
// URL Params: [id]
/*  Response:
        Success:
            data: bool
        Error:
            Missing fields:     { errorCode: 3001 }
            Contact not found:  { errorCode: 3002 }
            Error in query:     { errorCode: 3003 }
            Device not found:   { errorCode: 3004 }
*/
router.get('/delete', validToken, function (req, res, next) {

    if ((req.query.id == null) || (req.query.id == "")) {

        res.json({
            success: false,
            errorCode: errorsConstants.ContactsErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: id'
        });
    } else {
        // Busca o id do usuário logado recebido no token
        var userId = useful.getUserIdInToken(req.headers['x-access-token']);

        // find contact device_id
        var query = knex('contacts').select('device_id')
            .where('id', '=', req.query.id)
        query.then(function (results) {
            if (results[0].device_id) {
                //Check if device_id exists in user_id provided by the token
                var query = knex('devices').count()
                    .where('user_id', '=', userId)
                    .where('id', '=', results[0].device_id);
                query.then(function (results) {
                    var count = results[0].count;
                    if (count > 0) {
                        knex('contacts')
                            .where('id', '=', req.query.id)
                            .del().then(function (count) {
                                if (count === 0) {
                                    res.json({
                                        success: false,
                                        errorCode: errorsConstants.ContactsErrors.contactNotFound,
                                        data: null,
                                        message: 'Contact not found'
                                    });
                                } else {
                                    res.json({
                                        success: true,
                                        errorCode: errorsConstants.noError,
                                        data: true,
                                        message: 'Contact removed.'
                                    });
                                }
                            }).catch(function (err) {
                                res.json({
                                    success: false,
                                    errorCode: errorsConstants.ContactsErrors.queryError,
                                    data: err,
                                    message: 'Error accessing information.'
                                });
                            });
                    } else {
                        res.json({
                            success: false,
                            errorCode: errorsConstants.ContactsErrors.deviceNotFound,
                            data: null,
                            message: 'Device not found.'
                        });
                    }
                })
            }
        }).catch(function (err) {
            res.json({
                success: false,
                errorCode: errorsConstants.ContactsErrors.contactNotFound,
                data: err,
                message: 'Contact not found.'
            });
        });
    }
})

module.exports = router;

function validToken(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.headers['x-access-token'];
    // decode token
    if (token) {

        useful.validToken(token, function (err, result) {

            if (result)
                next();
            else
                return res.json({ success: false, message: 'Failed to authenticate token.' });
        });
    }
    else {

        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
}
