var _ = require('underscore');
var url = require('url')
var fs = require('fs-extra');
var path = require('path');
var fs = require('fs-extra');
var settings  = require('./public/settings'),
	moment = require('moment'),
  merge = require('merge'),
  parsedown = require('woods-parsedown'),
  formidable = require('formidable'),
  main = require('./main'),
	flags = require('flags'),
  gutil = require('gulp-util'),
  sizeOf = require('image-size')
;

module.exports = function(app,io,m){

  /**
  * routing event
  */
  app.get("/", getIndex);
  app.get("/:conf", getConf);
  app.post("/:conf/file-upload", postFile2);

  /**
  * routing functions
  */

  // GET
  function getIndex(req, res) {
    var pageTitle = "Baking Projects";
    // console.log(req);
    res.render("index", {title : pageTitle});
  };

  function getConf(req, res) {
    var pageTitle = "Diapo.js";
    var slugConfName = req.param('conf');
    readConfMeta(slugConfName).then(function(confMeta) {
      res.render("conf", {title : pageTitle, "slugConfName": slugConfName, "confName": confMeta.name});
    });
  };

  function postFile2(req, res){
    console.log('Will add new media for conf ' + req.param('conf'));
    var slugConfName = req.param('conf');

    // create an incoming form object
    var form = new formidable.IncomingForm();

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;

    // store all uploads in the conf directory
    form.uploadDir = path.join(__dirname, settings.contentDir, slugConfName);

    var allFilesMeta = [];

    // every time a file has been uploaded successfully,
    form.on('file', function(field, file) {
      console.log('File uploaded.');
      // rename it to it's original name prepended by a number
      findFirstFilenameNotTaken(form.uploadDir, file.name).then(function(newFileName){
        var newPathToNewFileName = path.join(form.uploadDir, newFileName);
        fs.rename(file.path, newPathToNewFileName);

        createMediaMeta( form.uploadDir, newFileName).then(function(fileMeta){
          dev.logverbose("Pushing file meta to all files meta");
          allFilesMeta.push(fileMeta);
          dev.logverbose("append the file to the conf.txt file of conf " + slugConfName);
          readConfMeta(slugConfName).then(function(confMeta) {

            var curSlides = [];
            if( confMeta.hasOwnProperty('slides')) {
              curSlides = confMeta.slides;
            }

            // we just store a filename without the format
            var fileNameWithoutExtension = new RegExp( settings.regexpRemoveFileExtension, 'i').exec(newFileName)[1];
            curSlides.push(fileNameWithoutExtension);
            confMeta['slides'] = curSlides;

            var metaConfPath = getMetaFileOfConf(slugConfName);
            storeData(metaConfPath, confMeta, 'update');

          }, function(err) {
            console.log('fail readConfMeta ' + err);
            reject(err);
          });
        }, function(err) {
          console.log('fail createMediaMeta ' + err);
          reject(err);
        });
      }, function(err) {
        console.log('fail findFirstFilenameNotTaken ' + err);
        reject(err);
      });

    });

    console.log('Checkup');

    // log any errors that occur
    form.on('error', function(err) {
      console.log('An error has occured: \n' + err);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function() {
      console.log('Finished packet, will send medias info : ' + JSON.stringify(allFilesMeta));
      var msg = {
        "msg" : "success",
        "medias" : JSON.stringify(allFilesMeta)
      }
      // not using those packets
      res.end(JSON.stringify(msg));
    });

    // parse the incoming request containing the form data
    form.parse(req);
  }


  function createMediaMeta(confPath, mediaFileName) {
    return new Promise(function(resolve, reject) {
      console.log( "Will create a new meta file for media " + mediaFileName + " for conf " + confPath);
  //       var fileExtension = new RegExp( settings.regexpGetFileExtension, 'i').exec( mediaFileName)[0];
      var fileNameWithoutExtension = new RegExp( settings.regexpRemoveFileExtension, 'i').exec( mediaFileName)[1];

      var newMetaFileName = fileNameWithoutExtension + settings.metaFileext;
      var newPathToMeta = path.join(confPath, newMetaFileName);

      // essayer d'avoir la taille du media
      var newPathToImage = path.join(confPath, mediaFileName);
      try {
        var dimension = sizeOf(newPathToImage);
        if(typeof dimension !== undefined)
          var mediaRatio = dimension.height / dimension.width;
      } catch(err) {}

      var mdata =
      {
        "name" : mediaFileName,
        "created" : getCurrentDate(),
        "modified" : getCurrentDate(),
        "informations" : "",
        "posX" : settings.startingPosX,
        "posY" : settings.startingPosY,
        "width" : 50,
      };
      if(mediaRatio !== undefined) {
        mdata['ratio'] = mediaRatio;
      }

      dev.logverbose("Saving JSON string " + JSON.stringify(mdata, null, 4));
      storeData( newPathToMeta, mdata, 'create').then(function( meta) {
        console.log( "New media meta file created at path " + newPathToMeta + " with meta : " + meta);
        resolve(meta);
      }, function(err) {
        console.log( gutil.colors.red('--> Couldn\'t create media meta.'));
        reject( 'Couldn\'t create media meta ' + err);
      });
    });
  }





  function storeData( mpath, d, e) {
    return new Promise(function(resolve, reject) {
      console.log('Will store data');
      var textd = textifyObj(d);
      if( e === "create") {
        fs.appendFile( mpath, textd, function(err) {
          if (err) reject( err);
          resolve(parseData(textd));
        });
      }
  	  if( e === "update") {
        fs.writeFile( mpath, textd, function(err) {
          if (err) reject( err);
          resolve(parseData(textd));
        });
      }
    });
  }
  function textifyObj( obj) {
    var str = '';
    dev.logverbose( '1. will prepare string for storage');
    for (var prop in obj) {
      var value = obj[prop];
      dev.logverbose('2. prop ? ' + prop + ' and value ? ' + value);
      // if value is a string, it's all good
      // but if it's an array (like it is for medias in publications) we'll need to make it into a string
      if( typeof value === 'array' || typeof value === 'object') {
        dev.logverbose('this is an array');
        value = value.join('\n');
      // check if value contains a delimiter
      } else if( typeof value === 'string' && value.indexOf('\n----\n') >= 0) {
        dev.logverbose( '2. WARNING : found a delimiter in string, replacing it with a backslash');
        // prepend with a space to neutralize it
        value = value.replace('\n----\n', '\n ----\n');
      }
      str += prop + ': ' + value + settings.textFieldSeparator;
  //       dev.logverbose('Current string output : ' + str);
    }
  //     dev.logverbose( '3. textified object : ' + str);
    return str;
  }

  function getCurrentDate() {
    return moment().format( settings.metaDateFormat);
  }
  function parseData(d) {
  	dev.logverbose("Will parse data");
  	var parsed = parsedown(d);
  	// if there is a field called medias, this one has to be made into an array
  	if( parsed.hasOwnProperty('slides'))
  	  parsed.slides = parsed.slides.split('\n');
  	return parsed;
  }

  function readConfMeta( slugConfName) {
    return new Promise(function(resolve, reject) {
  		dev.logfunction( "COMMON — readConfMeta");
  		var metaConfPath = getMetaFileOfConf(slugConfName);
  		var folderData = fs.readFileSync( metaConfPath, settings.textEncoding);
  		var folderMetadata = parseData( folderData);
  		dev.logverbose( "conf meta : " + JSON.stringify(folderMetadata));
      resolve(folderMetadata);
    });
  }

  function getMetaFileOfConf( slugConfName) {
  	var confPath = path.join(__dirname, settings.contentDir, slugConfName);
  	var metaPath = path.join(confPath, settings.confMetafilename + settings.metaFileext);
    return metaPath;
  }

  function findFirstFilenameNotTaken( confPath, fileName) {
    return new Promise(function(resolve, reject) {
      // let's find the extension
      var fileExtension = new RegExp( settings.regexpGetFileExtension, 'i').exec( fileName)[0];
      var fileNameWithoutExtension = new RegExp( settings.regexpRemoveFileExtension, 'i').exec( fileName)[1];
      dev.logverbose("Looking for existing file with name : " + fileNameWithoutExtension + " in confPath : " + confPath);
      try {
        var newFileName = fileNameWithoutExtension + fileExtension;
        var newMetaFileName = fileNameWithoutExtension + settings.metaFileext;
        var index = 0;
        var newPathToFile = path.join(confPath, newFileName);
        var newPathToMeta = path.join(confPath, newMetaFileName);
        dev.logverbose( "2. about to look for existing files.");
        // check si le nom du fichier et le nom du fichier méta sont déjà pris
        while( (!fs.accessSync( newPathToFile, fs.F_OK) && !fs.accessSync( newPathToMeta, fs.F_OK))){
          dev.logverbose("- - following path is already taken : newPathToFile = " + newPathToFile + " or newPathToMeta = " + newPathToMeta);
          index++;

          newFileName = fileNameWithoutExtension + "-" + index + fileExtension;
          newMetaFileName = fileNameWithoutExtension + "-" + index + settings.metaFileext;
          newPathToFile = path.join(confPath, newFileName);
          newPathToMeta = path.join(confPath, newMetaFileName);
        }
      } catch(err) {

      }
      dev.logverbose( "3. this filename is not taken : " + newFileName);
      resolve(newFileName);
    });
  }


};


global.dev = (function() {
  // VARIABLES
  flags.defineBoolean('debug');
  flags.defineBoolean('verbose');
  flags.parse();

  var isDebugMode = flags.get('debug');
  var isVerbose = flags.get('verbose');

  return {
    init : function() {
      if(isDebugMode) {
        console.log('Debug mode is Enabled');
        console.log('---');
        dev.log('all functions are prepended with ~ ');
        dev.logpackets('(dev mode) green for sent packets');
        if(isVerbose) {
          dev.logverbose('(dev and verbose) gray for regular parsing data');
        }
      }
    },
    log : function(term) {
      if( isDebugMode)
        console.log(gutil.colors.blue('- ' + term));
    },
    logverbose : function(term) {
      if( isDebugMode && isVerbose)
        console.log(gutil.colors.gray('- ' + term));
    },
    logpackets : function(term) {
      if( isDebugMode)
        console.log(gutil.colors.green('- ' + term));
    },
    logfunction : function(term) {
      if( isDebugMode)
        console.info(gutil.colors.magenta('~ ' + term))
    }
  }
})();
dev.init();
