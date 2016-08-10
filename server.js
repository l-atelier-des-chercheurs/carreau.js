var express = require("express"),
  http    = require('http'),
  fs = require('fs'),
  io = require('socket.io')
;

var app     = express();

var privateKey  = fs.readFileSync('file.pem', 'utf8');
var certificate = fs.readFileSync('file.crt', 'utf8');

//create https server
var credentials = {key: privateKey, cert: certificate};
var httpServer = http.createServer(app);
var io      = require("socket.io").listen(httpServer);

var strings  = require('./public/strings');
var main    = require('./main');
var config  = require('./config');
var router  = require('./router');

var m = new main(app, io);


/*
* Server config
*/
config(app, express);

/**
* Server routing and io events
*/
router(app, io, m);


/**
* Start the http server at port and IP defined before
*/

httpServer.listen(
  app.get("port"), function() {
    console.log("Server up and running. Go to https://localhost:" + app.get("port"));
  }
);
