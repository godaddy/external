'use strict';

var debug = require('diagnostics')('extern')
  , ReactIntl = require('react-intl')
  , Assets = require('async-asset')
  , React = require('react/addons')
  , Requests = require('requests')
  , Recovery = require('recovery')
  , destroy = require('demolish')
  , each = require('async-each')
  , URL = require('url-parse');

/**
 * Extern.
 *
 * Options:
 *
 * - `cdn` Base URL for the CDN, if non is provide it will use the URL requested
 *   as cdn URL.
 * - `timeout` Maximum time that we're allowed to load a single asset.
 * - `manual` Don't `open` by default but do it manual.
 * - `document` Optional reference to the `document` global it should use.
 *
 * @param {String} url Address of the server we're connecting against.
 * @param {Element} container Container in which the React should be loaded.
 * @param {Object} options Optional configuration.
 * @api public
 */
function Extern(url, container, options) {
  if (!this) return new Extern(url, container, options);

  options = this.options = Extern.merge(
    Extern.merge({}, Extern.defaults),
    options || {}
  );

  //
  // Setup our Exponential back off things.
  //
  Recovery.call(this, options.backoff || {});

  this.buffer = '';
  this.components = {};
  this.url = new URL(url);
  this.container = container;
  this.cdn = new URL(options.cdn || url);
  this.assets = new Assets(container.parentNode, {
    document: options.document || global.document || {},
    timeout: options.timeout,
    prefix: '_'
  });

  //
  // Remove parts of the URL that should not be send to CDN's
  //
  this.cdn.set('query', '');
  this.cdn.set('hash', '');

  this.render(this.react.loading, { message: options.loading });
  this.on('reconnect', this.open, this);

  if (!options.manual) this.reconnect();
}

//
//  Extern is an EventEmitter so we can listen upon all the things.
//
Extern.prototype = new Recovery();
Extern.prototype.constructor = Extern;
Extern.prototype.emits = require('emits');

/**
 * The default options.
 *
 * @type {Object}
 * @api public
 */
Extern.defaults = {
  timeout: 30000,             // Timeout for assets downloading.
  manual: false               // Manually start the request.
};

/**
 * Open the streaming connection and download all the data's.
 *
 * @api public
 */
Extern.prototype.open = function open() {
  var extern = this;

  extern.stream = new Requests(extern.url.href, {
    streaming: true,
    method: 'GET',
    mode: 'cors'
  });

  extern.stream
  .on('data', extern.parse.bind(extern))
  .on('error', extern.emits('error'))
  .on('end', function done(err) {
    if (err) extern.render(extern.react.error);

    extern.reconnected(err);
    extern.emit('done');
  });

  debug('opening connection to %s', extern.url.href);
  return extern;
};

/**
 * Render a given React component in our supplied container.
 *
 * @param {React} component The Component that needs to be rendered.
 * @param {Object} spread What ever needs to be spread upon the component.
 * @api public
 */
Extern.prototype.render = function render(component, spread) {
  try {
    return React.render(
      React.createElement(component, React.__spread(this.options.props || {},  spread || {})),
      this.container
    );
  } catch (e) {
    this.emit('error', e);
    debug('failed to render React component in the container due to', e);
    return this.render(this.react.error);
  }
};

/**
 * Parse incoming data.
 *
 * @param {String} data Received data stream from the XHR request.
 * @returns {Boolean} Extracted a fragment from the buffer.
 * @api private
 */
Extern.prototype.boundary = '\\u1337';
Extern.prototype.parse = function parse(data) {
  if (data) this.buffer += data;

  var i;

  if (!~(i = this.buffer.indexOf(this.boundary))) {
    debug('received %d of data, but did not contain our boundary yet.', data.length);
    return false;
  }

  //
  // Poor man's parser implementation. It's highly unlikely that we're receiving
  // multiple blobs of data in one go.
  //
  this.read(this.buffer.substr(0, i));

  this.buffer = this.buffer.substr(i + this.boundary.length).trim();
  this.parse(''); // Another parse call to see if we received multiple chunks.

  return true;
};

