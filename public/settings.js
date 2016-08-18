// set lang here
var lang = 'fr';



// localize strings
if( lang === 'fr') {
  var localize = {
    "lang" : {
      "folder" : "Dossier",
      "project" : "Projet",
      "projects" : "Projets",
      "capture" : "Prise de vue",
      "bibli" : "Bibliotheque de médias",
      "publi" : "Publication",
    }
  };
} else if( lang === 'en') {
  var localize = {
    "lang" : {
      "folder" : "Folder",
      "project" : "Project",
      "projects" : "Projects",
      "capture" : "Media capture",
      "bibli" : "Media library",
      "publi" : "Publication",

      "remove" : "Remove",

      "lastMediasAdded" : "Last medias added",
      "listOfPublications" : "List of publications",

    }
  };
}

var settings = {

  "codelang" : lang,
  "contentDir" : "conferences",
  "metaFileext" : ".txt",
  "confMetafilename" : "meta",

  "projectPublisFoldername" : "publications",
  "projectPhotosFoldername" : "01-photos",
  "projectAnimationsFoldername" : "02-animations",
  "projectVideosFoldername" : "03-videos",
  "projectAudiosFoldername" : "04-sons",
  "projectTextsFoldername" : "05-textes",

  "metaDateFormat" : "YYYYMMDD_HHmmss",
  "textEncoding" : "UTF-8",
  "textFieldSeparator" : "\n\n----\n\n",
  "deletedPrefix" : "x_",
  "thumbSuffix" : "_thumb",

  "mediaThumbWidth" : 320,
  "mediaThumbHeight" : 240,

  "startingPosX" : 0,
  "startingPosY" : 0,
  "startingWidth" : .50,

  "_comment" : "// see http://regexr.com/3d4t8",
  "regexpMatchFolderNames" : "^([^.]+)$",
  "regexpMatchProjectPreviewNames" : "^(apercu|preview)",
  "regexpGetFileExtension" : "\\.[^.]*$",
  "regexpRemoveFileExtension" : "(.+?)(\\.[^.]*$|$)"

};

// should work in ES6
var settings = Object.assign( localize, settings);

try {
  module.exports = settings;
} catch( err) {

}