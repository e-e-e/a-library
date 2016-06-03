
/* jshint esnext:true, globalstrict:true */
/* global require, module, exports, console, __dirname */

"use strict";

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var q = require('q');
var sqlite3 = require('sqlite3').verbose();

var fs_stat = q.denodeify(fs.stat);

/* global exports:true */
exports = module.exports = makeDB;

function makeDB (destination) {
	return new Library(destination);
}

function Library (dest) {
	this.destination = dest || __dirname;
	this.db = new sqlite3.Database(path.join(dest,'.a-library.db'));
	
	this.db.run('CREATE TABLE if not exists items (id INTEGER PRIMARY KEY,hash TEXT UNIQUE, file TEXT UNIQUE, authors TEXT, title TEXT, ext TEXT, filesize INTEGER )');
}

//basic db functions

Library.prototype.all = function all (query, values) {
	var deferred = q.defer();
	this.db.all(query,values, deferred.makeNodeResolver());
	return deferred.promise;
};

Library.prototype.run = function run (query, values) {
	var deferred = q.defer();
	this.db.run(query,values, deferred.makeNodeResolver());
	return deferred.promise;
};

// db task functions

Library.prototype.update = function update(id, authors, title) {
	return this.run('UPDATE items SET authors = ?, title = ? WHERE id = ?', 
		[authors,title,id]);
};

Library.prototype.delete_item = function delete_item (id) {
	//get file with id
	return this.all("SELECT id, title,file,authors, ext FROM items WHERE id=?",id)
		.then( results => {
			fs.unlink(path.join(this.destination,results[0].file));
			return results;
		}).then( results => this.run("DELETE FROM items WHERE id = ?", id) )
		.then( results => "Success");
};

Library.prototype.get = function get(p) {
	var page = p || 0;
	var pagelength = 10000;
	return this.all("SELECT id, title, file, authors, ext FROM items LIMIT $count OFFSET $skip", {$count:pagelength, $skip: page*pagelength} );
};

Library.prototype.getWithHash = function getWithHash(hash) {
	return this.all("SELECT id, title, file, authors, ext FROM items WHERE hash = ?", hash);
};

Library.prototype.add = function add(file, author, title) {
	var added_file = path.join(file.destination, file.filename);
	console.log('adding to '+added_file);
	return fs_stat(added_file)
		.then(stat => {
			if(stat.isFile()) 
				return read_and_hash(added_file);
			else throw new Error('File does not exist');
		})
		.then(hash => {
			return this.insert(hash, file.filename, author, title, file.size)
						.catch(err => { 
							//if error inserting into database delete file
							fs.unlink(added_file);
							throw err;
						});
		}).then(results=> {
			return this.getWithHash(results.hash);
		});
};

Library.prototype.insert = function insert(hash,filename,authors,title, filesize) {
	var deferred = q.defer();
	var ext = filename.substring(filename.lastIndexOf('.')+1);
	this.db.run("INSERT INTO items (hash,file,authors,title,ext,filesize) VALUES (?,?,?,?,?,?)",
		[hash, filename, authors, title, ext, filesize],
		(err) => {
			if (err) {
				deferred.reject(err);
				return;
			}
			deferred.resolve({ hash: hash, filename:filename });
		}
	);
	return deferred.promise;
};

/* Utility function */

function read_and_hash(file) {
	var deferred = q.defer();
	var stream = fs.createReadStream(file);
	var hash = crypto.createHash('md5');
	hash.setEncoding('hex');
	stream.on('end', function() {
		hash.end();
		deferred.resolve(hash.read());
	});
	stream.pipe(hash).on('error', err => deferred.reject(err));
	return deferred.promise;
}
