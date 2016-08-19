

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
      var files = e.originalEvent.dataTransfer.files;
      uploadDroppedFiles(files);

  	})
  	.on('dragleave',function(e){
  		$(".drop-files-container").removeClass('is--visible');
  		e.preventDefault();
  		e.stopPropagation();
  		return false;
  	})
  	;

}

function onListAllSlides(d) {
  console.log('Listing all slides');
  var $allNewSlides = $();
  d.forEach(function(s) {
    $allNewSlides.add(listOneSlide(s));
  });
}

function onListOneSlide(d) {
  console.log('Listing all slides');
  listOneSlide(d);
}

function listOneSlide(d) {
  console.log('Listing one slide');
	var ext = d.name.split('.').pop();
	var isUrl = d.name.indexOf('http://') >= 0 ? true : false;

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
  		    debugger;
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
	if(ext == ''){

  }

	var pxWidth = d.width * window.innerWidth;

	var pxHeight;
	if(preserveRatio)
	  pxHeight = pxWidth * d.ratio;
	 else
	  pxHeight = d.height * 0.5625 * window.innerWidth;

/*
	if( pxHeight > window.innerHeight) {
	  pxHeight = window.innerHeight;
    pxWidth = pxHeight / d.ratio;
  }
*/

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
    ;

  $('.slides-list').append(mediaItem);

  setSceneForSlide(mediaItem[0]);
  initInteractForSlide({
    'slide' : mediaItem.find('.js--interactevents')[0],
    'preserveRatio' : preserveRatio
  });
  return mediaItem;
}


function uploadDroppedFiles(droppedFiles) {

  // code adapted from https://coligo.io/building-ajax-file-uploader-with-node/
  if(droppedFiles.length > 0) { // checks if any files were dropped

    // create a FormData object which will be sent as the data payload in the
    // AJAX request
    var formData = new FormData();

    // loop through all the selected files and add them to the formData object
    for (var i = 0; i < droppedFiles.length; i++) {
      var file = droppedFiles[i];
      // add the files to formData object for the data payload
      formData.append('uploads[]', file, file.name);
    }
/*
    $popoverUpload = $('.popover_upload');
    $popoverUpload.show();
*/

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

/*
            // update the Bootstrap progress bar with the new percentage
            $popoverUpload.find('.progress-bar').text(percentComplete + '%');
            $popoverUpload.find('.progress-bar').width(percentComplete + '%');

            // once the upload reaches 100%, set the progress bar text to done
            if (percentComplete === 100) {
              $popoverUpload.html('Done');
            }
*/

          }

        }, false);

        return xhr;
      }
    });

  }
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

/*
  interact(element)
    .draggable({
      snap: {
        targets: [
          interact.createSnapGrid({ x: 30, y: 30 })
        ],
        range: Infinity,
        relativePoints: [ { x: 0, y: 0 } ]
      },
      inertia: true,
      restrict: {
        restriction: element.parentNode,
        elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
        endOnly: true
      }
    })
    .on('dragmove', function (event) {
      x += event.dx;
      y += event.dy;

      event.target.style.webkitTransform =
      event.target.style.transform =
          'translate(' + x + 'px, ' + y + 'px)';
    });
*/

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
