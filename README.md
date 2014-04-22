# [gulp](http://gulpjs.com)-sftp [![Build Status](https://travis-ci.org/gtg092x/gulp-sftp.svg?branch=master)](https://travis-ci.org/sindresorhus/gulp-sftp)

> Upload files via SSH

Useful for uploading and deploying things.


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

### ftp(options)

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

The remote path to upload too.

Doesn't have to exist as [jsftp-mkdirp](https://github.com/sindresorhus/jsftp-mkdirp) is used.


## License

[MIT](http://opensource.org/licenses/MIT) © [Sindre Sorhus](http://sindresorhus.com)