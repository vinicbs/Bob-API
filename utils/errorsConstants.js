module.exports = Object.freeze({
    noError: 0,
    //Login errors in range 100x
    LoginErrors: {
        missingFields: 1001,
        emailInUse: 1002,
        queryError: 1003,
        invalidEmailOrPassword: 1004,
        failedAuthentication: 1005
    },
    DevicesErrors: {
        missingFields: 2001,
        deviceNotFound: 2002,
        queryError: 2003,
        smsSendError: 2004,
        beepNotFound: 2005
    },
    ContactsErrors: {
        missingFields: 3001,
        contactNotFound: 3002,
        queryError: 3003,
        deviceNotFound: 3004,
    }
})