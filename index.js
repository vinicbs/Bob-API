require('dotenv').config()
const express = require('express')
const path = require('path');
const bodyParser = require('body-parser');
const app = express()
const port = 3000

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('port', process.env.PORT || 3000);

// Add headers
app.use(function (req, res, next) {    
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    
    // Request headers you wish to allow
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-Access-Token");
    
    // Set to true if you need the website to include cookies in the requests sent to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    
    // Pass to next layer of middleware
    next();
});

app.get('/', (req, res) => {
    res.render('index', { title: 'Bob API', description: 'Welcome to Bob API' });
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    res.json({ success: false, message: 'Route not found' });
});

app.listen(app.get('port'), () => {
    console.log(`Bob API listening on port ${port}!`)
})