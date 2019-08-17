var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var errorsConstants = require('../utils/errorsConstants')
var useful = require('../utils/useful')
let zenvia = require("zenvia-api").sendOne;

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
    var userId = useful.getUserIdInToken(req.headers['x-access-token']);
    if ((req.body.id == null) || (req.body.id == '')) {
        if ((req.body.name == null) || (req.body.name == "") || (req.body.imei == null) || (req.body.imei == "")) {

            var fields = '';
            fields += ((req.body.name == null) || (req.body.name == "")) ? 'name' : '';
            fields += ((req.body.imei == null) || (req.body.imei == "")) ? 'imei' : '';

            res.json({
                success: false,
                errorCode: errorsConstants.DevicesErrors.missingFields,
                data: null,
                message: 'Required fields have not been entered. Fields: ' + fields
            });
        } else {
            knex.insert({
                name: req.body.name, user_id: userId, imei: req.body.imei
            }).returning('id').into('devices').then(function (id) {
                res.json({
                    success: true,
                    errorCode: errorsConstants.noError,
                    data: id[0],
                    message: 'Device added.'
                });
            }).catch(function (err) {
                res.json({
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
            knex('devices')
                .where('id', '=', req.body.id)
                .update({ name: name, imei: imei, user_id: userId }).then(function (count) {
                    res.json({
                        success: true,
                        errorCode: errorsConstants.noError,
                        data: req.body.id,
                        message: 'Device updated.'
                    });
                }).catch(function (err) {
                    res.json({
                        success: false,
                        errorCode: errorsConstants.DevicesErrors.queryError,
                        data: err,
                        message: 'Error accessing information, update post'
                    });
                });
        }).then(null, function (err) {
            res.json({
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


//### KEEPALIVE ###

// URL: /devices/keepalive
// Method: POST
// URL Params: []
/*  Body:
    {
        imei: string
        day: int
        month: int
        year: int
        hour: int
        minutes: int
        timezone: int
        latitude: float
        longitude: float
        height: float (in degrees to the north)
        direction: float ()
        speed: float (km/h)
        number_satellites: int
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
router.post('/keepalive', function (req, res, next) {
    if (((req.body.imei == null) || (req.body.imei == "")) ||
        ((req.body.latitude == null) || (req.body.latitude == "")) ||
        ((req.body.longitude == null) || (req.body.longitude == ""))) {

        var fields = '';
        fields += ((req.body.imei == null) || (req.body.imei == "")) ? 'imei, ' : '';
        fields += ((req.body.latitude == null) || (req.body.latitude == "")) ? 'latitude, ' : '';
        fields += ((req.body.longitude == null) || (req.body.longitude == "")) ? 'longitude' : '';

        res.status(500).json({
            success: false,
            errorCode: errorsConstants.DevicesErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: ' + fields
        });
    } else {
        var query = knex('devices').select('id')
            .where('imei', '=', req.body.imei)
            .limit(1);
        query.then(function (results) {
            if (results.length === 0) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.DevicesErrors.deviceNotFound,
                    data: null,
                    message: 'Device not found'
                });
            } else {
                var timezone = (((req.body.timezone == null) || (req.body.timezone == "")) ? 0 : req.body.timezone);
                var height = (((req.body.height == null) || (req.body.height == "")) ? "" : req.body.height);
                var direction = (((req.body.direction == null) || (req.body.direction == "")) ? "" : req.body.direction);
                var speed = (((req.body.speed == null) || (req.body.speed == "")) ? "" : req.body.speed);
                var number_satellites = (((req.body.number_satellites == null) || (req.body.number_satellites == "")) ? 0 : req.body.number_satellites);

                knex.insert({
                    device_id: results[0].id, latitude: req.body.latitude, longitude: req.body.longitude,
                    timezone: timezone, height: height, direction: direction, speed: speed, number_satellites: number_satellites
                }).returning('id').into('devices_history').then(function (id) {
                    res.json({
                        success: true,
                        errorCode: errorsConstants.noError,
                        data: id[0],
                        message: 'Alive.'
                    });
                }).catch(function (err) {
                    res.status(500).json({
                        success: false,
                        errorCode: errorsConstants.DevicesErrors.queryError,
                        data: err,
                        message: 'Error creating device history'
                    });
                })
            }
        });
    }
})

// URL: /devices/keepalive/list
// Method: GET
// URL Params: [pageSize, page, imei]
/*  Response:
        Success:
            data: array list of devices_history objects
            total: int
        Error:
            Missing fields:     { errorCode: 2001 }
            Device not found:   { errorCode: 2002 }
            Error in query:     { errorCode: 2003 }
*/
router.get('/keepalive/list', validToken, function (req, res, next) {
    var pageSize = ((req.query.pageSize == null) ? 10 : req.query.pageSize);
    var page = ((req.query.page == null) ? 1 : req.query.page);
    if ((req.query.imei == null) || (req.query.imei == "")) {

        var fields = '';
        fields += ((req.query.imei == null) || (req.query.imei == "")) ? 'imei' : '';
        res.status(500).json({
            success: false,
            errorCode: errorsConstants.DevicesErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: ' + fields
        });
    } else {
        var query = knex('devices').select('id')
            .where('imei', '=', req.query.imei)
            .limit(1);
        query.then(function (devices) {
            if (devices.length === 0) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.DevicesErrors.deviceNotFound,
                    data: null,
                    message: 'Device not found'
                });
            } else {
                var deviceId = devices[0].id;
                var queryTotal = knex.select(knex.raw('count(*) total')).from('devices_history');

                queryTotal.then(function (resultTotal) {
                    var total = parseInt(resultTotal[0].total);
                    if ((req.query.total != null) && (req.query.total != '')) {
                        res.json({ success: true, total: total });
                    }
                    else {
                        if (total > 0) {
                            var query = knex('devices_history').select('*')
                                .where('device_id', '=', deviceId)
                                .orderBy('devices_history.id', 'desc')
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
            }
        });
    }
});

// URL: /devices/beep
// Method: POST
// URL Params: []
/*  Body:
    {
        imei: string
        day: int
        month: int
        year: int
        hour: int
        minutes: int
        timezone: int
        latitude: float
        longitude: float
        height: float (in degrees to the north)
        direction: float ()
        speed: float (km/h)
        number_satellites: int
        pressed_button: int
    }
*/
/*  Response:
        Success:
            data: {
                id
            }
        Error:
            Missing fields:     { errorCode: 2001 }
            Device not found:   { errorCode: 2002 }
            Error in query:     { errorCode: 2003 }
*/
router.post('/beep', function (req, res, next) {
    if (((req.body.imei == null) || (req.body.imei == "")) ||
        ((req.body.latitude == null) || (req.body.latitude == "")) ||
        ((req.body.longitude == null) || (req.body.longitude == ""))) {

        var fields = '';
        fields += ((req.body.imei == null) || (req.body.imei == "")) ? 'imei, ' : '';
        fields += ((req.body.latitude == null) || (req.body.latitude == "")) ? 'latitude, ' : '';
        fields += ((req.body.longitude == null) || (req.body.longitude == "")) ? 'longitude' : '';

        res.status(500).json({
            success: false,
            errorCode: errorsConstants.DevicesErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: ' + fields
        });
    } else {
        var query = knex('devices').select('id', 'user_id')
            .where('imei', '=', req.body.imei)
            .limit(1);
        query.then(function (results) {
            if (results.length === 0) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.DevicesErrors.deviceNotFound,
                    data: null,
                    message: 'Device not found'
                });
            } else {
                var queryUser = knex('users').select('first_name')
                    .where('id', '=', results[0].user_id).limit(1).then(function (user) {
                        var user_name = user[0].first_name
                        var timezone = (((req.body.timezone == null) || (req.body.timezone == "")) ? 0 : req.body.timezone);
                        var height = (((req.body.height == null) || (req.body.height == "")) ? "" : req.body.height);
                        var direction = (((req.body.direction == null) || (req.body.direction == "")) ? "" : req.body.direction);
                        var speed = (((req.body.speed == null) || (req.body.speed == "")) ? "" : req.body.speed);
                        var number_satellites = (((req.body.number_satellites == null) || (req.body.number_satellites == "")) ? 0 : req.body.number_satellites);
                        var pressed_button = (((req.body.pressed_button == null) || (req.body.pressed_button == "")) ? 0 : req.body.pressed_button);
                        var beep_token = '';

                        knex('contacts').select('*')
                            .where('device_id', '=', results[0].id)
                            .then(function (contacts) {

                                if (pressed_button == 1) {
                                    crypto.randomBytes(6, function (err, buffer) {
                                        beep_token = buffer.toString('hex');
                                        contacts.forEach(contact => {
                                            let body = {
                                                "from": "Botão do Bem",
                                                "to": contact.phone,
                                                "msg": "Botão do Bem: \nAqui é " + user_name +
                                                    "\nAcesse: https://bob-web-stag.herokuapp.com/help?beep=" + beep_token +
                                                    "\n",
                                                "callbackOption": "NONE",
                                            };
                                            zenvia(process.env.ZENVIA_ACCOUNT, process.env.ZENVIA_PASS, body)
                                                .then((smsResponse) => {
                                                    console.log(smsResponse);
                                                })
                                                .catch((err) => {
                                                    console.error(err);
                                                });
                                        });
                                        knex.insert({
                                            device_id: results[0].id, token: beep_token, latitude: req.body.latitude, longitude: req.body.longitude,
                                            timezone: timezone, height: height, direction: direction, speed: speed, number_satellites: number_satellites,
                                            pressed_button: pressed_button
                                        }).returning('id').into('devices_beeps').then(function (id) {
                                            res.json({
                                                success: true,
                                                errorCode: errorsConstants.noError,
                                                data: id[0],
                                                message: 'Beep'
                                            });
                                        }).catch(function (err) {
                                            res.status(500).json({
                                                success: false,
                                                errorCode: errorsConstants.DevicesErrors.queryError,
                                                data: err,
                                                message: 'Error creating device beep'
                                            });
                                        })
                                    })
                                } else {
                                    // Because function is not asyncronus, the code must be duplicated
                                    knex.insert({
                                        device_id: results[0].id, token: '', latitude: req.body.latitude, longitude: req.body.longitude,
                                        timezone: timezone, height: height, direction: direction, speed: speed, number_satellites: number_satellites,
                                        pressed_button: pressed_button
                                    }).returning('id').into('devices_beeps').then(function (id) {
                                        res.json({
                                            success: true,
                                            errorCode: errorsConstants.noError,
                                            data: id[0],
                                            message: 'Beep'
                                        });
                                    }).catch(function (err) {
                                        res.status(500).json({
                                            success: false,
                                            errorCode: errorsConstants.DevicesErrors.queryError,
                                            data: err,
                                            message: 'Error creating device beep'
                                        });
                                    })
                                }
                            })
                    })


            }
        });
    }
})

// URL: /devices/beep/list
// Method: GET
// URL Params: [pageSize, page, imei]
/*  Response:
        Success:
            data: array list of devices_beeps objects
            total: int
        Error:
            Missing fields:     { errorCode: 2001 }
            Device not found:   { errorCode: 2002 }
            Error in query:     { errorCode: 2003 }
*/
router.get('/beep/list', validToken, function (req, res, next) {
    var pageSize = ((req.query.pageSize == null) ? 10 : req.query.pageSize);
    var page = ((req.query.page == null) ? 1 : req.query.page);
    if ((req.query.imei == null) || (req.query.imei == "")) {

        var fields = '';
        fields += ((req.query.imei == null) || (req.query.imei == "")) ? 'imei' : '';
        res.status(500).json({
            success: false,
            errorCode: errorsConstants.DevicesErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: ' + fields
        });
    } else {
        var query = knex('devices').select('id')
            .where('imei', '=', req.query.imei)
            .limit(1);
        query.then(function (devices) {
            if (devices.length === 0) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.DevicesErrors.deviceNotFound,
                    data: null,
                    message: 'Device not found'
                });
            } else {
                var deviceId = devices[0].id;
                var queryTotal = knex.select(knex.raw('count(*) total')).from('devices_beeps');

                queryTotal.then(function (resultTotal) {
                    var total = parseInt(resultTotal[0].total);
                    if ((req.query.total != null) && (req.query.total != '')) {
                        res.json({ success: true, total: total });
                    }
                    else {
                        if (total > 0) {
                            var query = knex('devices_beeps').select('*')
                                .where('device_id', '=', deviceId)
                                .orderBy('devices_beeps.id', 'desc')
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
            }
        });
    }
});


// URL: /devices/beep/last
// Method: GET
// URL Params: [token, device]
/*  Response:
        Success:
            data: last devices_beeps object
        Error:
            Missing fields:     { errorCode: 2001 }
            Device not found:   { errorCode: 2002 }
            Error in query:     { errorCode: 2003 }
*/
router.get('/beep/help/last', function (req, res, next) {
    if (req.query.token == null) {
        var fields = '';
        fields += ((req.query.token == null) || (req.query.token == "")) ? 'token' : '';
        res.status(500).json({
            success: false,
            errorCode: errorsConstants.DevicesErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: ' + fields
        });
    } else {
        var queryBeep = knex('devices_beeps').select('created_at')
            .where('token', '=', req.query.token)
            .limit(1);
        queryBeep.then(function (device_beep) {
            if (device_beep.length === 0) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.DevicesErrors.beepNotFound,
                    data: null,
                    message: 'Device beep not found'
                });
            } else {
                var beepTime = new Date(device_beep[0].created_at);
                var maxTime = new Date(device_beep[0].created_at.setHours(device_beep[0].created_at.getHours() + 3));
                var queryBeeps = knex('devices_beeps').select('*')
                    .where('created_at', '>=', beepTime).andWhere('created_at', '<', maxTime).orderBy('created_at', 'desc').limit(1);
                queryBeeps.then(function (device_beeps) {
                    res.json({
                        success: true,
                        errorCode: errorsConstants.noError,
                        data: device_beeps[0],
                        message: 'Return OK.'
                    });
                })
            }
        })
    }
});

// URL: /devices/beep/help
// Method: GET
// URL Params: [token]
/*  Response:
        Success:
            data: array list of devices_beeps objects
        Error:
            Missing fields:     { errorCode: 2001 }
            Device not found:   { errorCode: 2002 }
            Error in query:     { errorCode: 2003 }
*/
router.get('/beep/help', function (req, res, next) {
    if (req.query.token == null) {
        var fields = '';
        fields += ((req.query.token == null) || (req.query.token == "")) ? 'token' : '';
        res.status(500).json({
            success: false,
            errorCode: errorsConstants.DevicesErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: ' + fields
        });
    } else {
        var queryBeep = knex('devices_beeps').select('created_at')
            .where('token', '=', req.query.token)
            .limit(1);
        queryBeep.then(function (device_beep) {
            if (device_beep.length === 0) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.DevicesErrors.beepNotFound,
                    data: null,
                    message: 'Device beep not found'
                });
            } else {
                var beepTime = new Date(device_beep[0].created_at);
                var maxTime = new Date(device_beep[0].created_at.setHours(device_beep[0].created_at.getHours() + 3));
                var queryBeeps = knex('devices_beeps').select('*')
                    .where('created_at', '>=', beepTime).andWhere('created_at', '<', maxTime).orderBy('created_at', 'asc');
                queryBeeps.then(function (device_beeps) {
                    res.json({
                        success: true,
                        errorCode: errorsConstants.noError,
                        data: device_beeps,
                        message: 'Return OK.'
                    });
                })
            }
        })
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