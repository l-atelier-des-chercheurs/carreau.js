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
	flags = require('flags'),
  merge = require('merge'),
  gutil = require('gulp-util'),
  parsedown = require('woods-parsedown'),
  slugg = require('slugg'),
  gm = require('gm').subClass({imageMagick: true})
;

var dodoc  = require('./public/strings');

module.exports = function(app, io){

  // VARIABLES
  flags.defineBoolean('debug');
  flags.defineBoolean('verbose');
  flags.parse();

  var dev = (function() {
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

	console.log("main module initialized");

	io.on("connection", function(socket){
		// I N D E X    P A G E
		socket.on( 'listSlides', function (data){ onListFolders( socket); });
	});

	// I N D E X     P A G E


}