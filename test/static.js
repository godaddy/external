'use strict';

var fs = require('fs')
  , url = require('url')
  , path = require('path')
  , http = require('http')
  , access = require('access-control')();

/**
 * Simple static server to serve test files.
 *
 * @param {Function} kill Kill the server.
 * @param {Function} next Continue
 * @api private
 */
module.exports = function staticserver(kill, next) {
  var server = http.createServer(function serve(req, res) {
    access(req, res, function () {
      var file = path.join(__dirname, url.parse(req.url).pathname);

      if (!fs.existsSync(file)) {
        res.statusCode = 404;

        return res.end('nope');
      }

      res.statusCode = 200;
      fs.createReadStream(file).pipe(res);
    });
  });

  kill(function close(next) {
    server.close(next);
  });

  server.listen(8080, next);
};

if (require.main === module) module.exports(function () {
  //
  // Ignore me, I'm the kill function of the test runner.
  //
}, function () {
  console.log('Running static server on localhost:8080');
});
