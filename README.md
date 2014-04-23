# [gulp](http://gulpjs.com)-sftp [![Build Status](https://travis-ci.org/gtg092x/gulp-sftp.svg?branch=master)](https://travis-ci.org/sindresorhus/gulp-sftp)

> Upload files via SSH

Useful for uploading and deploying things via sftp. Right now this plugin just uploads everything. Caching and hash comparison are two TODO items.  

[![NPM](https://nodei.co/npm/gulp-sftp.png?downloads=true&stars=true)](https://nodei.co/npm/gulp-sftp/)

## Install

```bash
$ npm install --save-dev gulp-sftp
```


## Usage

```js
var gulp = require('gulp');
var sftp = require('gulp-sftp');

gulp.task('default', function () {
	return gulp.src('src/*')
		.pipe(sftp({
			host: 'website.com',
			user: 'johndoe',
			pass: '1234'
		}));
});
```


## API

### sftp(options)

#### options.host

*Required*  
Type: `String`

#### options.port

Type: `Number`  
Default: `22`

#### options.user

Type: `String`  
Default: `'anonymous'`

#### options.pass

Type: `String`  
Default: `'@anonymous'`

#### options.remotePath

Type: `String`  
Default: `'/'`

The remote path to upload too. This path should exist, though the child directories that house your files do not need to.


## License

[MIT](http://opensource.org/licenses/MIT)