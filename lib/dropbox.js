const Dropbox = require('dropbox');

const QUEUED_FOLDER = process.env.DROPBOX_FOLDER;
const TWEETED_FILE = `${QUEUED_FOLDER}.json`;

const dbx = new Dropbox({
  accessToken: process.env.DROPBOX_ACCESS_TOKEN
});

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

const getTweetedFiles = () => {
  return new Promise((resolve, reject) => {
    downloadEntry(TWEETED_FILE)
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

const markAsTweeted = (file, url) => {
  return getTweetedFiles().then(tweeted => {
    tweeted.unshift({
      name: file.name,
      url: url
    });
    return uploadFile(TWEETED_FILE, JSON.stringify(tweeted, null, 2)).then(
      () => {
        return deleteFile(file.path);
      }
    );
  });
};

module.exports = {
  getAllFiles,
  getRandomImage,
  markAsTweeted,
  getTweetedFiles
};
