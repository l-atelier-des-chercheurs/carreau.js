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

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

module.exports = function(app,io,m){

  /**
  * routing event
  */
  app.get("/", getIndex);
  app.get("/:conf", getConf);
  app.post("/file-upload", multipartMiddleware, postFile);

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
    var pageTitle = "Baking Projects";
    // console.log(req);
    res.render("conf", {title : pageTitle});
    // res.render("index", {title : pageTitle});
  };

  // function getIndex(req, res) {
  //   res.render("index", {title : "elif - 29 mars 2016"});
  // };

  function postFile(req, res) {
    console.log("------ Requête reçue ! -----");
    console.log(req.files);
    for(var i= 0; i<req.files.files.length; i++){
      if(req.files.files[i].size > 0){
        var name = req.files.files[i].name;
        var id = convertToSlug(name);
        var newPath = __dirname + "/uploads/"+name;
        console.log(name);
        fs.readFile(req.files.files[i].path, function (err, data) {
          fs.writeFile(newPath, data, function (err) {
            //write Json File to save data
            var jsonFile = 'uploads/lyon.json';
            var data = fs.readFileSync(jsonFile,"UTF-8");
            var jsonObj = JSON.parse(data);
            var jsonAdd = { "name" : name, "id":id};
            jsonObj["files"].push(jsonAdd);
            var jsonString = JSON.stringify(jsonObj, null, 4);
            fs.writeFile(jsonFile, jsonString, function(err) {
              if(err) {
                console.log(err);
              } else {
                console.log("New file -> The file was saved!");
                io.sockets.emit("newMedia", {path: newPath, name:name, id: id});
              }
            });
          });
        });
      }
    }
  };


  function convertToSlug(Text){
    // converti le texte en minuscule
    var s = Text.toLowerCase();
    // remplace les a accentué
    s = s.replace(/[àâäáã]/g, 'a');
    // remplace les e accentué
    s = s.replace(/[èêëé]/g, 'e');
    // remplace les i accentué
    s = s.replace(/[ìîïí]/g, 'i');
    // remplace les u accentué
    s = s.replace(/[ùûüú]/g, 'u');
    // remplace les o accentué
    s = s.replace(/[òôöó]/g, 'o');
    // remplace le c cédille
    s = s.replace(/[ç]/g, 'c');
    // remplace le ene tilde espagnol
    s = s.replace(/[ñ]/g, 'n');
    // remplace tous les caractères qui ne sont pas alphanumérique en tiret
    s = s.replace(/\W/g, '-');
    // remplace les double tirets en tiret unique
    s = s.replace(/\-+/g, '-');
    // renvoi le texte modifié
    return s;
  }

};