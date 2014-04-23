'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var Connection = require('ssh2');
var async = require('async');
var parents = require('parents');

//mdrake: TODO - support .key file including private key auth
module.exports = function (options) {
	if (options.host === undefined) {
		throw new gutil.PluginError('gulp-sftp', '`host` required.');
	}

	var fileCount = 0;
	var remotePath = options.remotePath || '/';
	var localPath = options.localPath || '';
	var separator = options.separator || '/';
	var logFiles = options.logFiles === false ? false : true;

	delete options.remotePath;
	delete options.localPath;
	delete options.logFiles;
	
	var mkDirCache = {};

	return through.obj(function (file, enc, cb) {
		if (file.isNull()) {
			this.push(file);
			return cb();
		}

		if (file.isStream()) {
			this.emit('error', new gutil.PluginError('gulp-sftp', 'Streaming not supported'));
			return cb();
		}

		// have to create a new connection for each file otherwise they conflict, pulled from sindresorhus
		var relativePath = file.path.replace(file.cwd + '/', '');
		var fileBase = file.base?path.resolve(file.base) : file.cwd;
		var localRelativePath = file.path.replace(path.join(fileBase, localPath), '');
		var finalRemotePath = path.join(remotePath, localRelativePath);
		
		
		// MDRAKE: Would be nice - pool requests into single connection
		var c = new Connection();
		c.on('ready', function() {

			c.sftp(function(err, sftp) {
				if (err)
					throw err;

				sftp.on('end', function() {
					gutil.log('SFTP :: SFTP session closed');
				});
								
				
				/*
				 *  Create Directories
				 */
				
				//get dir name from file path
				var dirname=path.dirname(finalRemotePath);
				//get parents of the target dir
				
				var fileDirs = parents(dirname).map(function(d){return d.replace(/^\/~/,"~");});
				//get filter out dirs that are closer to root than the base remote path
				//also filter out any dirs made during this gulp session
				fileDirs = fileDirs.filter(function(d){return d.length>remotePath.length&&!mkDirCache[d];});
				
				//while there are dirs to create, create them
				//https://github.com/caolan/async#whilst - not the most commonly used async control flow
				async.whilst(function(){
					return fileDirs && fileDirs.length;
				},function(next){					
					var d= fileDirs.pop();
					mkDirCache[d]=true;
					//mdrake - TODO: use a default file permission instead of defaulting to 755 
					sftp.mkdir(d, {mode: '0755'}, function(err){
						
						if(err){
							//assuming that the directory exists here, silencing this error
							gutil.log('SFTP error or directory exists:', gutil.colors.red(err));
						}else{
							gutil.log('SFTP Created:', gutil.colors.green(dirname));
						}
						next();
					});
				},function(){
					
					var stream = sftp.createWriteStream(finalRemotePath,{ 
						flags: 'w',
						encoding: null,
						mode: '0666',
						autoClose: true
					});
					// stream.write();
					
					stream.on('close', function(err) {
						
						if(err)
							this.emit('error', new gutil.PluginError('gulp-sftp', err));
						else{
							if (logFiles) {
						          gutil.log('gulp-sftp:', gutil.colors.green('Uploaded: ') + 
						                                 relativePath +
						                                 gutil.colors.green(' => ') + 
						                                 finalRemotePath);
						        }

							fileCount++;
						}
						sftp.end();
						return c.end();
					});
					
					stream.end(file.contents);
				});//async.whilst
				
					
			});//c.sftp
		});//c.on('ready')
		
		c.on('error', function(err) {
			this.emit('error', new gutil.PluginError('gulp-sftp', err));
			return cb(err);
		});
		c.on('end', function() {
			gutil.log('Connection :: end');
		});
		c.on('close', function(had_error) {
			return cb(had_error);
		});
		c.connect({
			host : options.host,
			port : options.port,
			username : options.user,
			password : options.pass
		});
		
		this.push(file);

	}, function (cb) {
		if (fileCount > 0) {
			gutil.log('gulp-sftp:', gutil.colors.green(fileCount, fileCount === 1 ? 'file' : 'files', 'uploaded successfully'));
		} else {
			gutil.log('gulp-sftp:', gutil.colors.yellow('No files uploaded'));
		}

		cb();
	});
};
