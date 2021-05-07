const fs = require('fs');

const getStoreData = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    fs.readFile('db.json', 'utf8', function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(JSON.parse(data));
    });
  });
};

const saveStoreData = (data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile('db.json', JSON.stringify(data), function (err) {
      if (err) {
        reject(err);
      }
      resolve(true);
    });
  });
};

export default {
  getStoreData,
  saveStoreData,
};
