var express = require('express');
var router = express.Router();
var errorsConstants = require('../utils/errorsConstants')
var CryptoJS = require("crypto-js")
var useful = require('../utils/useful')

var DB = require('../db').DB,
    knex = DB.knex;



// URL: /users/signup
// Method: POST
// URL Params: []
/*  Body:
    {
        email: string [required]
        password: string [required]
        first_name: string [required]
        last_name: string [required]
        phone: string [required]
    }
*/
/*  Response:
        Success:
            data: {
                token,
                id
            }
        Error:
            Missing fields: { errorCode: 1001 }
            Emails already exists: { errorCode: 1002 }
            Error in query: { errorCode: 1003 }
*/
// Token is not required
router.post('/signup', function (req, res, next) {
    if ((req.body.email == null) || (req.body.email == "") ||
        (req.body.password == null) || (req.body.password == "")) {

        var fields = '';
        fields += ((req.body.email == null) || (req.body.email == "")) ? 'email' : '';
        fields += ((req.body.password == null) || (req.body.password == "")) ? (fields.length > 0 ? ', ' : '') + 'password' : '';
        fields += ((req.body.first_name == null) || (req.body.first_name == "")) ? (fields.length > 0 ? ', ' : '') + 'first_name' : '';
        fields += ((req.body.last_name == null) || (req.body.last_name == "")) ? (fields.length > 0 ? ', ' : '') + 'last_name' : '';
        fields += ((req.body.phone == null) || (req.body.phone == "")) ? (fields.length > 0 ? ', ' : '') + 'phone' : '';
        fields += ((req.body.country == null) || (req.body.country == "")) ? (fields.length > 0 ? ', ' : '') + 'country' : '';

        res.json({
            success: false,
            errorCode: errorsConstants.LoginErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: ' + fields
        });
    } else if  (req.body.first_name.length > 15) {
        res.json({
            success: false,
            errorCode: errorsConstants.LoginErrors.missingFields,
            data: null,
            message: 'Nome muito longo'
        });
    }
    else {
        knex('users').where({
            email: req.body.email
        }).select('password').then(results => {
            if (results.length > 0) {
                res.json({
                    success: false,
                    errorCode: errorsConstants.LoginErrors.emailInUse,
                    data: null,
                    message: 'Email already exists.'
                });
            }
            else {
                knex('users')
                    .returning('id').insert({
                        email: req.body.email,
                        password: CryptoJS.AES.encrypt(req.body.password, process.env.PASSWORD_KEY).toString(),
                        first_name: req.body.first_name,
                        last_name: req.body.last_name,
                        phone: req.body.phone,
                        country: req.body.country
                    }).then(id => {
                        // return user token
                        var token = useful.createToken(id[0]);

                        res.json({
                            success: true,
                            errorCode: errorsConstants.noError,
                            data: { token: token, id: id[0] },
                            message: 'User added.'
                        });
                    })
                    .catch(function (err) {
                        //query fail
                        console.log(err)
                        res.json({
                            success: false,
                            errorCode: errorsConstants.LoginErrors.queryError,
                            data: err,
                            message: 'Error accessing information 1.'
                        });
                    });
            }
        })
            .then(null, function (err) {
                //query fail
                res.json({
                    success: false,
                    errorCode: errorsConstants.LoginErrors.queryError,
                    data: err,
                    message: 'Error accessing information 2.'
                });
            });
    }
})

// URL: /users/signin
// Method: GET
// URL Params: [email, password]
/*  Response:
        Success:
            data: {
                token,
                id,
                email,
                first_name,
                last_name,
                phone
            }
        Error:
            Missing fields: { errorCode: 1001 }
            Error in query: { errorCode: 1003 }
            Email or password incorrect: { errorCode: 1004 }
*/
// Token is not required
router.get('/signin', function (req, res, next) {
    if ((req.query.email == null) || (req.query.email == "") ||
        (req.query.password == null) || (req.query.password == "")) {

        var fields = '';
        fields += ((req.query.email == null) || (req.query.email == "")) ? 'email' : '';
        fields += ((req.query.password == null) || (req.query.password == "")) ? (fields.length > 0 ? ', ' : '') + 'password' : '';

        res.json({
            success: false,
            errorCode: errorsConstants.LoginErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: ' + fields
        });
    }
    else {
        knex('users').where({
            email: req.query.email
        }).select().then(results => {
            if (results.length > 0) {
                var result = results[0];
                //compares passwords
                if (CryptoJS.AES.decrypt(result.password, process.env.PASSWORD_KEY).toString(CryptoJS.enc.Utf8) === req.query.password) {
                    // Returns token created for user
                    var token = useful.createToken(result.id);

                    let response = {
                        token: token,
                        id: result.id,
                        email: result.email,
                        first_name: result.first_name,
                        last_name: result.last_name,
                        phone: result.phone
                    }
                    res.json({
                        success: true,
                        errorCode: errorsConstants.noError,
                        data: response,
                        message: 'Login OK.'
                    });
                }
                else {
                    res.json({
                        success: false,
                        errorCode: errorsConstants.LoginErrors.invalidEmailOrPassword,
                        data: null,
                        message: 'Invalid email or password.'
                    });
                }
            }
            else {
                res.json({
                    success: false,
                    errorCode: errorsConstants.LoginErrors.invalidEmailOrPassword,
                    data: null,
                    message: 'Invalid email or password.'
                });
            }
        })
            .then(null, function (err) {
                //query fail
                res.json({
                    success: false,
                    errorCode: errorsConstants.LoginErrors.queryError,
                    data: err,
                    message: 'Error accessing information.'
                });
            });
    }
});

// URL: /users/verifyToken
// Method: GET
// URL Params: [token]
/*  Response:
        Success:
            data: {
                token
            }
        Error:
            Missing fields: { errorCode: 1001 }
            Error in query: { errorCode: 1003 }
*/
router.get('/verifyToken', function (req, res, next) {
    if ((req.query.token == null) || req.query.token == '') {
        res.json({
            success: false,
            errorCode: errorsConstants.LoginErrors.missingFields,
            data: null,
            message: 'Does not have a token'
        });
    }
    else {
        useful.validToken(req.query.token, function (err, result) {
            let response = {
                token: req.query.token
            }
            if (result)
                res.json({
                    success: true,
                    errorCode: errorsConstants.noError,
                    data: response,
                    message: 'Token is ok'
                })
            else
                res.json({
                    success: false,
                    errorCode: errorsConstants.LoginErrors.failedAuthentication,
                    data: null,
                    message: 'Failed to authenticate token.'
                });
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