var setFixedForSlides = (function() {


  // Detect request animation frame
  var scroll = window.requestAnimationFrame ||
               window.webkitRequestAnimationFrame ||
               window.mozRequestAnimationFrame ||
               window.msRequestAnimationFrame ||
               window.oRequestAnimationFrame ||
               function(callback){ window.setTimeout(callback, 1000/60); };

  var isRunning = false;
  // this means 3 slides will stay pinned at once before the last one gets hidden
  var slideLifetime = 2;
  var slidesData = [];

  function fixThisSlide(s) {
    if(!s.isFixed) {
      s.el.classList.add('is--pinned');
      s.isFixed = true;
      return true;
    }
    return false;
  }
  function unfixThisSlide(s) {
    if(s.isFixed) {
      s.el.classList.remove('is--pinned');
      s.isFixed = false;
      return true;
    }
    return false;
  }

  function farThisSlide(s) {
    if(!s.isFar) {
      s.el.classList.add('is--far');
      s.isFar = true;
    }
  }
  function unfarThisSlide(s) {
    if(s.isFar) {
      s.el.classList.remove('is--far');
      s.isFar = false;
    }
  }

  function getSlidesPositions(slides) {
    slidesData = [];
    for (i =0; i<slides.length; i++){
      slidesData[i] = { el: slides[i] };
      slidesData[i].bounds = slidesData[i].el.getBoundingClientRect();
      slidesData[i].bounds.offsetTop = slidesData[i].bounds.top + window.pageYOffset;
    }
  }

  var lastPosition = -1;

  function loop(){
    if (lastPosition === window.pageYOffset) {
        scroll(loop);
        return false;
    } else {
      var scrollSpeed = window.pageYOffset - lastPosition;
      lastPosition = window.pageYOffset;
//       console.log('scrollSpeed : ' + scrollSpeed);
      for (i =0; i<slidesData.length; i++){
        // position actuelle du scroll + vitesse actuelle = position anticipée à l'instant suivant
        if(window.pageYOffset + scrollSpeed >= slidesData[i].bounds.offsetTop) {
          var successFixSlide = fixThisSlide(slidesData[i]);
          if(successFixSlide) {
            console.log('Just made slide number ' + i + ' fixed.');
            var olderSlideToHide = i - slideLifetime;
            console.log('Will try to hide slide number ' + olderSlideToHide + '.');
            if(olderSlideToHide >= 0) { farThisSlide(slidesData[olderSlideToHide]); }
          }
        } else {
          var successUnFixSlide = unfixThisSlide(slidesData[i]);
          if(successUnFixSlide) {
            var olderSlideToShow = i - slideLifetime;
            if(olderSlideToShow >= 0) { unfarThisSlide(slidesData[olderSlideToShow]); }
          }
        }
      }
      if(isRunning) {
        scroll(loop);
      }
    }

  }

  return {

    init : function(slides) {
      getSlidesPositions(slides);
      isRunning = true;
      loop();
    },
    stop : function() {
      isRunning = false;
    }
  };
})();


/***************************************************************************
                  Camera feed logic (from https://github.com/sarahgarcin/dodoc)
***************************************************************************/


var currentStream = (function() {
  // using https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
  // to select audio/video source
  var $videoPopover = $('.js--popover_cameraFeed');
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
      if( deviceId === previousVideoDeviceId || deviceId === previousAudioDeviceId) {
        option.selected = true;
      }
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

    // restart the feed if the videoElement is playing
    if(!videoElement.paused) {
      currentStream.startCameraFeed();
    }
  }

  function getCameraFeed() {
    return new Promise(function(resolve, reject) {
      console.log( 'Getting camera feed');

      if( currentFeedsSource === undefined || currentFeedsSource.video === undefined) {
        reject('Camera not yet ready');
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
          alert( settings.lang.videoStreamCouldntBeStartedTryChangingRes + '\n\n error: ' + JSON.stringify(err));
        }
      );
    });
  }

  function getAudioFeed() {
    return new Promise(function(resolve, reject) {

      if( currentFeedsSource === undefined || currentFeedsSource.audio === undefined) {
        reject('audio devices not yet ready');
      }

      console.log( 'Getting audio feed');

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
          // si le menu des réglages est masqué en bas de page
          if( $settingsPane.offset().top >= $(window).innerHeight() - 50) {

            $($videoPopover).animate(
              {scrollTop: $settingsPane.outerHeight()},
              600,
              $.easing.easeInOutQuint
            );
          } else {
            $($videoPopover).animate(
              {scrollTop: 0},
              600,
              $.easing.easeInOutQuint
            );          }

        })
        ;

      setVideoResFromLocalstorage();

      if( store.get(userSelectedVideoDevice) === undefined) {
        $(document).trigger('open_settings_pane');
      }

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
            reject('Failed to init stream : ' + err);
          });
      });
    },

    getVideoFrame : function() {
      return videoElement;
    },

    stopAllFeeds : function() {
      if( !videoElement.paused) {
        videoElement.pause();
      }

      if(videoStream) {
        videoStream.getTracks().forEach(function(track) {
          track.stop();
        });
      }
      if(audioStream) {
        audioStream.getTracks().forEach(function(track) {
          track.stop();
        });
      }
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
            console.log( ' failed to start camera feed: ' + err);
            reject('failed to start camera feed');
          });
      });
    },

    startRecordCameraFeed : function() {
      return new Promise(function(resolve, reject) {
        getCameraFeed()
          .then( function( stream) {
            var requestedVideoRes = getVideoResFromRadio();
            recordVideoFeed = new RecordRTC(stream, {
              type: 'video',
              canvas: { width: requestedVideoRes.width, height: requestedVideoRes.height },
            });
            recordVideoFeed.startRecording();
            resolve();
          }, function(err) {
            console.log( ' failed to start camera feed: ' + err);
            reject();
          });

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
            console.log( ' failed to get audio feed');
            reject();
          })
          ;
      });
    },

    startRecordAudioFeed : function() {
      return new Promise(function(resolve, reject) {
        getAudioFeed()
          .then( function( stream) {
            recordAudioFeed = new RecordRTC(stream, {
              type: 'audio'
            });
            recordAudioFeed.startRecording();
            resolve();
          }, function() {
            console.log( ' failed to start audio recording');
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
  };
})();

// context vars sent by Node via router.js to footer.jade namespaced with app
// var currentFolder = app.currentFolder;

// utils fct globals

var popup = (function() {
  var $popup;

  function setCloseButton($popupTextDiv) {
    $popupTextDiv
      .find('.js--closePopup')
        .on('click', function() {
          $(this)
            .closest('.js--textContent')
              .fadeOut(300, function() { $(this).remove(); })
            .end()
            ;
        })
      .end()
      ;
  }

  function createNewMessage(msg) {
    var $popupTextDiv = $('<div class="module--popup--textContent js--textContent"><p>' + msg + '</p><button class="module--popup--closePopup js--closePopup">x</button></div>');

    $popup
      .append($popupTextDiv)
      .show()
      ;
    setCloseButton($popupTextDiv);
  }

  return {
    init : function($p) {
      console.log('-- popup : init');
      if($p.length !== 1) { return; }
      $popup = $p;
    },
    displayMessage : function(msg) {
      console.log('-- popup : showing new popup msg');
      createNewMessage(msg);
    },
  };

})();
popup.init($('.js--popup'));


$.extend($.easing,
{
    easeInOutQuint: function (x, t, b, c, d) {
        if ((t/=d/2) < 1) { return c/2*t*t*t*t*t + b; }
        return c/2*((t-=2)*t*t*t*t + 2) + b;
    }
});