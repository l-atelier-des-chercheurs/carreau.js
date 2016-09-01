**todo**

A presentation is made from cards that form a stack.

## How it looks / how it works

[![Video demo of carreau.js](screenshot.png)](https://www.youtube.com/watch?v=ANm2Vu5Gr58)

* creating a new stack, adding cards https://www.youtube.com/watch?v=acjNvDlNPfc

* example of a stack and some live editing of position and size of cards https://www.youtube.com/watch?v=B2OSHOP-zuk

* using iframe to display websites in a stack https://www.youtube.com/watch?v=QfsF0jAgg9U&feature=youtu.be

## How to install

You need node.js and npm to install this preview of carreau.js

In a terminal : 

1. `git clone --recursive https://github.com/louis-ev/carreau.js path/to/the/folder`
2. `cd path/to/the/folder`
3. `npm install`

Create a folder named *conferences* next to the *views* and *public* folder then run the following command:

* `node server.js`

## How to tweak, fork and debug

### server-side

* Run `node server.js --debug` to start the server with a better debug in terminal

* Run `node server.js --debug --verbose` to start the server with debug and verbose

To add an npm package, run `npm install` (for example `npm install --save-dev jshint`).

### client-side

To tweak and write some new SASS or client-side JS, you need to install bower from the public folder:

1. `cd public && bower install`
2. `cd ../`
3. `gulp`

To start gulp, just run `gulp` and tasks with watch will run.

To add a library, go to the `public` folder and use bower commands (such as `bower install isotope --save`)
