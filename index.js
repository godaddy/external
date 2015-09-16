'use strict';

var Fittings = require('fittings')
  , join = require('path').join
  , fs = require('fs');

/**
 * Read files out of our instructions directory.
 *
 * @param {String} file Filename that we should read.
 * @returns {String}
 * @api private
 */
function read(file) {
  return fs.readFileSync(join(__dirname, 'instructions', file), 'utf-8');
}

/**
 * Create a new custom fittings instance so we can fully customize how
 * everything should be loaded for external files.
 *
 * @constructor
 * @api public
 */
Fittings.extend({
  name: 'extern',
  fragment: read('fragment.json'),
  bootstrap: read('fragment.json'),
  library: require.resolve('./extern.js'),
  middleware: {
    standalone: require('serve-static')(join(__dirname, 'dist'))
  }
}).on(module);
