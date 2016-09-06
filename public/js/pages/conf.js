

/***************************************************************************
                  Conf logic
***************************************************************************/

/* VARIABLES */
var socket = io.connect();
var zIndex = 0;


/* sockets */
socket.on('connect', onSocketConnect);
socket.on('error', onSocketError);

function onSocketConnect() {
	sessionId = socket.io.engine.id;
	console.log('Connected ' + sessionId);
};

function onSocketError(reason) {
	console.log('Unable to connect to server', reason);
};


socket.on('listAllSlides', onListAllSlides);

jQuery(document).ready(function($) {
	init();
});


function init(){

	socket.emit('listSlides', { "slugConfName" : app.slugConfName});

	setDragEvents();

  setWebcamEvents();


}


function setWebcamEvents() {
  currentStream.init();
  $('.js--openCloseCamera').on('click', function() {
    toggleWebcamPopover();
  });

  document.body.onkeydown = function(e){
    if(e.keyCode == 32){
      toggleWebcamPopover();
      e.preventDefault();
      return false;
    }
  }

}

function toggleWebcamPopover() {
  $('.js--popover_cameraFeed').toggleClass('is--open');

  if( $('.js--popover_cameraFeed').hasClass('is--open')) {
    $('body').addClass('is--unscrollable');
    currentStream.startCameraFeed();
  } else {
    $('body').removeClass('is--unscrollable');
    currentStream.stopAllFeeds();
  }
}

function setDragEvents() {

	$(window)
	  .on('dragover',function(e){
  		$(".drop-files-container").addClass('is--visible');
  		e.preventDefault();
  		e.stopPropagation();
  		return false;
  	})
    ;
	$(".drop-files-container")
    	.on("drop", function(e) {
    		e.preventDefault();
    		$(".drop-files-container").removeClass('is--visible');
    		console.log("DROP FILE");


      if( e.originalEvent.dataTransfer.files.length >= 0) {
        var files = e.originalEvent.dataTransfer.files;
        // code adapted from https://coligo.io/building-ajax-file-uploader-with-node/
        var formData = new FormData();
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          // add the files to formData object for the data payload
          formData.append('uploads[]', file, file.name);
        }
        uploadFormData(formData);
      }
      if(typeof e.originalEvent.dataTransfer.getData('text') === 'string' && e.originalEvent.dataTransfer.getData('text').length > 0) {
        // code adapted from https://coligo.io/building-ajax-file-uploader-with-node/
        var formData = new FormData();
        formData.append('iframe[]', e.originalEvent.dataTransfer.getData('text'));
        uploadFormData(formData);
      }

    	})
    	.on('dragleave',function(e){
    		$(".drop-files-container").removeClass('is--visible');
    		e.preventDefault();
    		e.stopPropagation();
    		return false;
    	})
  	;

}


// executed on page load or media update (with diff checking)
function onListAllSlides(d) {
  console.log('Listing all slides');

  // create slides for dom
  var $allNewSlides = $();
  d.forEach(function(s) {
    $allNewSlides = $allNewSlides.add(listOneSlide(s));
  });

  // adding slides to dom
  var firstSlidePosY;
  $allNewSlides.each(function(i) {
    $mediaItem = $(this);
    $('.slides-list').append($mediaItem);
    setSceneForSlide($mediaItem[0]);
    initInteractForSlide({
      'slide' : $mediaItem.find('.js--interactevents')[0],
      'preserveRatio' : $mediaItem.data('preserveRatio')
    });
    if(i === 0) {
      firstSlidePosY = $mediaItem.offset().top;
    }
  });

  // if we just sent a few medias/websites
  if( $('.js--popover_upload').hasClass('is--open')){
    $('.js--popover_upload').removeClass('is--open');
    $('html').animate(
      {scrollTop: firstSlidePosY},
      900,
      $.easing.easeInOutQuint
    );
  }
}

function onListOneSlide(d) {
  console.log('Listing all slides');
  listOneSlide(d);
}

