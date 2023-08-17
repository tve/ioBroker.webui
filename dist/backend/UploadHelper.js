import fs from 'fs';
import fsAsync from 'fs/promises';
import path from 'path';
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export class Uploadhelper {
    constructor(adapter) {
        this._stoppingPromise = false;
        this._ignoredFileExtensions = [
            '.npmignore',
            '.gitignore',
            '.DS_Store',
            '_socket/info.js',
            'LICENSE'
        ];
        this._adapter = adapter;
        this._adapterName = this._adapter.name;
        this._uploadStateObjectName = `system.adapter.${this._adapterName}.upload`;
    }
    static async upload(adapter, sourceDirectory, targetDirectory) {
        const hlp = new Uploadhelper(adapter);
        await hlp.upload(sourceDirectory, targetDirectory);
    }
    async upload(sourceDirectory, targetDirectory) {
        if (!fs.existsSync(sourceDirectory)) {
            this._adapter.log.warn(`source directory does not exist: ${sourceDirectory}`);
            return;
        }
        await this._adapter.setForeignStateAsync(`system.adapter.${this._adapterName}.upload`, 0, true);
        try {
            await this._adapter.getForeignObjectAsync(this._adapterName);
        }
        catch {
            // ignore
        }
        // Read all names with subtrees from the local directory
        const files = this.walk(sourceDirectory);
        const { filesToDelete } = await this.collectExistingFilesToDelete(targetDirectory);
        this._adapter.log.debug(`Erasing files: ${filesToDelete.length}`);
        if (this._stoppingPromise) {
            return;
        }
        /*for (let f of filesToDelete) {
            this._adapter.log.debug(`Erasing file: ${f}`);
        }*/
        // delete old files, before upload of new
        await this.eraseFiles(filesToDelete);
        this._adapter.log.debug(`Erasing done, start upload...`);
        await this.uploadInternal(files, sourceDirectory, targetDirectory);
        if (this._stoppingPromise) {
            return;
        }
    }
    async collectExistingFilesToDelete(dir) {
        let _files = [];
        let _dirs = [];
        let files;
        if (this._stoppingPromise) {
            return { filesToDelete: _files, dirs: _dirs };
        }
        try {
            //this._adapter.log.debug(`Scanning ${dir}`);
            files = await this._adapter.readDirAsync(this._adapterName, dir);
        }
        catch {
            // ignore err
            files = [];
        }
        if (files && files.length) {
            for (const file of files) {
                if (file.file === '.' || file.file === '..') {
                    continue;
                }
                const newPath = path.join(dir, file.file);
                if (file.isDir) {
                    if (!_dirs.find(e => e.path === newPath)) {
                        _dirs.push({ adapter: this._adapter, path: newPath });
                    }
                    try {
                        const result = await this.collectExistingFilesToDelete(`${newPath}/`);
                        if (result.filesToDelete) {
                            _files = _files.concat(result.filesToDelete);
                        }
                        _dirs = _dirs.concat(result.dirs);
                    }
                    catch (err) {
                        this._adapter.log.warn(`Cannot delete folder "${this._adapter}${newPath}/": ${err.message}`);
                    }
                }
                else if (!_files.find(e => e.path === newPath)) {
                    _files.push(newPath);
                }
            }
        }
        return { filesToDelete: _files, dirs: _dirs };
    }
    async eraseFiles(files) {
        if (files && files.length) {
            for (const file of files) {
                if (this._stoppingPromise) {
                    return;
                }
                try {
                    await this._adapter.unlinkAsync(this._adapterName, file);
                }
                catch (err) {
                    this._adapter.log.error(`Cannot delete file "${file}": ${err}`);
                }
            }
        }
    }
    async uploadInternal(files, sourceDirectory, targetDirectory) {
        await this._adapter.setForeignStateAsync(this._uploadStateObjectName, { val: 0, ack: true });
        const dirLen = sourceDirectory.length;
        let filePromises = new Set;
        let maxParallelUpload = 20;
        for (let f = 0; f < files.length; f++) {
            const file = files[f];
            if (this._stoppingPromise) {
                return;
            }
            let attName = targetDirectory + file.substring(dirLen).replace(/\\/g, '/');
            // write upload status into log
            if (files.length - f > 100) {
                (!f || !((files.length - f - 1) % 50)) &&
                    this._adapter.log.debug(`upload [${files.length - f - 1}] ${file.substring(dirLen)} ${attName}`);
            }
            else if (files.length - f - 1 > 20) {
                (!f || !((files.length - f - 1) % 10)) &&
                    this._adapter.log.debug(`upload [${files.length - f - 1}] ${file.substring(dirLen)} ${attName}`);
            }
            else {
                this._adapter.log.debug(`upload [${files.length - f - 1}] ${file.substring(dirLen)} ${attName}`);
            }
            // Update upload indicator
            const now = Date.now();
            if (!this._lastProgressUpdate || now - this._lastProgressUpdate > 1000) {
                this._lastProgressUpdate = now;
                await this._adapter.setForeignStateAsync(this._uploadStateObjectName, {
                    val: Math.round((1000 * (files.length - f)) / files.length) / 10,
                    ack: true,
                });
            }
            try {
                this._adapter.log.info(`... start ${file} ${filePromises.size} ${maxParallelUpload} ${filePromises.size > maxParallelUpload} ...`);
                while (filePromises.size > maxParallelUpload) {
                    await sleep(10);
                }
                this._adapter.log.info(`... after sleep ${file} ...`);
                let uploadPromise = this._uploadFile(file, attName);
                this._adapter.log.info(`... after upload ${file} ...`);
                filePromises.add(uploadPromise);
                uploadPromise.then(x => filePromises.delete(uploadPromise));
                this._adapter.log.info(`... after upload an fullfillchek ${file} ...`);
            }
            catch (e) {
                this._adapter.log.error(`Error: Cannot upload ${file}: ${e.message}`);
            }
        }
        this._adapter.log.error(`Wait for last upload Promises to fullfill`);
        Promise.all(filePromises);
        this._adapter.log.error(`upload done`);
        // Set upload progress to 0;
        if (files.length) {
            await this._adapter.setForeignStateAsync(this._uploadStateObjectName, { val: 0, ack: true });
        }
        return;
    }
    async _uploadFile(sourceFile, destinationFile) {
        const data = await fsAsync.readFile(sourceFile);
        await this._adapter.writeFileAsync(this._adapterName, destinationFile, data);
    }
    // Read synchronous all files recursively from local directory
    walk(dir, _results) {
        const results = _results || [];
        if (this._stoppingPromise) {
            return results;
        }
        try {
            if (fs.existsSync(dir)) {
                const list = fs.readdirSync(dir);
                list.map(file => {
                    const stat = fs.statSync(`${dir}/${file}`);
                    if (stat.isDirectory()) {
                        this.walk(`${dir}/${file}`, results);
                    }
                    else {
                        if (!this._ignoredFileExtensions.some(x => file.endsWith(x))) {
                            results.push(`${dir}/${file}`);
                        }
                    }
                });
            }
        }
        catch (err) {
            console.error(err);
        }
        return results;
    }
}
