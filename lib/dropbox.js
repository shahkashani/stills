const Dropbox = require('dropbox');
const path = require('path');
const fs = require('fs');

const { DROPBOX_ACCESS_TOKEN, DROPBOX_FOLDER } = process.env;

const POSTED_FILE = `${DROPBOX_FOLDER}.json`;

const dbx = new Dropbox({
  accessToken: DROPBOX_ACCESS_TOKEN
});

const canConnect = () => DROPBOX_ACCESS_TOKEN && DROPBOX_FOLDER;

const uploadFile = (path, contents) =>
  dbx.filesUpload({
    path,
    contents,
    mode: 'overwrite'
  });

const deleteFile = path => dbx.filesDelete({ path });

const downloadEntry = path => {
  return new Promise((resolve, reject) => {
    dbx
      .filesDownload({ path })
      .then(result => {
        resolve({
          name: result.name,
          path: result.path_lower,
          data: result.fileBinary
        });
      })
      .catch(reject);
  });
};

const getPostedFiles = () => {
  return new Promise((resolve, reject) => {
    downloadEntry(POSTED_FILE)
      .then(result => {
        resolve(JSON.parse(result.data.trim()));
      })
      .catch(reject);
  });
};

const getAllFiles = () => {
  return new Promise((resolve, reject) => {
    dbx
      .filesListFolder({ path: QUEUED_FOLDER })
      .then(response => {
        resolve(response.entries);
      })
      .catch(reject);
  });
};

const getRandomFolderEntry = () => {
  return new Promise((resolve, reject) => {
    getAllFiles()
      .then(files => {
        if (files.length === 0) {
          reject('No more images in Dropbox!!');
        } else {
          resolve(files[Math.floor(files.length * Math.random())]);
        }
      })
      .catch(reject);
  });
};

const getRandomImage = () =>
  getRandomFolderEntry().then(entry => downloadEntry(entry.path_lower));

const markAsPosted = (file, urls) => {
  return getPostedFiles().then(posted => {
    posted.unshift({
      name: file.name,
      ...urls
    });
    return uploadFile(POSTED_FILE, JSON.stringify(posted, null, 2)).then(() => {
      return deleteFile(file.path);
    });
  });
};

const uploadPhoto = photo =>
  uploadFile(
    `${DROPBOX_FOLDER}/${path.basename(photo)}`,
    fs.readFileSync(photo)
  );

module.exports = {
  canConnect,
  getAllFiles,
  getRandomImage,
  markAsPosted,
  getPostedFiles,
  uploadPhoto
};
