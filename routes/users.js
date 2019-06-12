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
        name: string [required]
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
        fields += ((req.body.name == null) || (req.body.name == "")) ? (fields.length > 0 ? ', ' : '') + 'name' : '';
        fields += ((req.body.phone == null) || (req.body.phone == "")) ? (fields.length > 0 ? ', ' : '') + 'phone' : '';

        res.json({
            success: false,
            errorCode: errorsConstants.LoginErrors.missingFields,
            data: null,
            message: 'Required fields have not been entered. Fields: ' + fields
        });
    }
    else {
        knex('users').where({
            email: req.body.email
        }).select('password').then(results => {
            if (results.length > 0) {
                res.status(500).json({
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
                        name: req.body.name,
                        phone: req.body.phone
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
                        res.status(500).json({
                            success: false,
                            errorCode: errorsConstants.LoginErrors.queryError,
                            data: err,
                            message: 'Error accessing information.'
                        });
                    });
            }
        })
            .then(null, function (err) {
                //query fail
                res.status(500).json({
                    success: false,
                    errorCode: errorsConstants.LoginErrors.queryError,
                    data: err,
                    message: 'Error accessing information.'
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
                name,
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

        res.status(500).json({
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
                        name: result.name,
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
                    res.status(500).json({
                        success: false,
                        errorCode: errorsConstants.LoginErrors.invalidEmailOrPassword,
                        data: null,
                        message: 'Invalid email or password.'
                    });
                }
            }
            else {
                res.status(500).json({
                    success: false,
                    errorCode: errorsConstants.LoginErrors.invalidEmailOrPassword,
                    data: null,
                    message: 'Invalid email or password.'
                });
            }
        })
            .then(null, function (err) {
                //query fail
                res.status(500).json({
                    success: false,
                    errorCode: errorsConstants.LoginErrors.queryError,
                    data: err,
                    message: 'Error accessing information.'
                });
            });
    }
});

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