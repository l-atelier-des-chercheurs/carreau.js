// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var concat = require('gulp-concat');
var minifyCss = require('gulp-minify-css');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var jshint       = require('gulp-jshint');

var pluginsScripts = [
  'public/bower_components/jquery/dist/jquery.js',
  'public/bower_components/bootstrap/dist/js/bootstrap.js',
  'public/bower_components/moment/min/moment-with-locales.js',
  'public/bower_components/jquery/dist/jquery.min.js',
  'public/bower_components/store-js/store.min.js',
];
var userScripts = [
  'public/js/_global.js'
];



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
    .pipe(gulp.dest('public/css'));
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
    .pipe(concat('plugins.js'))
    .pipe(gulp.dest('public/js'))
    .pipe(browserSync.stream());
});


// Watch Files For Changes
gulp.task('watch', function() {
  gulp.watch('public/sass/*.scss', ['sass', 'css', 'lint', 'script-plugins']);
});

// Default Task
gulp.task('default', ['sass', 'css', 'lint', 'script-plugins', 'watch']);
