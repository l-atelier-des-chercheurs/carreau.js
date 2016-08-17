

/***************************************************************************
                  Conf logic
***************************************************************************/

/* VARIABLES */
var socket = io.connect();
var zIndex = 0;

/* sockets */
socket.on('connect', onSocketConnect);
socket.on('error', onSocketError);

/*
socket.on('listMedias', onListMedias);
socket.on('newMedia', onNewMedia);
*/
socket.on('mediaPosition', onMediaPosition);
socket.on('mediaDragPosition', onMediaDragPosition);
socket.on('mediaDragPositionForAll', onMediaDragPositionForAll);

socket.on('listAllSlides', onListAllSlides);

jQuery(document).ready(function($) {
	init();
});


function init(){

	socket.emit('listSlides', { "slugConfName" : app.slugConfName});

	$(window).on('dragover',function(e){
		$(".drop-files-container").css("z-index","9999");
		e.preventDefault();
		e.stopPropagation();
		return false;
	});
	$(window).on('dragleave',function(e){
		e.preventDefault();
		e.stopPropagation();
		return false;
	});

	$(".drop-files-container").on("drop", function(e) {
		e.preventDefault();
		console.log("DROP FILE");

    var files = e.originalEvent.dataTransfer.files;
    uploadDroppedFiles(files);

	});

}

function onListAllSlides(d) {
  d.forEach(function(s) {
    listOneSlide(s);
  });

/*
  var slides = document.querySelectorAll('.js--fixedslide');
  // create scene for every slide
  for (var i=0; i<slides.length; i++) {
  	new ScrollMagic.Scene({
  			triggerElement: slides[i]
  		})
  		.setPin(slides[i])
  		.addIndicators() // add indicators (requires plugin)
  		.addTo(controller);
  }
*/
}


function listOneSlide(d) {

  var path = d.name;
	var ext = d.name.split('.').pop();
	var mediaItem;

	if(ext == 'jpg' || ext == "jpeg" || ext == "png" || ext == "gif" || ext == "JPG"){
		mediaItem = $(".js--templates > .js--imageSlide").clone(false);
    mediaItem
		  .find( 'img')
		    .attr('src', path)
		  .end()
  }

	if(ext == 'mp4' || ext == "avi" || ext == "ogg" || ext == "mov" || ext == "webm"){
		mediaItem = $(".js--templates > .js--videoSlide").clone(false);
		mediaItem
		  .find( 'source')
		    .attr('src', path)
		  .end()
	}

	var pxWidth = (d.width/100) * window.innerWidth;
	var pxHeight = pxWidth * d.ratio;
	if( pxHeight > window.innerHeight) {
	  pxHeight = window.innerHeight;
    pxWidth = pxHeight / d.ratio;
  }

	mediaItem
	  .attr('data-fileName', d.name)
	  .find('.slide--item')
  	  .css({
  	  	'transform': 'translate(' + d.posX + '%, ' + d.posY + '%)',
  	  	'width': pxWidth,
  	  	'height': pxHeight,
  	  	'display':'block'
  	  })
  	.end()
    ;

  $('body').append(mediaItem);
  setSceneForSlide(mediaItem[0]);
  initInteractForSlide(mediaItem.find('.js--interactevents')[0]);
}