/**
 * Transform the parsed data in to an actual template.
 *
 * @param {String} fragment The received fragment from the server.
 * @api public
 */
Extern.prototype.read = function read(fragment) {
  try { fragment = JSON.parse(fragment); }
  catch (e) {
    debug('failed to parse buffer fragment to a valid JSON structure', e);
    return this.emit('error', new Error('Failed to parse received JSON'));
  }

  var assets = []
    , extern = this
    , name = fragment.name
    , cdn = new URL(this.cdn.toString());

  //
  // Make sure that we've received our basic structure.
  //
  fragment.details = fragment.details || {};

  extern
  .once(fragment.name +':loaded', function loaded(err) {
    // @TODO handle error
    if (err) debug('failed to load %s due to', fragment.name, err);

    if (extern.listeners(fragment.details.parent +':render').length) {
      debug('rendering %s as all is loaded', fragment.name);
      extern.emit(fragment.name +':render');
    }
  })
  .on(fragment.details.parent +':render', function render() {
    debug('parent %s has rendered so re-rendering child %s', fragment.details.parent, fragment.name);
    extern.emit(name +':render');
  })
  .on(fragment.name +':render', function render() {
    var component = (fragment.details.js || []).filter(function find(id) {
      return id in extern.components;
    });

    //
    // No JavaScript file was found, so we cannot render the view as we require
    // a React component for this.
    //
    if (!component.length) {
      return debug('no React component to render for %s', fragment.name);
    }

    extern.render(extern.components[component[0]](), fragment.state);
    extern.emit(fragment.name +':rendered', fragment.state);
  });

  if (fragment.details.css) Array.prototype.push.apply(assets, fragment.details.css);
  if (fragment.details.js) Array.prototype.push.apply(assets, fragment.details.js);

  /**
   * Create object that has CDN information.
   *
   * @param {String} pathname Asset file path.
   * @return {Object} details
   * @api private
   */
  function map(pathname) {
    cdn.set('pathname', pathname);

    return {
      pathname: pathname,
      href: cdn.href
    };
  }

  /**
   * Download the asset from the server.
   *
   * @param {Object} url Formatted URL.
   * @param {Function} fn Completion callback.
   * @api private
   */
  function download(url, fn) {
    debug('downloading asset %s for %s', url.href, fragment.name);
    if (/\.js$/.test(url.pathname)) return extern.download(url, fn);

    extern.assets.add(url.href, fn);
  }

  //
  // Download any global dependencies before local assets.
  //
  return each((fragment.details.dependencies || []).map(map), download, function prepared(err) {
    if (err) return extern.emit('error', err);

    each(assets.map(map), download, extern.emits(fragment.name +':loaded'));
  });
};

/**
 * Download files from the specified remote server so they can be sandboxed
 * before evaluation.
 *
 * @param {Array} urls A list of URL's that should be downloaded from the server.
 * @param {Function} fn Completion callback that follows error first callback pattern.
 * @returns {Extern}
 * @api public
 */
Extern.prototype.download = function download(urls, fn) {
  var extern = this;

  urls = Array.isArray(urls) ? urls : [urls];
  each(urls, function iteration(url, next) {
    var buffer = [];

    (new Requests(url.href, {
      timeout: extern.options.timeout,
      streaming: false,
      method: 'GET'
    }))
    .on('data', function concat(data) {
      buffer.push(data);
    })
    .on('end', function end(err) {
      if (err) return next(err);

      extern.sandbox(url.pathname, buffer.join(''));

      //
      // Clean-up all references and data that was gathered.
      //
      this.removeAllListeners();
      buffer.length = 0;

      next();
    });
  }, fn);

  return this;
};

/**
 * Generate a sandboxed environment.
 *
 * @param {String} pathaname The path to the source file on the server.
 * @param {String} buffer The received source from the server.
 * @returns {Extern}
 * @api public
 */
