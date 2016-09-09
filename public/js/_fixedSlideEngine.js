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
          var successFixSlide = unfixThisSlide(slidesData[i]);
          if(successFixSlide) {
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