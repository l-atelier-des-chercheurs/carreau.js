// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var concat = require('gulp-concat');
var minifyCss = require('gulp-minify-css');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var jshint       = require('gulp-jshint');
var browserSync  = require('browser-sync').create();

var pluginsScripts = [
  'public/bower_components/jquery/dist/jquery.js',
  'public/bower_components/bootstrap/dist/js/bootstrap.js',
  'public/bower_components/moment/min/moment-with-locales.js',
  'public/bower_components/jquery/dist/jquery.min.js',
  'public/bower_components/store-js/store.min.js',
  'public/bower_components/scrollmagic/scrollmagic/uncompressed/ScrollMagic.js',
  'public/bower_components/scrollmagic/scrollmagic/uncompressed/plugins/debug.addIndicators.js',
  'public/bower_components/interact/dist/interact.js',
  'public/bower_components/scrollmagic/scrollmagic/minified/plugins/animation.gsap.min.js',
  'public/bower_components/gsap/src/minified/TweenMax.min.js'
];
var userScripts = [
  'public/js/_global.js'
];

var localDevUrl = 'http://localhost:8080/';



// Compile Our Sass
gulp.task('sass', function() {
  return gulp.src('public/sass/*.scss')
    .pipe(plumber({
        errorHandler: function (err) {
            console.log(err);
            this.emit('end');
        }
    }))
    .pipe(sass())
    .pipe(gulp.dest('public/css'))
    .pipe(browserSync.stream());
});

// Concatenate & Minify CSS
gulp.task('css', function() {
  return gulp.src('pubic/css/*.css')
    .pipe(concat('all.css'))
    .pipe(gulp.dest('public/css'))
    .pipe(minifyCss({compatibility: 'ie9'}))
    .pipe(rename('all.min.css'))
    .pipe(gulp.dest('public/production'));
});



// Lint Task
gulp.task('lint', function() {
  return gulp.src( userScripts)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

// Concatenate JS plugin
gulp.task('script-plugins', function() {
  return gulp.src(pluginsScripts)
    .pipe(concat('_plugins.js'))
    .pipe(gulp.dest('public/js'))
    .pipe(browserSync.stream());
});


// Live reload sync on every screen connect to localhost
gulp.task('init-live-reload', function() {
  browserSync.init({
    proxy: localDevUrl,
    notify: false,
    snippetOptions: {
      ignorePaths: ['panel/**', 'site/accounts/**']
    },
  });
});


// Watch Files For Changes with live reload sync on every screen connect to localhost.
gulp.task('dev-watch-sync', ['init-live-reload', 'watch']);

// Watch Files For Changes
gulp.task('watch', function() {
  gulp.watch( userScripts, ['lint', 'script-plugins']);
  gulp.watch('public/sass/*.scss', ['sass', 'css']);
});

// Default Task
gulp.task('default', ['sass', 'css', 'lint', 'script-plugins', 'watch']);
