var express = require('express');
var router = express.Router();
var errorsConstants = require('../utils/errorsConstants')
var CryptoJS = require("crypto-js")
var useful = require('../utils/useful')

var DB = require('../db').DB,
    knex = DB.knex;

// URL: /devices/save
// Method: POST
// URL Params: []
/*  Body:
    {
        id: int [dont send for update]
        name: string
        imei: string
        user_id: int
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
        if ((req.body.name == null) || (req.body.name == "") || (req.body.imei == null) || (req.body.imei == "")) {

            var fields = '';
            fields += ((req.body.name == null) || (req.body.name == "")) ? 'name' : '';
            fields += ((req.body.imei == null) || (req.body.imei == "")) ? 'imei' : '';

            res.status(500).json({
                success: false,
                errorCode: errorsConstants.DevicesErrors.missingFields,
                data: null,
                message: 'Required fields have not been entered. Fields: ' + fields
            });
        } else {
            knex.insert({
                name: req.body.name, user_id: req.body.user_id, imei: req.body.imei
            }).returning('id').into('devices').then(function (id) {
                res.json({
                    success: true,
                    errorCode: errorsConstants.noError,
                    data: id[0],
                    message: 'Device added.'
                });
            }).catch(function (err) {
                res.status(500).json({
                    success: false,
                    errorCode: errorsConstants.DevicesErrors.queryError,
                    data: err,
                    message: 'Error accessing information, insert device'
                });
            })
        }
    } else {
        knex.select().from('devices').where('id', '=', req.body.id).then(function (result) {

            var name = (((req.body.name == null) || (req.body.name == "")) ? result[0].name : req.body.name);
            var imei = (((req.body.imei == null) || (req.body.imei == "")) ? result[0].imei : req.body.imei);
            var user_id = (((req.body.user_id == null) || (req.body.user_id == "")) ? result[0].user_id : req.body.user_id);
            knex('devices')
                .where('id', '=', req.body.id)
                .update({ name: name, imei: imei, user_id: user_id }).then(function (count) {
                    res.json({
                        success: true,
                        errorCode: errorsConstants.noError,
                        data: req.body.id,
                        message: 'Device updated.'
                    });
                }).catch(function (err) {
                    res.status(500).json({
                        success: false,
                        errorCode: errorsConstants.DevicesErrors.queryError,
                        data: err,
                        message: 'Error accessing information, update post'
                    });
                });
        }).then(null, function (err) {
            res.status(500).json({
                success: false,
                errorCode: errorsConstants.DevicesErrors.queryError,
                data: err,
                message: 'Error accessing information.'
            });
        });
    }
})

// URL: /devices/list
// Method: GET
// URL Params: [pageSize, page]
/*  Response:
        Success:
            data: array list of devices objects
            total: int
        Error:
            Missing fields:     { errorCode: 2001 }
            Error in query:     { errorCode: 2003 }
*/
router.get('/list', validToken, function (req, res, next) {
    var userId = useful.getUserIdInToken(req.headers['x-access-token']);

    var pageSize = ((req.query.pageSize == null) ? 10 : req.query.pageSize);
    var page = ((req.query.page == null) ? 1 : req.query.page);

    var queryTotal = knex.select(knex.raw('count(*) total')).from('devices');

    queryTotal.then(function (resultTotal) {
        var total = parseInt(resultTotal[0].total);
        if ((req.query.total != null) && (req.query.total != '')) {
            res.json({ success: true, total: total });
        }
        else {
            if (total > 0) {
                var query = knex('devices').select('*')
                    .where('user_id', '=', userId)
                    .orderBy('devices.id', 'desc')
                    .limit(pageSize)
                    .offset(pageSize * (page - 1));

                query.then(function (results) {
                    res.json({
                        success: true,
                        errorCode: errorsConstants.noError,
                        pageSize: pageSize,
                        total: total,
                        data: results,
                        message: 'Return OK.'
                    });

                }).then(null, function (err) {
                    console.log(err)
                    res.status(500).json({
                        success: false,
                        errorCode: errorsConstants.DevicesErrors.queryError,
                        data: err,
                        message: 'Error accessing information.'
                    });
                });
            } else {

                res.json({
                    success: true,
                    errorCode: errorsConstants.noError,
                    pageSize: pageSize,
                    total: 0,
                    data: [],
                    message: 'Return OK.'
                });
            }

        }
    }).then(null, function (err) {
        res.status(500).json({
            success: false,
            errorCode: errorsConstants.DevicesErrors.queryError,
            data: err,
            message: 'Error accessing information.'
        });
    });

});

// URL: /devices/delete
// Method: GET
// URL Params: [id]
/*  Response:
        Success:
            data: bool
        Error:
            Missing fields:     { errorCode: 2001 }
            Device not found:   { errorCode: 2002 }
            Error in query:     { errorCode: 2003 }
*/
router.get('/delete', validToken, function (req, res, next) {

    if ((req.query.id == null) || (req.query.id == "")) {

        res.status(500).json({
            success: false,
            errorCode: errorsConstants.DevicesErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: id'
        });
    } else {
        // Busca o id do usuário logado recebido no token
        var userId = useful.getUserIdInToken(req.headers['x-access-token']);
        knex('devices')
            .where('id', '=', req.query.id).where('user_id', '=', userId)
            .del().then(function (count) {
                if (count === 0) {
                    res.status(500).json({
                        success: false,
                        errorCode: errorsConstants.DevicesErrors.deviceNotFound,
                        data: null,
                        message: 'Device not found'
                    });
                } else {
                    res.json({
                        success: true,
                        errorCode: errorsConstants.noError,
                        data: true,
                        message: 'Device removed.'
                    });
                }
            }).catch(function (err) {
                res.status(500).json({
                    success: false,
                    errorCode: errorsConstants.DevicesErrors.queryError,
                    data: err,
                    message: 'Error accessing information.'
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