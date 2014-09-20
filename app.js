'use strict';

/*
 * Express Dependencies
 */
var express = require('express');
var app = express();
var port = 3000;

/*
 * shuffle specific dependencies
 */
var Library = require('./assets/scripts/lib/library'),
    Shuffler = require('./assets/scripts/lib/shuffler'),
    library = new Library(),
    shuffler = new Shuffler(app, library);

/*
 * Use Handlebars for templating
 */
var exphbs = require('express3-handlebars');
var hbs;

// For gzip compression
app.use(express.compress());

// For cookies - yum :D
app.use(express.cookieParser('8b3cd0d6-99f0-4702-959c-e18355b2582a'));

/*
 * Config for Production and Development
 */
if (process.env.NODE_ENV === 'production') {
    // Set the default layout and locate layouts and partials
    app.engine('handlebars', exphbs({
        defaultLayout: 'main',
        layoutsDir: 'dist/views/layouts/',
        partialsDir: 'dist/views/partials/'
    }));

    // Locate the views
    app.set('views', __dirname + '/dist/views');
    
    // Locate the assets
    app.use(express.static(__dirname + '/dist/assets'));

} else {
    app.engine('handlebars', exphbs({
        // Default Layout and locate layouts and partials
        defaultLayout: 'main',
        layoutsDir: 'views/layouts/',
        partialsDir: 'views/partials/'
    }));

    // Locate the views
    app.set('views', __dirname + '/views');
    
    // Locate the assets
    app.use(express.static(__dirname + '/assets'));
}

// Set Handlebars
app.set('view engine', 'handlebars');



/*
 * Routes
 */
// Index Page
app.get('/', function(request, response, next) {
    response.render('index');
});

// Shuffle
app.get('/shuffle', function (request, response) {
    shuffler.addClient(request, response);
});

// Shuffler track SSE
app.get('/events', function (request, response) {
    shuffler.addSseClient(request, response);
});

/*
 * Start it up
 */
app.listen(process.env.PORT || port);
console.log('Express started on port ' + port);
