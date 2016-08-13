/* jshint esnext:true, globalstrict:true */
/* global require, console, exports, module, __dirname */

"use strict";

var fs = require('fs');
var path = require('path');
var express = require('express');
var multer = require('multer');

var sync = require('./library-sync.js');

/* global exports:true */
exports = module.exports = makeRouter;

function makeRouter (destination, admin, backup) {

	make_storage_destination(destination);
	
	var library = require('./library-database.js')(destination);

	var storage = multer.diskStorage({
		destination: (req, file, cb) => {
			console.log('saving to '+destination);
			cb(null, destination);
		},
		filename: (req, file, cb) => {
			var author = req.body.authors.split(',')[0];
			var title = req.body.title;
			var ext = (file.mimetype.indexOf('pdf')>=0) ? 'pdf' :
								(file.mimetype.indexOf('epub')>=0)? 'epub' : 'unknown';
			var filename = author + '-'+title;
			filename = filename.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-') + '.' + ext;
			increment_name(filename, destination, cb);
		}
	});

	var upload = multer({ 
		storage: storage, 
		fileFilter: filter
	});

	var router = express.Router();

	router.use('/!',express.static(destination));

	router.post('/upload', upload.single('file'), (req,res) => {
		if(!req.file) {
			var err ='Error: ';
			if(req.body.title === '') err += "Need to enter title. ";
			else err += "Select	 valid file (pdf or epub file, max 10MB).";
			res.send({err:err, msg:null});

		} else {
			library.add(req.file, req.body.authors, req.body.title)
				.then(result => {
					res.json( {err:null, msg:'File successfully added to library.', added:result[0]});
					//syncronise
					if(backup) sync(destination,backup);
				}).catch( err => {
					console.log(err);
					res.json({err:"File already exists.", msg:null});
				});
		}
	});

	router.post('/update', (req,res)=> {
		console.log(req.body);
		library.update(req.body.id,req.body.authors,req.body.title).then(
			results => {
				res.json({success:results});
				//syncronise
				if(backup) sync(destination,backup);
			},
			err => {
				res.json({err:err});
			}
		);
	});

	router.post('/delete', (req,res) =>{
		library.delete_item(req.body.id).then(
			results => {
				res.json({success:results});
				//syncronise
				if(backup) sync(destination,backup);
			},
			err => res.json({err:err})
		);
	});

	router.get( admin || '/management', (req,res) =>{
		library.get().then(
			results => res.render('index.dust', {editable:true,files:results}),
			err => res.render('index.dust', {error:err})
		);
	});

	router.get('/', (req,res)=> {
		// get all items from database and render
		library.get().then(
			results => res.render('index.dust', {editable:false,files:results}),
			err => res.render('index.dust', {error:err})
		);
	});

	router.get('*', (req,res)=> {
		// get all items from database and render
		res.redirect('/');
	});

	router.use((err, req, res, next) => {
		console.log(err,err.stack);
		next(err);
	});

	return { router: router };
}

function make_storage_destination(dir) {
	try {
		fs.statSync(dir);
	} catch (e) {
		fs.mkdirSync(dir);
	}
}

function filter (req, file, cb) {
	if(req.body.title === '' || 
		!(file.mimetype.indexOf('pdf')>=0 || 
			file.mimetype.indexOf('epub')>=0))
	{
		cb(null, false);
		return;
	}
	if(req.body.authors === '') 
		req.body.authors = 'unknown author';
	console.log(req.body);
	cb(null, true);
}

function increment_name(filename,dest, cb, number) {
	console.log(number);
	var i = filename.lastIndexOf('.');
	var name = filename.substring(0,i);
	var ext = filename.substring(i);
	if(number) name += '-' + number;
	name += ext;
	fs.stat(path.join(dest,name), (err, stat) => {
		if(err) {
			cb(null,name);
			return;
		} else {
			if(!number) number = 0;
			increment_name(filename, dest, cb, number+1);
			return;
		}
	});
}
