/* jshint esnext:true, globalstrict:true */
/* global require, console, exports, module, __dirname */

"use strict";

const path = require('path');
const spawn = require('child_process').spawn;

/* global exports:true */
exports = module.exports =  function(source, destination) {
	const child = spawn('rsync', ['-a', path.join(source,'/'), destination]);
	child.stdout.on('data', data => console.log(`stdout: ${data}`));
	child.stderr.on('data', data => console.log(`stderr: ${data}`));
	child.on('close', code => console.log(`child process exited with code ${code}`));
};