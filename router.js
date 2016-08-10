var _ = require("underscore");
var url = require('url')
var fs = require('fs-extra');
var path = require("path");
var fs = require('fs-extra');
var strings  = require('./public/strings'),
	moment = require( "moment" ),
  merge = require('merge'),
  parsedown = require('woods-parsedown')
;

module.exports = function(app,io,m){

  /**
  * routing event
  */
  app.get("/", getIndex);

  /**
  * routing functions
  */
  function getFullPath( path) {
    return strings.contentDir + "/" + path;
  }

  function getMetaFileOfFolder( slugFolderName) {
    return getFullPath( slugFolderName) + '/' + strings.folderMetafilename + strings.metaFileext;
  }
  function getCurrentDate() {
    return moment().format( strings.metaDateFormat);
  }
  function eventAndContent( sendEvent, objectJson) {
    var eventContentJSON =
    {
      "socketevent" : sendEvent,
      "content" : objectJson
    };
    return eventContentJSON;
  }


  function generatePageData( req, pageTitle) {

    var pageDataJSON = [];

    var slugFolderName = req.param('folder');
    if( slugFolderName !== undefined) {
      var jsonFileOfFolder = getMetaFileOfFolder( slugFolderName);
      var folderData = readMetaFile( jsonFileOfFolder);

      pageDataJSON.slugFolderName = slugFolderName;
      pageDataJSON.folderName = folderData.name;
      pageDataJSON.statut = folderData.statut;

      var slugProjectName = req.param('project');
      if( slugProjectName !== undefined) {
        var projectPath = getProjectPath( slugFolderName, slugProjectName)
        var jsonFileOfProject = getMetaFileOfProject( projectPath);
        var projectData = readMetaFile( jsonFileOfProject);

        pageDataJSON.slugProjectName = slugProjectName;
        pageDataJSON.projectName = projectData.name;

        var slugPubliName = req.param('publi');
        if( slugPubliName !== undefined) {
          var jsonFileOfPubli = getPathToPubli( slugFolderName, slugProjectName, slugPubliName) + strings.metaFileext;
          var fullPathToJsonFileOfPubli = makePathToPubliFull( jsonFileOfPubli);
          var publiData = readMetaFile( fullPathToJsonFileOfPubli);

          pageDataJSON.slugPubliName = slugPubliName;
          pageDataJSON.publiName = publiData.name;
        }
      }
    }

    if( publiData !== undefined)
      pageTitle += " | " + publiData.name;
    else if( projectData !== undefined)
      pageTitle += " | " + projectData.name;
    else if( folderData !== undefined)
      pageTitle += " | " + folderData.name;

    if( pageTitle !== undefined)
      pageDataJSON.pageTitle = pageTitle;

    pageDataJSON.url = req.path;

    pageDataJSON.strings = strings;

    return pageDataJSON;
  }


  // GET
  function getIndex(req, res) {
    var pageTitle = "Do.Doc";
    var generatePageDataJSON = generatePageData(req, pageTitle);
    res.render("index", generatePageDataJSON);
  };


  function readMetaFile( metaFile){
    var metaFileContent = fs.readFileSync( metaFile, 'utf8');
    var metaFileContentParsed = parseData( metaFileContent);
    return metaFileContentParsed;
  }

	function parseData(d) {
  	var parsed = parsedown(d);
  	// if there is a field called medias, this one has to be made into an array
  	if( parsed.hasOwnProperty('medias'))
  	  parsed.medias = parsed.medias.split(',');
    // the fav field is a boolean, so let's convert it
  	if( parsed.hasOwnProperty('fav'))
  	  parsed.fav = (parsed.fav === 'true');
		return parsed;
	}

  function getPhotoPathOfProject() {
    return strings.projectPhotosFoldername;
  }
};
