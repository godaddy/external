'use strict';

/**
 * Emit mouse events on DOM elements without UI interaction.
 *
 * @param {DOM} node DOM node
 * @param {String} type Mouse event type we should trigger.
 * @api public
 */
exports.mouse = function mouse(node, type) {
  var evt;

  if (node.dispatchEvent) {
    if ('function' === typeof MouseEvent) {
      evt = new MouseEvent(type, {
        bubbles: true,
        cancelable: true
      });
    } else {
      // PhantomJS (wat!)
      evt = document.createEvent('MouseEvent');
      evt.initEvent(type, true, true);
    }

    return node.dispatchEvent(evt);
  } else {
    // IE 8
    evt = document.createEventObject('MouseEvent');
    return node.fireEvent('on'+ type, evt);
  }
};

/**
 * Emit keyboard events on DOM elements without UI interaction.
 *
 * @param {DOM} node DOM node
 * @param {String} type Mouse event type we should trigger.
 * @api public
 */
exports.keyboard = function keyboard(node, type, code) {
  var evt;

  if (node.dispatchEvent) {
    if ('function' === typeof KeyboardEvent) {
      // Chrome, Safari, Firefox
      evt = new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true
      });
    } else {
      // PhantomJS (wat!)
      evt = document.createEvent('KeyboardEvent');
      evt.initEvent(type, true, true);
    }

    evt.keyCode = code;
    return node.dispatchEvent(evt);
  } else {
    // IE 8
    evt = document.createEventObject('KeyboardEvent');
    evt.keyCode = code;
    return node.fireEvent('on'+ type, evt);
  }
};