Extern.prototype.sandbox = function sandbox(pathname, buffer) {
  if (pathname in this.components) return this;

  var extern = this
    , value
    , fn;

  //
  // We don't really need to do anything in the `catch` statement as the actual
  // error will be captured in the stored `conditional` function as it would
  // throw as the `fn` is not a function causing the error template to be used.
  //
  try { fn = new Function('React', 'require', buffer); }
  catch (e) {
    debug('failed to compile sandbox and create %s due to ', pathname, e);
    extern.emit('error', e);
  }

  /**
   * The component that needs to be rendered by the server.
   *
   * @returns {React.createClass}
   * @api private
   */
  this.components[pathname] = function conditional() {
    if (value) return value;

    //
    // Capture the execution of the component. We assume that the given JS
    // client code returns the React component that eventually needs to be
    // rendered.
    //
    // If the execution failed, we will show our build-in error component
    // instead so something visual is still rendered.
    //
    try { value = fn(React, require) || extern.react.error; }
    catch (e) {
      debug('failed to execute component sandbox for %s due to ', pathname, e);
      extern.emit('error', e);
      value = extern.react.error;
    }

    return value;
  };

  return this;
};

/**
 * Custom React components which are rendered while we're loading assets.
 *
 * @type {Object}
 * @private
 */
Extern.prototype.react = {
  loading: require('./react/loading'),
  error: require('./react/error')
};

/**
 * Completely destroy and null the said object.
 *
 * @returns {Boolean} First destruction
 * @api public
 */
Extern.prototype.destroy = destroy('buffer, components, url, container, assets, stream, options', {
  before: function () {
    debug('destroying extern instance %s', this.url.href);

    if (this.stream) {
      this.stream.destroy();
    }
  }
});

/**
 * Merge b with object a.
 *
 * @param {Object} a Target object that should receive props from b.
 * @param {Object} b Object that needs to be merged in to a.
 * @api public
 */
Extern.merge = function merge(a, b) {
  return Object.keys(b).reduce(function reduce(state, key) {
    state[key] = b[key];
    return state;
  }, a);
};

/**
 * A handy listener for automatically attaching to various of <a> elements that
 * will render the said URL's in the given placeholder.
 *
 * @param {Element} placeholder The placeholder for the remote pages.
 * @param {Object} configuration Configuration of the Extern server.
 * @param {Object} events Additional event listeners.
 * @returns {Extern}
 * @api public
 */
Extern.listen = function listen(placeholder, configuration, events) {
  events = events || {};
  configuration = configuration || {};
  configuration.className = configuration.className || 'extern-loads';

  var Instance = this
    , links = []
    , extern;

  Array.prototype.slice.call(
    document.getElementsByTagName('a')
  ).forEach(function each(a) {
    if (a.rel !== 'extern' || !a.href) return;

    /**
     * Render the given URL in the placeholder.
     *
     * @param {Event} e DOM Event from when we clicked on things.
     * @api private
     */
    function render(e) {
      if (e) e.preventDefault();

      //
      // Destroy the previous instance so we can clean up memory.
      //
      if (extern) extern.destroy();
      extern = new Instance(a.href, placeholder, configuration);

      for (var name in events) {
        extern.on(name, events[name]);
      }

      //
      // Add/Remove the custom className.
      //
      links.forEach(function clear(link) {
        if (!~link.className.indexOf(configuration.className)) return;
        link.className = link.className.replace(new RegExp('(?:^|\\s)'+ configuration.className +'(?!\\S)'), '');
      });

      a.className += ' '+ configuration.className;
    }

    a.addEventListener('click', render, false);
    links.push(a);

    //
    // If the given link has our special `active` className we should activate
    // the `extern` instance directly so it loads without having to click on the
    // URL.
    //
    if (~a.className.indexOf(configuration.className)) render();
  });

  return this;
};

/**
 * Expose the Requests instance so outsiders can also use it.
 *
 * @type {Function}
 * @api public
 */
Extern.requests = Requests;

//
// Expose the Framework
//
module.exports = Extern;
