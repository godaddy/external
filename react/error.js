'use strict';

var React = require('react/addons')
  , ReactIntl = require('react-intl');

/**
 * A simple back-up view for when loading or rendering an actual component
 * failed. This way we give users some addition instructions instead of leaving
 * them to suffer with a blank page of death.
 *
 * @returns {React}
 * @api public
 */
module.exports = React.createClass({
  mixins: [ReactIntl.IntlMixin],
  render: function render() {
    return React.createElement('div', { className: 'error' },
      React.createElement('h2', null, 'Yikes!'),
      React.createElement('p', null, [
        'Something\'s gone wrong, and we\'re working feverishly to fix the issue.',
        'Please wait a bit and try again.'
      ].join(' '))
    );
  }
});
