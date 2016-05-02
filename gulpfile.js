const gulp   = require("gulp"),
      concat = require("gulp-concat"),
      uglify = require("gulp-uglify"),
      cssmin = require("gulp-cssmin"),
      del    = require("del");
      
const bundle = require("./bundle.json");

//const browserSync = require('browser-sync').create();

gulp.task('default', ['clean', 'js', 'css', 'dev.js', 'dev.css']);
gulp.task('dev', ['clean', 'dev.js', 'dev.css']);
gulp.task('prod', ['clean', 'js', 'css']);

/*gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });
});*/

gulp.task('js', function() {
   
    return gulp.src(bundle.js)
    .pipe(uglify())
    .pipe(concat("angular-material-textangular.min.js"))
    .pipe(gulp.dest("dist")); 
    
});

gulp.task('dev.js', function() {
   
    return gulp.src(bundle.js)
    .pipe(concat("angular-material-textangular.js"))
    .pipe(gulp.dest("dist")); 
    
});

gulp.task('css', function() {
   
    return gulp.src(bundle.css)
    .pipe(cssmin())
    .pipe(concat("angular-material-textangular.min.css"))
    .pipe(gulp.dest("dist")); 
    
});

gulp.task('dev.css', function() {
   
    return gulp.src(bundle.css)
    .pipe(concat("angular-material-textangular.css"))
    .pipe(gulp.dest("dist")); 
    
});

gulp.task('clean', function(cb) {
  return del(['dist'], cb);
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch(bundle.paths.scripts, ['js', 'dev.js']);
  gulp.watch(bundle.paths.styles, ['css', 'dev.css']);
});