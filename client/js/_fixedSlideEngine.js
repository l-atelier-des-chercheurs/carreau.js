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
  var slideLifetime = 10;
  var slidesData = [];
  var $slides;

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

  function getSlidesPositions() {
    for (i =0; i<$slides.length; i++){
      slidesData[i] = { el: $slides[i] };
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
      for (i=0; i<slidesData.length; i++){
        // position actuelle du scroll + vitesse actuelle = position anticipée à l'instant suivant
        if(window.pageYOffset + scrollSpeed >= slidesData[i].bounds.offsetTop) {

          // tentative de fixed les slides qui sont entre le début et le moment actuel du scroll
          var successFixSlide = fixThisSlide(slidesData[i]);

          // si nouvelle slide fixed, alors
          if(successFixSlide) {
            console.log('Just made slide number ' + i + ' fixed.');
            var hideSlideIndex = i - slideLifetime;
            console.log('Will try to hide slide number ' + hideSlideIndex + '.');

            // masquer toutes les slides qui ont un numéro entre 0 et hideSlideIndex
            if(hideSlideIndex >= 0) {
              for(j=0; j<=hideSlideIndex; j++) {
                fixThisSlide(slidesData[j]);
                farThisSlide(slidesData[j]);
              }
            }
          }
        } else {

          // tentative de unfix les slides qui sont entre le moment actuel du scroll et la fin
          var successUnFixSlide = unfixThisSlide(slidesData[i]);
          if(successUnFixSlide) {
            // supprimer is--far sur la slide n - x
            var olderSlideToShow = i - slideLifetime;
            if(olderSlideToShow >= 0) { unfarThisSlide(slidesData[olderSlideToShow]); }

            // pour nettoyer, supprimer aussi le is--pinned et is--far sur toutes les slides après i
            for(j=i; j<slidesData.length; j++) {
              console.log('Will unfix ' + j);
              unfixThisSlide(slidesData[j]);
              unfarThisSlide(slidesData[j]);
            }
          }

        }
      }
      if(isRunning) {
        scroll(loop);
      }
    }

  }

  return {
    init : function($s) {
      if($s === undefined) {
        return;
      }
      $slides = $s;
      getSlidesPositions();
      isRunning = true;
      loop();
    },
    stop : function() {
      isRunning = false;
    },
    update: function($slides) {
      if(isRunning) {
        getSlidesPositions();
        // force update of fixed
        lastPosition = window.pageYOffset - 10;
      }
    },
  };
})();
