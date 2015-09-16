# external

External is a dual purpose library. It ships with a client-side framework renders
third party or external pages in the most optimal way as possible. This is done
using various of techniques:

- The payload is downloaded using a fully async streaming XHR request. This way
  we can continuously update and render our placeholder while data flows and
  therefor reducing the time to render.
- All assets of the page are loaded async, this includes the CSS.
- The received client code is wrapped before execution so client code can re-use
  our dependencies while keeping a sandboxed approach.
- While the client was specifically written for the [BigPipe] framework it
  should work against any back-end as long as it returns the same data
  structure.
- Templates are rendered using React so it's easy to compose and update.

But we also ship with a server-side framework implementation for [BigPipe] which
makes it possible to serve the client and automatically format all the output in
the expected HTML structure.

## Table of Contents

- [Installation](#installation)
  - [Building](#building)
  - [Serving](#serving)
  - [Listening](#listening)
- [Extern](#extern)
- [BigPipe](#bigpipe)
- [Wire Format](#wire-format)
- [License](#license)

## Installation

The client-side component is composed from various of tiny modules and can be
build using [Browserify]. It can be build-in to other browserify components by
simply requiring the `external` module in your client-code.

The server side part of this framework can be installed through npm:

```
npm install external
```

In addition to providing a browserify-able client-side script there is also a
compiled version of this code which lives in the `dist` folder called
`extern.js`. This pre-compiled library exposes it self using the `Extern` global
and therefor does not introduced `require` statement as globals. In all the code
examples in documentation we assume that you have an `Extern` global. If you use
the `dist` build you can skip the following example:

```js
var Extern = require('extern');
```

### Building

If you want to generate new stand alone bundles of the Extern library you can
run our `prepublish` and `dev` scripts using the `npm run` command. These
commands do assume that you've installed the `devDependencies` of this project.
To generate a new production build, `dist/extern.min.js` run:

```
npm run prepublish
```

As this is a `prepublish` script, it means that every release to npm will have
the `dist/extern.js` included. So if browserify isn't your think, you can just
include the `extern/dist/extern.min.js` instead.

To generate an un-minified build for development purposes you can run:

```
npm run dev
```

This will generate a new `dist/extern.dev.js` file.

### Serving

Now that you know how to install it and what type of bundles there are you can
decide how to serve the library. When this module is used as plugin in [BigPipe]
it will automatically serve the browserify and plugin combined bundle from:

```
http(s)://domain.com/extern.js
```

We also mount our `dist` folder on the server so the static assets in this
folder can also be served:

```
http(s)://domain.com/extern.min.js
```

Now that you've picked your build, and know how the files are served you can
simply put the script tag in your page and your ready to display external
pages/apps.

```html
<script src="https//yourdomain.com/extern.min.js"></script>
<script>
var extern = new Extern(document.body, 'http://whateverurlyouwantousehere.com/path/name');
</script>
```

### Listening

The easiest way to have `Extern` load your remote pages is by using the
`Extern.listen` method in combination with the `rel="extern"` attributes on
`<a>` elements:

```html
<a href="http://my-remote-server.com/optional/path" rel="extern">Remote</a>
```

The `Extern.listen` method will gather all `<a>` elements and search for a `rel`
that is set to `extern` and uses the set `href` of the element as URL that needs
to be remotely loaded.

```js
Extern.listen(document.body, {});
```

## Extern

The following options are supported:

- **`timeout`** Timeout for dependency loading. If assets take longer we should
  render and error template instead. The timeout is in milliseconds.
- **`document`** Reference to the `document` global can be useful if assets need
  to be loaded in iframes instead of the global document.
- **`className`** If a link has this className we will automatically load it in
  the placeholder. This className will also automatically be add and removed
  once the link is clicked. Defaults to `extern-loads`.

```js
var extern = new Extern('http://my.example.com/page', document.body, {
  timeout: 10000
});
```

### Events

The returned `extern` instance is actually an `EventEmitter3` instance so you
can listen to the various of events that we're emitting:

- **error** Emitted when something went so horribly wrong that we decided to
  show the error template. This event receives the actual `error` as argument.
- **done** The streaming XHR is finished with loading.
- **name:render** Called when a fragment is about to render in to the
  placeholder. The `name` part in the event should be name of the fragment you
  want to listen for.
- **name:loaded** All the assets are loaded for the given placeholder name.

## Wrapping

The client code for each fragments are loaded through an XHR connection. This
way we can safely executed third party code by wrapping the execution in a
`try/catch` statement. But not only does this allow us to wrap code, it also
allows us to introduce variables in the function. The following variables are
introduced as "globals":

- `React`, This is the `react/addons` reference.
- `require`, Reference to our `require` statement so you can re-use all the
  bundled things.

## API

The following properties and methods are exposed on the Extern instance.

#### Extern.listen

**Exposed on the constructor**

Scan the current document for all `<a rel="extern">` elements and attach click
listeners to it so we can automatically update the supplied placeholder with the
contents of the set URL. This method accepts one argument and that is the
`placeholder` DOM element where all pages should loaded in

```js
Extern.listen(document.body);
```

#### Extern.merge

**Exposed on the constructor**

Merge the object of the second argument in to the first argument. It returns the
fully merged first argument.

```js
var x = Extern.merge({ foo: 'foo' }, { bar: 'bar' });
```

#### Extern.requests

**Exposed on the constructor**

A reference to the `requests` module that we're using for our XHR requests.

```js
var requests = Extern.requests.
```

See [unshiftio/requests](https://github.com/unshiftio/requests) for more
information.

## BigPipe

This library ships with a custom [Fittings] framework implementation for
[BigPipe] which allows us to control how everything is processed inside of
[BigPipe]. Adding it to your BigPipe instance is just as simple as passing a
custom `framework` option while creating a new instance:

```js
'use strict';

var BigPipe = require('bigpipe')
  , Extern = require('external');

var app = BigPipe.createServer({
  framework: Extern,
  port: 8080
});
```

But the framework can also be set _after_ the construction using the `framework`
method:

```js
app.framework(Extern);
```

**Please do note that the current Fittings implentation is in the BigPipe master
branch but will out in the release that follows 0.9**

Once the fittings are installed on the application, it will start spitting out
responses based on the specified [Wire Format](#wire-format) below. The
processing instructions can be found in the [instructions](/instructions) folder
in the root of this repository. But before fiddling with these files I would
suggest giving the [README.md][Fittings] of Fittings a read so you know how the
data formatting works.

## Wire Format

In order to have the broadest support within this framework we came up with a
dedicated wire-format in order to have the server-side and client-side
components interact with each other. While this wire-format is mostly catered to
the needs of an application that is build using the [BigPipe] framework it
should be relatively easy to produce exactly the same output in different
frameworks and programming languages. This wire format is also required in order
to make streaming data as simple as possible as we can trigger buffer flushes
based on this.

The format that we're using is `\u1337` separated `JSON`. Every time we
encounter the `\u1337` character on the client-side we assume it's the end of
chunk that requires processing. The JSON payload that is send should contain the
following properties:

- **`_id`** A unique id for the payload that is flushed.
- **`name`** Name of the payload that is flushed. This is used to track
  potential child->parent references throughout the flushed payload.
- **`details`** An object that contains:
  - **`js`** Array with path names for the JavaScript files that need to be
    loaded on the page. We will automatically prepend the server address to
    these assets.
  - **`css`** Array with path names for the CSS files that need to be
    loaded on the page. We will automatically prepend the server address to
    these assets.
- **`state`** Additional state that will be spread on the component when we
  render it.
- **`template`** An initial HTML template that should be rendered in the given
  placeholder.

### CSS Assets

In order to be able to load CSS assets fully async in every browser we need to
know when the styles are applied. This is done by Extern client by adding a DOM
element to the page that has an `id` attribute which contains `_` and the filename of
the asset that is being downloaded (`#_yourfilename`). We therefor **require**
that the CSS file contains CSS selector and sets the `height` property to
`42px`. This allows us to poll the element for height changes to know when the
CSS is fully loaded. So if we have a file called `1aFafa801jz09.css` it should
have the following selector in the source:

```css
#_1aFafa801jz09 { height: 42px }
```

## License

This project has been released under the MIT license, see [LICENSE].

[Fittings]: https://github.com/bigpipe/fittings
[Browserify]: http://github.com/substack/node-browserify
[BigPipe]: https://github.com/bigpipe/bigpipe
