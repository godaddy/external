'use strict';

var React = require('react/addons')
  , ReactIntl = require('react-intl');

/**
 * A simple back-up view for when loading or rendering an actual component
 * failed. This way we give users some addition instructions instead of leaving
 * them to suffer with a blank page of death.
 *
 * @constructor
 * @type {React.Component}
 * @api public
 */
module.exports = React.createClass({
  mixins: [ReactIntl.IntlMixin],
  getDefaultProps: function getDefaultProps() {
    return {
      message: 'Loading, please wait.',
      container: {
        backgroundColor: '#FFF',
        marginBottom: '12px',
        padding: '25px 5%',
        textAlign: 'center'
      },
      spinner: {
        display: 'inline-block',
        verticalAlign: 'middle',
        marginRight: '5px',
        width: '16px',
        height: '16px'
      }
    };
  },
  render: function render() {
    return React.createElement('div', { style: this.props.container },
      React.createElement('i', { style: this.props.spinner }),
      this.props.message
    );
  }
});
