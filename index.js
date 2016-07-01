/* jshint esnext:true, globalstrict:true */
/* global require, console, __dirname */

"use strict";

// libraries need for serving content
var fs = require('fs');
var path = require('path');
var express = require('express');
var kleiDust = require('klei-dust');
var helmet = require('helmet');
var bodyParser = require('body-parser');

// need to set defaults if config file is not present or is broken.
var config = require('./config.json');

var router = require('./library-router.js')(config.database.location, config.server.admin_path, config.database.backup);

var app = express();

app.engine('dust', kleiDust.dust);
app.set('view engine', 'dust');
app.set('views', path.join(__dirname, '/views'));

app.use(helmet());
app.use(helmet.noCache());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'/public')));

app.use(router.router);

app.listen(config.server.port, (err, suc) => {
	if (err) {
		throw err;
	} else {
		console.log('listening on' + config.server.port);
	}
});