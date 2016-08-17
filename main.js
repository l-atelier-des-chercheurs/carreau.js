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


		socket.on('dragMediaPos', function(pos){
			socket.broadcast.emit("mediaDragPosition", pos);
			io.sockets.emit("mediaDragPositionForAll", pos);
			//Save position in json
		  var jsonFile = 'uploads/lyon.json';
	    var data = fs.readFileSync(jsonFile,"UTF-8");
	    var jsonObj = JSON.parse(data);
	    for (var i = 0; i < jsonObj["files"].length; i++){
			  if (jsonObj["files"][i].id == pos.id){
			  	jsonObj["files"][i]["xPos"] = pos.x;
			  	jsonObj["files"][i]["yPos"] = pos.y;
			  	jsonObj["files"][i]["zPos"] = pos.z;
			  	var jsonString = JSON.stringify(jsonObj, null, 4);
		      fs.writeFile(jsonFile, jsonString, function(err) {
		        if(err) {
		            console.log(err);
		        } else {

		        }
		      });
			  }
			}
		});

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
      for(var confSlide of confSlides) {
        dev.logverbose('Slide : ' + confSlide);
        var mediaMeta = getMediaMeta(dataFolder.slugConfName, confSlide);
        confSlidesData.push(mediaMeta);
        dev.logverbose('new media meta added');
      }
      dev.logverbose('sending data : ' + JSON.stringify(confSlidesData));
      sendEventWithContent( 'listAllSlides', confSlidesData, socket);
    }, function(error) {
      console.error("Failed to list projects! Error: ", error);
    });
	}

  function onMediaNewPos() {

  }

	// CONF METHOD !!
	function createNewConf( confData) {
    return new Promise(function(resolve, reject) {
    	console.log("COMMON — createNewFolder");

    	var confLieu = confData.lieu;
    	var confDate= confData.date;
    	var confName = confData.titre;
    	var confAuth = confData.auteur;
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
    var mediaMetaPath = path.join(confPath, fileNameWithoutExtension + settings.metaFileext);
  	var mediaData = fs.readFileSync(mediaMetaPath, settings.textEncoding);
  	var mediaMetaData = parseData(mediaData);
  	dev.logverbose( "COMMON — getMediaMeta : data was parsed " + JSON.stringify(mediaMetaData, null, 4));
    return mediaMetaData;
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

