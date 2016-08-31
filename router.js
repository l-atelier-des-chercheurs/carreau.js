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
  sizeOf = require('image-size'),
  mm = require('marky-mark'),
  slugg = require('slugg')
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
    var pageTitle = "carreau.js";
    // console.log(req);
    res.render("index", {"pageTitle" : pageTitle, "settings" : settings});
  };

  function getConf(req, res) {
    var slugConfName = req.param('conf');
    readConfMeta(slugConfName).then(function(c) {
      dev.logverbose('meta conf gotten. Sending back conf to client');
      var confMeta = {
        "pageTitle" : c.name + ' | carreau.js',
        "slugConfName": slugConfName,
        "confName": c.name
      };
      if( c.lieu !== undefined)
        confMeta.lieu = c.lieu;
      if( c.date !== undefined)
        confMeta.date = c.date;
      if( c.auteur !== undefined)
        confMeta.auteur = c.auteur;
      if( c.introduction !== undefined)
        confMeta.introduction = c.introduction;
      res.render("conf", confMeta);
    });
  };

  function postFile2(req, res){
    console.log('Will add new media for conf ' + req.param('conf'));
    var slugConfName = req.param('conf');

    // create an incoming form object
    var form = new formidable.IncomingForm();

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = false;

    // store all uploads in the conf directory
    form.uploadDir = path.join(__dirname, settings.contentDir, slugConfName);

    var allFilesMeta = [];
    var allIframeMeta = [];
    var index = 0;
    var processed;

    form.on('field', function(name, value) {
      console.log('Name: ' + name);
      console.log('Value: ' + value);
      if(name === 'iframe[]') {
        allIframeMeta.push(value);
      }
    });

    // every time a file has been uploaded successfully,
    form.on('file', function(field, file) {
      console.log('File uploaded.');
      console.log('field data : ' + JSON.stringify(field));
      console.log('file data : ' + JSON.stringify(file));
      allFilesMeta.push(file);
    });

    // log any errors that occur
    form.on('error', function(err) {
      console.log('An error has occured: \n' + err);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function() {



      // if websites
      if(allIframeMeta.length > 0) {
        var m = [];
        for(var i in allIframeMeta) {
          m.push(renameMediaAndCreateMetaForIframe(form.uploadDir, slugConfName, allIframeMeta[i]));
        }
        Promise.all(m).then(function(filesToAddToMeta) {
          addMediasToMetaConf(slugConfName, filesToAddToMeta);
          var msg = {
            "msg" : "success",
            "medias" : JSON.stringify(allIframeMeta)
          }
          // not using those packets actually
          res.end(JSON.stringify(msg));
        });
      }

      // if files
      if(allFilesMeta.length > 0) {
        var m = [];
        for(var i in allFilesMeta) {
          m.push(renameMediaAndCreateMeta(form.uploadDir, slugConfName, allFilesMeta[i]));
        }

        dev.logverbose('Will promise all soon');

        // rename the new media if necessary to it's original name prepended by a number
        Promise.all(m).then(function(filesToAddToMeta) {
          addMediasToMetaConf(slugConfName, filesToAddToMeta);
          var msg = {
            "msg" : "success",
            "medias" : JSON.stringify(allFilesMeta)
          }
          // not using those packets actually
          res.end(JSON.stringify(msg));
        });
      }
    });

    // parse the incoming request containing the form data
    form.parse(req);
  }

  function renameMediaAndCreateMeta( uploadDir, slugConfName, file) {
    return new Promise(function(resolve, reject) {
      findFirstFilenameNotTaken( uploadDir, file.name).then(function(newFileName){
        dev.logverbose('Found new name');
        var newPathToNewFileName = path.join(uploadDir, newFileName);
        fs.rename(file.path, newPathToNewFileName);
        createMediaMeta( uploadDir, newFileName).then(function(fileMeta){
          resolve(newFileName);
        }, function(err) {
          console.log('fail createMediaMeta ' + err);
          reject(err);
        });
      }, function(err) {
        console.log('fail findFirstFilenameNotTaken ' + err);
        reject(err);
      });
    });
  }

  function renameMediaAndCreateMetaForIframe( uploadDir, slugConfName, websiteName) {
    return new Promise(function(resolve, reject) {
      var slugWebsiteName = slugg(websiteName);
      findFirstFilenameNotTaken( uploadDir, slugWebsiteName + settings.metaFileext).then(function(newSlugWebsiteName){
        createMediaMeta( uploadDir, websiteName, newSlugWebsiteName).then(function(fileMeta){
          resolve(newSlugWebsiteName);
        }, function(err) {
          console.log('fail createMediaMeta for Iframes : ' + err);
          reject(err);
        });
      }, function(err) {
        console.log('fail findFirstFilenameNotTaken for iframe : ' + err);
        reject(err);
      });
    });
  }

  function createMediaMeta(confPath, mediaFileName, metaFileName) {
    return new Promise(function(resolve, reject) {
      console.log( "Will create a new meta file for media " + mediaFileName + " for conf " + confPath);

      // if no metaFileName, we will deduce metaFileName from mediaFileName
      if(metaFileName === undefined) {
        var fileNameWithoutExtension = new RegExp( settings.regexpRemoveFileExtension, 'i').exec( mediaFileName)[1];
        metaFileName = fileNameWithoutExtension + settings.metaFileext;
      }
      var newPathToMeta = path.join(confPath, metaFileName);

      // essayer d'avoir la taille du media
      var newPathToMedia = path.join(confPath, mediaFileName);
      try {
        var dimension = sizeOf(newPathToMedia);
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
        "width" : settings.startingWidth,
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



  function addMediasToMetaConf(slugConfName, filesToAddToMeta) {

    dev.logverbose('Finished adding media files, let’s add those to the conf meta');
    dev.logverbose('filesToAddToMeta : ' + JSON.stringify(filesToAddToMeta, null, 4));

    readConfMeta(slugConfName).then(function(confMeta) {
      var curSlides = [];
      if( confMeta.hasOwnProperty('slides')) {
        curSlides = confMeta.slides;
      }
      // we just store a filename without the format
      dev.logverbose('filesToAddToMeta is of type ' + typeof filesToAddToMeta);
      if( typeof filesToAddToMeta === 'array' || typeof filesToAddToMeta === 'object') {
        for(var i in filesToAddToMeta) {
          dev.logverbose('acting on slide ' + filesToAddToMeta[i]);
          var fileNameWithoutExtension = new RegExp( settings.regexpRemoveFileExtension, 'i').exec(filesToAddToMeta[i])[1];
          curSlides.push(fileNameWithoutExtension);
        }
      } else if( typeof filesToAddToMeta === 'string'){
        var fileNameWithoutExtension = new RegExp( settings.regexpRemoveFileExtension, 'i').exec(filesToAddToMeta)[1];
        curSlides.push(fileNameWithoutExtension);
      }
      dev.logverbose('new slides for meta ' + JSON.stringify(curSlides, null, 4))
      confMeta['slides'] = curSlides;
      var metaConfPath = getMetaFileOfConf(slugConfName);
      storeData(metaConfPath, confMeta, 'update');
    }, function(err) {
      console.log('fail readConfMeta ' + err);
      reject(err);
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
    	if( parsed.hasOwnProperty('slides')) {
      	parsed.slides = parsed.slides.trim();
    	  parsed.slides = parsed.slides.split('\n');
    }
    	return parsed;
  }

  function readConfMeta( slugConfName) {
    return new Promise(function(resolve, reject) {
  		dev.logfunction( "COMMON — readConfMeta");
  		var metaConfPath = getMetaFileOfConf(slugConfName);
  		var folderData = fs.readFileSync( metaConfPath, settings.textEncoding);
  		var folderMetadata = parseData( folderData);
  		if( folderMetadata.introduction !== undefined) {
      try {
        folderMetadata.introduction = mm.parse(folderMetadata.introduction).content;
      } catch(err){
        console.log('Couldn’t parse conf introduction for conf ' + slugConfName);
      }
    }
  		dev.logverbose( "conf meta : " + JSON.stringify(folderMetadata));
      resolve(folderMetadata);
    });
  }

  function getMetaFileOfConf( slugConfName) {
    	var confPath = path.join(__dirname, settings.contentDir, slugConfName);
    	var metaPath = path.join(confPath, settings.confMetafilename + settings.metaFileext);
    return metaPath;
  }

  // check whether fileName (such as "hello-world.mp4") already exists in the conf folder
  function findFirstFilenameNotTaken( confPath, fileName) {
    return new Promise(function(resolve, reject) {
      // let's find the extension if it exists
      var fileExtension = new RegExp( settings.regexpGetFileExtension, 'i').exec( fileName)[0];
      var fileNameWithoutExtension = new RegExp( settings.regexpRemoveFileExtension, 'i').exec( fileName)[1];
      fileNameWithoutExtension = slugg(fileNameWithoutExtension);
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
