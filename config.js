var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var dodoc  = require('./public/strings');

module.exports = function(app,express){
  app.set("port", 8080); //Server's port number
  app.set("views", __dirname + "/views"); //Specify the views folder
  app.set("view engine", "jade"); //View engine is Jade/pug
  app.use(express.static(__dirname + "/public")); //Specify where the static content is
  app.use(express.static(__dirname + "/" + dodoc.contentDir));
  app.use('/static', express.static("sessions"));
  //app.use(express.bodyParser()); //Tells server to support JSON, urlencoded, and multipart requests
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(favicon(__dirname + '/public/images/favicon.ico'));
}