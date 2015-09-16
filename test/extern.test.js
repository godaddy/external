describe('extern', function () {
  'use strict';

  var assume = require('assume')
    , Fittings = require('../');

  describe('bigpipe integration', function () {
    it('has a custom name', function () {
      assume(Fittings.prototype.name).equals('extern');
    });

    it('exported as function', function () {
      assume(Fittings).is.a('function');
    });
  });
});
