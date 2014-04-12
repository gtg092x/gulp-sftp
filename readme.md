# [gulp](https://github.com/wearefractal/gulp)-sftp [![Build Status](https://secure.travis-ci.org/sindresorhus/gulp-ftp.png?branch=master)](http://travis-ci.org/sindresorhus/gulp-ftp)

> Upload files to via SSH

Useful for uploading and deploying things.


## Install

Install with [npm](https://npmjs.org/package/gulp-sftp)

```
npm install --save-dev gulp-sftp
```


## Example

```js
var gulp = require('gulp');
var sftp = require('gulp-sftp');

gulp.task('default', function () {
	gulp.src('src/*')
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

The remote path to upload too.

#### options.localPath

Type: `String`
Default `'.'`

The local path to upload from.
This is useful for example when you use

```javascript
gulp.src('_public/js/*').pipe({remotePath: '/www/some/path'});
```

And you want the contents of `_public/js` to be uploaded to 
`/www/some/path`, but not `_public/js` itself. Then you just set
`localPath` to `_public/js` and you are done.

#### options.logFiles

Type: `Boolean`
Default: `true`

Logging of files as they are uploaded. If set to false, you will only see a message when all files finished.

## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