function onListMedias(data){
	var path = "../"+data.name;
	var id = data.id;
	zIndex = data.zPos;
	var ext = data.name.split('.').pop();
	var mediaItem;

	if(ext == 'jpg' || ext == "jpeg" || ext == "png" || ext == "gif" || ext == "JPG"){
		mediaItem = $(".js--templates .image").clone(false);
		mediaItem
		  .find( 'img')
		    .attr('src', path)
		  .end()
		  .attr('id', id)
		  .css({
		  	"top":data.yPos,
		  	"left":data.xPos,
		  	"z-index":data.zPos,
		  	"transform":"rotate("+data.random+"deg)",
		  	"display":"block"
		  });
	}

	if(ext == 'mp4' || ext == "avi" || ext == "ogg" || ext == "mov" || ext == "webm"){
		mediaItem = $(".js--templates .video").clone(false);
		mediaItem
		  .find( 'source')
		    .attr('src', path)
		  .end()
		  .attr('id', id)
		  .css({
		  	"top":data.yPos,
		  	"left":data.xPos,
		  	"z-index":data.zPos,
		  	"transform":"rotate("+data.random+"deg)",
		  	"display":"block"
		  });
	}

	if(ext == 'pdf'){
		mediaItem = $(".js--templates .pdf").clone(false);
		mediaItem
		  .find('a')
		    .attr('href', path)
		    .attr('title', data.name)
		    .attr('target', '_blank')
		    .append(data.name)
		  .end()
			.attr('id', id)
		  .css({
		  	"top":data.yPos,
		  	"left":data.xPos,
		  	"z-index":data.zPos,
		  	"transform":"rotate("+data.random+"deg)",
		  	"display":"block"
		  });
	}

  $('.medias-list').prepend(mediaItem);

  // ajouter un attribut paysage ou portrait pour définir une taille rationnelle
  setTimeout(function(){
	  //console.log(mediaItem.find('img')[0].naturalWidth, mediaItem.find('img')[0].naturalHeight);
		var mediaW = mediaItem.find('img')[0].naturalWidth;
		var mediaH = mediaItem.find('img')[0].naturalHeight;
		//console.log(mediaW, mediaH);
		var orientation;
		if(mediaW > mediaH){
			orientation = "paysage";
		}
		else{
			orientation = "portrait";
		}
		mediaItem.attr("data-orientation", orientation);
  }, 500);



  //draggable media
  mediaItem.draggable({
    start: function() {
    	zIndex ++;
	    // console.log(zIndex);
    },
    drag: function(event) {
    	// console.log(event);
    	var offset = $(this).offset();
      var posX = offset.left;
      var posY = offset.top;
    	socket.emit("dragMediaPos", {x: posX, y:posY, id:id, z:zIndex});
    },
    stop: function() {
    	socket.emit('takeScreenShot');
    }
  });
}

function onNewMedia(data){
	var path = "../"+data.name;
	var id = data.id;
	var ext = data.name.split('.').pop();
	var mediaItem;

	if(ext == 'jpg' || ext == "jpeg" || ext == "png" || ext == "gif" || ext == "JPG"){
		mediaItem = $(".js--templates .image").clone(false);
		mediaItem
		  .find( 'img')
		    .attr('src', path)
		  .end()
		  .addClass('no-position')
		  .attr('id', id)
		  .css({
		  	"zIndex": zIndex
		  });
	}

	if(ext == 'mp4' || ext == "avi" || ext == "ogg" || ext == "mov" || ext == "webm"){
		mediaItem = $(".js--templates .video").clone(false);
		mediaItem
		  .find('source')
		    .attr('src', path)
		  .end()
		  .addClass('no-position')
		  .attr('id', id)
		  .css({
		  	"zIndex": zIndex
		  });
	}

	if(ext == 'pdf'){
		mediaItem = $(".js--templates .pdf").clone(false);
		mediaItem
		  .find('a')
		    .attr('href', path)
		    .attr('title', data.name)
		    .attr('target', '_blank')
		    .append(data.name)
		  .end()
		  .addClass('no-position')
		  .attr('id', id)
		  .css({
		  	"zIndex": zIndex
		  });
	}


	$('.medias-list').prepend(mediaItem);

  //draggable media
/*
  mediaItem.draggable({
    start: function() {
    	zIndex ++;
    },
    drag: function(event) {
    	// console.log(event);
    	var offset = $(this).offset();
      var posX = offset.left;
      var posY = offset.top;
    	socket.emit("dragMediaPos", {x: posX, y:posY,  z:zIndex, id:id});
    },
    stop: function() {
    	socket.emit('takeScreenShot');
    }
  });
*/
}

function onMediaPosition(mouse){
	$(".drop-files-container").css("z-index", -1);
	var mediaW = $(".medias-list li.no-position").width();
	var mediaH = $(".medias-list li.no-position").height();
	var orientation;

	if(mediaW > mediaH){
		orientation = "paysage";
	}
	else{
		orientation = "portrait";
	}

	$(".medias-list li.no-position")
		.css({
			"top": mouse.mediaY,
	  	"left":mouse.mediaX,
	  	"transform":"rotate("+mouse.random+"deg)",
	  	"z-index": mouse.mediaZ,
	  	"display":"block"
		})
		.removeClass('no-position')
		.attr("data-index", mouse.mediaZ)
		.attr("data-orientation", orientation)
	;
	socket.emit('takeScreenShot');

}