function listOneSlide(d) {
  console.log('Listing one slide');

  // Check if it has a name (ie. a media name associated with a metaName
  // Missing medias only have a metaName like 1-mymedia
  if(d.name === undefined) {
    popup.displayMessage('Le média suivant n’a pas été trouvé&nbsp;: <br><strong>' + d.metaName + '</strong>');
    return;
  }

	var ext = d.name.split('.').pop();
	var isUrl = false;
	if(d.name.toLowerCase().indexOf('http://') !== -1 || d.name.toLowerCase().indexOf('https://') !== -1) {
    	isUrl = true;
  }
	var mediaItem;
  var preserveRatio = true;

  var $existingSlide = $('.slides-list .slide').filter(function() {
    return $(this).attr('data-filename') === d.metaName;
  });
  if( $existingSlide.length > 0) {
    console.log('Slide already exists');
    return;
  }

  if( isUrl ) {
		mediaItem = $(".js--templates > .js--iframeSlide").clone(false);
    mediaItem
		  .find( 'iframe')
		    .attr('data-src', d.name)
		  .end()
		  .find('.pageUrl')
		    .text(d.name)
		  .end()
		  .find('.js--startIframe')
		    .on('click', function() {
    		    var ifr = mediaItem.find('iframe');
    		    if(ifr.attr('src') === undefined) {
    		      ifr.attr('src', ifr.attr('data-src'));
      		    $(this).addClass('is--active');
      		    mediaItem.find('.slide--item_iframe').addClass('is--iframeOn');
    		    } else {
    		      ifr.removeAttr('src');
      		    $(this).removeClass('is--active');
      		    mediaItem.find('.slide--item_iframe').removeClass('is--iframeOn');
    		    }
		    })
		  .end()
		  .find('.js--openIframeNewTab')
        .attr('href', d.name)
		  .end()
		  ;
		preserveRatio = false;
  }

	else if(ext == 'jpg' || ext == "jpeg" || ext == "png" || ext == "gif" || ext == "JPG" || ext == "tiff"){
		mediaItem = $(".js--templates > .js--imageSlide").clone(false);
    mediaItem
		  .find( 'img')
		    .attr('src', d.name)
		  .end()
  }

	else if(ext == 'mp4' || ext == "avi" || ext == "ogg" || ext == "webm"){
		mediaItem = $(".js--templates > .js--videoSlide").clone(false);
		mediaItem
		  .find('source')
		    .attr('src', d.name)
		  .end()
		if(d.poster !== undefined)
		  mediaItem
		    .find('video')
		      .attr('poster', d.poster)
          .attr('preload', 'none')
        .end()
        ;
	}
	// if extension is some unknown format, let's bail out
	else{
    return;
  }



	var pxWidth = d.width * window.innerWidth;

	var pxHeight;
	if(preserveRatio)
	  pxHeight = pxWidth * d.ratio;
	 else {
    var desiredHeight = (d.height === undefined) ? d.width : d.height;
	  pxHeight = desiredHeight * 0.5625 * window.innerWidth;
	}
  var posX = d.posX * window.innerWidth;
  var posY = d.posY * window.innerHeight;
	mediaItem
	  .attr('data-fileName', d.metaName)
	  .find('.slide--item')
    	  .css({
    	  	'transform': 'translate(' + posX + 'px, ' + posY + 'px)',
    	  	'width': pxWidth,
    	  	'height': pxHeight,
    	  	'display':'block'
    	  })
    	  .attr('data-x', posX)
    	  .attr('data-y', posY)
    .end()
    .data('preserveRatio', preserveRatio)
    ;
  return mediaItem;
}


