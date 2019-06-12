var jwt = require('jsonwebtoken');

// Creates an user token
function createToken(userId)
{
    var token = jwt.sign({ data : userId }, process.env.TOKEN_KEY);
    return token;
}

// Validates user token
function validToken(token, callback) 
{
    jwt.verify(token, config.superSecret, function (err, decoded) {
        if (err) {
            callback(null, false);
        } else {
            
            callback(null, true);
        }
    });   
}

// Get user ID on token
function getAppUserIdInToken(token) {
    
    var result = '';
    try {
        result = jwt.verify(token, config.superSecret).data;
    }
    catch (err) { }

    return result;
}

module.exports = {
    createToken         : createToken,
    validToken          : validToken,
    getAppUserIdInToken : getAppUserIdInToken
};