function onMediaDragPosition(pos){
	$(".medias-list li#"+pos.id)
		.css({
			"top": pos.y,
	  	"left":pos.x,
	  	"z-index":pos.z
		});
}

function onMediaDragPositionForAll(pos){
	$(".medias-list li#"+pos.id)
	.css({
  	"z-index":pos.z,
	});
}


/* sockets */
function onSocketConnect() {
	sessionId = socket.io.engine.id;
	console.log('Connected ' + sessionId);
};

function onSocketError(reason) {
	console.log('Unable to connect to server', reason);
};


function uploadDroppedFiles(droppedFiles) {

  // code adapted from https://coligo.io/building-ajax-file-uploader-with-node/
  if(droppedFiles.length > 0) { // checks if any files were dropped

    // create a FormData object which will be sent as the data payload in the
    // AJAX request
    var formData = new FormData();

    // loop through all the selected files and add them to the formData object
    for (var i = 0; i < droppedFiles.length; i++) {
      var file = droppedFiles[i];
      file.slugConfName = app.slugConfName;
      // add the files to formData object for the data payload
      formData.append('uploads[]', file, file.name);
    }

    $popoverUpload =     $('.popover_upload');
    $popoverUpload.show();

    $.ajax({
      url: './file-upload',
      type: 'POST',
      data: formData,
      datatype: "json", // expecting JSON to be returned
      processData: false,
      contentType: false,
      success: function(data){
        console.log('upload successful!\n' + data);
        $popoverUpload.html('Rechargement de la conférence…');
        setTimeout(function() {
          location.reload();
        }, 500);
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

            // once the upload reaches 100%, set the progress bar text to done
            if (percentComplete === 100) {
              $popoverUpload.html('Done');
            }

          }

        }, false);

        return xhr;
      }
    });

  }
}


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
	new ScrollMagic.Scene({
			triggerElement: s
		})
		.setPin(s)
		.addIndicators() // add indicators (requires plugin)
		.addTo(controller);
}

/***************************************************************************
                  Interactjs logic (dragging slides objects, etc.)
***************************************************************************/

function initInteractForSlide(s) {
  // target elements with the "draggable" class
  interact(s)
    .draggable({
      snap: {
/*
        targets: [
          interact.createSnapGrid({ x: 30, y: 30 })
        ],
*/
//         range: Infinity,
//         relativePoints: [ { x: 0, y: 0 } ]
      },
      // keep the element within the area of it's parent
      restrict: {
/*         restriction: "parent", */
        endOnly: true,
        elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
      },
      // enable autoScroll
      autoScroll: false,

      // call this function on every dragmove event
      onmove: dragMoveListener,
      // call this function on every dragend event
      onend: function (event) {
        $(event.target.parentElement).removeClass('is--dragged');
/*         var pxWidth = (d.width/100) * window.innerWidth; */
/*

        textEl && (textEl.textContent =
          'moved a distance of '
          + (Math.sqrt(event.dx * event.dx +
                       event.dy * event.dy)|0) + 'px');
*/
        // send new drag position to server
        var target = event.target,
            x = (parseFloat(target.getAttribute('data-x')) || 0),
            y = (parseFloat(target.getAttribute('data-y')) || 0);

        var relativeX = x / window.innerWidth;
        var relativeY = y / window.innerHeight;

        var mediaPos = {
          "mediaName" : target.parentElement.getAttribute('data-filename'),
          "posX" : relativeX,
          "posY" : relativeY
        }
        socket.emit('mediaNewPos', mediaPos);
      }
    })
    .resizable({
      preserveAspectRatio: true,
      edges: { left: true, right: true, bottom: true, top: true }
    })
    .on('resizemove', function (event) {
      var target = event.target,
          x = (parseFloat(target.getAttribute('data-x')) || 0),
          y = (parseFloat(target.getAttribute('data-y')) || 0);

      // update the element's style
      target.style.width  = event.rect.width + 'px';
      target.style.height = event.rect.height + 'px';

      // translate when resizing from top or left edges
      x += event.deltaRect.left;
      y += event.deltaRect.top;

      target.style.webkitTransform = target.style.transform =
          'translate(' + x + 'px,' + y + 'px)';

      target.setAttribute('data-x', x);
      target.setAttribute('data-y', y);
//       target.textContent = Math.round(event.rect.width) + '×' + Math.round(event.rect.height);
    });

  function dragMoveListener (event) {

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
  }

  window.dragMoveListener = dragMoveListener;

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
}
