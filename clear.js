const async = require('async');
const path = require('path');
const gutil = require('gulp-util');

function log(...msg) {
    msg.unshift('gulp-sftp:');
    gutil.log.apply(console, msg);
}

function isDirectory(entry) {
    // Save one network call for 'stat' by checking the 'd' flag in longname:
    // drwxr--r-- 1 bar bar 718 Dec 8 2009 foo
    return entry.longname.startsWith('d');
}

/*
 * Delete contents of a directory on an SFTP server
 * @param {SFTPStream} sftp
 * @param {string} dirPath Remote directory
 * @param {(error) -> ()} callback Callback
 */
function clearDirectory(sftp, dirPath, callback) {
    function deleteEntry(entry, callback) {
        var entryPath = path.join(dirPath, entry.filename);

        if (isDirectory(entry)) {
            clearDirectory(sftp, entryPath, () => {
                log(gutil.colors.green('Deleting remote directory'), entryPath);
                sftp.rmdir(entryPath, callback);
            });
        } else {
            log(gutil.colors.green('Deleting remote file'), entryPath);
            sftp.unlink(entryPath, callback);
        }
    }

    sftp.readdir(dirPath, (err, entries) => {
        async.map(entries, deleteEntry, callback);
    });
}

module.exports.clearDirectory = clearDirectory;