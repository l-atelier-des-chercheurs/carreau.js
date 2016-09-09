var setFixedForSlides = (function() {


  // Detect request animation frame
  var scroll = window.requestAnimationFrame ||
               window.webkitRequestAnimationFrame ||
               window.mozRequestAnimationFrame ||
               window.msRequestAnimationFrame ||
               window.oRequestAnimationFrame ||
               function(callback){ window.setTimeout(callback, 1000/60); };

  var pxThreshold = 0;

  var isRunning = false;
  var slidesData = [];

  function fixThisSlide(s) {
    if(!s.isFixed) {
  //     s.el.children[0].style.position = 'fixed';
      s.el.classList.add('is--pinned');
      s.isFixed = true;
    }
  }
  function unfixThisSlide(s) {
    if(s.isFixed) {
  //     s.el.children[0].style.position = 'absolute';
      s.el.classList.remove('is--pinned');
      s.isFixed = false;
    }
  }

  function getSlidesPositions(slides) {
    slidesData = [];
    for (i =0; i<slides.length; i++){
      slidesData[i] = { el: slides[i] };
      slidesData[i].bounds = slidesData[i].el.getBoundingClientRect();
    }
  }

  var lastPosition = -1;

  function loop(){
    if (lastPosition === window.pageYOffset) {
        scroll(loop);
        return false;
    } else {
      lastPosition = window.pageYOffset;
    }

    for (i =0; i<slidesData.length; i++){
      if(window.pageYOffset >= slidesData[i].bounds.top) {
        debugger;
        fixThisSlide(slidesData[i]);
      } else {
        unfixThisSlide(slidesData[i]);
      }
    }
    if(isRunning) {
      scroll(loop);
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
