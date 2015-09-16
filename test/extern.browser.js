describe('extern', function () {
  'use strict';

  if (!global.Intl) global.Intl = require('intl');

  var Requests = require('requests')
    , Extern = require('../extern')
    , assume = require('assume')
    , React = require('react')
    , ui = require('./ui')
    , placeholder
    , extern;

  //
  // Add all the things to a custom DOM element so we do not accidentally override
  // assets or other things that are loaded in the DOM.
  //
  placeholder = document.createElement('div');
  placeholder.id = 'placeholder';
  document.body.appendChild(placeholder);

  beforeEach(function () {
    placeholder.innerHTML = '';

    extern = new Extern('http://localhost/wut', placeholder, {
      props: { custom: 'props', are: 'available' },
      timeout: 2000,
      manual: true
    });
  });

  afterEach(function () {
    extern.destroy();
  });

  it('is exported as a function', function () {
    assume(Extern).is.a('function');
  });

  it('renders an initial loading screen', function () {
    assume(placeholder.innerHTML).includes('Loading');

    extern = new Extern('http://localhost/wut', placeholder, {
      loading: 'Custom totally unrelated message',
      manual: true
    });

    assume(placeholder.innerHTML).includes('totally unrelated');
  });

  it('exposes the `.requests` library', function () {
    assume(Extern.requests).equals(Requests);
  });

  it('removes querystring/hash for CDN urls', function () {
    extern.destroy();
    extern = new Extern('http://localhost/wut', placeholder, {
      cdn: 'https://thisisadifferenturl.com/?querystring=removed#hashtagyolo',
      timeout: 2000,
      manual: true
    });

    assume(extern.cdn.href).equals('https://thisisadifferenturl.com/');

    extern.destroy();
    extern = new Extern('http://localhost/wut?q=s#swag', placeholder, {
      timeout: 2000,
      manual: true
    });

    assume(extern.cdn.href).equals('http://localhost/wut');
  });

  describe('#open', function () {
    it('renders an error template when things fail', function (next) {
      extern.open();

      extern.once('done', function () {
        assume(placeholder.innerHTML).includes('error');
        next();
      });
    });

    it('requests the given source', function (next) {
      extern.destroy();

      extern = new Extern('http://localhost:8080/fixtures/format.json', placeholder, {
        timeout: 1000
      });

      extern.once('error', next);
      extern.once('fixture:rendered', function () {
        assume(placeholder.innerHTML).includes('client.js');

        next();
      });
    });
  });

  describe('#render', function () {
    it('emits `error` when it fails to render the component', function (next) {
      extern.once('error', function (err) {
        assume(err).is.instanceOf(Error);
        next();
      });

      extern.render({ not: 'a real component' });
    });

    it('renders the error template', function () {
      placeholder.innerHTML = '';
      extern.render({ non: 'extistent' });

      assume(placeholder.innerHTML).matches(/error/i);
    });

    it('applies the given object as spread data', function () {
      var Fixture = React.createClass({
        render: function () {
          return React.createElement('div', null, this.props.foo);
        }
      });

      extern.render(Fixture, { foo: 'bar-lal' });
      assume(placeholder.innerHTML).matches(/bar-lal/i);
    });

    it('merges the supplied props options with the supplied spread', function () {
      var Fixture = React.createClass({
        render: function () {
          assume(this.props.are).equals('merged');
          assume(this.props.foo).equals('bar-lal');
          assume(this.props.custom).equals('props');

          return React.createElement('div', null, this.props.foo);
        }
      });

      extern.render(Fixture, { foo: 'bar-lal', are: 'merged' });
      assume(placeholder.innerHTML).matches(/bar-lal/i);
    });
  });

  describe('#parse', function () {
    it('adds the supplied data to the buffer if no boundary is found', function () {
      assume(extern.buffer).equals('');

      assume(extern.parse('foo')).is.false();
      assume(extern.buffer).equals('foo');
    });

    it('it continues attempting to read until buffer is full', function () {
      extern.parse('foo');
      extern.parse('bar');

      assume(extern.buffer).equals('foobar');
      assume(extern.parse(extern.boundary)).is.true();

      assume(extern.buffer).equals('');
    });

    it('trims away and extra whitespace', function () {
      assume(extern.parse('foo, bar'+ extern.boundary + '\n\r\n')).is.true();
      assume(extern.buffer).equals('');
    });

    it('can parse multiple chunks of data', function () {
      extern.parse('foo bar'+ extern.boundary +'moo boo');
      assume(extern.buffer).equals('moo boo');

      extern.parse(extern.boundary +'moo'+ extern.boundary);
      assume(extern.buffer).equals('');
    });

    it('passes the chunk in to the #read method');
  });

  describe('#read', function () {
    it('emits an error when it fails to parse JSON', function (next) {
      extern.once('error', function (err) {
        assume(err.message).contains('JSON');
        next();
      });

      extern.read('{foo');
    });

    it('emits `<name>:loaded` if there are no dependencies to load', function (next) {
      extern.once('foo:loaded', function () {
        next();
      });

      extern.read(JSON.stringify({
        name: 'foo'
      }));
    });

    it('displays an error view when there is no component to render', function (next) {
      extern.destroy();

      extern = new Extern('http://localhost:8080/fixtures/missing.json', placeholder, {
        timeout: 1000
      });

      extern.once('error', next);
      extern.once('fixture:rendered', function () {
        assume(placeholder.innerHTML).includes('error');

        next();
      });
    });
  });

  describe('.listen', function () {
    it('has a .listen method', function () {
      assume(Extern.listen).is.a('function');
    });

    it('returns the Extern', function () {
      assume(Extern.listen(placeholder)).equals(Extern);
    });

    it('attaches it self to <a rel="extern"> links & downloads the said URL', function (next) {
      var a = document.createElement('a');

      a.href = 'http://localhost:8080/fixtures/format.json';
      a.rel = 'extern';

      document.body.appendChild(a);
      Extern.listen(placeholder, {}, {
        'error': next,
        'fixture:rendered': function () {
          assume(placeholder.innerHTML).contains('fixture client.js');

          next();
        }
      });

      ui.mouse(a, 'click');
    });

    it('initializes all the things automatically using classNames', function (next) {
      var a = document.createElement('a');

      a.href = 'http://localhost:8080/fixtures/format.json';
      a.className = 'foo bar banana';
      a.rel = 'extern';

      document.body.appendChild(a);
      Extern.listen(placeholder, { className: 'bar' }, {
        'error': next,
        'fixture:rendered': function () {
          assume(placeholder.innerHTML).contains('fixture client.js');

          next();
        }
      });
    });
  });

  describe('.merge', function () {
    it('merges the object in the first arg', function () {
      var obj = {};

      Extern.merge(obj, { foo: 'bar' });
      assume(obj.foo).equals('bar');
    });

    it('returns the supplied object', function () {
      var obj = {};

      assume(Extern.merge(obj, { foo: 'bar' })).deep.equals(obj);
      assume(obj.foo).equals('bar');
    });
  });
});