function uploadFormData(formData) {

  var $popoverUpload = $('.js--popover_upload');
  $popoverUpload.addClass('is--open');

  $.ajax({
    url: './file-upload',
    type: 'POST',
    data: formData,
    datatype: 'json', // expecting JSON to be returned
    processData: false,
    contentType: false,
    success: function(data){
      console.log('upload successful!\n' + data);
//         $popoverUpload.html('Upload et rechargement de la conférence…');
      // let's wait a bit that the media has been added before we ask for a refreshed list of medias
      setTimeout(function() { socket.emit('listSlides', { "slugConfName" : app.slugConfName}); }, 500)
    },
    xhr: function() {
      // create an XMLHttpRequest
      var xhr = new XMLHttpRequest();

      // listen to the 'progress' event
      xhr.upload.addEventListener('progress', function(evt) {
        if (evt.lengthComputable) {
          // calculate the percentage of upload completed
          var percentComplete = evt.loaded / evt.total;
          percentComplete = parseInt(percentComplete * 100);

          // update the Bootstrap progress bar with the new percentage
          $popoverUpload.find('.progress-bar').text(percentComplete + '%');
          $popoverUpload.find('.progress-bar').width(percentComplete + '%');
        }
      }, false);
      return xhr;
    }
  });

}

/***************************************************************************
                  ScrollMagic logic (fixed slides)
***************************************************************************/

// init
var controller = new ScrollMagic.Controller({
	globalSceneOptions: {
		triggerHook: 'onLeave'
	}
});

// get all slides

function setSceneForSlide(s) {
	var thisScene = new ScrollMagic.Scene({
			triggerElement: s
		})
		.setPin(s)
//   	.setTween(TweenMax.from(s, 1, {y: "120%", ease:Power0.easeNone}))
// 		.addIndicators() // add indicators (requires plugin)
		.addTo(controller)
//     .loglevel(3)
// 		.setClassToggle('.slides-list .slide', 'is--pinned')
		.on("progress", function (event) {
  		// ajouter la class "is--hidden" à la slide 3 parents plus haut
  		$(s)
  		  .parent()
  		    .prev()
    		    .toggleClass('is--pinned')
    		    .prev()
    		      .toggleClass('is--far')
    		    .end()
    		  .end()
    		.end()
  		  ;
/*
  		$(s).parent().prevAll()
  		  .eq(10)
  		    .find('> .slide')
  		      .addClass('is--far')
  		    .end()
  		  .end()
  		  .eq(9)
  		    .find('> .slide')
  		      .removeClass('is--far')
  		    .end()
        .end()
*/
    });
}

/***************************************************************************
                  Interactjs logic (dragging slides objects, etc.)
***************************************************************************/

