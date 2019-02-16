'use strict';
// COSAdapter
// Store Parse Files in Tencent Cloud COS Service: https://cloud.tencent.com/product/cos
const storage = require('cos-nodejs-sdk-v5');

function requiredOrFromEnvironment(options, key, env) {
  options[key] = options[key] || process.env[env];
  if (!options[key]) {
    throw `COSAdapter requires an ${key}`;
  }
  return options;
}

function fromEnvironmentOrDefault(options, key, env, defaultValue) {
  options[key] = options[key] || process.env[env] || defaultValue;
  return options;
}

function optionsFromArguments(args) {
  let options = {};
  let SecretIdOrOptions = args[0];
  if (Object.prototype.toString.call(SecretIdOrOptions) === '[object String]') {
    options.SecretId = SecretIdOrOptions;
    options.SecretKey = args[1];
    options.Region = args[2];
    options.Bucket = args[3];
    options.DirectAccess = args[4];
  } else {
    options = Object.assign({}, SecretIdOrOptions);
  }
  options = requiredOrFromEnvironment(options, 'SecretId', 'COS_SECRET_ID');
  options = requiredOrFromEnvironment(options, 'SecretKey', 'COS_SECRET_KEY');
  options = requiredOrFromEnvironment(options, 'Region', 'COS_REGION');
  options = requiredOrFromEnvironment(options, 'Bucket', 'COS_BUCKET');
  options = fromEnvironmentOrDefault(options, 'DirectAccess', 'COS_DIRECT_ACCESS', undefined);
  return options;
}

/*
supported options
*SecretId / 'COS_SECRET_ID'
*SecretKey / 'COS_SECRET_KEY'
*Bucket / 'COS_BUCKET'
*Region / 'COS_REGION'
*DirectAccess / 'COS_DIRECT_ACCESS'
*/
function COSAdapter() {
  let options = optionsFromArguments(arguments);
  this._bucket = options.Bucket;
  this._region = options.Region;
  this._directAccess = options.DirectAccess;
  this._cosClient = new storage({
    SecretId: options.SecretId,
    SecretKey: options.SecretKey
  });
}

COSAdapter.prototype.createFile = function(filename, data, contentType) {
  return new Promise((resolve, reject) => {
    this._cosClient.putObject({
      Region : this._region,
      Bucket : this._bucket,
      Key : filename,
      Body: fs.createReadStream(data),
      contentType: contentType,
      onProgress: function (progressData) {
        return progressData;
      },
    }, function(err, result) {
      if(err) {
        return reject(err);
      } else {
        return resolve(result);
      }
    });
  });
}

COSAdapter.prototype.deleteFile = function(filename) {
  const params = {
    Region : this._region,
    Bucket : this._bucket,
    Key : filename
  };
  return new Promise((resolve, reject) => {
    this._cosClient.deleteObject(params, function(err, result) {
      if(err) {
        return reject(err);
      } else {
        return resolve(result);
      }
    });
  });
}

// Search for and return a file if found by filename.
// Returns a promise that succeeds with the buffer result from COS, or fails with an error.
COSAdapter.prototype.getFileData = function(filename) {
  const params = {
    Region : this._region,
    Bucket : this._bucket,
    Key : filename,
    output: 'WriteStream'
  };
  return new Promise((resolve, reject) => {
    this._cosClient.getObject(params, function(err, result) {
      if(err) {
        return reject(err);
      } else {
        return resolve(result);
      }
    });
  });
}

// Generates and returns the location of a file stored in COS for the given request and filename.
// The location is the direct COS link if the option is set,
// otherwise we serve the file through parse-server.
COSAdapter.prototype.getFileLocation = function(config, filename) {
  if (this._directAccess) {
    return `https://${this._bucket}.cos.${this._region}.myqcloud.com/${filename}`;
  }
  return (config.mount + '/files/' + config.applicationId + '/' + filename);
}

module.exports = COSAdapter;
module.exports.default = COSAdapter;
