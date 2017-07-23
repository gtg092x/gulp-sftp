const {clearDirectory} = require('./clear');
const path = require('path');

/**
 * Resolve a a subtree by filesystem-like path in an object tree
 * @param {Object} vfs 
 * @param {string} entryPath 
 */
function resolvePath(vfs, entryPath) {
    if (entryPath === '/') {
        return vfs;
    }
    const segments = entryPath.split(path.sep);
    if (segments[0] === '') {
        segments.shift()
    }

    return segments.reduce((tree, segment) => tree[segment], vfs);
}

describe('resolvePath', () => {
    it('resolves root', () => {
        const vfs = {};

        expect(resolvePath(vfs, '/')).toBe(vfs);
    })

    it('returns undefined for missing entries', () => {
        expect(resolvePath({}, '/test')).toBeUndefined();
    })

    it('resolves first level item', () => {
        const vfs = { 'a': 'passed' };

        expect(resolvePath(vfs, '/a')).toBe("passed");
    })

    it('resolves deep value', () => {
        const vfs = { 'a': { 'b': { 'c': { 'd': "deep passed" }}}};

        expect(resolvePath(vfs, '/a/b/c/d')).toBe("deep passed")
    })

    it('resolves relative paths', () => {
        const vfs = { 'a': { 'b': "relative passed" }};

        expect(resolvePath(vfs, 'a/b')).toBe("relative passed")
    })
})


function mockSFTP(vfs) {
    // The following samples are taken from a real FTP server
    const dirLongName  = 'drwxr-x---    2 user www            13 Jul 23 00:59 tmp'
    const fileLongName = '-rw-r-----    1 user www           760 Jul 23 00:59 main.css'
    const deletions = []

    return {
        'readdir': jest.fn((path, callback) => {
            const dirEntry = resolvePath(vfs, path);

            try {
                const ftpEntries = Object.keys(dirEntry)
                    .map((k) => [k, dirEntry[k]])
                    .map(([name, contents]) => ({
                        filename: name,
                        longname: contents instanceof Object ? dirLongName : fileLongName
                    }));

                try { callback(null, ftpEntries); } catch (callbackFailure) { console.error(callbackFailure) }
            } catch (e) {
                callback(e);
            }
        }),

        'unlink': jest.fn((filepath, callback) => {
            const {dir, base} = path.parse(filepath);
            const dirEntry = resolvePath(vfs, dir);

            if (dirEntry[base] instanceof Object) {
                callback(`Error: cannot unlink a directory: ${filepath}`)
            } else if (dirEntry[base] === undefined) {
                callback(`Error: file ${filepath} does not exist`)
             } else {
                delete dirEntry[base];
                deletions.push(filepath);
                callback();
            }
        }),

        'rmdir': jest.fn((dirpath, callback) => {
            const {dir, base} = path.parse(dirpath);
            const parentDirEntry = resolvePath(vfs, dir);

            if (parentDirEntry[base] instanceof Object) {
                delete parentDirEntry[base];
                deletions.push(dirpath);
                callback();
            } else {
                callback(`Error: ${dirpath} is not a directory`)
            }
        }),

        'deletions': deletions
    }
}