function initInteractForSlide(s) {
  // target elements with the "draggable" class
  interact(s.slide)
    .draggable({
      inertia: true,
      snap: {
/*
        targets: [
          interact.createSnapGrid({ x: 30, y: 30 })
        ],
        range: Infinity,
        relativePoints: [ { x: 0, y: 0 } ]
*/
      },
      // keep the element within the area of it's parent
      restrict: {
        restriction: "parent",
        endOnly: true,
        elementRect: { top: true, left: false, bottom: false, right: true }
      },

      // call this function on every dragmove event
      onmove: function(event) {
        $(event.target.parentElement).addClass('is--dragged');
        var target = event.target,
            // keep the dragged position in the data-x/data-y attributes
            x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
            y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        // translate the element
        target.style.webkitTransform =
        target.style.transform =
          'translate(' + x + 'px, ' + y + 'px)';

        // update the posiion attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      },
      // call this function on every dragend event
      onend: function (event) {
        $(event.target.parentElement).removeClass('is--dragged');
        var target = event.target,
            x = (parseFloat(target.getAttribute('data-x')) || 0),
            y = (parseFloat(target.getAttribute('data-y')) || 0);

        var relativeX = x / window.innerWidth;
        var relativeY = y / window.innerHeight;

        var mediaPos = {
          'mediaName' : target.parentElement.getAttribute('data-filename'),
          'slugConfName' : app.slugConfName,
          'posX' : relativeX,
          'posY' : relativeY
        }
        socket.emit('mediaNewPos', mediaPos);
      },
    })
    .resizable({
      preserveAspectRatio: s.preserveRatio,
      edges: { left: true, right: true, bottom: true, top: true },
      restrict: {
          restriction: {
          },
      },
    })
    .on('resizemove', function (event) {
      $(event.target.parentElement).addClass('is--resized');
      var target = event.target,
          x = (parseFloat(target.getAttribute('data-x')) || 0),
          y = (parseFloat(target.getAttribute('data-y')) || 0);

      // update the element's style
      var rectWidth = event.rect.width > 100 ? event.rect.width : 100;
      var rectHeight = event.rect.height > 100 ? event.rect.height : 100;

      target.style.width  = rectWidth + 'px';
      target.style.height = rectHeight + 'px';

      // translate when resizing from top or left edges
      x += event.deltaRect.left;
      y += event.deltaRect.top;

      target.style.webkitTransform = target.style.transform =
          'translate(' + x + 'px,' + y + 'px)';

      target.setAttribute('data-x', x);
      target.setAttribute('data-y', y);
//       target.textContent = Math.round(event.rect.width) + '×' + Math.round(event.rect.height);
    })
    .on('resizeend', function (event) {
      $(event.target.parentElement).removeClass('is--resized');
      var target = event.target;
      updateMediaSize(target);
    })
    .on('doubletap', function (event) {
      var target = event.target;
      var tparent = target.parentElement;

      var baseWidth = settings.startingWidth * window.innerWidth;
      target.style.width  = baseWidth + 'px';
      updateMediaSize(target);
    })
    ;

  function updateMediaSize(t) {
    var w = t.offsetWidth;
    var h = t.offsetHeight;
    var relativeW = w / t.parentElement.offsetWidth;
    var relativeH = h / t.parentElement.offsetHeight;
    var mediaSize = {
      'mediaName' : t.parentElement.getAttribute('data-filename'),
      'slugConfName' : app.slugConfName,
      'width' : relativeW,
    }
    // ajouter la height si pas de ratio
    if( !s.preserveRatio)
      mediaSize.height = relativeH;

    socket.emit('mediaNewSize', mediaSize);
    return;
  }
}


/***************************************************************************
                  Camera feed logic (from https://github.com/sarahgarcin/dodoc)
***************************************************************************/


var currentStream = (function(context) {
  // using https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
  // to select audio/video source
  var $settingsPane = $('.js--popover_cameraFeed_settingsPane');
  var $settingsButton = $('.js--toggleCameraSettings');

  var videoElement = document.querySelector('.js--videoFeed');
  var videoStream, audioStream;

  var audioInputSelect = document.querySelector('.js--audioSource');
  var audioOutputSelect = document.querySelector('.js--audioOutput');
  var videoSelect = document.querySelector('.js--videoSource');
  var selectors = [audioInputSelect, audioOutputSelect, videoSelect];

  var videoResSwitches = document.querySelector('.js--resolutionSelector').videoRes;

  var recordVideoFeed;
  var recordAudioFeed;

  var userSelectedVideoDevice = 'selectedVideoDeviceId';
  var userSelectedAudioDevice = 'selectedAudioDeviceId';
  var userSelectedRes = 'selectedVideoRes';

  var currentFeedsSource;


  function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    var values = selectors.map(function(select) {
      return select.value;
    });
    selectors.forEach(function(select) {
      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }
    });
    var previousVideoDeviceId = store.get(userSelectedVideoDevice);
    var previousAudioDeviceId = store.get(userSelectedAudioDevice);

    for (var i = 0; i !== deviceInfos.length; ++i) {
      var deviceInfo = deviceInfos[i];
      var deviceId = deviceInfo.deviceId;
      var option = document.createElement('option');
      option.value = deviceId;
      if( deviceId === previousVideoDeviceId || deviceId === previousAudioDeviceId)
        option.selected = true;
      if (deviceInfo.kind === 'audioinput') {
        option.text = deviceInfo.label || 'microphone ' + (audioInputSelect.length + 1);
        audioInputSelect.appendChild(option);
      } else if (deviceInfo.kind === 'audiooutput') {
        option.text = deviceInfo.label || 'speaker ' + (audioOutputSelect.length + 1);
        audioOutputSelect.appendChild(option);
      } else if (deviceInfo.kind === 'videoinput') {
        option.text = deviceInfo.label || 'camera ' + (videoSelect.length + 1);
        videoSelect.appendChild(option);
      } else {
        console.log('Some other kind of source/device: ', deviceInfo);
      }
    }
    selectors.forEach(function(select, selectorIndex) {
      if (Array.prototype.slice.call(select.childNodes).some(function(n) {
        return n.value === values[selectorIndex];
      })) {
        select.value = values[selectorIndex];
      }
    });

  }
  function errorCallback(error) {
    console.log('navigator.getUserMedia error: ', error);
  }

  function getVideoResFromRadio() {
    for (index=0; index < videoResSwitches.length; index++) {
      if (videoResSwitches[index].checked) {
        return videoResSwitches[index].dataset;
      }
    }
  }
  function setVideoResFromLocalstorage() {
    console.log( userSelectedRes);
    var getPreviousSessionRes = store.get(userSelectedRes);
    if(getPreviousSessionRes !== undefined) {
      for (index=0; index < videoResSwitches.length; index++) {
        if( getPreviousSessionRes.width === videoResSwitches[index].dataset.width && getPreviousSessionRes.height === videoResSwitches[index].dataset.height) {
          videoResSwitches[index].checked = true;
        } else {
          videoResSwitches[index].checked = false;
        }
      }
    }
  }

  // Attach audio output device to video element using device/sink ID.
  function attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== 'undefined') {
      element.setSinkId(sinkId)
      .then(function() {
        console.log('Success, audio output device attached: ' + sinkId);
      })
      .catch(function(error) {
        var errorMessage = error;
        if (error.name === 'SecurityError') {
          errorMessage = 'You need to use HTTPS for selecting audio output ' +
              'device: ' + error;
        }
        console.error(errorMessage);
        // Jump back to first output device in the list as it's the default.
        audioOutputSelect.selectedIndex = 0;
      });
    } else {
      console.warn('Browser does not support output device selection.');
    }
  }

  function changeAudioDestination() {
    var audioDestination = audioOutputSelect.value;
    attachSinkId(videoElement, audioDestination);
  }

  function setSources() {

    console.log( 'setting new sources for audio and video feeds');
    var audioSource = audioInputSelect.value;
    var videoSource = videoSelect.value;

    // set source in localstorage for next time
    store.set(userSelectedVideoDevice, videoSource);
    store.set(userSelectedAudioDevice, audioSource);

    var requestedVideoRes = getVideoResFromRadio();
    store.set(userSelectedRes, requestedVideoRes);

    currentFeedsSource = {
      audio: {
        optional: [ audioSource ? {sourceId: audioSource} : undefined ],
      },
      video: {
        optional: [ videoSource ? {sourceId: videoSource} : undefined],
        mandatory: {
          minWidth: requestedVideoRes.width,
          minHeight: requestedVideoRes.height
        }
      }
    };

    // restart the feed (should be cleaner but since we don't need audio...)
    currentStream.startCameraFeed();

  }

  function getCameraFeed() {
    return new Promise(function(resolve, reject) {
      console.log( "Getting camera feed");

      if( currentFeedsSource === undefined || currentFeedsSource.video === undefined) {
        reject("Camera not yet ready");
      }
      navigator.getUserMedia(
        {
          video: currentFeedsSource.video,
          audio: false
        },
        function (stream) {
          resolve( stream);
        },
        function(err) {
          alert( dodoc.lang.videoStreamCouldntBeStartedTryChangingRes + '\n\n error: ' + JSON.stringify(err));
        }
      );
    });
  }

  function getAudioFeed() {
    return new Promise(function(resolve, reject) {

      if( currentFeedsSource === undefined || currentFeedsSource.audio === undefined) {
        reject("audio devices not yet ready");
      }

      console.log( "Getting audio feed");

      navigator.getUserMedia(
        {
          video: false,
          audio: currentFeedsSource.audio
        },
        function (stream) {
          resolve(stream);
        },
        function(err) {
          alert( dodoc.lang.audioStreamCouldntBeStarted + '\n\n error: ' + JSON.stringify(err));
        }
      );
    });
  }

  // déclaration des fonctions accessibles de l'extérieur ici
  return {

    init : function() {

      $settingsButton.click(function() {
        $(document).trigger('toggle_settings_pane');
      });

      $(document)
        .on( 'toggle_settings_pane', function() {
          $settingsPane.toggleClass('is--open');
        })
        .on( 'open_settings_pane', function() {
          $settingsPane.addClass('is--open');
        })
        .on( 'close_settings_pane', function() {
          $settingsPane.removeClass('is--open');
        })
        ;

      setVideoResFromLocalstorage();

      if( store.get(userSelectedVideoDevice) === undefined)
        $(document).trigger('open_settings_pane');

      return new Promise(function(resolve, reject) {
        navigator.mediaDevices.enumerateDevices()
          .then(function(deviceInfos) {
            gotDevices(deviceInfos);
            setSources();
            audioInputSelect.onchange = setSources;
            audioOutputSelect.onchange = changeAudioDestination;
            videoSelect.onchange = setSources;
            $(videoResSwitches).change(setSources);
            resolve();
          }, function(err) {
            reject("Failed to init stream : " + err);
          });
      });
    },

    getVideoFrame : function() {
      return videoElement;
    },

    stopAllFeeds : function() {
      if( !videoElement.paused)
        videoElement.pause();

      if(videoStream) videoStream.getTracks().forEach(function(track) {
        track.stop();
      });
      if(audioStream) audioStream.getTracks().forEach(function(track) {
        track.stop();
      });
    },

    startCameraFeed : function() {
      return new Promise(function(resolve, reject) {
        currentStream.stopAllFeeds();
        getCameraFeed()
          .then( function( stream) {
            videoStream = stream;
            if (navigator.mozGetUserMedia) {
              videoElement.mozSrcObject = stream;
            } else {
              var vendorURL = window.URL || window.webkitURL;
              videoElement.src = vendorURL.createObjectURL(stream);
            }
            videoElement.play();
            resolve();
          }, function(err) {
            console.log( " failed to start camera feed: " + err);
            reject('failed to start camera feed');
          });
      });
    },

    startRecordCameraFeed : function() {
      return new Promise(function(resolve, reject) {
        getCameraFeed()
          .then( function( stream) {
            var requestedVideoRes = getVideoResFromRadio();
            recordVideoFeed = RecordRTC(stream, {
              type: 'video',
              canvas: { width: requestedVideoRes.width, height: requestedVideoRes.height },
            });
            recordVideoFeed.startRecording();
            resolve();
          }, function(err) {
            console.log( " failed to start camera feed: " + err);
            reject();
          });
          ;
      });
    },

    stopRecordCameraFeed : function() {
      return new Promise(function(resolve, reject) {
        if( recordVideoFeed !== undefined) {
          recordVideoFeed.stopRecording(function() {
            recordVideoFeed.getDataURL(function(videoDataURL) {
              resolve( videoDataURL);
            });
          });
        }
      });
    },

    getAudioStream : function() {
      return;
    },

    startAudioFeed : function() {
      return new Promise(function(resolve, reject) {
        currentStream.stopAllFeeds();
        getAudioFeed()
          .then( function( stream) {
            audioStream = stream;
            resolve( stream);
          }, function() {
            console.log( " failed to get audio feed");
            reject();
          })
          ;
      });
    },

    startRecordAudioFeed : function() {
      return new Promise(function(resolve, reject) {
        getAudioFeed()
          .then( function( stream) {
            recordAudioFeed = RecordRTC(stream, {
              type: 'audio'
            });
            recordAudioFeed.startRecording();
            resolve();
          }, function() {
            console.log( " failed to start audio recording");
            reject();
          })
          ;
      });
    },

    stopRecordAudioFeed : function() {
      return new Promise(function(resolve, reject) {
        if( recordAudioFeed !== undefined) {
          recordAudioFeed.stopRecording(function(url) {
            recordAudioFeed.getDataURL(function(audioDataURL) {
      //             type: recordVideo.getBlob().type || 'video/webm',
              // send instruction to record video
              resolve( audioDataURL);
            });
          });
        }
      });
    },
  }
})();


