'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var Connection = require('ssh2');


module.exports = function (options) {
	if (options.host === undefined) {
		throw new gutil.PluginError('gulp-sftp', '`host` required.');
	}

	var fileCount = 0;
	var remotePath = options.remotePath || '';
	var localPath = options.localPath || '';
	var logFiles = options.logFiles === false ? false : true;

	delete options.remotePath;
	delete options.localPath;
	delete options.logFiles;

	return through.obj(function (file, enc, cb) {
		if (file.isNull()) {
			this.push(file);
			return cb();
		}

		if (file.isStream()) {
			this.emit('error', new gutil.PluginError('gulp-sftp', 'Streaming not supported'));
			return cb();
		}

		// have to create a new connection for each file otherwise they conflict
		var relativePath = file.path.replace(file.cwd + '/', '');
		var fileBase = file.base?path.resolve(file.base) : file.cwd;
		var localRelativePath = file.path.replace(path.join(fileBase, localPath), '');
		var finalRemotePath = path.join('/', remotePath, localRelativePath);
		
		//MDRAKE: TODO pool requests into single connection
		var c = new Connection();
		c.on('ready', function() {

			c.sftp(function(err, sftp) {
				if (err)
					throw err;

				sftp.on('end', function() {
					console.log('SFTP :: SFTP session closed');
				});
				
				// create directories
				var dirname=path.dirname(finalRemotePath);
				sftp.mkdir(dirname, {mode: '0755'}, function(err){
					if(err){
						gutil.log('SFTP error or directory exists:', gutil.colors.red(err));
					}else{
						gutil.log('SFTP Created:', gutil.colors.green(dirname));
					}
				});

				var stream = sftp.createWriteStream(finalRemotePath,{ 
					flags: 'w',
					encoding: null,
					mode: '0666',
					autoClose: true
				});
				stream.write();
				
				stream.on('close', function(err) {
					console.log('FINISH');
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
				
			});
		});
		c.on('error', function(err) {			
			this.emit('error', new gutil.PluginError('gulp-sftp', err));
			return cb(err);
		});
		c.on('end', function() {
			console.log('Connection :: end');
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