describe('mockSFTP', () => {
    let vfs;
    let sftp;
    let callback;

    beforeEach(() => {
        vfs = {
            'dir1': [],
            'dir2': {
                'a.txt': null,
                'b.txt': null
            },
            'file1.txt': null
        };
        sftp = mockSFTP(vfs);
        callback = jest.fn();
    })

    describe('readdir', () => {
        it('returns directory contents', () => {
            sftp.readdir('/dir2', callback);

            expect(callback).toBeCalled();

            const [err, entries] = callback.mock.calls[0]
            expect(err).toBeFalsy()
            expect(entries.length).toBe(2);
            expect(entries[0].filename).toBe('a.txt')
            expect(entries[1].filename).toBe('b.txt')
        })

        it('returns file type attribute in longname', () => {
            sftp.readdir('/', callback);

            expect(callback).toBeCalled();

            const [err, entries] = callback.mock.calls[0]
            expect(err).toBeFalsy()

            expect(entries.find((e) => e.filename === 'dir1').longname).toMatch(/^d/);
            expect(entries.find((e) => e.filename === 'file1.txt').longname).toMatch(/^-/);
        })

        it("fail on non-directory", () => {
            sftp.readdir('/file1.txt', callback);

            expect(callback).toBeCalled();

            var [err] = callback.mock.calls[0]
            expect(err).toBeTruthy();
        })

        it("fail on non-existing directory", () => {
            sftp.readdir('/non-existing-dir', callback);

            expect(callback).toBeCalled();

            const [err] = callback.mock.calls[0]
            expect(err).toBeTruthy();
        })
    })

    describe('unlink', () => {
        it('deletes file', () => {
            sftp.unlink('/file1.txt', callback);

            expect(vfs['file1.txt']).toBeUndefined();
            expect(callback).toBeCalled();

            const [err] = callback.mock.calls[0]
            expect(err).toBeFalsy();
        })

        it('records deletions in order', () => {
            sftp.unlink('/dir2/a.txt', callback);
            sftp.unlink('/dir2/b.txt', callback);
            
            expect(sftp.deletions.length).toBe(2);
            expect(sftp.deletions[0]).toBe('/dir2/a.txt');
            expect(sftp.deletions[1]).toBe('/dir2/b.txt');
        })

        it('fails on directories', () => {
            sftp.unlink('/dir1', callback);
            
            expect(sftp.deletions.length).toBe(0)
            expect(callback).toBeCalled();

            const [err] = callback.mock.calls[0]
            expect(err).toBeTruthy();
        })

        it('fails on non-existing files', () => {
            sftp.unlink('/non-existing-file.txt', callback);
            
            expect(sftp.deletions.length).toBe(0)
            expect(callback).toBeCalled();

            const [err] = callback.mock.calls[0]
            expect(err).toBeTruthy();
        })
    })

    describe('rmmdir', () => {
        it('deletes empty directories', () => {
            sftp.rmdir('/dir1', callback);

            expect(sftp.deletions.length).toBe(1);
            expect(sftp.deletions[0]).toBe('/dir1');
            expect(callback).toBeCalled();

            const [err] = callback.mock.calls[0]
            expect(err).toBeFalsy();
        })

        it('fails on files', () => {
            sftp.rmdir('/file1.txt', callback);

            expect(sftp.deletions.length).toBe(0)
            expect(callback).toBeCalled();

            const [err] = callback.mock.calls[0]
            expect(err).toBeTruthy();
        })

        it('fails on non-existing directories', () => {
            sftp.rmdir('/non-existing-directory', callback);

            expect(sftp.deletions.length).toBe(0)
            expect(callback).toBeCalled();

            const [err] = callback.mock.calls[0]
            expect(err).toBeTruthy();
        })
    })
})

describe('clearDirectory', () => {
    let callback;

    beforeEach(() => {
        callback = jest.fn();
    })

    it('keeps clearing destination root directory', () => {
        const sftp = mockSFTP({ 'dir': {} })

        clearDirectory(sftp, '/dir', callback);

        expect(sftp.deletions.length).toBe(0);
        expect(callback).toBeCalled();

        const [err] = callback.mock.calls[0]
        expect(err).toBeFalsy();
    })

    it('deletes contents before deleting a directory', () => {
        const sftp = mockSFTP({
            'dir': {
                'file1.txt': null,
                'file2.txt': null
            }
        })

        clearDirectory(sftp, '/', callback);

        expect(sftp.readdir).toBeCalled();
        expect(callback).toBeCalled();

        const [err] = callback.mock.calls[0]
        expect(err).toBeFalsy();

        expect(sftp.deletions.length).toBe(3);
        expect(sftp.deletions[0]).toBe('/dir/file1.txt');
        expect(sftp.deletions[1]).toBe('/dir/file2.txt');
        expect(sftp.deletions[2]).toBe('/dir');
    })
})