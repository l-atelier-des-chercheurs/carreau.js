"use strict";

var fs = require('fs-extra'),
	glob = require('glob'),
	path = require('path'),
	gm = require('gm'),
  mm = require('marky-mark'),
	moment = require('moment'),
	exec = require('child_process').exec,
// 	phantom = require('phantom'),
	sprintf = require('sprintf-js').sprintf,
	vsprintf = require('sprintf-js').vsprintf,
  merge = require('merge'),
  gutil = require('gulp-util'),
  parsedown = require('woods-parsedown'),
  slugg = require('slugg'),
  gm = require('gm').subClass({imageMagick: true}),
	flags = require('flags')
;


var settings  = require('./public/settings');


module.exports = function main(app, io){

	console.log("main module initialized");

	io.on("connection", function(socket){

		// I N D E X
		socket.on('newConf', onNewConf);
		socket.on('listConf', function (data){ onListConf(socket); });

		socket.on('listSlides', function (data){ onListSlides(socket, data); });
		socket.on('mediaNewPos', onMediaNewPos);
		socket.on('mediaNewSize', onMediaNewSize);
	});


// ------------- F U N C T I O N S -------------------

	// I N D E X      P A G E
	function onListConf( socket){
		console.log( "EVENT - onListConf");
    listAllFolders().then(function( allFoldersData) {
      sendEventWithContent( 'listAllFolders', allFoldersData, socket);
    }, function(error) {
      console.error("Failed to list folders! Error: ", error);
    });
	}

	function onNewConf( confData) {
		console.log('New Conf: '+ confData);
		createNewConf(confData).then(function(newpdata) {
			console.log('newpdata: '+newpdata);
      sendEventWithContent('confCreated', newpdata);
    }, function(errorpdata) {
      console.error("Failed to create a new folder! Error: ", errorpdata);
      sendEventWithContent('confAlreadyExist', errorpdata);
    });
	}
	// F I N      I N D E X

	function onListSlides( socket, dataFolder) {
		dev.logfunction( "EVENT - onListSlides");
    readConfMeta(dataFolder.slugConfName).then(function(confMeta) {
      dev.logverbose('just read conf meta');
      var confSlides = confMeta.slides;
      var confSlidesData = new Array();
      for(var slideName of confSlides) {
        dev.logverbose('Slide : ' + slideName);
        var mediaMeta = getMediaMeta(dataFolder.slugConfName, slideName);
        mediaMeta.metaName = slideName;
        confSlidesData.push(mediaMeta);
        dev.logverbose('new media meta added');
      }
      dev.logverbose('sending data : ' + JSON.stringify(confSlidesData));
      sendEventWithContent( 'listAllSlides', confSlidesData, socket);
    }, function(error) {
      console.error("Failed to list slides! Error: ", error);
    });
	}

  function onMediaNewPos(slidePos) {
    var slideNameWE = new RegExp( settings.regexpRemoveFileExtension, 'i').exec(slidePos.mediaName)[1];
    var mediaMeta = getMediaMeta(slidePos.slugConfName, slideNameWE);
    mediaMeta.posX = Math.max(slidePos.posX,0);
    mediaMeta.posY = slidePos.posY;
    updateMediaMeta(slidePos.slugConfName, slideNameWE, mediaMeta).then(function(mediaNewMeta) {
//      sendEventWithContent( 'listAllSlides', confSlidesData, socket);
    });
  }

  function onMediaNewSize(slideWidth) {
    var slideNameWE = new RegExp( settings.regexpRemoveFileExtension, 'i').exec(slideWidth.mediaName)[1];
    var mediaMeta = getMediaMeta(slideWidth.slugConfName, slideNameWE);
    mediaMeta.width = slideWidth.width;
    if(!mediaMeta.hasOwnProperty('ratio'))
      mediaMeta.height = slideWidth.height;
    updateMediaMeta(slideWidth.slugConfName, slideNameWE, mediaMeta).then(function(mediaNewMeta) {
//      sendEventWithContent( 'listAllSlides', confSlidesData, socket);
    });
  }



	// CONF METHOD !!
	function createNewConf( confData) {
    return new Promise(function(resolve, reject) {
    	console.log("COMMON — createNewFolder");

    	var confName = confData.titre;
    	var confLieu = confData.lieu;
    	var confDate= confData.date;
    	var confAuth = confData.auteur;
    	var confIntro = confData.introduction;
    	var slugConfName = slugg(confName);
    	var confPath = getFullPath( slugConfName);
    	var currentDateString = getCurrentDate();

  	  fs.access(confPath, fs.F_OK, function( err) {
    	  // if there's nothing at path
        if (err) {
        	console.log("New conf created with name " + confName + " and path " + confPath);
          fs.ensureDirSync(confPath);//write new folder in folders
          var fmeta =
            {
              "name" : confName,
              "introduction" : confIntro,
              "lieu" : confLieu,
              "date" : confDate,
              "auteur": confAuth,
              "created" : currentDateString,
            };
          storeData( getMetaFileOfFolder(confPath), fmeta, "create").then(function( meta) {
          	console.log('sucess ' + meta)
            resolve( meta);
          }, function(err) {
            console.log( gutil.colors.red('--> Couldn\'t create conf meta.'));
            reject( 'Couldn\'t create conf meta ' + err);
          });

        } else {
          // if there's already something at path
          console.log("WARNING - the following folder name already exists: " + slugConfName);
          var objectJson = {
            "name": confName,
            "timestamp": currentDateString
          };
          reject( objectJson);
        }
  	  });

    });
  }

  function listAllFolders() {
    return new Promise(function(resolve, reject) {
  		fs.readdir(settings.contentDir, function (err, filenames) {
        if (err) return console.log( 'Couldn\'t read content dir : ' + err);

        var folders = filenames.filter( function(slugFolderName){ return new RegExp("^([^.]+)$", 'i').test( slugFolderName); });
  	    console.log( "Number of folders in " + settings.contentDir + " = " + folders.length + ". Folders are " + folders);

  	    var foldersProcessed = 0;
  	    var allFoldersData = [];
  		  folders.forEach( function( slugFolderName) {

  		    if( new RegExp("^([^.]+)$", 'i').test( slugFolderName)
  		    && slugFolderName.indexOf( settings.deletedPrefix)){
    		    var fmeta = getFolderMeta( slugFolderName);
          	fmeta.slugFolderName = slugFolderName;
            allFoldersData.push( fmeta);
          }

          foldersProcessed++;
          if( foldersProcessed === folders.length && allFoldersData.length > 0) {
            console.log( "- - - - all folders JSON have been processed.");
            resolve( allFoldersData);
          }
  		  });
  		});
    });
	}

	function getMetaFileOfFolder( folderPath) {
    return folderPath + '/' + settings.confMetafilename + settings.metaFileext;
  }

  // C O M M O N     F U N C T I O N S
  function eventAndContent( sendEvent, objectJson) {
    var eventContentJSON =
    {
      "socketevent" : sendEvent,
      "content" : objectJson
    };
    return eventContentJSON;
  }

  function sendEventWithContent( sendEvent, objectContent, socket) {
    var eventAndContentJson = eventAndContent( sendEvent, objectContent);
    console.log("eventAndContentJson " + JSON.stringify( eventAndContentJson, null, 4));
    if( socket === undefined)
      io.sockets.emit( eventAndContentJson["socketevent"], eventAndContentJson["content"]);
    else
      socket.emit( eventAndContentJson["socketevent"], eventAndContentJson["content"]);
  }

  function getFullPath( path) {
    return settings.contentDir + "/" + path;
  }






  // should remove this function to replace with
  function getFolderMeta( slugFolderName) {
		console.log( "COMMON — getFolderMeta");

    var folderPath = getFullPath( slugFolderName);
  	var folderMetaFile = getMetaFileOfFolder( folderPath);

		var folderData = fs.readFileSync( folderMetaFile,settings.textEncoding);
		var folderMetadata = parseData( folderData);

    return folderMetadata;
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

  function getMediaMeta( slugConfName, fileNameWithoutExtension) {
  	dev.logfunction( "COMMON — getMediaMeta : slugConfName = " + slugConfName + " fileNameWithoutExtension = " + fileNameWithoutExtension);
  	var confPath = path.join(__dirname, settings.contentDir, slugConfName);
  	dev.logverbose( 'confPath = ' + confPath);
    var mediaMetaPath = path.join(confPath, fileNameWithoutExtension + settings.metaFileext);
  	dev.logverbose( 'mediaMetaPath = ' + mediaMetaPath);

    try{
      fs.accessSync( mediaMetaPath, fs.F_OK);
    } catch(err) {
      console.log( gutil.colors.red('-->Couldn’t find media metafile at path ' + mediaMetaPath));
      return new Error('Couldn’t find media metafile');
    }

  	var mediaData = fs.readFileSync(mediaMetaPath, settings.textEncoding);
/*   	dev.logverbose( 'mediaData = ' + mediaData); */
  	var mediaMetaData = parseData(mediaData);
  	dev.logverbose( "COMMON — getMediaMeta : data was parsed");
    return mediaMetaData;
  }

  function updateMediaMeta( slugConfName, fileNameWithoutExtension, newMediaMeta) {
    return new Promise(function(resolve, reject) {
    	dev.logfunction( "COMMON — updateMediaMeta : slugConfName = " + slugConfName + " fileNameWithoutExtension = " + fileNameWithoutExtension);
    	var confPath = path.join(__dirname, settings.contentDir, slugConfName);
      var mediaMetaPath = path.join(confPath, fileNameWithoutExtension + settings.metaFileext);
      storeData( mediaMetaPath, newMediaMeta, 'update').then(function( meta) {
        resolve(meta);
      }, function(err) {
        console.log( gutil.colors.red('--> Couldn\'t update media meta.'));
        reject( 'Couldn\'t update media meta ' + err);
      });
    });
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

// - - - END FUNCTIONS - - -

};

