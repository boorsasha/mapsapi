/*
 Maps api created at 2GIS. Build on Leaflet.
 (c) 2013-2015, 2GIS
*/

(function (window, document, undefined) {

var L = {
	version: '0.8-dev'
};

function expose() {
	var oldL = window.L;

	L.noConflict = function () {
		window.L = oldL;
		return this;
	};

	window.L = L;
}

// define Leaflet for Node module pattern loaders, including Browserify
if (typeof module === 'object' && typeof module.exports === 'object') {
	module.exports = L;

// define Leaflet as an AMD module
} else if (typeof define === 'function' && define.amd) {
	define(L);

// define Leaflet as a global L variable, saving the original L to restore later if needed
} else {
	expose();
}

/*
 * L.Util contains various utility functions used throughout Leaflet code.
 */

L.Util = {
	// extend an object with properties of one or more other objects
	extend: function (dest) {
		var sources = Array.prototype.slice.call(arguments, 1),
		    i, j, len, src;

		for (j = 0, len = sources.length; j < len; j++) {
			src = sources[j];
			for (i in src) {
				dest[i] = src[i];
			}
		}
		return dest;
	},

	// create an object from a given prototype
	create: Object.create || (function () {
		function F() {}
		return function (proto) {
			F.prototype = proto;
			return new F();
		};
	})(),

	// bind a function to be called with a given context
	bind: function (fn, obj) {
		var slice = Array.prototype.slice;

		if (fn.bind) {
			return fn.bind.apply(fn, slice.call(arguments, 1));
		}

		var args = slice.call(arguments, 2);

		return function () {
			return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
		};
	},

	// return unique ID of an object
	stamp: function (obj) {
		// jshint camelcase: false
		obj._leaflet_id = obj._leaflet_id || ++L.Util.lastId;
		return obj._leaflet_id;
	},

	lastId: 0,

	// return a function that won't be called more often than the given interval
	throttle: function (fn, time, context) {
		var lock, args, wrapperFn, later;

		later = function () {
			// reset lock and call if queued
			lock = false;
			if (args) {
				wrapperFn.apply(context, args);
				args = false;
			}
		};

		wrapperFn = function () {
			if (lock) {
				// called too soon, queue to call later
				args = arguments;

			} else {
				// call and lock until later
				fn.apply(context, arguments);
				setTimeout(later, time);
				lock = true;
			}
		};

		return wrapperFn;
	},

	// wrap the given number to lie within a certain range (used for wrapping longitude)
	wrapNum: function (x, range, includeMax) {
		var max = range[1],
		    min = range[0],
		    d = max - min;
		return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
	},

	// do nothing (used as a noop throughout the code)
	falseFn: function () { return false; },

	// round a given number to a given precision
	formatNum: function (num, digits) {
		var pow = Math.pow(10, digits || 5);
		return Math.round(num * pow) / pow;
	},

	// trim whitespace from both sides of a string
	trim: function (str) {
		return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
	},

	// split a string into words
	splitWords: function (str) {
		return L.Util.trim(str).split(/\s+/);
	},

	// set options to an object, inheriting parent's options as well
	setOptions: function (obj, options) {
		if (!obj.hasOwnProperty('options')) {
			obj.options = obj.options ? L.Util.create(obj.options) : {};
		}
		for (var i in options) {
			obj.options[i] = options[i];
		}
		return obj.options;
	},

	// make an URL with GET parameters out of a set of properties/values
	getParamString: function (obj, existingUrl, uppercase) {
		var params = [];
		for (var i in obj) {
			params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + '=' + encodeURIComponent(obj[i]));
		}
		return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
	},

	// super-simple templating facility, used for TileLayer URLs
	template: function (str, data) {
		return str.replace(L.Util.templateRe, function (str, key) {
			var value = data[key];

			if (value === undefined) {
				throw new Error('No value provided for variable ' + str);

			} else if (typeof value === 'function') {
				value = value(data);
			}
			return value;
		});
	},

	templateRe: /\{ *([\w_]+) *\}/g,

	isArray: Array.isArray || function (obj) {
		return (Object.prototype.toString.call(obj) === '[object Array]');
	},

	// minimal image URI, set to an image when disposing to flush memory
	emptyImageUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
};

(function () {
	// inspired by http://paulirish.com/2011/requestanimationframe-for-smart-animating/

	function getPrefixed(name) {
		return window['webkit' + name] || window['moz' + name] || window['ms' + name];
	}

	var lastTime = 0;

	// fallback for IE 7-8
	function timeoutDefer(fn) {
		var time = +new Date(),
		    timeToCall = Math.max(0, 16 - (time - lastTime));

		lastTime = time + timeToCall;
		return window.setTimeout(fn, timeToCall);
	}

	var requestFn = window.requestAnimationFrame || getPrefixed('RequestAnimationFrame') || timeoutDefer,
	    cancelFn = window.cancelAnimationFrame || getPrefixed('CancelAnimationFrame') ||
	               getPrefixed('CancelRequestAnimationFrame') || function (id) { window.clearTimeout(id); };


	L.Util.requestAnimFrame = function (fn, context, immediate, element) {
		if (immediate && requestFn === timeoutDefer) {
			fn.call(context);
		} else {
			return requestFn.call(window, L.bind(fn, context), element);
		}
	};

	L.Util.cancelAnimFrame = function (id) {
		if (id) {
			cancelFn.call(window, id);
		}
	};
})();

// shortcuts for most used utility functions
L.extend = L.Util.extend;
L.bind = L.Util.bind;
L.stamp = L.Util.stamp;
L.setOptions = L.Util.setOptions;

/*
 * L.Class powers the OOP facilities of the library.
 * Thanks to John Resig and Dean Edwards for inspiration!
 */

L.Class = function () {};

L.Class.extend = function (props) {

	// extended class with the new prototype
	var NewClass = function () {

		// call the constructor
		if (this.initialize) {
			this.initialize.apply(this, arguments);
		}

		// call all constructor hooks
		if (this._initHooks.length) {
			this.callInitHooks();
		}
	};

	// jshint camelcase: false
	var parentProto = NewClass.__super__ = this.prototype;

	var proto = L.Util.create(parentProto);
	proto.constructor = NewClass;

	NewClass.prototype = proto;

	//inherit parent's statics
	for (var i in this) {
		if (this.hasOwnProperty(i) && i !== 'prototype') {
			NewClass[i] = this[i];
		}
	}

	// mix static properties into the class
	if (props.statics) {
		L.extend(NewClass, props.statics);
		delete props.statics;
	}

	// mix includes into the prototype
	if (props.includes) {
		L.Util.extend.apply(null, [proto].concat(props.includes));
		delete props.includes;
	}

	// merge options
	if (proto.options) {
		props.options = L.Util.extend(L.Util.create(proto.options), props.options);
	}

	// mix given properties into the prototype
	L.extend(proto, props);

	proto._initHooks = [];

	// add method for calling all hooks
	proto.callInitHooks = function () {

		if (this._initHooksCalled) { return; }

		if (parentProto.callInitHooks) {
			parentProto.callInitHooks.call(this);
		}

		this._initHooksCalled = true;

		for (var i = 0, len = proto._initHooks.length; i < len; i++) {
			proto._initHooks[i].call(this);
		}
	};

	return NewClass;
};


// method for adding properties to prototype
L.Class.include = function (props) {
	L.extend(this.prototype, props);
};

// merge new default options to the Class
L.Class.mergeOptions = function (options) {
	L.extend(this.prototype.options, options);
};

// add a constructor hook
L.Class.addInitHook = function (fn) { // (Function) || (String, args...)
	var args = Array.prototype.slice.call(arguments, 1);

	var init = typeof fn === 'function' ? fn : function () {
		this[fn].apply(this, args);
	};

	this.prototype._initHooks = this.prototype._initHooks || [];
	this.prototype._initHooks.push(init);
};

/*
 * L.Evented is a base class that Leaflet classes inherit from to handle custom events.
 */

L.Evented = L.Class.extend({

	on: function (types, fn, context) {

		// types can be a map of types/handlers
		if (typeof types === 'object') {
			for (var type in types) {
				// we don't process space-separated events here for performance;
				// it's a hot path since Layer uses the on(obj) syntax
				this._on(type, types[type], fn);
			}

		} else {
			// types can be a string of space-separated words
			types = L.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._on(types[i], fn, context);
			}
		}

		return this;
	},

	off: function (types, fn, context) {

		if (!types) {
			// clear all listeners if called without arguments
			delete this._events;

		} else if (typeof types === 'object') {
			for (var type in types) {
				this._off(type, types[type], fn);
			}

		} else {
			types = L.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._off(types[i], fn, context);
			}
		}

		return this;
	},

	// attach listener (without syntactic sugar now)
	_on: function (type, fn, context) {

		var events = this._events = this._events || {},
		    contextId = context && context !== this && L.stamp(context);

		if (contextId) {
			// store listeners with custom context in a separate hash (if it has an id);
			// gives a major performance boost when firing and removing events (e.g. on map object)

			var indexKey = type + '_idx',
			    indexLenKey = type + '_len',
			    typeIndex = events[indexKey] = events[indexKey] || {},
			    id = L.stamp(fn) + '_' + contextId;

			if (!typeIndex[id]) {
				typeIndex[id] = {fn: fn, ctx: context};

				// keep track of the number of keys in the index to quickly check if it's empty
				events[indexLenKey] = (events[indexLenKey] || 0) + 1;
			}

		} else {
			// individual layers mostly use "this" for context and don't fire listeners too often
			// so simple array makes the memory footprint better while not degrading performance

			events[type] = events[type] || [];
			events[type].push({fn: fn});
		}
	},

	_off: function (type, fn, context) {
		var events = this._events,
		    indexKey = type + '_idx',
		    indexLenKey = type + '_len';

		if (!events) { return; }

		if (!fn) {
			// clear all listeners for a type if function isn't specified
			delete events[type];
			delete events[indexKey];
			delete events[indexLenKey];
			return;
		}

		var contextId = context && context !== this && L.stamp(context),
		    listeners, i, len, listener, id;

		if (contextId) {
			id = L.stamp(fn) + '_' + contextId;
			listeners = events[indexKey];

			if (listeners && listeners[id]) {
				listener = listeners[id];
				delete listeners[id];
				events[indexLenKey]--;
			}

		} else {
			listeners = events[type];

			if (listeners) {
				for (i = 0, len = listeners.length; i < len; i++) {
					if (listeners[i].fn === fn) {
						listener = listeners[i];
						listeners.splice(i, 1);
						break;
					}
				}
			}
		}

		// set the removed listener to noop so that's not called if remove happens in fire
		if (listener) {
			listener.fn = L.Util.falseFn;
		}
	},

	fire: function (type, data, propagate) {
		if (!this.listens(type, propagate)) { return this; }

		var event = L.Util.extend({}, data, {type: type, target: this}),
		    events = this._events;

		if (events) {
		    var typeIndex = events[type + '_idx'],
		        i, len, listeners, id;

			if (events[type]) {
				// make sure adding/removing listeners inside other listeners won't cause infinite loop
				listeners = events[type].slice();

				for (i = 0, len = listeners.length; i < len; i++) {
					listeners[i].fn.call(this, event);
				}
			}

			// fire event for the context-indexed listeners as well
			for (id in typeIndex) {
				typeIndex[id].fn.call(typeIndex[id].ctx, event);
			}
		}

		if (propagate) {
			// propagate the event to parents (set with addEventParent)
			this._propagateEvent(event);
		}

		return this;
	},

	listens: function (type, propagate) {
		var events = this._events;

		if (events && (events[type] || events[type + '_len'])) { return true; }

		if (propagate) {
			// also check parents for listeners if event propagates
			for (var id in this._eventParents) {
				if (this._eventParents[id].listens(type, propagate)) { return true; }
			}
		}
		return false;
	},

	once: function (types, fn, context) {

		if (typeof types === 'object') {
			for (var type in types) {
				this.once(type, types[type], fn);
			}
			return this;
		}

		var handler = L.bind(function () {
			this
			    .off(types, fn, context)
			    .off(types, handler, context);
		}, this);

		// add a listener that's executed once and removed after that
		return this
		    .on(types, fn, context)
		    .on(types, handler, context);
	},

	// adds a parent to propagate events to (when you fire with true as a 3rd argument)
	addEventParent: function (obj) {
		this._eventParents = this._eventParents || {};
		this._eventParents[L.stamp(obj)] = obj;
		return this;
	},

	removeEventParent: function (obj) {
		if (this._eventParents) {
			delete this._eventParents[L.stamp(obj)];
		}
		return this;
	},

	_propagateEvent: function (e) {
		for (var id in this._eventParents) {
			this._eventParents[id].fire(e.type, L.extend({layer: e.target}, e), true);
		}
	}
});

var proto = L.Evented.prototype;

// aliases; we should ditch those eventually
proto.addEventListener = proto.on;
proto.removeEventListener = proto.clearAllEventListeners = proto.off;
proto.addOneTimeEventListener = proto.once;
proto.fireEvent = proto.fire;
proto.hasEventListeners = proto.listens;

L.Mixin = {Events: proto};

/*
 * L.Browser handles different browser and feature detections for internal Leaflet use.
 */

(function () {

	var ua = navigator.userAgent.toLowerCase(),
	    doc = document.documentElement,

	    ie = 'ActiveXObject' in window,

	    webkit    = ua.indexOf('webkit') !== -1,
	    phantomjs = ua.indexOf('phantom') !== -1,
	    android23 = ua.search('android [23]') !== -1,
	    chrome    = ua.indexOf('chrome') !== -1,

	    mobile = typeof orientation !== 'undefined',
	    msPointer = navigator.msPointerEnabled && navigator.msMaxTouchPoints && !window.PointerEvent,
	    pointer = (window.PointerEvent && navigator.pointerEnabled && navigator.maxTouchPoints) || msPointer,

	    ie3d = ie && ('transition' in doc.style),
	    webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()) && !android23,
	    gecko3d = 'MozPerspective' in doc.style,
	    opera3d = 'OTransition' in doc.style;


	var retina = 'devicePixelRatio' in window && window.devicePixelRatio > 1;

	if (!retina && 'matchMedia' in window) {
		var matches = window.matchMedia('(min-resolution:144dpi)');
		retina = matches && matches.matches;
	}

	var touch = !window.L_NO_TOUCH && !phantomjs && (pointer || 'ontouchstart' in window ||
			(window.DocumentTouch && document instanceof window.DocumentTouch));

	L.Browser = {
		ie: ie,
		ielt9: ie && !document.addEventListener,
		webkit: webkit,
		gecko: (ua.indexOf('gecko') !== -1) && !webkit && !window.opera && !ie,
		android: ua.indexOf('android') !== -1,
		android23: android23,
		chrome: chrome,
		safari: !chrome && ua.indexOf('safari') !== -1,

		ie3d: ie3d,
		webkit3d: webkit3d,
		gecko3d: gecko3d,
		opera3d: opera3d,
		any3d: !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d || opera3d) && !phantomjs,

		mobile: mobile,
		mobileWebkit: mobile && webkit,
		mobileWebkit3d: mobile && webkit3d,
		mobileOpera: mobile && window.opera,

		touch: !!touch,
		msPointer: !!msPointer,
		pointer: !!pointer,

		retina: !!retina
	};

}());

/*
 * L.Point represents a point with x and y coordinates.
 */

L.Point = function (/*Number*/ x, /*Number*/ y, /*Boolean*/ round) {
	this.x = (round ? Math.round(x) : x);
	this.y = (round ? Math.round(y) : y);
};

L.Point.prototype = {

	clone: function () {
		return new L.Point(this.x, this.y);
	},

	// non-destructive, returns a new point
	add: function (point) {
		return this.clone()._add(L.point(point));
	},

	// destructive, used directly for performance in situations where it's safe to modify existing point
	_add: function (point) {
		this.x += point.x;
		this.y += point.y;
		return this;
	},

	subtract: function (point) {
		return this.clone()._subtract(L.point(point));
	},

	_subtract: function (point) {
		this.x -= point.x;
		this.y -= point.y;
		return this;
	},

	divideBy: function (num) {
		return this.clone()._divideBy(num);
	},

	_divideBy: function (num) {
		this.x /= num;
		this.y /= num;
		return this;
	},

	multiplyBy: function (num) {
		return this.clone()._multiplyBy(num);
	},

	_multiplyBy: function (num) {
		this.x *= num;
		this.y *= num;
		return this;
	},

	round: function () {
		return this.clone()._round();
	},

	_round: function () {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	},

	floor: function () {
		return this.clone()._floor();
	},

	_floor: function () {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	},

	ceil: function () {
		return this.clone()._ceil();
	},

	_ceil: function () {
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);
		return this;
	},

	distanceTo: function (point) {
		point = L.point(point);

		var x = point.x - this.x,
		    y = point.y - this.y;

		return Math.sqrt(x * x + y * y);
	},

	equals: function (point) {
		point = L.point(point);

		return point.x === this.x &&
		       point.y === this.y;
	},

	contains: function (point) {
		point = L.point(point);

		return Math.abs(point.x) <= Math.abs(this.x) &&
		       Math.abs(point.y) <= Math.abs(this.y);
	},

	toString: function () {
		return 'Point(' +
		        L.Util.formatNum(this.x) + ', ' +
		        L.Util.formatNum(this.y) + ')';
	}
};

L.point = function (x, y, round) {
	if (x instanceof L.Point) {
		return x;
	}
	if (L.Util.isArray(x)) {
		return new L.Point(x[0], x[1]);
	}
	if (x === undefined || x === null) {
		return x;
	}
	return new L.Point(x, y, round);
};

/*
 * L.Bounds represents a rectangular area on the screen in pixel coordinates.
 */

L.Bounds = function (a, b) { //(Point, Point) or Point[]
	if (!a) { return; }

	var points = b ? [a, b] : a;

	for (var i = 0, len = points.length; i < len; i++) {
		this.extend(points[i]);
	}
};

L.Bounds.prototype = {
	// extend the bounds to contain the given point
	extend: function (point) { // (Point)
		point = L.point(point);

		if (!this.min && !this.max) {
			this.min = point.clone();
			this.max = point.clone();
		} else {
			this.min.x = Math.min(point.x, this.min.x);
			this.max.x = Math.max(point.x, this.max.x);
			this.min.y = Math.min(point.y, this.min.y);
			this.max.y = Math.max(point.y, this.max.y);
		}
		return this;
	},

	getCenter: function (round) { // (Boolean) -> Point
		return new L.Point(
		        (this.min.x + this.max.x) / 2,
		        (this.min.y + this.max.y) / 2, round);
	},

	getBottomLeft: function () { // -> Point
		return new L.Point(this.min.x, this.max.y);
	},

	getTopRight: function () { // -> Point
		return new L.Point(this.max.x, this.min.y);
	},

	getSize: function () {
		return this.max.subtract(this.min);
	},

	contains: function (obj) { // (Bounds) or (Point) -> Boolean
		var min, max;

		if (typeof obj[0] === 'number' || obj instanceof L.Point) {
			obj = L.point(obj);
		} else {
			obj = L.bounds(obj);
		}

		if (obj instanceof L.Bounds) {
			min = obj.min;
			max = obj.max;
		} else {
			min = max = obj;
		}

		return (min.x >= this.min.x) &&
		       (max.x <= this.max.x) &&
		       (min.y >= this.min.y) &&
		       (max.y <= this.max.y);
	},

	intersects: function (bounds) { // (Bounds) -> Boolean
		bounds = L.bounds(bounds);

		var min = this.min,
		    max = this.max,
		    min2 = bounds.min,
		    max2 = bounds.max,
		    xIntersects = (max2.x >= min.x) && (min2.x <= max.x),
		    yIntersects = (max2.y >= min.y) && (min2.y <= max.y);

		return xIntersects && yIntersects;
	},

	isValid: function () {
		return !!(this.min && this.max);
	}
};

L.bounds = function (a, b) { // (Bounds) or (Point, Point) or (Point[])
	if (!a || a instanceof L.Bounds) {
		return a;
	}
	return new L.Bounds(a, b);
};

/*
 * L.Transformation is an utility class to perform simple point transformations through a 2d-matrix.
 */

L.Transformation = function (a, b, c, d) {
	this._a = a;
	this._b = b;
	this._c = c;
	this._d = d;
};

L.Transformation.prototype = {
	transform: function (point, scale) { // (Point, Number) -> Point
		return this._transform(point.clone(), scale);
	},

	// destructive transform (faster)
	_transform: function (point, scale) {
		scale = scale || 1;
		point.x = scale * (this._a * point.x + this._b);
		point.y = scale * (this._c * point.y + this._d);
		return point;
	},

	untransform: function (point, scale) {
		scale = scale || 1;
		return new L.Point(
		        (point.x / scale - this._b) / this._a,
		        (point.y / scale - this._d) / this._c);
	}
};

/*
 * L.DomUtil contains various utility functions for working with DOM.
 */

L.DomUtil = {
	get: function (id) {
		return typeof id === 'string' ? document.getElementById(id) : id;
	},

	getStyle: function (el, style) {

		var value = el.style[style] || (el.currentStyle && el.currentStyle[style]);

		if ((!value || value === 'auto') && document.defaultView) {
			var css = document.defaultView.getComputedStyle(el, null);
			value = css ? css[style] : null;
		}

		return value === 'auto' ? null : value;
	},

	create: function (tagName, className, container) {

		var el = document.createElement(tagName);
		el.className = className;

		if (container) {
			container.appendChild(el);
		}

		return el;
	},

	remove: function (el) {
		var parent = el.parentNode;
		if (parent) {
			parent.removeChild(el);
		}
	},

	toFront: function (el) {
		el.parentNode.appendChild(el);
	},

	toBack: function (el) {
		var parent = el.parentNode;
		parent.insertBefore(el, parent.firstChild);
	},

	hasClass: function (el, name) {
		if (el.classList !== undefined) {
			return el.classList.contains(name);
		}
		var className = L.DomUtil.getClass(el);
		return className.length > 0 && new RegExp('(^|\\s)' + name + '(\\s|$)').test(className);
	},

	addClass: function (el, name) {
		if (el.classList !== undefined) {
			var classes = L.Util.splitWords(name);
			for (var i = 0, len = classes.length; i < len; i++) {
				el.classList.add(classes[i]);
			}
		} else if (!L.DomUtil.hasClass(el, name)) {
			var className = L.DomUtil.getClass(el);
			L.DomUtil.setClass(el, (className ? className + ' ' : '') + name);
		}
	},

	removeClass: function (el, name) {
		if (el.classList !== undefined) {
			el.classList.remove(name);
		} else {
			L.DomUtil.setClass(el, L.Util.trim((' ' + L.DomUtil.getClass(el) + ' ').replace(' ' + name + ' ', ' ')));
		}
	},

	setClass: function (el, name) {
		if (el.className.baseVal === undefined) {
			el.className = name;
		} else {
			// in case of SVG element
			el.className.baseVal = name;
		}
	},

	getClass: function (el) {
		return el.className.baseVal === undefined ? el.className : el.className.baseVal;
	},

	setOpacity: function (el, value) {

		if ('opacity' in el.style) {
			el.style.opacity = value;

		} else if ('filter' in el.style) {

			var filter = false,
			    filterName = 'DXImageTransform.Microsoft.Alpha';

			// filters collection throws an error if we try to retrieve a filter that doesn't exist
			try {
				filter = el.filters.item(filterName);
			} catch (e) {
				// don't set opacity to 1 if we haven't already set an opacity,
				// it isn't needed and breaks transparent pngs.
				if (value === 1) { return; }
			}

			value = Math.round(value * 100);

			if (filter) {
				filter.Enabled = (value !== 100);
				filter.Opacity = value;
			} else {
				el.style.filter += ' progid:' + filterName + '(opacity=' + value + ')';
			}
		}
	},

	testProp: function (props) {

		var style = document.documentElement.style;

		for (var i = 0; i < props.length; i++) {
			if (props[i] in style) {
				return props[i];
			}
		}
		return false;
	},

	setTransform: function (el, offset, scale) {
		var pos = offset || new L.Point(0, 0),
			is3d = L.Browser.webkit3d,
		    open = 'translate' + (is3d ? '3d' : '') + '(',
		    close = (is3d ? ',0' : '') + ')';

		el.style[L.DomUtil.TRANSFORM] =
			open + pos.x + 'px,' + pos.y + 'px' + close + (scale ? ' scale(' + scale + ')' : '');
	},

	setPosition: function (el, point, no3d) { // (HTMLElement, Point[, Boolean])

		// jshint camelcase: false
		el._leaflet_pos = point;

		if (L.Browser.any3d && !no3d) {
			L.DomUtil.setTransform(el, point);
		} else {
			el.style.left = point.x + 'px';
			el.style.top = point.y + 'px';
		}
	},

	getPosition: function (el) {
		// this method is only used for elements previously positioned using setPosition,
		// so it's safe to cache the position for performance

		// jshint camelcase: false
		return el._leaflet_pos;
	}
};


(function () {
	// prefix style property names

	L.DomUtil.TRANSFORM = L.DomUtil.testProp(
			['transform', 'WebkitTransform', 'OTransform', 'MozTransform', 'msTransform']);


	// webkitTransition comes first because some browser versions that drop vendor prefix don't do
	// the same for the transitionend event, in particular the Android 4.1 stock browser

	var transition = L.DomUtil.TRANSITION = L.DomUtil.testProp(
			['webkitTransition', 'transition', 'OTransition', 'MozTransition', 'msTransition']);

	L.DomUtil.TRANSITION_END =
			transition === 'webkitTransition' || transition === 'OTransition' ? transition + 'End' : 'transitionend';


	if ('onselectstart' in document) {
		L.DomUtil.disableTextSelection = function () {
			L.DomEvent.on(window, 'selectstart', L.DomEvent.preventDefault);
		};
		L.DomUtil.enableTextSelection = function () {
			L.DomEvent.off(window, 'selectstart', L.DomEvent.preventDefault);
		};

	} else {
		var userSelectProperty = L.DomUtil.testProp(
			['userSelect', 'WebkitUserSelect', 'OUserSelect', 'MozUserSelect', 'msUserSelect']);

		L.DomUtil.disableTextSelection = function () {
			if (userSelectProperty) {
				var style = document.documentElement.style;
				this._userSelect = style[userSelectProperty];
				style[userSelectProperty] = 'none';
			}
		};
		L.DomUtil.enableTextSelection = function () {
			if (userSelectProperty) {
				document.documentElement.style[userSelectProperty] = this._userSelect;
				delete this._userSelect;
			}
		};
	}

	L.DomUtil.disableImageDrag = function () {
		L.DomEvent.on(window, 'dragstart', L.DomEvent.preventDefault);
	};
	L.DomUtil.enableImageDrag = function () {
		L.DomEvent.off(window, 'dragstart', L.DomEvent.preventDefault);
	};
})();

/*
 * L.LatLng represents a geographical point with latitude and longitude coordinates.
 */

L.LatLng = function (lat, lng, alt) {
	if (isNaN(lat) || isNaN(lng)) {
		throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
	}

	this.lat = +lat;
	this.lng = +lng;

	if (alt !== undefined) {
		this.alt = +alt;
	}
};

L.LatLng.prototype = {
	equals: function (obj, maxMargin) {
		if (!obj) { return false; }

		obj = L.latLng(obj);

		var margin = Math.max(
		        Math.abs(this.lat - obj.lat),
		        Math.abs(this.lng - obj.lng));

		return margin <= (maxMargin === undefined ? 1.0E-9 : maxMargin);
	},

	toString: function (precision) {
		return 'LatLng(' +
		        L.Util.formatNum(this.lat, precision) + ', ' +
		        L.Util.formatNum(this.lng, precision) + ')';
	},

	distanceTo: function (other) {
		return L.CRS.Earth.distance(this, L.latLng(other));
	},

	wrap: function () {
		return L.CRS.Earth.wrapLatLng(this);
	}
};


// constructs LatLng with different signatures
// (LatLng) or ([Number, Number]) or (Number, Number) or (Object)

L.latLng = function (a, b) {
	if (a instanceof L.LatLng) {
		return a;
	}
	if (L.Util.isArray(a) && typeof a[0] !== 'object') {
		if (a.length === 3) {
			return new L.LatLng(a[0], a[1], a[2]);
		}
		return new L.LatLng(a[0], a[1]);
	}
	if (a === undefined || a === null) {
		return a;
	}
	if (typeof a === 'object' && 'lat' in a) {
		return new L.LatLng(a.lat, 'lng' in a ? a.lng : a.lon);
	}
	if (b === undefined) {
		return null;
	}
	return new L.LatLng(a, b);
};


/*
 * L.LatLngBounds represents a rectangular area on the map in geographical coordinates.
 */

L.LatLngBounds = function (southWest, northEast) { // (LatLng, LatLng) or (LatLng[])
	if (!southWest) { return; }

	var latlngs = northEast ? [southWest, northEast] : southWest;

	for (var i = 0, len = latlngs.length; i < len; i++) {
		this.extend(latlngs[i]);
	}
};

L.LatLngBounds.prototype = {

	// extend the bounds to contain the given point or bounds
	extend: function (obj) { // (LatLng) or (LatLngBounds)
		var sw = this._southWest,
			ne = this._northEast,
			sw2, ne2;

		if (obj instanceof L.LatLng) {
			sw2 = obj;
			ne2 = obj;

		} else if (obj instanceof L.LatLngBounds) {
			sw2 = obj._southWest;
			ne2 = obj._northEast;

			if (!sw2 || !ne2) { return this; }

		} else {
			return obj ? this.extend(L.latLng(obj) || L.latLngBounds(obj)) : this;
		}

		if (!sw && !ne) {
			this._southWest = new L.LatLng(sw2.lat, sw2.lng);
			this._northEast = new L.LatLng(ne2.lat, ne2.lng);
		} else {
			sw.lat = Math.min(sw2.lat, sw.lat);
			sw.lng = Math.min(sw2.lng, sw.lng);
			ne.lat = Math.max(ne2.lat, ne.lat);
			ne.lng = Math.max(ne2.lng, ne.lng);
		}

		return this;
	},

	// extend the bounds by a percentage
	pad: function (bufferRatio) { // (Number) -> LatLngBounds
		var sw = this._southWest,
		    ne = this._northEast,
		    heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio,
		    widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;

		return new L.LatLngBounds(
		        new L.LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
		        new L.LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
	},

	getCenter: function () { // -> LatLng
		return new L.LatLng(
		        (this._southWest.lat + this._northEast.lat) / 2,
		        (this._southWest.lng + this._northEast.lng) / 2);
	},

	getSouthWest: function () {
		return this._southWest;
	},

	getNorthEast: function () {
		return this._northEast;
	},

	getNorthWest: function () {
		return new L.LatLng(this.getNorth(), this.getWest());
	},

	getSouthEast: function () {
		return new L.LatLng(this.getSouth(), this.getEast());
	},

	getWest: function () {
		return this._southWest.lng;
	},

	getSouth: function () {
		return this._southWest.lat;
	},

	getEast: function () {
		return this._northEast.lng;
	},

	getNorth: function () {
		return this._northEast.lat;
	},

	contains: function (obj) { // (LatLngBounds) or (LatLng) -> Boolean
		if (typeof obj[0] === 'number' || obj instanceof L.LatLng) {
			obj = L.latLng(obj);
		} else {
			obj = L.latLngBounds(obj);
		}

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2, ne2;

		if (obj instanceof L.LatLngBounds) {
			sw2 = obj.getSouthWest();
			ne2 = obj.getNorthEast();
		} else {
			sw2 = ne2 = obj;
		}

		return (sw2.lat >= sw.lat) && (ne2.lat <= ne.lat) &&
		       (sw2.lng >= sw.lng) && (ne2.lng <= ne.lng);
	},

	intersects: function (bounds) { // (LatLngBounds)
		bounds = L.latLngBounds(bounds);

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2 = bounds.getSouthWest(),
		    ne2 = bounds.getNorthEast(),

		    latIntersects = (ne2.lat >= sw.lat) && (sw2.lat <= ne.lat),
		    lngIntersects = (ne2.lng >= sw.lng) && (sw2.lng <= ne.lng);

		return latIntersects && lngIntersects;
	},

	toBBoxString: function () {
		return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(',');
	},

	equals: function (bounds) { // (LatLngBounds)
		if (!bounds) { return false; }

		bounds = L.latLngBounds(bounds);

		return this._southWest.equals(bounds.getSouthWest()) &&
		       this._northEast.equals(bounds.getNorthEast());
	},

	isValid: function () {
		return !!(this._southWest && this._northEast);
	}
};

//TODO International date line?

L.latLngBounds = function (a, b) { // (LatLngBounds) or (LatLng, LatLng)
	if (!a || a instanceof L.LatLngBounds) {
		return a;
	}
	return new L.LatLngBounds(a, b);
};

/*
 * Simple equirectangular (Plate Carree) projection, used by CRS like EPSG:4326 and Simple.
 */

L.Projection = {};

L.Projection.LonLat = {
	project: function (latlng) {
		return new L.Point(latlng.lng, latlng.lat);
	},

	unproject: function (point) {
		return new L.LatLng(point.y, point.x);
	},

	bounds: L.bounds([-180, -90], [180, 90])
};

/*
 * Spherical Mercator is the most popular map projection, used by EPSG:3857 CRS used by default.
 */

L.Projection.SphericalMercator = {

	R: 6378137,

	project: function (latlng) {
		var d = Math.PI / 180,
		    max = 1 - 1E-15,
		    sin = Math.max(Math.min(Math.sin(latlng.lat * d), max), -max);

		return new L.Point(
				this.R * latlng.lng * d,
				this.R * Math.log((1 + sin) / (1 - sin)) / 2);
	},

	unproject: function (point) {
		var d = 180 / Math.PI;

		return new L.LatLng(
			(2 * Math.atan(Math.exp(point.y / this.R)) - (Math.PI / 2)) * d,
			point.x * d / this.R);
	},

	bounds: (function () {
		var d = 6378137 * Math.PI;
		return L.bounds([-d, -d], [d, d]);
	})()
};

/*
 * L.CRS is the base object for all defined CRS (Coordinate Reference Systems) in Leaflet.
 */

L.CRS = {
	// converts geo coords to pixel ones
	latLngToPoint: function (latlng, zoom) {
		var projectedPoint = this.projection.project(latlng),
		    scale = this.scale(zoom);

		return this.transformation._transform(projectedPoint, scale);
	},

	// converts pixel coords to geo coords
	pointToLatLng: function (point, zoom) {
		var scale = this.scale(zoom),
		    untransformedPoint = this.transformation.untransform(point, scale);

		return this.projection.unproject(untransformedPoint);
	},

	// converts geo coords to projection-specific coords (e.g. in meters)
	project: function (latlng) {
		return this.projection.project(latlng);
	},

	// converts projected coords to geo coords
	unproject: function (point) {
		return this.projection.unproject(point);
	},

	// defines how the world scales with zoom
	scale: function (zoom) {
		return 256 * Math.pow(2, zoom);
	},

	// returns the bounds of the world in projected coords if applicable
	getProjectedBounds: function (zoom) {
		if (this.infinite) { return null; }

		var b = this.projection.bounds,
		    s = this.scale(zoom),
		    min = this.transformation.transform(b.min, s),
		    max = this.transformation.transform(b.max, s);

		return L.bounds(min, max);
	},

	// whether a coordinate axis wraps in a given range (e.g. longitude from -180 to 180); depends on CRS
	// wrapLng: [min, max],
	// wrapLat: [min, max],

	// if true, the coordinate space will be unbounded (infinite in all directions)
	// infinite: false,

	// wraps geo coords in certain ranges if applicable
	wrapLatLng: function (latlng) {
		var lng = this.wrapLng ? L.Util.wrapNum(latlng.lng, this.wrapLng, true) : latlng.lng,
		    lat = this.wrapLat ? L.Util.wrapNum(latlng.lat, this.wrapLat, true) : latlng.lat;

		return L.latLng(lat, lng);
	}
};

/*
 * A simple CRS that can be used for flat non-Earth maps like panoramas or game maps.
 */

L.CRS.Simple = L.extend({}, L.CRS, {
	projection: L.Projection.LonLat,
	transformation: new L.Transformation(1, 0, -1, 0),

	scale: function (zoom) {
		return Math.pow(2, zoom);
	},

	distance: function (latlng1, latlng2) {
		var dx = latlng2.lng - latlng1.lng,
		    dy = latlng2.lat - latlng1.lat;

		return Math.sqrt(dx * dx + dy * dy);
	},

	infinite: true
});

/*
 * L.CRS.Earth is the base class for all CRS representing Earth.
 */

L.CRS.Earth = L.extend({}, L.CRS, {
	wrapLng: [-180, 180],

	R: 6378137,

	// distane between two geographical points using spherical law of cosines approximation
	distance: function (latlng1, latlng2) {
		var rad = Math.PI / 180,
		    lat1 = latlng1.lat * rad,
		    lat2 = latlng2.lat * rad;

		return this.R * Math.acos(Math.sin(lat1) * Math.sin(lat2) +
				Math.cos(lat1) * Math.cos(lat2) * Math.cos((latlng2.lng - latlng1.lng) * rad));
	}
});

/*
 * L.CRS.EPSG3857 (Spherical Mercator) is the most common CRS for web mapping and is used by Leaflet by default.
 */

L.CRS.EPSG3857 = L.extend({}, L.CRS.Earth, {
	code: 'EPSG:3857',
	projection: L.Projection.SphericalMercator,

	transformation: (function () {
		var scale = 0.5 / (Math.PI * L.Projection.SphericalMercator.R);
		return new L.Transformation(scale, 0.5, -scale, 0.5);
	}())
});

L.CRS.EPSG900913 = L.extend({}, L.CRS.EPSG3857, {
	code: 'EPSG:900913'
});

/*
 * L.CRS.EPSG4326 is a CRS popular among advanced GIS specialists.
 */

L.CRS.EPSG4326 = L.extend({}, L.CRS.Earth, {
	code: 'EPSG:4326',
	projection: L.Projection.LonLat,
	transformation: new L.Transformation(1 / 180, 1, -1 / 180, 0.5)
});

/*
 * L.Map is the central class of the API - it is used to create a map.
 */

L.Map = L.Evented.extend({

	options: {
		crs: L.CRS.EPSG3857,

		/*
		center: LatLng,
		zoom: Number,
		layers: Array,
		*/

		fadeAnimation: true,
		trackResize: true,
		markerZoomAnimation: true
	},

	initialize: function (id, options) { // (HTMLElement or String, Object)
		options = L.setOptions(this, options);

		this._initContainer(id);
		this._initLayout();

		// hack for https://github.com/Leaflet/Leaflet/issues/1980
		this._onResize = L.bind(this._onResize, this);

		this._initEvents();

		if (options.maxBounds) {
			this.setMaxBounds(options.maxBounds);
		}

		if (options.center && options.zoom !== undefined) {
			this.setView(L.latLng(options.center), options.zoom, {reset: true});
		}

		this._handlers = [];
		this._layers = {};
		this._zoomBoundLayers = {};

		this.callInitHooks();

		this._addLayers(this.options.layers);
	},


	// public methods that modify map state

	// replaced by animation-powered implementation in Map.PanAnimation.js
	setView: function (center, zoom) {
		zoom = zoom === undefined ? this.getZoom() : zoom;
		this._resetView(L.latLng(center), this._limitZoom(zoom));
		return this;
	},

	setZoom: function (zoom, options) {
		if (!this._loaded) {
			this._zoom = this._limitZoom(zoom);
			return this;
		}
		return this.setView(this.getCenter(), zoom, {zoom: options});
	},

	zoomIn: function (delta, options) {
		return this.setZoom(this._zoom + (delta || 1), options);
	},

	zoomOut: function (delta, options) {
		return this.setZoom(this._zoom - (delta || 1), options);
	},

	setZoomAround: function (latlng, zoom, options) {
		var scale = this.getZoomScale(zoom),
		    viewHalf = this.getSize().divideBy(2),
		    containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng),

		    centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale),
		    newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

		return this.setView(newCenter, zoom, {zoom: options});
	},

	fitBounds: function (bounds, options) {

		options = options || {};
		bounds = bounds.getBounds ? bounds.getBounds() : L.latLngBounds(bounds);

		var paddingTL = L.point(options.paddingTopLeft || options.padding || [0, 0]),
		    paddingBR = L.point(options.paddingBottomRight || options.padding || [0, 0]),

		    zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR));

		zoom = options.maxZoom ? Math.min(options.maxZoom, zoom) : zoom;

		var paddingOffset = paddingBR.subtract(paddingTL).divideBy(2),

		    swPoint = this.project(bounds.getSouthWest(), zoom),
		    nePoint = this.project(bounds.getNorthEast(), zoom),
		    center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);

		return this.setView(center, zoom, options);
	},

	fitWorld: function (options) {
		return this.fitBounds([[-90, -180], [90, 180]], options);
	},

	panTo: function (center, options) { // (LatLng)
		return this.setView(center, this._zoom, {pan: options});
	},

	panBy: function (offset) { // (Point)
		// replaced with animated panBy in Map.PanAnimation.js
		this.fire('movestart');

		this._rawPanBy(L.point(offset));

		this.fire('move');
		return this.fire('moveend');
	},

	setMaxBounds: function (bounds) {
		bounds = L.latLngBounds(bounds);

		this.options.maxBounds = bounds;

		if (!bounds) {
			return this.off('moveend', this._panInsideMaxBounds);
		}

		if (this._loaded) {
			this._panInsideMaxBounds();
		}

		return this.on('moveend', this._panInsideMaxBounds);
	},

	panInsideBounds: function (bounds, options) {
		var center = this.getCenter(),
			newCenter = this._limitCenter(center, this._zoom, bounds);

		if (center.equals(newCenter)) { return this; }

		return this.panTo(newCenter, options);
	},

	invalidateSize: function (options) {
		if (!this._loaded) { return this; }

		options = L.extend({
			animate: false,
			pan: true
		}, options === true ? {animate: true} : options);

		var oldSize = this.getSize();
		this._sizeChanged = true;
		this._initialCenter = null;

		var newSize = this.getSize(),
		    oldCenter = oldSize.divideBy(2).round(),
		    newCenter = newSize.divideBy(2).round(),
		    offset = oldCenter.subtract(newCenter);

		if (!offset.x && !offset.y) { return this; }

		if (options.animate && options.pan) {
			this.panBy(offset);

		} else {
			if (options.pan) {
				this._rawPanBy(offset);
			}

			this.fire('move');

			if (options.debounceMoveend) {
				clearTimeout(this._sizeTimer);
				this._sizeTimer = setTimeout(L.bind(this.fire, this, 'moveend'), 200);
			} else {
				this.fire('moveend');
			}
		}

		return this.fire('resize', {
			oldSize: oldSize,
			newSize: newSize
		});
	},

	// TODO handler.addTo
	addHandler: function (name, HandlerClass) {
		if (!HandlerClass) { return this; }

		var handler = this[name] = new HandlerClass(this);

		this._handlers.push(handler);

		if (this.options[name]) {
			handler.enable();
		}

		return this;
	},

	remove: function () {

		this._initEvents('off');

		try {
			// throws error in IE6-8
			delete this._container._leaflet;
		} catch (e) {
			this._container._leaflet = undefined;
		}

		L.DomUtil.remove(this._mapPane);

		if (this._clearControlPos) {
			this._clearControlPos();
		}

		this._clearHandlers();

		if (this._loaded) {
			this.fire('unload');
		}

		return this;
	},

	createPane: function (name, container) {
		var className = 'leaflet-pane' + (name ? ' leaflet-' + name.replace('Pane', '') + '-pane' : ''),
		    pane = L.DomUtil.create('div', className, container || this._mapPane);

		if (name) {
			this._panes[name] = pane;
		}
		return pane;
	},


	// public methods for getting map state

	getCenter: function () { // (Boolean) -> LatLng
		this._checkIfLoaded();

		if (this._initialCenter && !this._moved()) {
			return this._initialCenter;
		}
		return this.layerPointToLatLng(this._getCenterLayerPoint());
	},

	getZoom: function () {
		return this._zoom;
	},

	getBounds: function () {
		var bounds = this.getPixelBounds(),
		    sw = this.unproject(bounds.getBottomLeft()),
		    ne = this.unproject(bounds.getTopRight());

		return new L.LatLngBounds(sw, ne);
	},

	getMinZoom: function () {
		return this.options.minZoom === undefined ? this._layersMinZoom || 0 : this.options.minZoom;
	},

	getMaxZoom: function () {
		return this.options.maxZoom === undefined ?
			(this._layersMaxZoom === undefined ? Infinity : this._layersMaxZoom) :
			this.options.maxZoom;
	},

	getBoundsZoom: function (bounds, inside, padding) { // (LatLngBounds[, Boolean, Point]) -> Number
		bounds = L.latLngBounds(bounds);

		var zoom = this.getMinZoom() - (inside ? 1 : 0),
		    maxZoom = this.getMaxZoom(),
		    size = this.getSize(),

		    nw = bounds.getNorthWest(),
		    se = bounds.getSouthEast(),

		    zoomNotFound = true,
		    boundsSize;

		padding = L.point(padding || [0, 0]);

		do {
			zoom++;
			boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding);
			zoomNotFound = !inside ? size.contains(boundsSize) : boundsSize.x < size.x || boundsSize.y < size.y;

		} while (zoomNotFound && zoom <= maxZoom);

		if (zoomNotFound && inside) {
			return null;
		}

		return inside ? zoom : zoom - 1;
	},

	getSize: function () {
		if (!this._size || this._sizeChanged) {
			this._size = new L.Point(
				this._container.clientWidth,
				this._container.clientHeight);

			this._sizeChanged = false;
		}
		return this._size.clone();
	},

	getPixelBounds: function () {
		var topLeftPoint = this._getTopLeftPoint();
		return new L.Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
	},

	getPixelOrigin: function () {
		this._checkIfLoaded();
		return this._initialTopLeftPoint;
	},

	getPixelWorldBounds: function () {
		return this.options.crs.getProjectedBounds(this.getZoom());
	},

	getPane: function (pane) {
		return typeof pane === 'string' ? this._panes[pane] : pane;
	},

	getPanes: function () {
		return this._panes;
	},

	getContainer: function () {
		return this._container;
	},


	// TODO replace with universal implementation after refactoring projections

	getZoomScale: function (toZoom) {
		var crs = this.options.crs;
		return crs.scale(toZoom) / crs.scale(this._zoom);
	},

	getScaleZoom: function (scale) {
		return this._zoom + (Math.log(scale) / Math.LN2);
	},


	// conversion methods

	project: function (latlng, zoom) { // (LatLng[, Number]) -> Point
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.latLngToPoint(L.latLng(latlng), zoom);
	},

	unproject: function (point, zoom) { // (Point[, Number]) -> LatLng
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.pointToLatLng(L.point(point), zoom);
	},

	layerPointToLatLng: function (point) { // (Point)
		var projectedPoint = L.point(point).add(this.getPixelOrigin());
		return this.unproject(projectedPoint);
	},

	latLngToLayerPoint: function (latlng) { // (LatLng)
		var projectedPoint = this.project(L.latLng(latlng))._round();
		return projectedPoint._subtract(this.getPixelOrigin());
	},

	wrapLatLng: function (latlng) {
		return this.options.crs.wrapLatLng(L.latLng(latlng));
	},

	distance: function (latlng1, latlng2) {
		return this.options.crs.distance(L.latLng(latlng1), L.latLng(latlng2));
	},

	containerPointToLayerPoint: function (point) { // (Point)
		return L.point(point).subtract(this._getMapPanePos());
	},

	layerPointToContainerPoint: function (point) { // (Point)
		return L.point(point).add(this._getMapPanePos());
	},

	containerPointToLatLng: function (point) {
		var layerPoint = this.containerPointToLayerPoint(L.point(point));
		return this.layerPointToLatLng(layerPoint);
	},

	latLngToContainerPoint: function (latlng) {
		return this.layerPointToContainerPoint(this.latLngToLayerPoint(L.latLng(latlng)));
	},

	mouseEventToContainerPoint: function (e) { // (MouseEvent)
		return L.DomEvent.getMousePosition(e, this._container);
	},

	mouseEventToLayerPoint: function (e) { // (MouseEvent)
		return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
	},

	mouseEventToLatLng: function (e) { // (MouseEvent)
		return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
	},


	// map initialization methods

	_initContainer: function (id) {
		var container = this._container = L.DomUtil.get(id);

		if (!container) {
			throw new Error('Map container not found.');
		} else if (container._leaflet) {
			throw new Error('Map container is already initialized.');
		}

		container._leaflet = true;
	},

	_initLayout: function () {
		var container = this._container;

		this._fadeAnimated = this.options.fadeAnimation && L.Browser.any3d;

		L.DomUtil.addClass(container, 'leaflet-container' +
			(L.Browser.touch ? ' leaflet-touch' : '') +
			(L.Browser.retina ? ' leaflet-retina' : '') +
			(L.Browser.ielt9 ? ' leaflet-oldie' : '') +
			(L.Browser.safari ? ' leaflet-safari' : '') +
			(this._fadeAnimated ? ' leaflet-fade-anim' : ''));

		var position = L.DomUtil.getStyle(container, 'position');

		if (position !== 'absolute' && position !== 'relative' && position !== 'fixed') {
			container.style.position = 'relative';
		}

		this._initPanes();

		if (this._initControlPos) {
			this._initControlPos();
		}
	},

	_initPanes: function () {
		var panes = this._panes = {};

		this._mapPane = this.createPane('mapPane', this._container);

		this.createPane('tilePane');
		this.createPane('shadowPane');
		this.createPane('overlayPane');
		this.createPane('markerPane');
		this.createPane('popupPane');

		if (!this.options.markerZoomAnimation) {
			L.DomUtil.addClass(panes.markerPane, 'leaflet-zoom-hide');
			L.DomUtil.addClass(panes.shadowPane, 'leaflet-zoom-hide');
		}
	},


	// private methods that modify map state

	_resetView: function (center, zoom, preserveMapOffset, afterZoomAnim) {

		var zoomChanged = (this._zoom !== zoom);

		if (!afterZoomAnim) {
			this.fire('movestart');

			if (zoomChanged) {
				this.fire('zoomstart');
			}
		}

		this._zoom = zoom;
		this._initialCenter = center;

		this._initialTopLeftPoint = this._getNewTopLeftPoint(center);

		if (!preserveMapOffset) {
			L.DomUtil.setPosition(this._mapPane, new L.Point(0, 0));
		} else {
			this._initialTopLeftPoint._add(this._getMapPanePos());
		}

		var loading = !this._loaded;
		this._loaded = true;

		this.fire('viewreset', {hard: !preserveMapOffset});

		if (loading) {
			this.fire('load');
		}

		this.fire('move');

		if (zoomChanged || afterZoomAnim) {
			this.fire('zoomend');
		}

		this.fire('moveend', {hard: !preserveMapOffset});
	},

	_rawPanBy: function (offset) {
		L.DomUtil.setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
	},

	_getZoomSpan: function () {
		return this.getMaxZoom() - this.getMinZoom();
	},

	_panInsideMaxBounds: function () {
		this.panInsideBounds(this.options.maxBounds);
	},

	_checkIfLoaded: function () {
		if (!this._loaded) {
			throw new Error('Set map center and zoom first.');
		}
	},

	// map events

	_initEvents: function (onOff) {
		if (!L.DomEvent) { return; }

		onOff = onOff || 'on';

		L.DomEvent[onOff](this._container,
			'click dblclick mousedown mouseup mouseenter mouseleave mousemove contextmenu',
			this._handleMouseEvent, this);

		if (this.options.trackResize) {
			L.DomEvent[onOff](window, 'resize', this._onResize, this);
		}
	},

	_onResize: function () {
		L.Util.cancelAnimFrame(this._resizeRequest);
		this._resizeRequest = L.Util.requestAnimFrame(
		        function () { this.invalidateSize({debounceMoveend: true}); }, this, false, this._container);
	},

	_handleMouseEvent: function (e) {
		if (!this._loaded) { return; }

		this._fireMouseEvent(this, e,
				e.type === 'mouseenter' ? 'mouseover' :
				e.type === 'mouseleave' ? 'mouseout' : e.type);
	},

	_fireMouseEvent: function (obj, e, type, propagate, latlng) {
		type = type || e.type;

		if (L.DomEvent._skipped(e)) { return; }

		if (type === 'click') {
			if (!e._simulated && ((this.dragging && this.dragging.moved()) ||
			                      (this.boxZoom && this.boxZoom.moved()))) { return; }
			obj.fire('preclick');
		}

		if (!obj.listens(type, propagate)) { return; }

		if (type === 'contextmenu') {
			L.DomEvent.preventDefault(e);
		}
		if (type === 'click' || type === 'dblclick' || type === 'contextmenu') {
			L.DomEvent.stopPropagation(e);
		}

		var data = {
			originalEvent: e,
			containerPoint: this.mouseEventToContainerPoint(e)
		};

		data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
		data.latlng = latlng || this.layerPointToLatLng(data.layerPoint);

		obj.fire(type, data, propagate);
	},

	_clearHandlers: function () {
		for (var i = 0, len = this._handlers.length; i < len; i++) {
			this._handlers[i].disable();
		}
	},

	whenReady: function (callback, context) {
		if (this._loaded) {
			callback.call(context || this, {target: this});
		} else {
			this.on('load', callback, context);
		}
		return this;
	},


	// private methods for getting map state

	_getMapPanePos: function () {
		return L.DomUtil.getPosition(this._mapPane);
	},

	_moved: function () {
		var pos = this._getMapPanePos();
		return pos && !pos.equals([0, 0]);
	},

	_getTopLeftPoint: function () {
		return this.getPixelOrigin().subtract(this._getMapPanePos());
	},

	_getNewTopLeftPoint: function (center, zoom) {
		var viewHalf = this.getSize()._divideBy(2);
		// TODO round on display, not calculation to increase precision?
		return this.project(center, zoom)._subtract(viewHalf)._round();
	},

	_latLngToNewLayerPoint: function (latlng, newZoom, newCenter) {
		var topLeft = this._getNewTopLeftPoint(newCenter, newZoom).add(this._getMapPanePos());
		return this.project(latlng, newZoom)._subtract(topLeft);
	},

	// layer point of the current center
	_getCenterLayerPoint: function () {
		return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
	},

	// offset of the specified place to the current center in pixels
	_getCenterOffset: function (latlng) {
		return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
	},

	// adjust center for view to get inside bounds
	_limitCenter: function (center, zoom, bounds) {

		if (!bounds) { return center; }

		var centerPoint = this.project(center, zoom),
		    viewHalf = this.getSize().divideBy(2),
		    viewBounds = new L.Bounds(centerPoint.subtract(viewHalf), centerPoint.add(viewHalf)),
		    offset = this._getBoundsOffset(viewBounds, bounds, zoom);

		return this.unproject(centerPoint.add(offset), zoom);
	},

	// adjust offset for view to get inside bounds
	_limitOffset: function (offset, bounds) {
		if (!bounds) { return offset; }

		var viewBounds = this.getPixelBounds(),
		    newBounds = new L.Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));

		return offset.add(this._getBoundsOffset(newBounds, bounds));
	},

	// returns offset needed for pxBounds to get inside maxBounds at a specified zoom
	_getBoundsOffset: function (pxBounds, maxBounds, zoom) {
		var nwOffset = this.project(maxBounds.getNorthWest(), zoom).subtract(pxBounds.min),
		    seOffset = this.project(maxBounds.getSouthEast(), zoom).subtract(pxBounds.max),

		    dx = this._rebound(nwOffset.x, -seOffset.x),
		    dy = this._rebound(nwOffset.y, -seOffset.y);

		return new L.Point(dx, dy);
	},

	_rebound: function (left, right) {
		return left + right > 0 ?
			Math.round(left - right) / 2 :
			Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
	},

	_limitZoom: function (zoom) {
		var min = this.getMinZoom(),
		    max = this.getMaxZoom();

		return Math.max(min, Math.min(max, zoom));
	}
});

L.map = function (id, options) {
	return new L.Map(id, options);
};


L.Layer = L.Evented.extend({

	options: {
		pane: 'overlayPane'
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	remove: function () {
		return this.removeFrom(this._map || this._mapToAdd);
	},

	removeFrom: function (obj) {
		if (obj) {
			obj.removeLayer(this);
		}
		return this;
	},

	getPane: function (name) {
		return this._map.getPane(name ? (this.options[name] || name) : this.options.pane);
	},

	_layerAdd: function (e) {
		var map = e.target;

		// check in case layer gets added and then removed before the map is ready
		if (!map.hasLayer(this)) { return; }

		this._map = map;
		this._zoomAnimated = map._zoomAnimated;

		this.onAdd(map);

		if (this.getAttribution && this._map.attributionControl) {
			this._map.attributionControl.addAttribution(this.getAttribution());
		}

		if (this.getEvents) {
			map.on(this.getEvents(), this);
		}

		this.fire('add');
		map.fire('layeradd', {layer: this});
	}
});


L.Map.include({
	addLayer: function (layer) {
		var id = L.stamp(layer);
		if (this._layers[id]) { return layer; }
		this._layers[id] = layer;

		layer._mapToAdd = this;

		if (layer.beforeAdd) {
			layer.beforeAdd(this);
		}

		this.whenReady(layer._layerAdd, layer);

		return this;
	},

	removeLayer: function (layer) {
		var id = L.stamp(layer);

		if (!this._layers[id]) { return this; }

		if (this._loaded) {
			layer.onRemove(this);
		}

		if (layer.getAttribution && this.attributionControl) {
			this.attributionControl.removeAttribution(layer.getAttribution());
		}

		if (layer.getEvents) {
			this.off(layer.getEvents(), layer);
		}

		delete this._layers[id];

		if (this._loaded) {
			this.fire('layerremove', {layer: layer});
			layer.fire('remove');
		}

		layer._map = layer._mapToAdd = null;

		return this;
	},

	hasLayer: function (layer) {
		return !!layer && (L.stamp(layer) in this._layers);
	},

	eachLayer: function (method, context) {
		for (var i in this._layers) {
			method.call(context, this._layers[i]);
		}
		return this;
	},

	_addLayers: function (layers) {
		layers = layers ? (L.Util.isArray(layers) ? layers : [layers]) : [];

		for (var i = 0, len = layers.length; i < len; i++) {
			this.addLayer(layers[i]);
		}
	},

	_addZoomLimit: function (layer) {
		if (isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom)) {
			this._zoomBoundLayers[L.stamp(layer)] = layer;
			this._updateZoomLevels();
		}
	},

	_removeZoomLimit: function (layer) {
		var id = L.stamp(layer);

		if (this._zoomBoundLayers[id]) {
			delete this._zoomBoundLayers[id];
			this._updateZoomLevels();
		}
	},

	_updateZoomLevels: function () {
		var minZoom = Infinity,
			maxZoom = -Infinity,
			oldZoomSpan = this._getZoomSpan();

		for (var i in this._zoomBoundLayers) {
			var options = this._zoomBoundLayers[i].options;

			minZoom = options.minZoom === undefined ? minZoom : Math.min(minZoom, options.minZoom);
			maxZoom = options.maxZoom === undefined ? maxZoom : Math.max(maxZoom, options.maxZoom);
		}

		this._layersMaxZoom = maxZoom === -Infinity ? undefined : maxZoom;
		this._layersMinZoom = minZoom === Infinity ? undefined : minZoom;

		if (oldZoomSpan !== this._getZoomSpan()) {
			this.fire('zoomlevelschange');
		}
	}
});

/*
 * Mercator projection that takes into account that the Earth is not a perfect sphere.
 * Less popular than spherical mercator; used by projections like EPSG:3395.
 */

L.Projection.Mercator = {
	R: 6378137,
	R_MINOR: 6356752.314245179,

	bounds: L.bounds([-20037508.34279, -15496570.73972], [20037508.34279, 18764656.23138]),

	project: function (latlng) {
		var d = Math.PI / 180,
		    r = this.R,
		    y = latlng.lat * d,
		    tmp = this.R_MINOR / r,
		    e = Math.sqrt(1 - tmp * tmp),
		    con = e * Math.sin(y);

		var ts = Math.tan(Math.PI / 4 - y / 2) / Math.pow((1 - con) / (1 + con), e / 2);
		y = -r * Math.log(Math.max(ts, 1E-10));

		return new L.Point(latlng.lng * d * r, y);
	},

	unproject: function (point) {
		var d = 180 / Math.PI,
		    r = this.R,
		    tmp = this.R_MINOR / r,
		    e = Math.sqrt(1 - tmp * tmp),
		    ts = Math.exp(-point.y / r),
		    phi = Math.PI / 2 - 2 * Math.atan(ts);

		for (var i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
			con = e * Math.sin(phi);
			con = Math.pow((1 - con) / (1 + con), e / 2);
			dphi = Math.PI / 2 - 2 * Math.atan(ts * con) - phi;
			phi += dphi;
		}

		return new L.LatLng(phi * d, point.x * d / r);
	}
};

/*
 * L.CRS.EPSG3857 (World Mercator) CRS implementation.
 */

L.CRS.EPSG3395 = L.extend({}, L.CRS.Earth, {
	code: 'EPSG:3395',
	projection: L.Projection.Mercator,

	transformation: (function () {
		var scale = 0.5 / (Math.PI * L.Projection.Mercator.R);
		return new L.Transformation(scale, 0.5, -scale, 0.5);
	}())
});

/*
 * L.GridLayer is used as base class for grid-like layers like TileLayer.
 */

L.GridLayer = L.Layer.extend({

	options: {
		pane: 'tilePane',

		tileSize: 256,
		opacity: 1,

		unloadInvisibleTiles: L.Browser.mobile,
		updateWhenIdle: L.Browser.mobile,
		updateInterval: 150

		/*
		minZoom: <Number>,
		maxZoom: <Number>,
		attribution: <String>,
		zIndex: <Number>,
		bounds: <LatLngBounds>
		*/
	},

	initialize: function (options) {
		options = L.setOptions(this, options);
	},

	onAdd: function () {
		this._initContainer();

		if (!this.options.updateWhenIdle) {
			// update tiles on move, but not more often than once per given interval
			this._update = L.Util.throttle(this._update, this.options.updateInterval, this);
		}

		this._reset();
		this._update();
	},

	beforeAdd: function (map) {
		map._addZoomLimit(this);
	},

	onRemove: function (map) {
		this._clearBgBuffer();
		L.DomUtil.remove(this._container);

		map._removeZoomLimit(this);

		this._container = null;
	},

	bringToFront: function () {
		if (this._map) {
			L.DomUtil.toFront(this._container);
			this._setAutoZIndex(Math.max);
		}
		return this;
	},

	bringToBack: function () {
		if (this._map) {
			L.DomUtil.toBack(this._container);
			this._setAutoZIndex(Math.min);
		}
		return this;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	getContainer: function () {
		return this._container;
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;

		if (this._map) {
			this._updateOpacity();
		}
		return this;
	},

	setZIndex: function (zIndex) {
		this.options.zIndex = zIndex;
		this._updateZIndex();

		return this;
	},

	redraw: function () {
		if (this._map) {
			this._reset({hard: true});
			this._update();
		}
		return this;
	},

	getEvents: function () {
		var events = {
			viewreset: this._reset,
			moveend: this._update
		};

		if (!this.options.updateWhenIdle) {
			events.move = this._update;
		}

		if (this._zoomAnimated) {
			events.zoomstart = this._startZoomAnim;
			events.zoomanim = this._animateZoom;
			events.zoomend = this._endZoomAnim;
		}

		return events;
	},

	_updateZIndex: function () {
		if (this._container && this.options.zIndex !== undefined) {
			this._container.style.zIndex = this.options.zIndex;
		}
	},

	_setAutoZIndex: function (compare) {
		// go through all other layers of the same pane, set zIndex to max + 1 (front) or min - 1 (back)

		var layers = this.getPane().children,
		    edgeZIndex = -compare(-Infinity, Infinity); // -Infinity for max, Infinity for min

		for (var i = 0, len = layers.length, zIndex; i < len; i++) {

			zIndex = layers[i].style.zIndex;

			if (layers[i] !== this._container && zIndex) {
				edgeZIndex = compare(edgeZIndex, +zIndex);
			}
		}

		if (isFinite(edgeZIndex)) {
			this.options.zIndex = edgeZIndex + compare(-1, 1);
			this._updateZIndex();
		}
	},

	_updateOpacity: function () {
		var opacity = this.options.opacity;

		if (L.Browser.ielt9) {
			// IE doesn't inherit filter opacity properly, so we're forced to set it on tiles
			for (var i in this._tiles) {
				L.DomUtil.setOpacity(this._tiles[i], opacity);
			}
		} else {
			L.DomUtil.setOpacity(this._container, opacity);
		}
	},

	_initContainer: function () {
		if (this._container) { return; }

		this._container = L.DomUtil.create('div', 'leaflet-layer');
		this._updateZIndex();

		if (this._zoomAnimated) {
			var className = 'leaflet-tile-container leaflet-zoom-animated';

			this._bgBuffer = L.DomUtil.create('div', className, this._container);
			this._tileContainer = L.DomUtil.create('div', className, this._container);

			L.DomUtil.setTransform(this._tileContainer);

		} else {
			this._tileContainer = this._container;
		}

		if (this.options.opacity < 1) {
			this._updateOpacity();
		}

		this.getPane().appendChild(this._container);
	},

	_reset: function (e) {
		for (var key in this._tiles) {
			this.fire('tileunload', {
				tile: this._tiles[key]
			});
		}

		this._tiles = {};
		this._tilesToLoad = 0;
		this._tilesTotal = 0;

		this._tileContainer.innerHTML = '';

		if (this._zoomAnimated && e && e.hard) {
			this._clearBgBuffer();
		}

		this._tileNumBounds = this._getTileNumBounds();
		this._resetWrap();
	},

	_resetWrap: function () {
		var map = this._map,
		    crs = map.options.crs;

		if (crs.infinite) { return; }

		var tileSize = this._getTileSize();

		if (crs.wrapLng) {
			this._wrapLng = [
				Math.floor(map.project([0, crs.wrapLng[0]]).x / tileSize),
				Math.ceil(map.project([0, crs.wrapLng[1]]).x / tileSize)
			];
		}

		if (crs.wrapLat) {
			this._wrapLat = [
				Math.floor(map.project([crs.wrapLat[0], 0]).y / tileSize),
				Math.ceil(map.project([crs.wrapLat[1], 0]).y / tileSize)
			];
		}
	},

	_getTileSize: function () {
		return this.options.tileSize;
	},

	_update: function () {

		if (!this._map) { return; }

		var bounds = this._map.getPixelBounds(),
		    zoom = this._map.getZoom(),
		    tileSize = this._getTileSize();

		if (zoom > this.options.maxZoom ||
		    zoom < this.options.minZoom) { return; }

		// tile coordinates range for the current view
		var tileBounds = L.bounds(
			bounds.min.divideBy(tileSize).floor(),
			bounds.max.divideBy(tileSize).floor());

		this._addTiles(tileBounds);

		if (this.options.unloadInvisibleTiles) {
			this._removeOtherTiles(tileBounds);
		}
	},

	_addTiles: function (bounds) {
		var queue = [],
		    center = bounds.getCenter(),
		    zoom = this._map.getZoom();

		var j, i, coords;

		// create a queue of coordinates to load tiles from
		for (j = bounds.min.y; j <= bounds.max.y; j++) {
			for (i = bounds.min.x; i <= bounds.max.x; i++) {

				coords = new L.Point(i, j);
				coords.z = zoom;

				// add tile to queue if it's not in cache or out of bounds
				if (!(this._tileCoordsToKey(coords) in this._tiles) && this._isValidTile(coords)) {
					queue.push(coords);
				}
			}
		}

		var tilesToLoad = queue.length;

		if (tilesToLoad === 0) { return; }

		// if its the first batch of tiles to load
		if (!this._tilesToLoad) {
			this.fire('loading');
		}

		this._tilesToLoad += tilesToLoad;
		this._tilesTotal += tilesToLoad;

		// sort tile queue to load tiles in order of their distance to center
		queue.sort(function (a, b) {
			return a.distanceTo(center) - b.distanceTo(center);
		});

		// create DOM fragment to append tiles in one batch
		var fragment = document.createDocumentFragment();

		for (i = 0; i < tilesToLoad; i++) {
			this._addTile(queue[i], fragment);
		}

		this._tileContainer.appendChild(fragment);
	},

	_isValidTile: function (coords) {
		var crs = this._map.options.crs;

		if (!crs.infinite) {
			// don't load tile if it's out of bounds and not wrapped
			var bounds = this._tileNumBounds;
			if ((!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x)) ||
			    (!crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y))) { return false; }
		}

		if (!this.options.bounds) { return true; }

		// don't load tile if it doesn't intersect the bounds in options
		var tileBounds = this._tileCoordsToBounds(coords);
		return L.latLngBounds(this.options.bounds).intersects(tileBounds);
	},

	// converts tile coordinates to its geographical bounds
	_tileCoordsToBounds: function (coords) {

		var map = this._map,
		    tileSize = this.options.tileSize,

		    nwPoint = coords.multiplyBy(tileSize),
		    sePoint = nwPoint.add([tileSize, tileSize]),

		    nw = map.wrapLatLng(map.unproject(nwPoint, coords.z)),
		    se = map.wrapLatLng(map.unproject(sePoint, coords.z));

		return new L.LatLngBounds(nw, se);
	},

	// converts tile coordinates to key for the tile cache
	_tileCoordsToKey: function (coords) {
		return coords.x + ':' + coords.y;
	},

	// converts tile cache key to coordiantes
	_keyToTileCoords: function (key) {
		var kArr = key.split(':'),
		    x = parseInt(kArr[0], 10),
		    y = parseInt(kArr[1], 10);

		return new L.Point(x, y);
	},

	// remove any present tiles that are off the specified bounds
	_removeOtherTiles: function (bounds) {
		for (var key in this._tiles) {
			if (!bounds.contains(this._keyToTileCoords(key))) {
				this._removeTile(key);
			}
		}
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];

		L.DomUtil.remove(tile);

		delete this._tiles[key];

		this.fire('tileunload', {tile: tile});
	},

	_initTile: function (tile) {
		var size = this._getTileSize();

		L.DomUtil.addClass(tile, 'leaflet-tile');

		tile.style.width = size + 'px';
		tile.style.height = size + 'px';

		tile.onselectstart = L.Util.falseFn;
		tile.onmousemove = L.Util.falseFn;

		// update opacity on tiles in IE7-8 because of filter inheritance problems
		if (L.Browser.ielt9 && this.options.opacity < 1) {
			L.DomUtil.setOpacity(tile, this.options.opacity);
		}

		// without this hack, tiles disappear after zoom on Chrome for Android
		// https://github.com/Leaflet/Leaflet/issues/2078
		if (L.Browser.android && !L.Browser.android23) {
			tile.style.WebkitBackfaceVisibility = 'hidden';
		}
	},

	_addTile: function (coords, container) {
		var tilePos = this._getTilePos(coords);

		// wrap tile coords if necessary (depending on CRS)
		this._wrapCoords(coords);

		var tile = this.createTile(coords, L.bind(this._tileReady, this));

		this._initTile(tile);

		// if createTile is defined with a second argument ("done" callback),
		// we know that tile is async and will be ready later; otherwise
		if (this.createTile.length < 2) {
			// mark tile as ready, but delay one frame for opacity animation to happen
			setTimeout(L.bind(this._tileReady, this, null, tile), 0);
		}

		// we prefer top/left over translate3d so that we don't create a HW-accelerated layer from each tile
		// which is slow, and it also fixes gaps between tiles in Safari
		L.DomUtil.setPosition(tile, tilePos, true);

		// save tile in cache
		this._tiles[this._tileCoordsToKey(coords)] = tile;

		container.appendChild(tile);
		this.fire('tileloadstart', {tile: tile});
	},

	_tileReady: function (err, tile) {
		if (err) {
			this.fire('tileerror', {
				error: err,
				tile: tile
			});
		}

		L.DomUtil.addClass(tile, 'leaflet-tile-loaded');

		this.fire('tileload', {tile: tile});

		this._tilesToLoad--;

		if (this._tilesToLoad === 0) {
			this._visibleTilesReady();
		}
	},

	_visibleTilesReady: function () {
		this.fire('load');

		if (this._zoomAnimated) {
			// clear scaled tiles after all new tiles are loaded (for performance)
			clearTimeout(this._clearBgBufferTimer);
			this._clearBgBufferTimer = setTimeout(L.bind(this._clearBgBuffer, this), 300);
		}
	},

	_getTilePos: function (coords) {
		return coords
				.multiplyBy(this._getTileSize())
				.subtract(this._map.getPixelOrigin());
	},

	_wrapCoords: function (coords) {
		coords.x = this._wrapLng ? L.Util.wrapNum(coords.x, this._wrapLng) : coords.x;
		coords.y = this._wrapLat ? L.Util.wrapNum(coords.y, this._wrapLat) : coords.y;
	},

	// get the global tile coordinates range for the current zoom
	_getTileNumBounds: function () {
		var bounds = this._map.getPixelWorldBounds(),
			size = this._getTileSize();

		return bounds ? L.bounds(
				bounds.min.divideBy(size).floor(),
				bounds.max.divideBy(size).ceil().subtract([1, 1])) : null;
	},

	_startZoomAnim: function () {
		this._prepareBgBuffer();
		this._prevTranslate = this._translate || new L.Point(0, 0);
		this._prevScale = this._scale;
	},

	_animateZoom: function (e) {
		// avoid stacking transforms by calculating cumulating translate/scale sequence
		this._translate = this._prevTranslate.multiplyBy(e.scale).add(e.origin.multiplyBy(1 - e.scale));
		this._scale = this._prevScale * e.scale;

		L.DomUtil.setTransform(this._bgBuffer, this._translate, this._scale);
	},

	_endZoomAnim: function () {
		var front = this._tileContainer;
		front.style.visibility = '';
		L.DomUtil.toFront(front); // bring to front
	},

	_clearBgBuffer: function () {
		var map = this._map,
			bg = this._bgBuffer;

		if (map && !map._animatingZoom && !map.touchZoom._zooming && bg) {
			bg.innerHTML = '';
			L.DomUtil.setTransform(bg);
		}
	},

	_prepareBgBuffer: function () {

		var front = this._tileContainer,
		    bg = this._bgBuffer;

		if (this._abortLoading) {
			this._abortLoading();
		}

		if (this._tilesToLoad / this._tilesTotal > 0.5) {
			// if foreground layer doesn't have many tiles loaded,
			// keep the existing bg layer and just zoom it some more
			front.style.visibility = 'hidden';
			return;
		}

		// prepare the buffer to become the front tile pane
		bg.style.visibility = 'hidden';
		L.DomUtil.setTransform(bg);

		// switch out the current layer to be the new bg layer (and vice-versa)
		this._tileContainer = bg;
		this._bgBuffer = front;

		// reset bg layer transform info
		this._translate = new L.Point(0, 0);
		this._scale = 1;

		// prevent bg buffer from clearing right after zoom
		clearTimeout(this._clearBgBufferTimer);
	}
});

L.gridLayer = function (options) {
	return new L.GridLayer(options);
};

/*
 * L.TileLayer is used for standard xyz-numbered tile layers.
 */

L.TileLayer = L.GridLayer.extend({

	options: {
		minZoom: 0,
		maxZoom: 18,

		subdomains: 'abc',
		// errorTileUrl: '',
		zoomOffset: 0

		/*
		maxNativeZoom: <Number>,
		tms: <Boolean>,
		zoomReverse: <Number>,
		detectRetina: <Number>,
		*/
	},

	initialize: function (url, options) {

		this._url = url;

		options = L.setOptions(this, options);

		// detecting retina displays, adjusting tileSize and zoom levels
		if (options.detectRetina && L.Browser.retina && options.maxZoom > 0) {

			options.tileSize = Math.floor(options.tileSize / 2);
			options.zoomOffset++;

			options.minZoom = Math.max(0, options.minZoom);
			options.maxZoom--;
		}

		if (typeof options.subdomains === 'string') {
			options.subdomains = options.subdomains.split('');
		}
	},

	setUrl: function (url, noRedraw) {
		this._url = url;

		if (!noRedraw) {
			this.redraw();
		}
		return this;
	},

	createTile: function (coords, done) {
		var tile = document.createElement('img');

		tile.onload = L.bind(this._tileOnLoad, this, done, tile);
		tile.onerror = L.bind(this._tileOnError, this, done, tile);

		/*
		 Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
		 http://www.w3.org/TR/WCAG20-TECHS/H67
		*/
		tile.alt = '';

		tile.src = this.getTileUrl(coords);

		return tile;
	},

	getTileUrl: function (coords) {
		return L.Util.template(this._url, L.extend({
			r: this.options.detectRetina && L.Browser.retina && this.options.maxZoom > 0 ? '@2x' : '',
			s: this._getSubdomain(coords),
			x: coords.x,
			y: this.options.tms ? this._tileNumBounds.max.y - coords.y : coords.y,
			z: this._getZoomForUrl()
		}, this.options));
	},

	_tileOnLoad: function (done, tile) {
		done(null, tile);
	},

	_tileOnError: function (done, tile, e) {
		var errorUrl = this.options.errorTileUrl;
		if (errorUrl) {
			tile.src = errorUrl;
		}
		done(e, tile);
	},

	_getTileSize: function () {
		var map = this._map,
		    options = this.options,
		    zoom = map.getZoom() + options.zoomOffset,
		    zoomN = options.maxNativeZoom;

		// increase tile size when overscaling
		return zoomN && zoom > zoomN ?
				Math.round(map.getZoomScale(zoom) / map.getZoomScale(zoomN) * options.tileSize) :
				options.tileSize;
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];

		L.GridLayer.prototype._removeTile.call(this, key);

		// for https://github.com/Leaflet/Leaflet/issues/137
		if (!L.Browser.android) {
			tile.onload = null;
			tile.src = L.Util.emptyImageUrl;
		}
	},

	_getZoomForUrl: function () {

		var options = this.options,
		    zoom = this._map.getZoom();

		if (options.zoomReverse) {
			zoom = options.maxZoom - zoom;
		}

		zoom += options.zoomOffset;

		return options.maxNativeZoom ? Math.min(zoom, options.maxNativeZoom) : zoom;
	},

	_getSubdomain: function (tilePoint) {
		var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
		return this.options.subdomains[index];
	},

	// stops loading all tiles in the background layer
	_abortLoading: function () {
		var i, tile;
		for (i in this._tiles) {
			tile = this._tiles[i];

			if (!tile.complete) {
				tile.onload = L.Util.falseFn;
				tile.onerror = L.Util.falseFn;
				tile.src = L.Util.emptyImageUrl;

				L.DomUtil.remove(tile);
			}
		}
	}
});

L.tileLayer = function (url, options) {
	return new L.TileLayer(url, options);
};

/*
 * L.TileLayer.WMS is used for WMS tile layers.
 */

L.TileLayer.WMS = L.TileLayer.extend({

	defaultWmsParams: {
		service: 'WMS',
		request: 'GetMap',
		version: '1.1.1',
		layers: '',
		styles: '',
		format: 'image/jpeg',
		transparent: false
	},

	initialize: function (url, options) {

		this._url = url;

		var wmsParams = L.extend({}, this.defaultWmsParams);

		// all keys that are not TileLayer options go to WMS params
		for (var i in options) {
			if (!this.options.hasOwnProperty(i) && i !== 'crs') {
				wmsParams[i] = options[i];
			}
		}

		options = L.setOptions(this, options);

		wmsParams.width = wmsParams.height =
				options.tileSize * (options.detectRetina && L.Browser.retina ? 2 : 1);

		this.wmsParams = wmsParams;
	},

	onAdd: function (map) {

		this._crs = this.options.crs || map.options.crs;

		this._wmsVersion = parseFloat(this.wmsParams.version);

		var projectionKey = this._wmsVersion >= 1.3 ? 'crs' : 'srs';
		this.wmsParams[projectionKey] = this._crs.code;

		L.TileLayer.prototype.onAdd.call(this, map);
	},

	getTileUrl: function (coords) {

		var tileBounds = this._tileCoordsToBounds(coords),
		    nw = this._crs.project(tileBounds.getNorthWest()),
		    se = this._crs.project(tileBounds.getSouthEast()),

		    bbox = (this._wmsVersion >= 1.3 && this._crs === L.CRS.EPSG4326 ?
			    [se.y, nw.x, nw.y, se.x] :
			    [nw.x, se.y, se.x, nw.y]).join(','),

		    url = L.Util.template(this._url, {s: this._getSubdomain(coords)});

		return url + L.Util.getParamString(this.wmsParams, url, true) + '&BBOX=' + bbox;
	},

	setParams: function (params, noRedraw) {

		L.extend(this.wmsParams, params);

		if (!noRedraw) {
			this.redraw();
		}

		return this;
	}
});

L.tileLayer.wms = function (url, options) {
	return new L.TileLayer.WMS(url, options);
};

/*
 * L.ImageOverlay is used to overlay images over the map (to specific geographical bounds).
 */

L.ImageOverlay = L.Layer.extend({

	options: {
		opacity: 1
	},

	initialize: function (url, bounds, options) { // (String, LatLngBounds, Object)
		this._url = url;
		this._bounds = L.latLngBounds(bounds);

		L.setOptions(this, options);
	},

	onAdd: function () {
		if (!this._image) {
			this._initImage();

			if (this.options.opacity < 1) {
				this._updateOpacity();
			}
		}

		this.getPane().appendChild(this._image);

		this._reset();
	},

	onRemove: function () {
		L.DomUtil.remove(this._image);
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;

		if (this._image) {
			this._updateOpacity();
		}
		return this;
	},

	bringToFront: function () {
		if (this._map) {
			L.DomUtil.toFront(this._image);
		}
		return this;
	},

	bringToBack: function () {
		if (this._map) {
			L.DomUtil.toBack(this._image);
		}
		return this;
	},

	setUrl: function (url) {
		this._url = url;

		if (this._image) {
			this._image.src = url;
		}
		return this;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	getEvents: function () {
		var events = {
			viewreset: this._reset
		};

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}

		return events;
	},

	_initImage: function () {
		var img = this._image = L.DomUtil.create('img',
				'leaflet-image-layer ' + (this._zoomAnimated ? 'leaflet-zoom-animated' : ''));

		img.onselectstart = L.Util.falseFn;
		img.onmousemove = L.Util.falseFn;

		img.onload = L.bind(this.fire, this, 'load');
		img.src = this._url;
	},

	_animateZoom: function (e) {
		var topLeft = this._map._latLngToNewLayerPoint(this._bounds.getNorthWest(), e.zoom, e.center),
		    size = this._map._latLngToNewLayerPoint(this._bounds.getSouthEast(), e.zoom, e.center).subtract(topLeft),
		    offset = topLeft.add(size._multiplyBy((1 - 1 / e.scale) / 2));

		L.DomUtil.setTransform(this._image, offset, e.scale);
	},

	_reset: function () {
		var image = this._image,
		    bounds = new L.Bounds(
		        this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
		        this._map.latLngToLayerPoint(this._bounds.getSouthEast())),
		    size = bounds.getSize();

		L.DomUtil.setPosition(image, bounds.min);

		image.style.width  = size.x + 'px';
		image.style.height = size.y + 'px';
	},

	_updateOpacity: function () {
		L.DomUtil.setOpacity(this._image, this.options.opacity);
	}
});

L.imageOverlay = function (url, bounds, options) {
	return new L.ImageOverlay(url, bounds, options);
};

/*
 * L.Icon is an image-based icon class that you can use with L.Marker for custom markers.
 */

L.Icon = L.Class.extend({
	/*
	options: {
		iconUrl: (String) (required)
		iconRetinaUrl: (String) (optional, used for retina devices if detected)
		iconSize: (Point) (can be set through CSS)
		iconAnchor: (Point) (centered by default, can be set in CSS with negative margins)
		popupAnchor: (Point) (if not specified, popup opens in the anchor point)
		shadowUrl: (String) (no shadow by default)
		shadowRetinaUrl: (String) (optional, used for retina devices if detected)
		shadowSize: (Point)
		shadowAnchor: (Point)
		className: (String)
	},
	*/

	initialize: function (options) {
		L.setOptions(this, options);
	},

	createIcon: function (oldIcon) {
		return this._createIcon('icon', oldIcon);
	},

	createShadow: function (oldIcon) {
		return this._createIcon('shadow', oldIcon);
	},

	_createIcon: function (name, oldIcon) {
		var src = this._getIconUrl(name);

		if (!src) {
			if (name === 'icon') {
				throw new Error('iconUrl not set in Icon options (see the docs).');
			}
			return null;
		}

		var img = this._createImg(src, oldIcon && oldIcon.tagName === 'IMG' ? oldIcon : null);
		this._setIconStyles(img, name);

		return img;
	},

	_setIconStyles: function (img, name) {
		var options = this.options,
		    size = L.point(options[name + 'Size']),
		    anchor = L.point(name === 'shadow' && options.shadowAnchor || options.iconAnchor ||
		            size && size.divideBy(2, true));

		img.className = 'leaflet-marker-' + name + ' ' + (options.className || '');

		if (anchor) {
			img.style.marginLeft = (-anchor.x) + 'px';
			img.style.marginTop  = (-anchor.y) + 'px';
		}

		if (size) {
			img.style.width  = size.x + 'px';
			img.style.height = size.y + 'px';
		}
	},

	_createImg: function (src, el) {
		el = el || document.createElement('img');
		el.src = src;
		return el;
	},

	_getIconUrl: function (name) {
		return L.Browser.retina && this.options[name + 'RetinaUrl'] || this.options[name + 'Url'];
	}
});

L.icon = function (options) {
	return new L.Icon(options);
};

/*
 * L.Icon.Default is the blue marker icon used by default in Leaflet.
 */

L.Icon.Default = L.Icon.extend({

	options: {
		iconSize:    [25, 41],
		iconAnchor:  [12, 41],
		popupAnchor: [1, -34],
		shadowSize:  [41, 41]
	},

	_getIconUrl: function (name) {
		var key = name + 'Url';

		if (this.options[key]) {
			return this.options[key];
		}

		var path = L.Icon.Default.imagePath;

		if (!path) {
			throw new Error('Couldn\'t autodetect L.Icon.Default.imagePath, set it manually.');
		}

		return path + '/marker-' + name + (L.Browser.retina && name === 'icon' ? '-2x' : '') + '.png';
	}
});

L.Icon.Default.imagePath = (function () {
	var scripts = document.getElementsByTagName('script'),
	    leafletRe = /[\/^]leaflet[\-\._]?([\w\-\._]*)\.js\??/;

	var i, len, src, path;

	for (i = 0, len = scripts.length; i < len; i++) {
		src = scripts[i].src;

		if (src.match(leafletRe)) {
			path = src.split(leafletRe)[0];
			return (path ? path + '/' : '') + 'images';
		}
	}
}());

/*
 * L.Marker is used to display clickable/draggable icons on the map.
 */

L.Marker = L.Layer.extend({

	options: {
		pane: 'markerPane',

		icon: new L.Icon.Default(),
		// title: '',
		// alt: '',
		clickable: true,
		// draggable: false,
		keyboard: true,
		zIndexOffset: 0,
		opacity: 1,
		// riseOnHover: false,
		riseOffset: 250
	},

	initialize: function (latlng, options) {
		L.setOptions(this, options);
		this._latlng = L.latLng(latlng);
	},

	onAdd: function (map) {
		this._zoomAnimated = this._zoomAnimated && map.options.markerZoomAnimation;

		this._initIcon();
		this.update();
	},

	onRemove: function () {
		if (this.dragging) {
			this.dragging.disable();
		}

		this._removeIcon();
		this._removeShadow();
	},

	getEvents: function () {
		var events = {viewreset: this.update};

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}

		return events;
	},

	getLatLng: function () {
		return this._latlng;
	},

	setLatLng: function (latlng) {
		var oldLatLng = this._latlng;
		this._latlng = L.latLng(latlng);
		this.update();
		return this.fire('move', { oldLatLng: oldLatLng, latlng: this._latlng });
	},

	setZIndexOffset: function (offset) {
		this.options.zIndexOffset = offset;
		return this.update();
	},

	setIcon: function (icon) {

		this.options.icon = icon;

		if (this._map) {
			this._initIcon();
			this.update();
		}

		if (this._popup) {
			this.bindPopup(this._popup);
		}

		return this;
	},

	update: function () {

		if (this._icon) {
			var pos = this._map.latLngToLayerPoint(this._latlng).round();
			this._setPos(pos);
		}

		return this;
	},

	_initIcon: function () {
		var options = this.options,
		    classToAdd = 'leaflet-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');

		var icon = options.icon.createIcon(this._icon),
			addIcon = false;

		// if we're not reusing the icon, remove the old one and init new one
		if (icon !== this._icon) {
			if (this._icon) {
				this._removeIcon();
			}
			addIcon = true;

			if (options.title) {
				icon.title = options.title;
			}
			if (options.alt) {
				icon.alt = options.alt;
			}
		}

		L.DomUtil.addClass(icon, classToAdd);

		if (options.keyboard) {
			icon.tabIndex = '0';
		}

		this._icon = icon;
		this._initInteraction();

		if (options.riseOnHover) {
			L.DomEvent.on(icon, {
				mouseover: this._bringToFront,
				mouseout: this._resetZIndex
			}, this);
		}

		var newShadow = options.icon.createShadow(this._shadow),
			addShadow = false;

		if (newShadow !== this._shadow) {
			this._removeShadow();
			addShadow = true;
		}

		if (newShadow) {
			L.DomUtil.addClass(newShadow, classToAdd);
		}
		this._shadow = newShadow;


		if (options.opacity < 1) {
			this._updateOpacity();
		}


		if (addIcon) {
			this.getPane().appendChild(this._icon);
		}
		if (newShadow && addShadow) {
			this.getPane('shadowPane').appendChild(this._shadow);
		}
	},

	_removeIcon: function () {
		if (this.options.riseOnHover) {
			L.DomEvent.off(this._icon, {
				mouseover: this._bringToFront,
			    mouseout: this._resetZIndex
			}, this);
		}

		L.DomUtil.remove(this._icon);

		this._icon = null;
	},

	_removeShadow: function () {
		if (this._shadow) {
			L.DomUtil.remove(this._shadow);
		}
		this._shadow = null;
	},

	_setPos: function (pos) {
		L.DomUtil.setPosition(this._icon, pos);

		if (this._shadow) {
			L.DomUtil.setPosition(this._shadow, pos);
		}

		this._zIndex = pos.y + this.options.zIndexOffset;

		this._resetZIndex();
	},

	_updateZIndex: function (offset) {
		this._icon.style.zIndex = this._zIndex + offset;
	},

	_animateZoom: function (opt) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();

		this._setPos(pos);
	},

	_initInteraction: function () {

		if (!this.options.clickable) { return; }

		L.DomUtil.addClass(this._icon, 'leaflet-clickable');

		L.DomEvent.on(this._icon, 'click dblclick mousedown mouseup mouseover mouseout contextmenu keypress',
				this._fireMouseEvent, this);

		if (L.Handler.MarkerDrag) {
			this.dragging = new L.Handler.MarkerDrag(this);

			if (this.options.draggable) {
				this.dragging.enable();
			}
		}
	},

	_fireMouseEvent: function (e, type) {
		// to prevent outline when clicking on keyboard-focusable marker
		if (e.type === 'mousedown') {
			L.DomEvent.preventDefault(e);
		}

		if (e.type === 'click' && this.dragging && this.dragging.moved()) {
			L.DomEvent.stopPropagation(e);
			return;
		}

		if (e.type === 'keypress' && e.keyCode === 13) {
			type = 'click';
		}

		if (this._map) {
			this._map._fireMouseEvent(this, e, type, true, this._latlng);
		}
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		if (this._map) {
			this._updateOpacity();
		}

		return this;
	},

	_updateOpacity: function () {
		var opacity = this.options.opacity;

		L.DomUtil.setOpacity(this._icon, opacity);

		if (this._shadow) {
			L.DomUtil.setOpacity(this._shadow, opacity);
		}
	},

	_bringToFront: function () {
		this._updateZIndex(this.options.riseOffset);
	},

	_resetZIndex: function () {
		this._updateZIndex(0);
	}
});

L.marker = function (latlng, options) {
	return new L.Marker(latlng, options);
};

/*
 * L.DivIcon is a lightweight HTML-based icon class (as opposed to the image-based L.Icon)
 * to use with L.Marker.
 */

L.DivIcon = L.Icon.extend({
	options: {
		iconSize: [12, 12], // also can be set through CSS
		/*
		iconAnchor: (Point)
		popupAnchor: (Point)
		html: (String)
		bgPos: (Point)
		*/
		className: 'leaflet-div-icon',
		html: false
	},

	createIcon: function (oldIcon) {
		var div = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div'),
		    options = this.options;

		div.innerHTML = options.html !== false ? options.html : '';

		if (options.bgPos) {
			div.style.backgroundPosition = (-options.bgPos.x) + 'px ' + (-options.bgPos.y) + 'px';
		}
		this._setIconStyles(div, 'icon');

		return div;
	},

	createShadow: function () {
		return null;
	}
});

L.divIcon = function (options) {
	return new L.DivIcon(options);
};

/*
 * L.Popup is used for displaying popups on the map.
 */

L.Map.mergeOptions({
	closePopupOnClick: true
});

L.Popup = L.Layer.extend({

	options: {
		pane: 'popupPane',

		minWidth: 50,
		maxWidth: 300,
		// maxHeight: <Number>,
		offset: [0, 7],

		autoPan: true,
		autoPanPadding: [5, 5],
		// autoPanPaddingTopLeft: <Point>,
		// autoPanPaddingBottomRight: <Point>,

		closeButton: true,
		// keepInView: false,
		// className: '',
		zoomAnimation: true
	},

	initialize: function (options, source) {
		L.setOptions(this, options);

		this._source = source;
	},

	onAdd: function (map) {
		this._zoomAnimated = this._zoomAnimated && this.options.zoomAnimation;

		if (!this._container) {
			this._initLayout();
		}

		if (map._fadeAnimated) {
			L.DomUtil.setOpacity(this._container, 0);
		}

		clearTimeout(this._removeTimeout);
		this.getPane().appendChild(this._container);
		this.update();

		if (map._fadeAnimated) {
			L.DomUtil.setOpacity(this._container, 1);
		}

		map.fire('popupopen', {popup: this});

		if (this._source) {
			this._source.fire('popupopen', {popup: this}, true);
		}
	},

	openOn: function (map) {
		map.openPopup(this);
		return this;
	},

	onRemove: function (map) {
		if (map._fadeAnimated) {
			L.DomUtil.setOpacity(this._container, 0);
			this._removeTimeout = setTimeout(L.bind(L.DomUtil.remove, L.DomUtil, this._container), 200);
		} else {
			L.DomUtil.remove(this._container);
		}

		map.fire('popupclose', {popup: this});

		if (this._source) {
			this._source.fire('popupclose', {popup: this}, true);
		}
	},

	getLatLng: function () {
		return this._latlng;
	},

	setLatLng: function (latlng) {
		this._latlng = L.latLng(latlng);
		if (this._map) {
			this._updatePosition();
			this._adjustPan();
		}
		return this;
	},

	getContent: function () {
		return this._content;
	},

	setContent: function (content) {
		this._content = content;
		this.update();
		return this;
	},

	update: function () {
		if (!this._map) { return; }

		this._container.style.visibility = 'hidden';

		this._updateContent();
		this._updateLayout();
		this._updatePosition();

		this._container.style.visibility = '';

		this._adjustPan();
	},

	getEvents: function () {
		var events = {viewreset: this._updatePosition},
		    options = this.options;

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}
		if ('closeOnClick' in options ? options.closeOnClick : this._map.options.closePopupOnClick) {
			events.preclick = this._close;
		}
		if (options.keepInView) {
			events.moveend = this._adjustPan;
		}
		return events;
	},
	
	isOpen: function () {
		return !!this._map && this._map.hasLayer(this);
	},

	_close: function () {
		if (this._map) {
			this._map.closePopup(this);
		}
	},

	_initLayout: function () {
		var prefix = 'leaflet-popup',
		    container = this._container = L.DomUtil.create('div',
			prefix + ' ' + (this.options.className || '') +
			' leaflet-zoom-' + (this._zoomAnimated ? 'animated' : 'hide'));

		if (this.options.closeButton) {
			var closeButton = this._closeButton = L.DomUtil.create('a', prefix + '-close-button', container);
			closeButton.href = '#close';
			closeButton.innerHTML = '&#215;';

			L.DomEvent.on(closeButton, 'click', this._onCloseButtonClick, this);
		}

		var wrapper = this._wrapper = L.DomUtil.create('div', prefix + '-content-wrapper', container);
		this._contentNode = L.DomUtil.create('div', prefix + '-content', wrapper);

		L.DomEvent
			.disableClickPropagation(wrapper)
			.disableScrollPropagation(this._contentNode)
			.on(wrapper, 'contextmenu', L.DomEvent.stopPropagation);

		this._tipContainer = L.DomUtil.create('div', prefix + '-tip-container', container);
		this._tip = L.DomUtil.create('div', prefix + '-tip', this._tipContainer);
	},

	_updateContent: function () {
		if (!this._content) { return; }

		var node = this._contentNode;

		if (typeof this._content === 'string') {
			node.innerHTML = this._content;
		} else {
			while (node.hasChildNodes()) {
				node.removeChild(node.firstChild);
			}
			node.appendChild(this._content);
		}
		this.fire('contentupdate');
	},

	_updateLayout: function () {
		var container = this._contentNode,
		    style = container.style;

		style.width = '';
		style.whiteSpace = 'nowrap';

		var width = container.offsetWidth;
		width = Math.min(width, this.options.maxWidth);
		width = Math.max(width, this.options.minWidth);

		style.width = (width + 1) + 'px';
		style.whiteSpace = '';

		style.height = '';

		var height = container.offsetHeight,
		    maxHeight = this.options.maxHeight,
		    scrolledClass = 'leaflet-popup-scrolled';

		if (maxHeight && height > maxHeight) {
			style.height = maxHeight + 'px';
			L.DomUtil.addClass(container, scrolledClass);
		} else {
			L.DomUtil.removeClass(container, scrolledClass);
		}

		this._containerWidth = this._container.offsetWidth;
	},

	_updatePosition: function () {
		if (!this._map) { return; }

		var pos = this._map.latLngToLayerPoint(this._latlng),
		    offset = L.point(this.options.offset);

		if (this._zoomAnimated) {
			L.DomUtil.setPosition(this._container, pos);
		} else {
			offset = offset.add(pos);
		}

		var bottom = this._containerBottom = -offset.y,
		    left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;

		// bottom position the popup in case the height of the popup changes (images loading etc)
		this._container.style.bottom = bottom + 'px';
		this._container.style.left = left + 'px';
	},

	_animateZoom: function (e) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center);
		L.DomUtil.setPosition(this._container, pos);
	},

	_adjustPan: function () {
		if (!this.options.autoPan) { return; }

		var map = this._map,
		    containerHeight = this._container.offsetHeight,
		    containerWidth = this._containerWidth,
		    layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom);

		if (this._zoomAnimated) {
			layerPos._add(L.DomUtil.getPosition(this._container));
		}

		var containerPos = map.layerPointToContainerPoint(layerPos),
		    padding = L.point(this.options.autoPanPadding),
		    paddingTL = L.point(this.options.autoPanPaddingTopLeft || padding),
		    paddingBR = L.point(this.options.autoPanPaddingBottomRight || padding),
		    size = map.getSize(),
		    dx = 0,
		    dy = 0;

		if (containerPos.x + containerWidth + paddingBR.x > size.x) { // right
			dx = containerPos.x + containerWidth - size.x + paddingBR.x;
		}
		if (containerPos.x - dx - paddingTL.x < 0) { // left
			dx = containerPos.x - paddingTL.x;
		}
		if (containerPos.y + containerHeight + paddingBR.y > size.y) { // bottom
			dy = containerPos.y + containerHeight - size.y + paddingBR.y;
		}
		if (containerPos.y - dy - paddingTL.y < 0) { // top
			dy = containerPos.y - paddingTL.y;
		}

		if (dx || dy) {
			map
			    .fire('autopanstart')
			    .panBy([dx, dy]);
		}
	},

	_onCloseButtonClick: function (e) {
		this._close();
		L.DomEvent.stop(e);
	}
});

L.popup = function (options, source) {
	return new L.Popup(options, source);
};


L.Map.include({
	openPopup: function (popup, latlng, options) { // (Popup) or (String || HTMLElement, LatLng[, Object])
		if (!(popup instanceof L.Popup)) {
			var content = popup;

			popup = new L.Popup(options).setContent(content);
		}

		if (latlng) {
			popup.setLatLng(latlng);
		}

		if (this.hasLayer(popup)) {
			return this;
		}

		this.closePopup();
		this._popup = popup;
		return this.addLayer(popup);
	},

	closePopup: function (popup) {
		if (!popup || popup === this._popup) {
			popup = this._popup;
			this._popup = null;
		}
		if (popup) {
			this.removeLayer(popup);
		}
		return this;
	}
});

/*
 * Adds popup-related methods to all layers.
 */

L.Layer.include({

	bindPopup: function (content, options) {

		if (content instanceof L.Popup) {
			this._popup = content;
			content._source = this;
		} else {
			if (!this._popup || options) {
				this._popup = new L.Popup(options, this);
			}
			this._popup.setContent(content);
		}

		if (!this._popupHandlersAdded) {
			this.on({
				click: this._openPopup,
				remove: this.closePopup,
				move: this._movePopup
			});
			this._popupHandlersAdded = true;
		}

		return this;
	},

	unbindPopup: function () {
		if (this._popup) {
			this.on({
			    click: this._openPopup,
			    remove: this.closePopup,
			    move: this._movePopup
			});
			this._popupHandlersAdded = false;
			this._popup = null;
		}
		return this;
	},

	openPopup: function (latlng) {
		if (this._popup && this._map) {
			this._map.openPopup(this._popup, latlng || this._latlng || this.getCenter());
		}
		return this;
	},

	closePopup: function () {
		if (this._popup) {
			this._popup._close();
		}
		return this;
	},

	togglePopup: function () {
		if (this._popup) {
			if (this._popup._map) {
				this.closePopup();
			} else {
				this.openPopup();
			}
		}
		return this;
	},

	setPopupContent: function (content) {
		if (this._popup) {
			this._popup.setContent(content);
		}
		return this;
	},

	getPopup: function () {
		return this._popup;
	},

	_openPopup: function (e) {
		this._map.openPopup(this._popup, e.latlng);
	},

	_movePopup: function (e) {
		this._popup.setLatLng(e.latlng);
	}
});

/*
 * Popup extension to L.Marker, adding popup-related methods.
 */

L.Marker.include({
	bindPopup: function (content, options) {
		var anchor = L.point(this.options.icon.options.popupAnchor || [0, 0])
			.add(L.Popup.prototype.options.offset);

		options = L.extend({offset: anchor}, options);

		return L.Layer.prototype.bindPopup.call(this, content, options);
	},

	_openPopup: L.Layer.prototype.togglePopup
});

/*
 * L.LayerGroup is a class to combine several layers into one so that
 * you can manipulate the group (e.g. add/remove it) as one layer.
 */

L.LayerGroup = L.Layer.extend({

	initialize: function (layers) {
		this._layers = {};

		var i, len;

		if (layers) {
			for (i = 0, len = layers.length; i < len; i++) {
				this.addLayer(layers[i]);
			}
		}
	},

	addLayer: function (layer) {
		var id = this.getLayerId(layer);

		this._layers[id] = layer;

		if (this._map) {
			this._map.addLayer(layer);
		}

		return this;
	},

	removeLayer: function (layer) {
		var id = layer in this._layers ? layer : this.getLayerId(layer);

		if (this._map && this._layers[id]) {
			this._map.removeLayer(this._layers[id]);
		}

		delete this._layers[id];

		return this;
	},

	hasLayer: function (layer) {
		return !!layer && (layer in this._layers || this.getLayerId(layer) in this._layers);
	},

	clearLayers: function () {
		for (var i in this._layers) {
			this.removeLayer(this._layers[i]);
		}
		return this;
	},

	invoke: function (methodName) {
		var args = Array.prototype.slice.call(arguments, 1),
		    i, layer;

		for (i in this._layers) {
			layer = this._layers[i];

			if (layer[methodName]) {
				layer[methodName].apply(layer, args);
			}
		}

		return this;
	},

	onAdd: function (map) {
		for (var i in this._layers) {
			map.addLayer(this._layers[i]);
		}
	},

	onRemove: function (map) {
		for (var i in this._layers) {
			map.removeLayer(this._layers[i]);
		}
	},

	eachLayer: function (method, context) {
		for (var i in this._layers) {
			method.call(context, this._layers[i]);
		}
		return this;
	},

	getLayer: function (id) {
		return this._layers[id];
	},

	getLayers: function () {
		var layers = [];

		for (var i in this._layers) {
			layers.push(this._layers[i]);
		}
		return layers;
	},

	setZIndex: function (zIndex) {
		return this.invoke('setZIndex', zIndex);
	},

	getLayerId: function (layer) {
		return L.stamp(layer);
	}
});

L.layerGroup = function (layers) {
	return new L.LayerGroup(layers);
};

/*
 * L.FeatureGroup extends L.LayerGroup by introducing mouse events and additional methods
 * shared between a group of interactive layers (like vectors or markers).
 */

L.FeatureGroup = L.LayerGroup.extend({

	addLayer: function (layer) {
		if (this.hasLayer(layer)) {
			return this;
		}

		layer.addEventParent(this);

		L.LayerGroup.prototype.addLayer.call(this, layer);

		if (this._popupContent && layer.bindPopup) {
			layer.bindPopup(this._popupContent, this._popupOptions);
		}

		return this.fire('layeradd', {layer: layer});
	},

	removeLayer: function (layer) {
		if (!this.hasLayer(layer)) {
			return this;
		}
		if (layer in this._layers) {
			layer = this._layers[layer];
		}

		layer.removeEventParent(this);

		L.LayerGroup.prototype.removeLayer.call(this, layer);

		if (this._popupContent) {
			this.invoke('unbindPopup');
		}

		return this.fire('layerremove', {layer: layer});
	},

	bindPopup: function (content, options) {
		this._popupContent = content;
		this._popupOptions = options;
		return this.invoke('bindPopup', content, options);
	},

	openPopup: function (latlng) {
		// open popup on the first layer
		for (var id in this._layers) {
			this._layers[id].openPopup(latlng);
			break;
		}
		return this;
	},

	setStyle: function (style) {
		return this.invoke('setStyle', style);
	},

	bringToFront: function () {
		return this.invoke('bringToFront');
	},

	bringToBack: function () {
		return this.invoke('bringToBack');
	},

	getBounds: function () {
		var bounds = new L.LatLngBounds();

		this.eachLayer(function (layer) {
			bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
		});

		return bounds;
	}
});

L.featureGroup = function (layers) {
	return new L.FeatureGroup(layers);
};

/*
 * L.Renderer is a base class for renderer implementations (SVG, Canvas);
 * handles renderer container, bounds and zoom animation.
 */

L.Renderer = L.Layer.extend({

	options: {
		// how much to extend the clip area around the map view (relative to its size)
		// e.g. 0.1 would be 10% of map view in each direction; defaults to clip with the map view
		padding: 0
	},

	initialize: function (options) {
		L.setOptions(this, options);
		L.stamp(this);
	},

	onAdd: function () {
		if (!this._container) {
			this._initContainer(); // defined by renderer implementations

			if (this._zoomAnimated) {
				L.DomUtil.addClass(this._container, 'leaflet-zoom-animated');
			}
		}

		this.getPane().appendChild(this._container);
		this._update();
	},

	onRemove: function () {
		L.DomUtil.remove(this._container);
	},

	getEvents: function () {
		var events = {
			moveend: this._update
		};
		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}
		return events;
	},

	_animateZoom: function (e) {
		var origin = e.origin.subtract(this._map._getCenterLayerPoint()),
		    offset = this._bounds.min.add(origin.multiplyBy(1 - e.scale));

		L.DomUtil.setTransform(this._container, offset, e.scale);
	},

	_update: function () {
		// update pixel bounds of renderer container (for positioning/sizing/clipping later)
		var p = this.options.padding,
		    size = this._map.getSize(),
		    min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();

		this._bounds = new L.Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());
	}
});


L.Map.include({
	// used by each vector layer to decide which renderer to use
	getRenderer: function (layer) {
		var renderer = layer.options.renderer || this.options.renderer || this._renderer;

		if (!renderer) {
			renderer = this._renderer = (L.SVG && L.svg()) || (L.Canvas && L.canvas());
		}

		if (!this.hasLayer(renderer)) {
			this.addLayer(renderer);
		}
		return renderer;
	}
});

/*
 * L.Path is the base class for all Leaflet vector layers like polygons and circles.
 */

L.Path = L.Layer.extend({

	options: {
		stroke: true,
		color: '#3388ff',
		weight: 3,
		opacity: 1,
		lineCap: 'round',
		lineJoin: 'round',
		// dashArray: null
		// dashOffset: null

		// fill: false
		// fillColor: same as color by default
		fillOpacity: 0.2,

		// className: ''
		clickable: true
	},

	onAdd: function () {
		this._renderer = this._map.getRenderer(this);
		this._renderer._initPath(this);

		// defined in children classes
		this._project();
		this._update();

		this._renderer._addPath(this);
	},

	onRemove: function () {
		this._renderer._removePath(this);
	},

	getEvents: function () {
		return {
			viewreset: this._project,
			moveend: this._update
		};
	},

	redraw: function () {
		if (this._map) {
			this._renderer._updatePath(this);
		}
		return this;
	},

	setStyle: function (style) {
		L.setOptions(this, style);
		if (this._renderer) {
			this._renderer._updateStyle(this);
		}
		return this;
	},

	bringToFront: function () {
		this._renderer._bringToFront(this);
		return this;
	},

	bringToBack: function () {
		this._renderer._bringToBack(this);
		return this;
	},

	_fireMouseEvent: function (e, type) {
		this._map._fireMouseEvent(this, e, type, true);
	},

	_clickTolerance: function () {
		// used when doing hit detection for Canvas layers
		return (this.options.stroke ? this.options.weight / 2 : 0) + (L.Browser.touch ? 10 : 0);
	}
});

/*
 * L.LineUtil contains different utility functions for line segments
 * and polylines (clipping, simplification, distances, etc.)
 */

/*jshint bitwise:false */ // allow bitwise operations for this file

L.LineUtil = {

	// Simplify polyline with vertex reduction and Douglas-Peucker simplification.
	// Improves rendering performance dramatically by lessening the number of points to draw.

	simplify: function (/*Point[]*/ points, /*Number*/ tolerance) {
		if (!tolerance || !points.length) {
			return points.slice();
		}

		var sqTolerance = tolerance * tolerance;

		// stage 1: vertex reduction
		points = this._reducePoints(points, sqTolerance);

		// stage 2: Douglas-Peucker simplification
		points = this._simplifyDP(points, sqTolerance);

		return points;
	},

	// distance from a point to a segment between two points
	pointToSegmentDistance:  function (/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
		return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
	},

	closestPointOnSegment: function (/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
		return this._sqClosestPointOnSegment(p, p1, p2);
	},

	// Douglas-Peucker simplification, see http://en.wikipedia.org/wiki/Douglas-Peucker_algorithm
	_simplifyDP: function (points, sqTolerance) {

		var len = points.length,
		    ArrayConstructor = typeof Uint8Array !== undefined + '' ? Uint8Array : Array,
		    markers = new ArrayConstructor(len);

		markers[0] = markers[len - 1] = 1;

		this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);

		var i,
		    newPoints = [];

		for (i = 0; i < len; i++) {
			if (markers[i]) {
				newPoints.push(points[i]);
			}
		}

		return newPoints;
	},

	_simplifyDPStep: function (points, markers, sqTolerance, first, last) {

		var maxSqDist = 0,
		    index, i, sqDist;

		for (i = first + 1; i <= last - 1; i++) {
			sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);

			if (sqDist > maxSqDist) {
				index = i;
				maxSqDist = sqDist;
			}
		}

		if (maxSqDist > sqTolerance) {
			markers[index] = 1;

			this._simplifyDPStep(points, markers, sqTolerance, first, index);
			this._simplifyDPStep(points, markers, sqTolerance, index, last);
		}
	},

	// reduce points that are too close to each other to a single point
	_reducePoints: function (points, sqTolerance) {
		var reducedPoints = [points[0]];

		for (var i = 1, prev = 0, len = points.length; i < len; i++) {
			if (this._sqDist(points[i], points[prev]) > sqTolerance) {
				reducedPoints.push(points[i]);
				prev = i;
			}
		}
		if (prev < len - 1) {
			reducedPoints.push(points[len - 1]);
		}
		return reducedPoints;
	},

	// Cohen-Sutherland line clipping algorithm.
	// Used to avoid rendering parts of a polyline that are not currently visible.

	clipSegment: function (a, b, bounds, useLastCode) {
		var codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds),
		    codeB = this._getBitCode(b, bounds),

		    codeOut, p, newCode;

		// save 2nd code to avoid calculating it on the next segment
		this._lastCode = codeB;

		while (true) {
			// if a,b is inside the clip window (trivial accept)
			if (!(codeA | codeB)) {
				return [a, b];
			// if a,b is outside the clip window (trivial reject)
			} else if (codeA & codeB) {
				return false;
			// other cases
			} else {
				codeOut = codeA || codeB;
				p = this._getEdgeIntersection(a, b, codeOut, bounds);
				newCode = this._getBitCode(p, bounds);

				if (codeOut === codeA) {
					a = p;
					codeA = newCode;
				} else {
					b = p;
					codeB = newCode;
				}
			}
		}
	},

	_getEdgeIntersection: function (a, b, code, bounds) {
		var dx = b.x - a.x,
		    dy = b.y - a.y,
		    min = bounds.min,
		    max = bounds.max,
		    x, y;

		if (code & 8) { // top
			x = a.x + dx * (max.y - a.y) / dy;
			y = max.y;

		} else if (code & 4) { // bottom
			x = a.x + dx * (min.y - a.y) / dy;
			y = min.y;

		} else if (code & 2) { // right
			x = max.x;
			y = a.y + dy * (max.x - a.x) / dx;

		} else if (code & 1) { // left
			x = min.x;
			y = a.y + dy * (min.x - a.x) / dx;
		}

		return new L.Point(x, y, true);
	},

	_getBitCode: function (/*Point*/ p, bounds) {
		var code = 0;

		if (p.x < bounds.min.x) { // left
			code |= 1;
		} else if (p.x > bounds.max.x) { // right
			code |= 2;
		}

		if (p.y < bounds.min.y) { // bottom
			code |= 4;
		} else if (p.y > bounds.max.y) { // top
			code |= 8;
		}

		return code;
	},

	// square distance (to avoid unnecessary Math.sqrt calls)
	_sqDist: function (p1, p2) {
		var dx = p2.x - p1.x,
		    dy = p2.y - p1.y;
		return dx * dx + dy * dy;
	},

	// return closest point on segment or distance to that point
	_sqClosestPointOnSegment: function (p, p1, p2, sqDist) {
		var x = p1.x,
		    y = p1.y,
		    dx = p2.x - x,
		    dy = p2.y - y,
		    dot = dx * dx + dy * dy,
		    t;

		if (dot > 0) {
			t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

			if (t > 1) {
				x = p2.x;
				y = p2.y;
			} else if (t > 0) {
				x += dx * t;
				y += dy * t;
			}
		}

		dx = p.x - x;
		dy = p.y - y;

		return sqDist ? dx * dx + dy * dy : new L.Point(x, y);
	}
};

/*
 * L.Polyline implements polyline vector layer (a set of points connected with lines)
 */

L.Polyline = L.Path.extend({

	options: {
		// how much to simplify the polyline on each zoom level
		// more = better performance and smoother look, less = more accurate
		smoothFactor: 1.0
		// noClip: false
	},

	initialize: function (latlngs, options) {
		L.setOptions(this, options);
		this._setLatLngs(latlngs);
	},

	getLatLngs: function () {
		// TODO rings
		return this._latlngs;
	},

	setLatLngs: function (latlngs) {
		this._setLatLngs(latlngs);
		return this.redraw();
	},

	addLatLng: function (latlng) {
		// TODO rings
		latlng = L.latLng(latlng);
		this._latlngs.push(latlng);
		this._bounds.extend(latlng);
		return this.redraw();
	},

	spliceLatLngs: function () {
		// TODO rings
		var removed = [].splice.apply(this._latlngs, arguments);
		this._setLatLngs(this._latlngs);
		this.redraw();
		return removed;
	},

	closestLayerPoint: function (p) {
		var minDistance = Infinity,
		    minPoint = null,
		    closest = L.LineUtil._sqClosestPointOnSegment,
		    p1, p2;

		for (var j = 0, jLen = this._parts.length; j < jLen; j++) {
			var points = this._parts[j];

			for (var i = 1, len = points.length; i < len; i++) {
				p1 = points[i - 1];
				p2 = points[i];

				var sqDist = closest(p, p1, p2, true);

				if (sqDist < minDistance) {
					minDistance = sqDist;
					minPoint = closest(p, p1, p2);
				}
			}
		}
		if (minPoint) {
			minPoint.distance = Math.sqrt(minDistance);
		}
		return minPoint;
	},

	getCenter: function () {
		var i, halfDist, segDist, dist, p1, p2, ratio,
		    points = this._rings[0],
		    len = points.length;

		// polyline centroid algorithm; only uses the first ring if there are multiple

		for (i = 0, halfDist = 0; i < len - 1; i++) {
			halfDist += points[i].distanceTo(points[i + 1]) / 2;
		}

		for (i = 0, dist = 0; i < len - 1; i++) {
			p1 = points[i];
			p2 = points[i + 1];
			segDist = p1.distanceTo(p2);
			dist += segDist;

			if (dist > halfDist) {
				ratio = (dist - halfDist) / segDist;
				return this._map.layerPointToLatLng([
					p2.x - ratio * (p2.x - p1.x),
					p2.y - ratio * (p2.y - p1.y)
				]);
			}
		}
	},

	getBounds: function () {
		return this._bounds;
	},

	_setLatLngs: function (latlngs) {
		this._bounds = new L.LatLngBounds();
		this._latlngs = this._convertLatLngs(latlngs);
	},

	// recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
	_convertLatLngs: function (latlngs) {
		var result = [],
		    flat = this._flat(latlngs);

		for (var i = 0, len = latlngs.length; i < len; i++) {
			if (flat) {
				result[i] = L.latLng(latlngs[i]);
				this._bounds.extend(result[i]);
			} else {
				result[i] = this._convertLatLngs(latlngs[i]);
			}
		}

		return result;
	},

	_flat: function (latlngs) {
		// true if it's a flat array of latlngs; false if nested
		return !L.Util.isArray(latlngs[0]) || typeof latlngs[0][0] !== 'object';
	},

	_project: function () {
		this._rings = [];
		this._projectLatlngs(this._latlngs, this._rings);

		// project bounds as well to use later for Canvas hit detection/etc.
		var w = this._clickTolerance(),
			p = new L.Point(w, -w);

		if (this._latlngs.length) {
			this._pxBounds = new L.Bounds(
				this._map.latLngToLayerPoint(this._bounds.getSouthWest())._subtract(p),
				this._map.latLngToLayerPoint(this._bounds.getNorthEast())._add(p));
		}
	},

	// recursively turns latlngs into a set of rings with projected coordinates
	_projectLatlngs: function (latlngs, result) {

		var flat = latlngs[0] instanceof L.LatLng,
		    len = latlngs.length,
		    i, ring;

		if (flat) {
			ring = [];
			for (i = 0; i < len; i++) {
				ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
			}
			result.push(ring);
		} else {
			for (i = 0; i < len; i++) {
				this._projectLatlngs(latlngs[i], result);
			}
		}
	},

	// clip polyline by renderer bounds so that we have less to render for performance
	_clipPoints: function () {
		if (this.options.noClip) {
			this._parts = this._rings;
			return;
		}

		this._parts = [];

		var parts = this._parts,
		    bounds = this._renderer._bounds,
		    i, j, k, len, len2, segment, points;

		for (i = 0, k = 0, len = this._rings.length; i < len; i++) {
			points = this._rings[i];

			for (j = 0, len2 = points.length; j < len2 - 1; j++) {
				segment = L.LineUtil.clipSegment(points[j], points[j + 1], bounds, j);

				if (!segment) { continue; }

				parts[k] = parts[k] || [];
				parts[k].push(segment[0]);

				// if segment goes out of screen, or it's the last one, it's the end of the line part
				if ((segment[1] !== points[j + 1]) || (j === len2 - 2)) {
					parts[k].push(segment[1]);
					k++;
				}
			}
		}
	},

	// simplify each clipped part of the polyline for performance
	_simplifyPoints: function () {
		var parts = this._parts,
			tolerance = this.options.smoothFactor;

		for (var i = 0, len = parts.length; i < len; i++) {
			parts[i] = L.LineUtil.simplify(parts[i], tolerance);
		}
	},

	_update: function () {
		if (!this._map) { return; }

		this._clipPoints();
		this._simplifyPoints();
		this._updatePath();
	},

	_updatePath: function () {
		this._renderer._updatePoly(this);
	}
});

L.polyline = function (latlngs, options) {
	return new L.Polyline(latlngs, options);
};

/*
 * L.PolyUtil contains utility functions for polygons (clipping, etc.).
 */

/*jshint bitwise:false */ // allow bitwise operations here

L.PolyUtil = {};

/*
 * Sutherland-Hodgeman polygon clipping algorithm.
 * Used to avoid rendering parts of a polygon that are not currently visible.
 */
L.PolyUtil.clipPolygon = function (points, bounds) {
	var clippedPoints,
	    edges = [1, 4, 2, 8],
	    i, j, k,
	    a, b,
	    len, edge, p,
	    lu = L.LineUtil;

	for (i = 0, len = points.length; i < len; i++) {
		points[i]._code = lu._getBitCode(points[i], bounds);
	}

	// for each edge (left, bottom, right, top)
	for (k = 0; k < 4; k++) {
		edge = edges[k];
		clippedPoints = [];

		for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
			a = points[i];
			b = points[j];

			// if a is inside the clip window
			if (!(a._code & edge)) {
				// if b is outside the clip window (a->b goes out of screen)
				if (b._code & edge) {
					p = lu._getEdgeIntersection(b, a, edge, bounds);
					p._code = lu._getBitCode(p, bounds);
					clippedPoints.push(p);
				}
				clippedPoints.push(a);

			// else if b is inside the clip window (a->b enters the screen)
			} else if (!(b._code & edge)) {
				p = lu._getEdgeIntersection(b, a, edge, bounds);
				p._code = lu._getBitCode(p, bounds);
				clippedPoints.push(p);
			}
		}
		points = clippedPoints;
	}

	return points;
};

/*
 * L.Polygon implements polygon vector layer (closed polyline with a fill inside).
 */

L.Polygon = L.Polyline.extend({

	options: {
		fill: true
	},

	getCenter: function () {
		var i, j, len, p1, p2, f, area, x, y,
		    points = this._rings[0];

		// polygon centroid algorithm; only uses the first ring if there are multiple

		area = x = y = 0;

		for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
			p1 = points[i];
			p2 = points[j];

			f = p1.y * p2.x - p2.y * p1.x;
			x += (p1.x + p2.x) * f;
			y += (p1.y + p2.y) * f;
			area += f * 3;
		}

		return this._map.layerPointToLatLng([x / area, y / area]);
	},

	_convertLatLngs: function (latlngs) {
		var result = L.Polyline.prototype._convertLatLngs.call(this, latlngs),
		    len = result.length;

		// remove last point if it equals first one
		if (len >= 2 && result[0] instanceof L.LatLng && result[0].equals(result[len - 1])) {
			result.pop();
		}
		return result;
	},

	_clipPoints: function () {
		if (this.options.noClip) {
			this._parts = this._rings;
			return;
		}

		// polygons need a different clipping algorithm so we redefine that

		var bounds = this._renderer._bounds,
		    w = this.options.weight,
		    p = new L.Point(w, w);

		// increase clip padding by stroke width to avoid stroke on clip edges
		bounds = new L.Bounds(bounds.min.subtract(p), bounds.max.add(p));

		this._parts = [];

		for (var i = 0, len = this._rings.length, clipped; i < len; i++) {
			clipped = L.PolyUtil.clipPolygon(this._rings[i], bounds);
			if (clipped.length) {
				this._parts.push(clipped);
			}
		}
	},

	_updatePath: function () {
		this._renderer._updatePoly(this, true);
	}
});

L.polygon = function (latlngs, options) {
	return new L.Polygon(latlngs, options);
};

/*
 * L.Rectangle extends Polygon and creates a rectangle when passed a LatLngBounds object.
 */

L.Rectangle = L.Polygon.extend({
	initialize: function (latLngBounds, options) {
		L.Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
	},

	setBounds: function (latLngBounds) {
		this.setLatLngs(this._boundsToLatLngs(latLngBounds));
	},

	_boundsToLatLngs: function (latLngBounds) {
		latLngBounds = L.latLngBounds(latLngBounds);
		return [
			latLngBounds.getSouthWest(),
			latLngBounds.getNorthWest(),
			latLngBounds.getNorthEast(),
			latLngBounds.getSouthEast()
		];
	}
});

L.rectangle = function (latLngBounds, options) {
	return new L.Rectangle(latLngBounds, options);
};

/*
 * L.CircleMarker is a circle overlay with a permanent pixel radius.
 */

L.CircleMarker = L.Path.extend({

	options: {
		fill: true,
		radius: 10
	},

	initialize: function (latlng, options) {
		L.setOptions(this, options);
		this._latlng = L.latLng(latlng);
		this._radius = this.options.radius;
	},

	setLatLng: function (latlng) {
		this._latlng = L.latLng(latlng);
		this.redraw();
		return this.fire('move', {latlng: this._latlng});
	},

	getLatLng: function () {
		return this._latlng;
	},

	setRadius: function (radius) {
		this.options.radius = this._radius = radius;
		return this.redraw();
	},

	getRadius: function () {
		return this._radius;
	},

	setStyle : function (options) {
		var radius = options && options.radius || this._radius;
		L.Path.prototype.setStyle.call(this, options);
		this.setRadius(radius);
		return this;
	},

	_project: function () {
		this._point = this._map.latLngToLayerPoint(this._latlng);
		this._updateBounds();
	},

	_updateBounds: function () {
		var r = this._radius,
		    r2 = this._radiusY || r,
		    w = this._clickTolerance(),
		    p = [r + w, r2 + w];
		this._pxBounds = new L.Bounds(this._point.subtract(p), this._point.add(p));
	},

	_update: function () {
		if (this._map) {
			this._updatePath();
		}
	},

	_updatePath: function () {
		this._renderer._updateCircle(this);
	},

	_empty: function () {
		return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
	}
});

L.circleMarker = function (latlng, options) {
	return new L.CircleMarker(latlng, options);
};

/*
 * L.Circle is a circle overlay (with a certain radius in meters).
 * It's an approximation and starts to diverge from a real circle closer to poles (due to projection distortion)
 */

L.Circle = L.CircleMarker.extend({

	initialize: function (latlng, radius, options) {
		L.setOptions(this, options);
		this._latlng = L.latLng(latlng);
		this._mRadius = radius;
	},

	setRadius: function (radius) {
		this._mRadius = radius;
		return this.redraw();
	},

	getRadius: function () {
		return this._mRadius;
	},

	getBounds: function () {
		var half = [this._radius, this._radiusY];

		return new L.LatLngBounds(
			this._map.layerPointToLatLng(this._point.subtract(half)),
			this._map.layerPointToLatLng(this._point.add(half)));
	},

	setStyle: L.Path.prototype.setStyle,

	_project: function () {

		var lng = this._latlng.lng,
		    lat = this._latlng.lat,
		    map = this._map,
		    crs = map.options.crs;

		if (crs.distance === L.CRS.Earth.distance) {
			var d = Math.PI / 180,
			    latR = (this._mRadius / L.CRS.Earth.R) / d,
			    top = map.project([lat + latR, lng]),
			    bottom = map.project([lat - latR, lng]),
			    p = top.add(bottom).divideBy(2),
			    lat2 = map.unproject(p).lat,
			    lngR = Math.acos((Math.cos(latR * d) - Math.sin(lat * d) * Math.sin(lat2 * d)) /
			            (Math.cos(lat * d) * Math.cos(lat2 * d))) / d;

			this._point = p.subtract(map.getPixelOrigin());
			this._radius = isNaN(lngR) ? 0 : Math.max(Math.round(p.x - map.project([lat2, lng - lngR]).x), 1);
			this._radiusY = Math.max(Math.round(p.y - top.y), 1);

		} else {
			var latlng2 = crs.unproject(crs.project(this._latlng).subtract([this._mRadius, 0]));

			this._point = map.latLngToLayerPoint(this._latlng);
			this._radius = this._point.x - map.latLngToLayerPoint(latlng2).x;
		}

		this._updateBounds();
	}
});

L.circle = function (latlng, radius, options) {
	return new L.Circle(latlng, radius, options);
};

/*
 * L.SVG renders vector layers with SVG. All SVG-specific code goes here.
 */

L.SVG = L.Renderer.extend({

	_initContainer: function () {
		this._container = L.SVG.create('svg');

		this._paths = {};
		this._initEvents();

		// makes it possible to click through svg root; we'll reset it back in individual paths
		this._container.setAttribute('pointer-events', 'none');
	},

	_update: function () {
		if (this._map._animatingZoom && this._bounds) { return; }

		L.Renderer.prototype._update.call(this);

		var b = this._bounds,
		    size = b.getSize(),
		    container = this._container,
		    pane = this.getPane();

		// hack to make flicker on drag end on mobile webkit less irritating
		if (L.Browser.mobileWebkit) {
			pane.removeChild(container);
		}

		L.DomUtil.setPosition(container, b.min);

		// update container viewBox so that we don't have to change coordinates of individual layers
		container.setAttribute('width', size.x);
		container.setAttribute('height', size.y);
		container.setAttribute('viewBox', [b.min.x, b.min.y, size.x, size.y].join(' '));

		if (L.Browser.mobileWebkit) {
			pane.appendChild(container);
		}
	},

	// methods below are called by vector layers implementations

	_initPath: function (layer) {
		var path = layer._path = L.SVG.create('path');

		if (layer.options.className) {
			L.DomUtil.addClass(path, layer.options.className);
		}

		if (layer.options.clickable) {
			L.DomUtil.addClass(path, 'leaflet-clickable');
		}

		this._updateStyle(layer);
	},

	_addPath: function (layer) {
		var path = layer._path;
		this._container.appendChild(path);
		this._paths[L.stamp(path)] = layer;
	},

	_removePath: function (layer) {
		var path = layer._path;
		L.DomUtil.remove(path);
		delete this._paths[L.stamp(path)];
	},

	_updatePath: function (layer) {
		layer._project();
		layer._update();
	},

	_updateStyle: function (layer) {
		var path = layer._path,
			options = layer.options;

		if (!path) { return; }

		if (options.stroke) {
			path.setAttribute('stroke', options.color);
			path.setAttribute('stroke-opacity', options.opacity);
			path.setAttribute('stroke-width', options.weight);
			path.setAttribute('stroke-linecap', options.lineCap);
			path.setAttribute('stroke-linejoin', options.lineJoin);

			if (options.dashArray) {
				path.setAttribute('stroke-dasharray', options.dashArray);
			} else {
				path.removeAttribute('stroke-dasharray');
			}

			if (options.dashOffset) {
				path.setAttribute('stroke-dashoffset', options.dashOffset);
			} else {
				path.removeAttribute('stroke-dashoffset');
			}
		} else {
			path.setAttribute('stroke', 'none');
		}

		if (options.fill) {
			path.setAttribute('fill', options.fillColor || options.color);
			path.setAttribute('fill-opacity', options.fillOpacity);
			path.setAttribute('fill-rule', 'evenodd');
		} else {
			path.setAttribute('fill', 'none');
		}

		path.setAttribute('pointer-events', options.pointerEvents || (options.clickable ? 'visiblePainted' : 'none'));
	},

	_updatePoly: function (layer, closed) {
		this._setPath(layer, L.SVG.pointsToPath(layer._parts, closed));
	},

	_updateCircle: function (layer) {
		var p = layer._point,
		    r = layer._radius,
		    r2 = layer._radiusY || r,
		    arc = 'a' + r + ',' + r2 + ' 0 1,0 ';

		// drawing a circle with two half-arcs
		var d = layer._empty() ? 'M0 0' :
				'M' + (p.x - r) + ',' + p.y +
				arc +  (r * 2) + ',0 ' +
				arc + (-r * 2) + ',0 ';

		this._setPath(layer, d);
	},

	_setPath: function (layer, path) {
		layer._path.setAttribute('d', path);
	},

	// SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
	_bringToFront: function (layer) {
		L.DomUtil.toFront(layer._path);
	},

	_bringToBack: function (layer) {
		L.DomUtil.toBack(layer._path);
	},

	// TODO remove duplication with L.Map
	_initEvents: function () {
		L.DomEvent.on(this._container, 'click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu',
				this._fireMouseEvent, this);
	},

	_fireMouseEvent: function (e) {
		this._paths[L.stamp(e.target || e.srcElement)] && this._paths[L.stamp(e.target || e.srcElement)]._fireMouseEvent(e);
	}
});


L.extend(L.SVG, {
	create: function (name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	},

	// generates SVG path string for multiple rings, with each ring turning into "M..L..L.." instructions
	pointsToPath: function (rings, closed) {
		var str = '',
			i, j, len, len2, points, p;

		for (i = 0, len = rings.length; i < len; i++) {
			points = rings[i];

			for (j = 0, len2 = points.length; j < len2; j++) {
				p = points[j];
				str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
			}

			// closes the ring for polygons; "x" is VML syntax
			str += closed ? (L.Browser.svg ? 'z' : 'x') : '';
		}

		// SVG complains about empty path strings
		return str || 'M0 0';
	}
});

L.Browser.svg = !!(document.createElementNS && L.SVG.create('svg').createSVGRect);

L.svg = function (options) {
	return L.Browser.svg || L.Browser.vml ? new L.SVG(options) : null;
};

/*
 * Vector rendering for IE7-8 through VML.
 * Thanks to Dmitry Baranovsky and his Raphael library for inspiration!
 */

L.Browser.vml = !L.Browser.svg && (function () {
	try {
		var div = document.createElement('div');
		div.innerHTML = '<v:shape adj="1"/>';

		var shape = div.firstChild;
		shape.style.behavior = 'url(#default#VML)';

		return shape && (typeof shape.adj === 'object');

	} catch (e) {
		return false;
	}
}());

// redefine some SVG methods to handle VML syntax which is similar but with some differences
L.SVG.include(!L.Browser.vml ? {} : {

	_initContainer: function () {
		this._container = L.DomUtil.create('div', 'leaflet-vml-container');

		this._paths = {};
		this._initEvents();
	},

	_update: function () {
		if (this._map._animatingZoom) { return; }
		L.Renderer.prototype._update.call(this);
	},

	_initPath: function (layer) {
		var container = layer._container = L.SVG.create('shape');

		L.DomUtil.addClass(container, 'leaflet-vml-shape ' + (this.options.className || ''));

		container.coordsize = '1 1';

		layer._path = L.SVG.create('path');
		container.appendChild(layer._path);

		this._updateStyle(layer);
	},

	_addPath: function (layer) {
		var container = layer._container;
		this._container.appendChild(container);
		this._paths[L.stamp(container)] = layer;
	},

	_removePath: function (layer) {
		var container = layer._container;
		L.DomUtil.remove(container);
		delete this._paths[L.stamp(container)];
	},

	_updateStyle: function (layer) {
		var stroke = layer._stroke,
		    fill = layer._fill,
		    options = layer.options,
		    container = layer._container;

		container.stroked = !!options.stroke;
		container.filled = !!options.fill;

		if (options.stroke) {
			if (!stroke) {
				stroke = layer._stroke = L.SVG.create('stroke');
				container.appendChild(stroke);
			}
			stroke.weight = options.weight + 'px';
			stroke.color = options.color;
			stroke.opacity = options.opacity;

			if (options.dashArray) {
				stroke.dashStyle = L.Util.isArray(options.dashArray) ?
				    options.dashArray.join(' ') :
				    options.dashArray.replace(/( *, *)/g, ' ');
			} else {
				stroke.dashStyle = '';
			}
			stroke.endcap = options.lineCap.replace('butt', 'flat');
			stroke.joinstyle = options.lineJoin;

		} else if (stroke) {
			container.removeChild(stroke);
			layer._stroke = null;
		}

		if (options.fill) {
			if (!fill) {
				fill = layer._fill = L.SVG.create('fill');
				container.appendChild(fill);
			}
			fill.color = options.fillColor || options.color;
			fill.opacity = options.fillOpacity;

		} else if (fill) {
			container.removeChild(fill);
			layer._fill = null;
		}
	},

	_updateCircle: function (layer) {
		var p = layer._point,
		    r = Math.round(layer._radius),
		    r2 = Math.round(layer._radiusY || r);

		this._setPath(layer, layer._empty() ? 'M0 0' :
				'AL ' + p.x + ',' + p.y + ' ' + r + ',' + r2 + ' 0,' + (65535 * 360));
	},

	_setPath: function (layer, path) {
		layer._path.v = path;
	},

	_bringToFront: function (layer) {
		L.DomUtil.toFront(layer._path.parentNode);
	},

	_bringToBack: function (layer) {
		L.DomUtil.toBack(layer._path.parentNode);
	}
});

if (L.Browser.vml) {
	L.SVG.create = (function () {
		try {
			document.namespaces.add('lvml', 'urn:schemas-microsoft-com:vml');
			return function (name) {
				return document.createElement('<lvml:' + name + ' class="lvml">');
			};
		} catch (e) {
			return function (name) {
				return document.createElement('<' + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
			};
		}
	})();
}

/*
 * L.Canvas handles Canvas vector layers rendering and mouse events handling. All Canvas-specific code goes here.
 */

L.Canvas = L.Renderer.extend({

	onAdd: function () {
		L.Renderer.prototype.onAdd.call(this);

		this._layers = this._layers || {};

		// redraw vectors since canvas is cleared upon removal
		this._draw();
	},

	_initContainer: function () {
		var container = this._container = document.createElement('canvas');

		L.DomEvent
			.on(container, 'mousemove', this._onMouseMove, this)
			.on(container, 'click dblclick mousedown mouseup contextmenu', this._onClick, this);

		this._ctx = container.getContext('2d');
	},

	_update: function () {
		if (this._map._animatingZoom && this._bounds) { return; }

		L.Renderer.prototype._update.call(this);

		var b = this._bounds,
		    container = this._container,
		    size = b.getSize(),
		    m = L.Browser.retina ? 2 : 1;

		L.DomUtil.setPosition(container, b.min);

		// set canvas size (also clearing it); use double size on retina
		container.width = m * size.x;
		container.height = m * size.y;
		container.style.width = size.x + 'px';
		container.style.height = size.y + 'px';

		if (L.Browser.retina) {
			this._ctx.scale(2, 2);
		}

		// translate so we use the same path coordinates after canvas element moves
		this._ctx.translate(-b.min.x, -b.min.y);
	},

	_initPath: function (layer) {
		this._layers[L.stamp(layer)] = layer;
	},

	_addPath: L.Util.falseFn,

	_removePath: function (layer) {
		layer._removed = true;
		this._requestRedraw(layer);
	},

	_updatePath: function (layer) {
		this._redrawBounds = layer._pxBounds;
		this._draw(true);
		layer._project();
		layer._update();
		this._draw();
		this._redrawBounds = null;
	},

	_updateStyle: function (layer) {
		this._requestRedraw(layer);
	},

	_requestRedraw: function (layer) {
		if (!this._map) { return; }

		this._redrawBounds = this._redrawBounds || new L.Bounds();
		this._redrawBounds.extend(layer._pxBounds.min).extend(layer._pxBounds.max);

		this._redrawRequest = this._redrawRequest || L.Util.requestAnimFrame(this._redraw, this);
	},

	_redraw: function () {
		this._redrawRequest = null;

		this._draw(true); // clear layers in redraw bounds
		this._draw(); // draw layers

		this._redrawBounds = null;
	},

	_draw: function (clear) {
		this._clear = clear;
		var layer;

		for (var id in this._layers) {
			layer = this._layers[id];
			if (!this._redrawBounds || layer._pxBounds.intersects(this._redrawBounds)) {
				layer._updatePath();
			}
			if (clear && layer._removed) {
				delete layer._removed;
				delete this._layers[id];
			}
		}
	},

	_updatePoly: function (layer, closed) {

		var i, j, len2, p,
		    parts = layer._parts,
		    len = parts.length,
		    ctx = this._ctx;

	    if (!len) { return; }

		ctx.beginPath();

		for (i = 0; i < len; i++) {
			for (j = 0, len2 = parts[i].length; j < len2; j++) {
				p = parts[i][j];
				ctx[j ? 'lineTo' : 'moveTo'](p.x, p.y);
			}
			if (closed) {
				ctx.closePath();
			}
		}

		this._fillStroke(ctx, layer);

		// TODO optimization: 1 fill/stroke for all features with equal style instead of 1 for each feature
	},

	_updateCircle: function (layer) {

		if (layer._empty()) { return; }

		var p = layer._point,
		    ctx = this._ctx,
		    r = layer._radius,
		    s = (layer._radiusY || r) / r;

		if (s !== 1) {
			ctx.save();
			ctx.scale(1, s);
		}

		ctx.beginPath();
		ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);

		if (s !== 1) {
			ctx.restore();
		}

		this._fillStroke(ctx, layer);
	},

	_fillStroke: function (ctx, layer) {
		var clear = this._clear,
		    options = layer.options;

		ctx.globalCompositeOperation = clear ? 'destination-out' : 'source-over';

		if (options.fill) {
			ctx.globalAlpha = clear ? 1 : options.fillOpacity;
			ctx.fillStyle = options.fillColor || options.color;
			ctx.fill('evenodd');
		}

		if (options.stroke) {
			ctx.globalAlpha = clear ? 1 : options.opacity;

			// if clearing shape, do it with the previously drawn line width
			layer._prevWeight = ctx.lineWidth = clear ? layer._prevWeight + 1 : options.weight;

			ctx.strokeStyle = options.color;
			ctx.lineCap = options.lineCap;
			ctx.lineJoin = options.lineJoin;
			ctx.stroke();
		}
	},

	// Canvas obviously doesn't have mouse events for individual drawn objects,
	// so we emulate that by calculating what's under the mouse on mousemove/click manually

	_onClick: function (e) {
		var point = this._map.mouseEventToLayerPoint(e);

		for (var id in this._layers) {
			if (this._layers[id]._containsPoint(point)) {
				this._layers[id]._fireMouseEvent(e);
			}
		}
	},

	_onMouseMove: function (e) {
		if (!this._map || this._map._animatingZoom) { return; }

		var point = this._map.mouseEventToLayerPoint(e);

		// TODO don't do on each move event, throttle since it's expensive
		for (var id in this._layers) {
			this._handleHover(this._layers[id], e, point);
		}
	},

	_handleHover: function (layer, e, point) {
		if (!layer.options.clickable) { return; }

		if (layer._containsPoint(point)) {
			// if we just got inside the layer, fire mouseover
			if (!layer._mouseInside) {
				L.DomUtil.addClass(this._container, 'leaflet-clickable'); // change cursor
				layer._fireMouseEvent(e, 'mouseover');
				layer._mouseInside = true;
			}
			// fire mousemove
			layer._fireMouseEvent(e);

		} else if (layer._mouseInside) {
			// if we're leaving the layer, fire mouseout
			L.DomUtil.removeClass(this._container, 'leaflet-clickable');
			layer._fireMouseEvent(e, 'mouseout');
			layer._mouseInside = false;
		}
	},

	// TODO _bringToFront & _bringToBack, pretty tricky

	_bringToFront: L.Util.falseFn,
	_bringToBack: L.Util.falseFn
});

L.Browser.canvas = (function () {
	return !!document.createElement('canvas').getContext;
}());

L.canvas = function (options) {
	return L.Browser.canvas ? new L.Canvas(options) : null;
};

L.Polyline.prototype._containsPoint = function (p, closed) {
	var i, j, k, len, len2, part,
	    w = this._clickTolerance();

	if (!this._pxBounds.contains(p)) { return false; }

	// hit detection for polylines
	for (i = 0, len = this._parts.length; i < len; i++) {
		part = this._parts[i];

		for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
			if (!closed && (j === 0)) { continue; }

			if (L.LineUtil.pointToSegmentDistance(p, part[k], part[j]) <= w) {
				return true;
			}
		}
	}
	return false;
};

L.Polygon.prototype._containsPoint = function (p) {
	var inside = false,
	    part, p1, p2, i, j, k, len, len2;

	if (!this._pxBounds.contains(p)) { return false; }

	// ray casting algorithm for detecting if point is in polygon
	for (i = 0, len = this._parts.length; i < len; i++) {
		part = this._parts[i];

		for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
			p1 = part[j];
			p2 = part[k];

			if (((p1.y > p.y) !== (p2.y > p.y)) && (p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
				inside = !inside;
			}
		}
	}

	// also check if it's on polygon stroke
	return inside || L.Polyline.prototype._containsPoint.call(this, p, true);
};

L.CircleMarker.prototype._containsPoint = function (p) {
	return p.distanceTo(this._point) <= this._radius + this._clickTolerance();
};

/*
 * L.GeoJSON turns any GeoJSON data into a Leaflet layer.
 */

L.GeoJSON = L.FeatureGroup.extend({

	initialize: function (geojson, options) {
		L.setOptions(this, options);

		this._layers = {};

		if (geojson) {
			this.addData(geojson);
		}
	},

	addData: function (geojson) {
		var features = L.Util.isArray(geojson) ? geojson : geojson.features,
		    i, len, feature;

		if (features) {
			for (i = 0, len = features.length; i < len; i++) {
				// Only add this if geometry or geometries are set and not null
				feature = features[i];
				if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
					this.addData(feature);
				}
			}
			return this;
		}

		var options = this.options;

		if (options.filter && !options.filter(geojson)) { return; }

		var layer = L.GeoJSON.geometryToLayer(geojson, options);
		layer.feature = L.GeoJSON.asFeature(geojson);

		layer.defaultOptions = layer.options;
		this.resetStyle(layer);

		if (options.onEachFeature) {
			options.onEachFeature(geojson, layer);
		}

		return this.addLayer(layer);
	},

	resetStyle: function (layer) {
		// reset any custom styles
		layer.options = layer.defaultOptions;
		this._setLayerStyle(layer, this.options.style);
	},

	setStyle: function (style) {
		this.eachLayer(function (layer) {
			this._setLayerStyle(layer, style);
		}, this);
	},

	_setLayerStyle: function (layer, style) {
		if (typeof style === 'function') {
			style = style(layer.feature);
		}
		if (layer.setStyle) {
			layer.setStyle(style);
		}
	}
});

L.extend(L.GeoJSON, {
	geometryToLayer: function (geojson, options) {

		var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson,
		    coords = geometry.coordinates,
		    layers = [],
		    pointToLayer = options && options.pointToLayer,
		    coordsToLatLng = options && options.coordsToLatLng || this.coordsToLatLng,
		    latlng, latlngs, i, len;

		switch (geometry.type) {
		case 'Point':
			latlng = coordsToLatLng(coords);
			return pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng);

		case 'MultiPoint':
			for (i = 0, len = coords.length; i < len; i++) {
				latlng = coordsToLatLng(coords[i]);
				layers.push(pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng));
			}
			return new L.FeatureGroup(layers);

		case 'LineString':
		case 'MultiLineString':
			latlngs = this.coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, coordsToLatLng);
			return new L.Polyline(latlngs, options);

		case 'Polygon':
		case 'MultiPolygon':
			latlngs = this.coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, coordsToLatLng);
			return new L.Polygon(latlngs, options);

		case 'GeometryCollection':
			for (i = 0, len = geometry.geometries.length; i < len; i++) {

				layers.push(this.geometryToLayer({
					geometry: geometry.geometries[i],
					type: 'Feature',
					properties: geojson.properties
				}, options));
			}
			return new L.FeatureGroup(layers);

		default:
			throw new Error('Invalid GeoJSON object.');
		}
	},

	coordsToLatLng: function (coords) {
		return new L.LatLng(coords[1], coords[0], coords[2]);
	},

	coordsToLatLngs: function (coords, levelsDeep, coordsToLatLng) {
		var latlngs = [];

		for (var i = 0, len = coords.length, latlng; i < len; i++) {
			latlng = levelsDeep ?
			        this.coordsToLatLngs(coords[i], levelsDeep - 1, coordsToLatLng) :
			        (coordsToLatLng || this.coordsToLatLng)(coords[i]);

			latlngs.push(latlng);
		}

		return latlngs;
	},

	latLngToCoords: function (latlng) {
		return latlng.alt !== undefined ?
				[latlng.lng, latlng.lat, latlng.alt] :
				[latlng.lng, latlng.lat];
	},

	latLngsToCoords: function (latlngs, levelsDeep, closed) {
		var coords = [];

		for (var i = 0, len = latlngs.length; i < len; i++) {
			coords.push(levelsDeep ?
				L.GeoJSON.latLngsToCoords(latlngs[i], levelsDeep - 1, closed):
				L.GeoJSON.latLngToCoords(latlngs[i]));
		}

		if (!levelsDeep && closed) {
			coords.push(coords[0]);
		}

		return coords;
	},

	getFeature: function (layer, newGeometry) {
		return layer.feature ?
				L.extend({}, layer.feature, {geometry: newGeometry}) :
				L.GeoJSON.asFeature(newGeometry);
	},

	asFeature: function (geoJSON) {
		if (geoJSON.type === 'Feature') {
			return geoJSON;
		}

		return {
			type: 'Feature',
			properties: {},
			geometry: geoJSON
		};
	}
});

var PointToGeoJSON = {
	toGeoJSON: function () {
		return L.GeoJSON.getFeature(this, {
			type: 'Point',
			coordinates: L.GeoJSON.latLngToCoords(this.getLatLng())
		});
	}
};

L.Marker.include(PointToGeoJSON);
L.Circle.include(PointToGeoJSON);
L.CircleMarker.include(PointToGeoJSON);

L.Polyline.prototype.toGeoJSON = function () {
	var multi = !this._flat(this._latlngs);

	var coords = L.GeoJSON.latLngsToCoords(this._latlngs, multi ? 1 : 0);

	return L.GeoJSON.getFeature(this, {
		type: (multi ? 'Multi' : '') + 'LineString',
		coordinates: coords
	});
};

L.Polygon.prototype.toGeoJSON = function () {
	var holes = !this._flat(this._latlngs),
	    multi = holes && !this._flat(this._latlngs[0]);

	var coords = L.GeoJSON.latLngsToCoords(this._latlngs, multi ? 2 : holes ? 1 : 0, true);

	if (holes && this._latlngs.length === 1) {
		multi = true;
		coords = [coords];
	}
	if (!holes) {
		coords = [coords];
	}

	return L.GeoJSON.getFeature(this, {
		type: (multi ? 'Multi' : '') + 'Polygon',
		coordinates: coords
	});
};


L.LayerGroup.include({
	toMultiPoint: function () {
		var coords = [];

		this.eachLayer(function (layer) {
			coords.push(layer.toGeoJSON().geometry.coordinates);
		});

		return L.GeoJSON.getFeature(this, {
			type: 'MultiPoint',
			coordinates: coords
		});
	},

	toGeoJSON: function () {

		var type = this.feature && this.feature.geometry && this.feature.geometry.type;

		if (type === 'MultiPoint') {
			return this.toMultiPoint();
		}

		var isGeometryCollection = type === 'GeometryCollection',
			jsons = [];

		this.eachLayer(function (layer) {
			if (layer.toGeoJSON) {
				var json = layer.toGeoJSON();
				jsons.push(isGeometryCollection ? json.geometry : L.GeoJSON.asFeature(json));
			}
		});

		if (isGeometryCollection) {
			return L.GeoJSON.getFeature(this, {
				geometries: jsons,
				type: 'GeometryCollection'
			});
		}

		return {
			type: 'FeatureCollection',
			features: jsons
		};
	}
});

L.geoJson = function (geojson, options) {
	return new L.GeoJSON(geojson, options);
};

/*
 * L.DomEvent contains functions for working with DOM events.
 * Inspired by John Resig, Dean Edwards and YUI addEvent implementations.
 */

var eventsKey = '_leaflet_events';

L.DomEvent = {

	on: function (obj, types, fn, context) {

		if (typeof types === 'object') {
			for (var type in types) {
				this._on(obj, type, types[type], fn);
			}
		} else {
			types = L.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._on(obj, types[i], fn, context);
			}
		}

		return this;
	},

	off: function (obj, types, fn, context) {

		if (typeof types === 'object') {
			for (var type in types) {
				this._off(obj, type, types[type], fn);
			}
		} else {
			types = L.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._off(obj, types[i], fn, context);
			}
		}

		return this;
	},

	_on: function (obj, type, fn, context) {
		var id = type + L.stamp(fn) + (context ? '_' + L.stamp(context) : '');

		if (obj[eventsKey] && obj[eventsKey][id]) { return this; }

		var handler = function (e) {
			return fn.call(context || obj, e || window.event);
		};

		var originalHandler = handler;

		if (L.Browser.pointer && type.indexOf('touch') === 0) {
			return this.addPointerListener(obj, type, handler, id);
		}
		if (L.Browser.touch && (type === 'dblclick') && this.addDoubleTapListener) {
			this.addDoubleTapListener(obj, handler, id);
		}

		if ('addEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.addEventListener('DOMMouseScroll', handler, false);
				obj.addEventListener(type, handler, false);

			} else if ((type === 'mouseenter') || (type === 'mouseleave')) {
				handler = function (e) {
					e = e || window.event;
					if (!L.DomEvent._checkMouse(obj, e)) { return; }
					return originalHandler(e);
				};
				obj.addEventListener(type === 'mouseenter' ? 'mouseover' : 'mouseout', handler, false);

			} else {
				if (type === 'click' && L.Browser.android) {
					handler = function (e) {
						return L.DomEvent._filterClick(e, originalHandler);
					};
				}
				obj.addEventListener(type, handler, false);
			}

		} else if ('attachEvent' in obj) {
			obj.attachEvent('on' + type, handler);
		}

		obj[eventsKey] = obj[eventsKey] || {};
		obj[eventsKey][id] = handler;

		return this;
	},

	_off: function (obj, type, fn, context) {

		var id = type + L.stamp(fn) + (context ? '_' + L.stamp(context) : ''),
		    handler = obj[eventsKey] && obj[eventsKey][id];

		if (!handler) { return this; }

		if (L.Browser.pointer && type.indexOf('touch') === 0) {
			this.removePointerListener(obj, type, id);

		} else if (L.Browser.touch && (type === 'dblclick') && this.removeDoubleTapListener) {
			this.removeDoubleTapListener(obj, id);

		} else if ('removeEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.removeEventListener('DOMMouseScroll', handler, false);
				obj.removeEventListener(type, handler, false);

			} else {
				obj.removeEventListener(
					type === 'mouseenter' ? 'mouseover' :
					type === 'mouseleave' ? 'mouseout' : type, handler, false);
			}

		} else if ('detachEvent' in obj) {
			obj.detachEvent('on' + type, handler);
		}

		obj[eventsKey][id] = null;

		return this;
	},

	stopPropagation: function (e) {

		if (e.stopPropagation) {
			e.stopPropagation();
		} else {
			e.cancelBubble = true;
		}
		L.DomEvent._skipped(e);

		return this;
	},

	disableScrollPropagation: function (el) {
		return L.DomEvent.on(el, 'mousewheel MozMousePixelScroll', L.DomEvent.stopPropagation);
	},

	disableClickPropagation: function (el) {
		var stop = L.DomEvent.stopPropagation;

		L.DomEvent.on(el, L.Draggable.START.join(' '), stop);

		return L.DomEvent.on(el, {
			click: L.DomEvent._fakeStop,
			dblclick: stop
		});
	},

	preventDefault: function (e) {

		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
		return this;
	},

	stop: function (e) {
		return L.DomEvent
			.preventDefault(e)
			.stopPropagation(e);
	},

	getMousePosition: function (e, container) {
		if (!container) {
			return new L.Point(e.clientX, e.clientY);
		}

		var rect = container.getBoundingClientRect();

		return new L.Point(
			e.clientX - rect.left - container.clientLeft,
			e.clientY - rect.top - container.clientTop);
	},

	getWheelDelta: function (e) {

		var delta = 0;

		if (e.wheelDelta) {
			delta = e.wheelDelta / 120;
		}
		if (e.detail) {
			delta = -e.detail / 3;
		}
		return delta;
	},

	_skipEvents: {},

	_fakeStop: function (e) {
		// fakes stopPropagation by setting a special event flag, checked/reset with L.DomEvent._skipped(e)
		L.DomEvent._skipEvents[e.type] = true;
	},

	_skipped: function (e) {
		var skipped = this._skipEvents[e.type];
		// reset when checking, as it's only used in map container and propagates outside of the map
		this._skipEvents[e.type] = false;
		return skipped;
	},

	// check if element really left/entered the event target (for mouseenter/mouseleave)
	_checkMouse: function (el, e) {

		var related = e.relatedTarget;

		if (!related) { return true; }

		try {
			while (related && (related !== el)) {
				related = related.parentNode;
			}
		} catch (err) {
			return false;
		}
		return (related !== el);
	},

	// this is a horrible workaround for a bug in Android where a single touch triggers two click events
	_filterClick: function (e, handler) {
		var timeStamp = (e.timeStamp || e.originalEvent.timeStamp),
			elapsed = L.DomEvent._lastClick && (timeStamp - L.DomEvent._lastClick);

		// are they closer together than 500ms yet more than 100ms?
		// Android typically triggers them ~300ms apart while multiple listeners
		// on the same event should be triggered far faster;
		// or check if click is simulated on the element, and if it is, reject any non-simulated events

		if ((elapsed && elapsed > 100 && elapsed < 500) || (e.target._simulatedClick && !e._simulated)) {
			L.DomEvent.stop(e);
			return;
		}
		L.DomEvent._lastClick = timeStamp;

		return handler(e);
	}
};

L.DomEvent.addListener = L.DomEvent.on;
L.DomEvent.removeListener = L.DomEvent.off;

/*
 * L.Draggable allows you to add dragging capabilities to any element. Supports mobile devices too.
 */

L.Draggable = L.Evented.extend({

	statics: {
		START: L.Browser.touch ? ['touchstart', 'mousedown'] : ['mousedown'],
		END: {
			mousedown: 'mouseup',
			touchstart: 'touchend',
			pointerdown: 'touchend',
			MSPointerDown: 'touchend'
		},
		MOVE: {
			mousedown: 'mousemove',
			touchstart: 'touchmove',
			pointerdown: 'touchmove',
			MSPointerDown: 'touchmove'
		}
	},

	initialize: function (element, dragStartTarget) {
		this._element = element;
		this._dragStartTarget = dragStartTarget || element;
	},

	enable: function () {
		if (this._enabled) { return; }

		L.DomEvent.on(this._dragStartTarget, L.Draggable.START.join(' '), this._onDown, this);

		this._enabled = true;
	},

	disable: function () {
		if (!this._enabled) { return; }

		L.DomEvent.off(this._dragStartTarget, L.Draggable.START.join(' '), this._onDown, this);

		this._enabled = false;
		this._moved = false;
	},

	_onDown: function (e) {
		this._moved = false;

		if (e.shiftKey || ((e.which !== 1) && (e.button !== 1) && !e.touches)) { return; }

		L.DomEvent.stopPropagation(e);

		if (L.Draggable._disabled) { return; }

		L.DomUtil.disableImageDrag();
		L.DomUtil.disableTextSelection();

		if (this._moving) { return; }

		this.fire('down');

		var first = e.touches ? e.touches[0] : e;

		this._startPoint = new L.Point(first.clientX, first.clientY);
		this._startPos = this._newPos = L.DomUtil.getPosition(this._element);

		L.DomEvent
		    .on(document, L.Draggable.MOVE[e.type], this._onMove, this)
		    .on(document, L.Draggable.END[e.type], this._onUp, this);
	},

	_onMove: function (e) {
		if (e.touches && e.touches.length > 1) {
			this._moved = true;
			return;
		}

		var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
		    newPoint = new L.Point(first.clientX, first.clientY),
		    offset = newPoint.subtract(this._startPoint);

		if (!offset.x && !offset.y) { return; }
		if (L.Browser.touch && Math.abs(offset.x) + Math.abs(offset.y) < 3) { return; }

		L.DomEvent.preventDefault(e);

		if (!this._moved) {
			this.fire('dragstart');

			this._moved = true;
			this._startPos = L.DomUtil.getPosition(this._element).subtract(offset);

			L.DomUtil.addClass(document.body, 'leaflet-dragging');
			L.DomUtil.addClass(e.target || e.srcElement, 'leaflet-drag-target');
		}

		this._newPos = this._startPos.add(offset);
		this._moving = true;

		L.Util.cancelAnimFrame(this._animRequest);
		this._animRequest = L.Util.requestAnimFrame(this._updatePosition, this, true, this._dragStartTarget);
	},

	_updatePosition: function () {
		this.fire('predrag');
		L.DomUtil.setPosition(this._element, this._newPos);
		this.fire('drag');
	},

	_onUp: function (e) {
		L.DomUtil.removeClass(document.body, 'leaflet-dragging');
		L.DomUtil.removeClass(e.target || e.srcElement, 'leaflet-drag-target');

		for (var i in L.Draggable.MOVE) {
			L.DomEvent
			    .off(document, L.Draggable.MOVE[i], this._onMove, this)
			    .off(document, L.Draggable.END[i], this._onUp, this);
		}

		L.DomUtil.enableImageDrag();
		L.DomUtil.enableTextSelection();

		if (this._moved && this._moving) {
			// ensure drag is not fired after dragend
			L.Util.cancelAnimFrame(this._animRequest);

			this.fire('dragend', {
				distance: this._newPos.distanceTo(this._startPos)
			});
		}

		this._moving = false;
	}
});

/*
	L.Handler is a base class for handler classes that are used internally to inject
	interaction features like dragging to classes like Map and Marker.
*/

L.Handler = L.Class.extend({
	initialize: function (map) {
		this._map = map;
	},

	enable: function () {
		if (this._enabled) { return; }

		this._enabled = true;
		this.addHooks();
	},

	disable: function () {
		if (!this._enabled) { return; }

		this._enabled = false;
		this.removeHooks();
	},

	enabled: function () {
		return !!this._enabled;
	}
});

/*
 * L.Handler.MapDrag is used to make the map draggable (with panning inertia), enabled by default.
 */

L.Map.mergeOptions({
	dragging: true,

	inertia: !L.Browser.android23,
	inertiaDeceleration: 3400, // px/s^2
	inertiaMaxSpeed: Infinity, // px/s
	inertiaThreshold: L.Browser.touch ? 32 : 18, // ms
	easeLinearity: 0.25,

	// TODO refactor, move to CRS
	worldCopyJump: false
});

L.Map.Drag = L.Handler.extend({
	addHooks: function () {
		if (!this._draggable) {
			var map = this._map;

			this._draggable = new L.Draggable(map._mapPane, map._container);

			this._draggable.on({
				down: this._onDown,
				dragstart: this._onDragStart,
				drag: this._onDrag,
				dragend: this._onDragEnd
			}, this);

			if (map.options.worldCopyJump) {
				this._draggable.on('predrag', this._onPreDrag, this);
				map.on('viewreset', this._onViewReset, this);

				map.whenReady(this._onViewReset, this);
			}
		}
		this._draggable.enable();
	},

	removeHooks: function () {
		this._draggable.disable();
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_onDown: function () {
		if (this._map._panAnim) {
			this._map._panAnim.stop();
		}
	},

	_onDragStart: function () {
		var map = this._map;

		map
		    .fire('movestart')
		    .fire('dragstart');

		if (map.options.inertia) {
			this._positions = [];
			this._times = [];
		}
	},

	_onDrag: function () {
		if (this._map.options.inertia) {
			var time = this._lastTime = +new Date(),
			    pos = this._lastPos = this._draggable._newPos;

			this._positions.push(pos);
			this._times.push(time);

			if (time - this._times[0] > 200) {
				this._positions.shift();
				this._times.shift();
			}
		}

		this._map
		    .fire('move')
		    .fire('drag');
	},

	_onViewReset: function () {
		var pxCenter = this._map.getSize().divideBy(2),
		    pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);

		this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
		this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
	},

	_onPreDrag: function () {
		// TODO refactor to be able to adjust map pane position after zoom
		var worldWidth = this._worldWidth,
		    halfWidth = Math.round(worldWidth / 2),
		    dx = this._initialWorldOffset,
		    x = this._draggable._newPos.x,
		    newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx,
		    newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx,
		    newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;

		this._draggable._newPos.x = newX;
	},

	_onDragEnd: function (e) {
		var map = this._map,
		    options = map.options,
		    delay = +new Date() - this._lastTime,

		    noInertia = !options.inertia || delay > options.inertiaThreshold || !this._positions[0];

		map.fire('dragend', e);

		if (noInertia) {
			map.fire('moveend');

		} else {

			var direction = this._lastPos.subtract(this._positions[0]),
			    duration = (this._lastTime + delay - this._times[0]) / 1000,
			    ease = options.easeLinearity,

			    speedVector = direction.multiplyBy(ease / duration),
			    speed = speedVector.distanceTo([0, 0]),

			    limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
			    limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),

			    decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease),
			    offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();

			if (!offset.x || !offset.y) {
				map.fire('moveend');

			} else {
				offset = map._limitOffset(offset, map.options.maxBounds);

				L.Util.requestAnimFrame(function () {
					map.panBy(offset, {
						duration: decelerationDuration,
						easeLinearity: ease,
						noMoveStart: true
					});
				});
			}
		}
	}
});

L.Map.addInitHook('addHandler', 'dragging', L.Map.Drag);

/*
 * L.Handler.DoubleClickZoom is used to handle double-click zoom on the map, enabled by default.
 */

L.Map.mergeOptions({
	doubleClickZoom: true
});

L.Map.DoubleClickZoom = L.Handler.extend({
	addHooks: function () {
		this._map.on('dblclick', this._onDoubleClick, this);
	},

	removeHooks: function () {
		this._map.off('dblclick', this._onDoubleClick, this);
	},

	_onDoubleClick: function (e) {
		var map = this._map,
		    zoom = map.getZoom() + (e.originalEvent.shiftKey ? -1 : 1);

		if (map.options.doubleClickZoom === 'center') {
			map.setZoom(zoom);
		} else {
			map.setZoomAround(e.containerPoint, zoom);
		}
	}
});

L.Map.addInitHook('addHandler', 'doubleClickZoom', L.Map.DoubleClickZoom);

/*
 * L.Handler.ScrollWheelZoom is used by L.Map to enable mouse scroll wheel zoom on the map.
 */

L.Map.mergeOptions({
	scrollWheelZoom: true
});

L.Map.ScrollWheelZoom = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, {
			mousewheel: this._onWheelScroll,
			MozMousePixelScroll: L.DomEvent.preventDefault
		}, this);

		this._delta = 0;
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, {
			mousewheel: this._onWheelScroll,
			MozMousePixelScroll: L.DomEvent.preventDefault
		}, this);
	},

	_onWheelScroll: function (e) {
		var delta = L.DomEvent.getWheelDelta(e);

		this._delta += delta;
		this._lastMousePos = this._map.mouseEventToContainerPoint(e);

		if (!this._startTime) {
			this._startTime = +new Date();
		}

		var left = Math.max(40 - (+new Date() - this._startTime), 0);

		clearTimeout(this._timer);
		this._timer = setTimeout(L.bind(this._performZoom, this), left);

		L.DomEvent.stop(e);
	},

	_performZoom: function () {
		var map = this._map,
		    delta = this._delta,
		    zoom = map.getZoom();

		delta = delta > 0 ? Math.ceil(delta) : Math.floor(delta);
		delta = Math.max(Math.min(delta, 4), -4);
		delta = map._limitZoom(zoom + delta) - zoom;

		this._delta = 0;
		this._startTime = null;

		if (!delta) { return; }

		if (map.options.scrollWheelZoom === 'center') {
			map.setZoom(zoom + delta);
		} else {
			map.setZoomAround(this._lastMousePos, zoom + delta);
		}
	}
});

L.Map.addInitHook('addHandler', 'scrollWheelZoom', L.Map.ScrollWheelZoom);

/*
 * L.PosAnimation is used by Leaflet internally for pan animations.
 */

L.PosAnimation = L.Evented.extend({

	run: function (el, newPos, duration, easeLinearity) { // (HTMLElement, Point[, Number, Number])
		this.stop();

		this._el = el;
		this._inProgress = true;
		this._newPos = newPos;

		this.fire('start');

		el.style[L.DomUtil.TRANSITION] = 'all ' + (duration || 0.25) +
		        's cubic-bezier(0,0,' + (easeLinearity || 0.5) + ',1)';

		L.DomEvent.on(el, L.DomUtil.TRANSITION_END, this._onTransitionEnd, this);
		L.DomUtil.setPosition(el, newPos);

		// toggle reflow, Chrome flickers for some reason if you don't do this
		L.Util.falseFn(el.offsetWidth);

		// there's no native way to track value updates of transitioned properties, so we imitate this
		this._stepTimer = setInterval(L.bind(this._onStep, this), 50);
	},

	stop: function () {
		if (!this._inProgress) { return; }

		// if we just removed the transition property, the element would jump to its final position,
		// so we need to make it stay at the current position

		this._newPos = this._getPos();
		L.DomUtil.setPosition(this._el, this._newPos);

		this._onTransitionEnd();
		L.Util.falseFn(this._el.offsetWidth); // force reflow in case we are about to start a new animation
	},

	_onStep: function () {
		var stepPos = this._getPos();
		if (!stepPos) {
			this._onTransitionEnd();
			return;
		}
		// jshint camelcase: false
		// make L.DomUtil.getPosition return intermediate position value during animation
		this._el._leaflet_pos = stepPos;

		this.fire('step');
	},

	// you can't easily get intermediate values of properties animated with CSS3 Transitions,
	// we need to parse computed style (in case of transform it returns matrix string)

	_transformRe: /([-+]?(?:\d*\.)?\d+)\D*, ([-+]?(?:\d*\.)?\d+)\D*\)/,

	_getPos: function () {
		var left, top, matches,
		    el = this._el,
		    style = window.getComputedStyle(el);

		if (L.Browser.any3d) {
			matches = style[L.DomUtil.TRANSFORM].match(this._transformRe);
			if (!matches) { return; }
			left = parseFloat(matches[1]);
			top  = parseFloat(matches[2]);
		} else {
			left = parseFloat(style.left);
			top  = parseFloat(style.top);
		}

		return new L.Point(left, top, true);
	},

	_onTransitionEnd: function () {
		L.DomEvent.off(this._el, L.DomUtil.TRANSITION_END, this._onTransitionEnd, this);

		if (!this._inProgress) { return; }
		this._inProgress = false;

		this._el.style[L.DomUtil.TRANSITION] = '';

		// jshint camelcase: false
		// make sure L.DomUtil.getPosition returns the final position value after animation
		this._el._leaflet_pos = this._newPos;

		clearInterval(this._stepTimer);

		this.fire('step').fire('end');
	}

});

/*
 * Extends L.Map to handle panning animations.
 */

L.Map.include({

	setView: function (center, zoom, options) {

		zoom = zoom === undefined ? this._zoom : this._limitZoom(zoom);
		center = this._limitCenter(L.latLng(center), zoom, this.options.maxBounds);
		options = options || {};

		if (this._panAnim) {
			this._panAnim.stop();
		}

		if (this._loaded && !options.reset && options !== true) {

			if (options.animate !== undefined) {
				options.zoom = L.extend({animate: options.animate}, options.zoom);
				options.pan = L.extend({animate: options.animate}, options.pan);
			}

			// try animating pan or zoom
			var animated = (this._zoom !== zoom) ?
				this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom, options.zoom) :
				this._tryAnimatedPan(center, options.pan);

			if (animated) {
				// prevent resize handler call, the view will refresh after animation anyway
				clearTimeout(this._sizeTimer);
				return this;
			}
		}

		// animation didn't start, just reset the map view
		this._resetView(center, zoom);

		return this;
	},

	panBy: function (offset, options) {
		offset = L.point(offset).round();
		options = options || {};

		if (!offset.x && !offset.y) {
			return this;
		}

		if (!this._panAnim) {
			this._panAnim = new L.PosAnimation();

			this._panAnim.on({
				'step': this._onPanTransitionStep,
				'end': this._onPanTransitionEnd
			}, this);
		}

		// don't fire movestart if animating inertia
		if (!options.noMoveStart) {
			this.fire('movestart');
		}

		// animate pan unless animate: false specified
		if (options.animate !== false) {
			L.DomUtil.addClass(this._mapPane, 'leaflet-pan-anim');

			var newPos = this._getMapPanePos().subtract(offset);
			this._panAnim.run(this._mapPane, newPos, options.duration || 0.25, options.easeLinearity);
		} else {
			this._rawPanBy(offset);
			this.fire('move').fire('moveend');
		}

		return this;
	},

	_onPanTransitionStep: function () {
		this.fire('move');
	},

	_onPanTransitionEnd: function () {
		L.DomUtil.removeClass(this._mapPane, 'leaflet-pan-anim');
		this.fire('moveend');
	},

	_tryAnimatedPan: function (center, options) {
		// difference between the new and current centers in pixels
		var offset = this._getCenterOffset(center)._floor();

		// don't animate too far unless animate: true specified in options
		if ((options && options.animate) !== true && !this.getSize().contains(offset)) { return false; }

		this.panBy(offset, options);

		return true;
	}
});

/*
 * Extends L.Map to handle zoom animations.
 */

L.Map.mergeOptions({
	zoomAnimation: true,
	zoomAnimationThreshold: 4
});

var zoomAnimated = L.DomUtil.TRANSITION && L.Browser.any3d && !L.Browser.mobileOpera;

if (zoomAnimated) {

	L.Map.addInitHook(function () {
		// don't animate on browsers without hardware-accelerated transitions or old Android/Opera
		this._zoomAnimated = this.options.zoomAnimation;

		// zoom transitions run with the same duration for all layers, so if one of transitionend events
		// happens after starting zoom animation (propagating to the map pane), we know that it ended globally
		if (this._zoomAnimated) {
			L.DomEvent.on(this._mapPane, L.DomUtil.TRANSITION_END, this._catchTransitionEnd, this);
		}
	});
}

L.Map.include(!zoomAnimated ? {} : {

	_catchTransitionEnd: function (e) {
		if (this._animatingZoom && e.propertyName.indexOf('transform') >= 0) {
			this._onZoomTransitionEnd();
		}
	},

	_nothingToAnimate: function () {
		return !this._container.getElementsByClassName('leaflet-zoom-animated').length;
	},

	_tryAnimatedZoom: function (center, zoom, options) {

		if (this._animatingZoom) { return true; }

		options = options || {};

		// don't animate if disabled, not supported or zoom difference is too large
		if (!this._zoomAnimated || options.animate === false || this._nothingToAnimate() ||
		        Math.abs(zoom - this._zoom) > this.options.zoomAnimationThreshold) { return false; }

		// offset is the pixel coords of the zoom origin relative to the current center
		var scale = this.getZoomScale(zoom),
		    offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale);

		// don't animate if the zoom origin isn't within one screen from the current center, unless forced
		if (options.animate !== true && !this.getSize().contains(offset)) { return false; }

		L.Util.requestAnimFrame(function () {
			this
			    .fire('movestart')
			    .fire('zoomstart')
			    ._animateZoom(center, zoom, true);
		}, this);

		return true;
	},

	_animateZoom: function (center, zoom, startAnim) {
		if (startAnim) {
			this._animatingZoom = true;

			// remember what center/zoom to set after animation
			this._animateToCenter = center;
			this._animateToZoom = zoom;

			// disable any dragging during animation
			if (L.Draggable) {
				L.Draggable._disabled = true;
			}

			L.DomUtil.addClass(this._mapPane, 'leaflet-zoom-anim');
		}

		var scale = this.getZoomScale(zoom),
			origin = this._getCenterLayerPoint().add(this._getCenterOffset(center)._divideBy(1 - 1 / scale));

		this.fire('zoomanim', {
			center: center,
			zoom: zoom,
			origin: origin,
			scale: scale
		});
	},

	_onZoomTransitionEnd: function () {

		this._animatingZoom = false;

		L.DomUtil.removeClass(this._mapPane, 'leaflet-zoom-anim');

		this._resetView(this._animateToCenter, this._animateToZoom, true, true);

		if (L.Draggable) {
			L.Draggable._disabled = false;
		}
	}
});

/*
 * Extends the event handling code with double tap support for mobile browsers.
 */

L.extend(L.DomEvent, {

	_touchstart: L.Browser.msPointer ? 'MSPointerDown' : L.Browser.pointer ? 'pointerdown' : 'touchstart',
	_touchend: L.Browser.msPointer ? 'MSPointerUp' : L.Browser.pointer ? 'pointerup' : 'touchend',

	// inspired by Zepto touch code by Thomas Fuchs
	addDoubleTapListener: function (obj, handler, id) {
		var last, touch,
		    doubleTap = false,
		    delay = 250,
		    trackedTouches = [];

		function onTouchStart(e) {
			var count;

			if (L.Browser.pointer) {
				trackedTouches.push(e.pointerId);
				count = trackedTouches.length;
			} else {
				count = e.touches.length;
			}

			if (count > 1) { return; }

			var now = Date.now(),
			    delta = now - (last || now);

			touch = e.touches ? e.touches[0] : e;
			doubleTap = (delta > 0 && delta <= delay);
			last = now;
		}

		function onTouchEnd(e) {
			if (L.Browser.pointer) {
				var idx = trackedTouches.indexOf(e.pointerId);
				if (idx === -1) { return; }
				trackedTouches.splice(idx, 1);
			}

			if (doubleTap) {
				if (L.Browser.pointer) {
					// work around .type being readonly with MSPointer* events
					var newTouch = {},
						prop, i;

					for (i in touch) {
						prop = touch[i];
						newTouch[i] = prop && prop.bind ? prop.bind(touch) : prop;
					}
					touch = newTouch;
				}
				touch.type = 'dblclick';
				handler(touch);
				last = null;
			}
		}

		var pre = '_leaflet_',
		    touchstart = this._touchstart,
		    touchend = this._touchend;

		obj[pre + touchstart + id] = onTouchStart;
		obj[pre + touchend + id] = onTouchEnd;

		// on pointer we need to listen on the document, otherwise a drag starting on the map and moving off screen
		// will not come through to us, so we will lose track of how many touches are ongoing
		var endElement = L.Browser.pointer ? document.documentElement : obj;

		obj.addEventListener(touchstart, onTouchStart, false);

		endElement.addEventListener(touchend, onTouchEnd, false);
		if (L.Browser.pointer) {
			endElement.addEventListener(L.DomEvent.POINTER_CANCEL, onTouchEnd, false);
		}

		return this;
	},

	removeDoubleTapListener: function (obj, id) {
		var pre = '_leaflet_',
		    endElement = L.Browser.pointer ? document.documentElement : obj,
		    touchend = obj[pre + this._touchend + id];

		obj.removeEventListener(this._touchstart, obj[pre + this._touchstart + id], false);

		endElement.removeEventListener(this._touchend, touchend, false);
		if (L.Browser.pointer) {
			endElement.removeEventListener(L.DomEvent.POINTER_CANCEL, touchend, false);
		}

		return this;
	}
});

/*
 * Extends L.DomEvent to provide touch support for Internet Explorer and Windows-based devices.
 */

L.extend(L.DomEvent, {

	POINTER_DOWN:   L.Browser.msPointer ? 'MSPointerDown'   : 'pointerdown',
	POINTER_MOVE:   L.Browser.msPointer ? 'MSPointerMove'   : 'pointermove',
	POINTER_UP:     L.Browser.msPointer ? 'MSPointerUp'     : 'pointerup',
	POINTER_CANCEL: L.Browser.msPointer ? 'MSPointerCancel' : 'pointercancel',

	_pointers: {},

	// Provides a touch events wrapper for (ms)pointer events.
	// ref http://www.w3.org/TR/pointerevents/ https://www.w3.org/Bugs/Public/show_bug.cgi?id=22890

	addPointerListener: function (obj, type, handler, id) {

		if (type === 'touchstart') {
			this._addPointerStart(obj, handler, id);

		} else if (type === 'touchmove') {
			this._addPointerMove(obj, handler, id);

		} else if (type === 'touchend') {
			this._addPointerEnd(obj, handler, id);
		}

		return this;
	},

	removePointerListener: function (obj, type, id) {
		var handler = obj['_leaflet_' + type + id];

		if (type === 'touchstart') {
			obj.removeEventListener(this.POINTER_DOWN, handler, false);

		} else if (type === 'touchmove') {
			obj.removeEventListener(this.POINTER_MOVE, handler, false);

		} else if (type === 'touchend') {
			obj.removeEventListener(this.POINTER_UP, handler, false);
			obj.removeEventListener(this.POINTER_CANCEL, handler, false);
		}

		return this;
	},

	_addPointerStart: function (obj, handler, id) {
		var onDown = L.bind(function (e) {
			L.DomEvent.preventDefault(e);

			this._pointers[e.pointerId] = e;
			this._handlePointer(e, handler);
		}, this);

		obj['_leaflet_touchstart' + id] = onDown;
		obj.addEventListener(this.POINTER_DOWN, onDown, false);

		// need to also listen for end events to keep the _pointers object accurate
		if (!this._pointerDocListener) {
			var removePointer = L.bind(function (e) {
				delete this._pointers[e.pointerId];
			}, this);

			// we listen documentElement as any drags that end by moving the touch off the screen get fired there
			document.documentElement.addEventListener(this.POINTER_UP, removePointer, false);
			document.documentElement.addEventListener(this.POINTER_CANCEL, removePointer, false);

			this._pointerDocListener = true;
		}
	},

	_handlePointer: function (e, handler) {
		e.touches = [];
		for (var i in this._pointers) {
			e.touches.push(this._pointers[i]);
		}
		e.changedTouches = [e];

		handler(e);
	},

	_addPointerMove: function (obj, handler, id) {
		var onMove = L.bind(function (e) {
			// don't fire touch moves when mouse isn't down
			if ((e.pointerType === e.MSPOINTER_TYPE_MOUSE || e.pointerType === 'mouse') && e.buttons === 0) { return; }

			this._pointers[e.pointerId] = e;
			this._handlePointer(e, handler);
		}, this);

		obj['_leaflet_touchmove' + id] = onMove;
		obj.addEventListener(this.POINTER_MOVE, onMove, false);
	},

	_addPointerEnd: function (obj, handler, id) {
		var onUp = L.bind(function (e) {
			delete this._pointers[e.pointerId];
			this._handlePointer(e, handler);
		}, this);

		obj['_leaflet_touchend' + id] = onUp;
		obj.addEventListener(this.POINTER_UP, onUp, false);
		obj.addEventListener(this.POINTER_CANCEL, onUp, false);
	}
});

/*
 * L.Handler.TouchZoom is used by L.Map to add pinch zoom on supported mobile browsers.
 */

L.Map.mergeOptions({
	touchZoom: L.Browser.touch && !L.Browser.android23,
	bounceAtZoomLimits: true
});

L.Map.TouchZoom = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, 'touchstart', this._onTouchStart, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, 'touchstart', this._onTouchStart, this);
	},

	_onTouchStart: function (e) {
		var map = this._map;

		if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming) { return; }

		var p1 = map.mouseEventToLayerPoint(e.touches[0]),
		    p2 = map.mouseEventToLayerPoint(e.touches[1]),
		    viewCenter = map._getCenterLayerPoint();

		this._startCenter = p1.add(p2)._divideBy(2);
		this._startDist = p1.distanceTo(p2);

		this._moved = false;
		this._zooming = true;

		this._centerOffset = viewCenter.subtract(this._startCenter);

		if (map._panAnim) {
			map._panAnim.stop();
		}

		L.DomEvent
		    .on(document, 'touchmove', this._onTouchMove, this)
		    .on(document, 'touchend', this._onTouchEnd, this);

		L.DomEvent.preventDefault(e);
	},

	_onTouchMove: function (e) {
		if (!e.touches || e.touches.length !== 2 || !this._zooming) { return; }

		var map = this._map,
		    p1 = map.mouseEventToLayerPoint(e.touches[0]),
		    p2 = map.mouseEventToLayerPoint(e.touches[1]);

		this._scale = p1.distanceTo(p2) / this._startDist;
		this._delta = p1._add(p2)._divideBy(2)._subtract(this._startCenter);

		if (!map.options.bounceAtZoomLimits &&
		    ((map.getZoom() === map.getMinZoom() && this._scale < 1) ||
		     (map.getZoom() === map.getMaxZoom() && this._scale > 1))) { return; }

		if (!this._moved) {
			map
			    .fire('movestart')
			    .fire('zoomstart');

			this._moved = true;
		}

		L.Util.cancelAnimFrame(this._animRequest);
		this._animRequest = L.Util.requestAnimFrame(this._updateOnMove, this, true, this._map._container);

		L.DomEvent.preventDefault(e);
	},

	_updateOnMove: function () {
		var map = this._map;

		if (map.options.touchZoom === 'center') {
			this._center = map.getCenter();
		} else {
			this._center = map.layerPointToLatLng(this._getTargetCenter());
		}
		this._zoom = map.getScaleZoom(this._scale);

		map._animateZoom(this._center, this._zoom);
	},

	_onTouchEnd: function () {
		if (!this._moved || !this._zooming) {
			this._zooming = false;
			return;
		}

		this._zooming = false;
		L.Util.cancelAnimFrame(this._animRequest);

		L.DomEvent
		    .off(document, 'touchmove', this._onTouchMove)
		    .off(document, 'touchend', this._onTouchEnd);

		var map = this._map,
		    oldZoom = map.getZoom(),
		    zoomDelta = this._zoom - oldZoom,
		    finalZoom = map._limitZoom(oldZoom + (zoomDelta > 0 ? Math.ceil(zoomDelta) : Math.floor(zoomDelta)));

		map._animateZoom(this._center, finalZoom, true);
	},

	_getTargetCenter: function () {
		var centerOffset = this._centerOffset.subtract(this._delta).divideBy(this._scale);
		return this._startCenter.add(centerOffset);
	}
});

L.Map.addInitHook('addHandler', 'touchZoom', L.Map.TouchZoom);

/*
 * L.Map.Tap is used to enable mobile hacks like quick taps and long hold.
 */

L.Map.mergeOptions({
	tap: true,
	tapTolerance: 15
});

L.Map.Tap = L.Handler.extend({
	addHooks: function () {
		L.DomEvent.on(this._map._container, 'touchstart', this._onDown, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._map._container, 'touchstart', this._onDown, this);
	},

	_onDown: function (e) {
		if (!e.touches) { return; }

		L.DomEvent.preventDefault(e);

		this._fireClick = true;

		// don't simulate click or track longpress if more than 1 touch
		if (e.touches.length > 1) {
			this._fireClick = false;
			clearTimeout(this._holdTimeout);
			return;
		}

		var first = e.touches[0],
		    el = first.target;

		this._startPos = this._newPos = new L.Point(first.clientX, first.clientY);

		// if touching a link, highlight it
		if (el.tagName && el.tagName.toLowerCase() === 'a') {
			L.DomUtil.addClass(el, 'leaflet-active');
		}

		// simulate long hold but setting a timeout
		this._holdTimeout = setTimeout(L.bind(function () {
			if (this._isTapValid()) {
				this._fireClick = false;
				this._onUp();
				this._simulateEvent('contextmenu', first);
			}
		}, this), 1000);
		
		this._simulateEvent('mousedown', first);

		L.DomEvent.on(document, {
			touchmove: this._onMove,
			touchend: this._onUp
		}, this);
	},

	_onUp: function (e) {
		clearTimeout(this._holdTimeout);

		L.DomEvent.off(document, {
			touchmove: this._onMove,
			touchend: this._onUp
		}, this);

		if (this._fireClick && e && e.changedTouches) {

			var first = e.changedTouches[0],
			    el = first.target;

			if (el && el.tagName && el.tagName.toLowerCase() === 'a') {
				L.DomUtil.removeClass(el, 'leaflet-active');
			}
			
			this._simulateEvent('mouseup', first);

			// simulate click if the touch didn't move too much
			if (this._isTapValid()) {
				this._simulateEvent('click', first);
			}
		}
	},

	_isTapValid: function () {
		return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
	},

	_onMove: function (e) {
		var first = e.touches[0];
		this._newPos = new L.Point(first.clientX, first.clientY);
	},

	_simulateEvent: function (type, e) {
		var simulatedEvent = document.createEvent('MouseEvents');

		simulatedEvent._simulated = true;
		e.target._simulatedClick = true;

		simulatedEvent.initMouseEvent(
		        type, true, true, window, 1,
		        e.screenX, e.screenY,
		        e.clientX, e.clientY,
		        false, false, false, false, 0, null);

		e.target.dispatchEvent(simulatedEvent);
	}
});

if (L.Browser.touch && !L.Browser.pointer) {
	L.Map.addInitHook('addHandler', 'tap', L.Map.Tap);
}

/*
 * L.Handler.ShiftDragZoom is used to add shift-drag zoom interaction to the map
  * (zoom to a selected bounding box), enabled by default.
 */

L.Map.mergeOptions({
	boxZoom: true
});

L.Map.BoxZoom = L.Handler.extend({
	initialize: function (map) {
		this._map = map;
		this._container = map._container;
		this._pane = map._panes.overlayPane;
	},

	addHooks: function () {
		L.DomEvent.on(this._container, 'mousedown', this._onMouseDown, this);
	},

	removeHooks: function () {
		L.DomEvent.off(this._container, 'mousedown', this._onMouseDown, this);
	},

	moved: function () {
		return this._moved;
	},

	_onMouseDown: function (e) {
		this._moved = false;

		if (!e.shiftKey || ((e.which !== 1) && (e.button !== 1))) { return false; }

		L.DomUtil.disableTextSelection();
		L.DomUtil.disableImageDrag();

		this._startPoint = this._map.mouseEventToContainerPoint(e);

		L.DomEvent.on(document, {
			mousemove: this._onMouseMove,
		    mouseup: this._onMouseUp,
		    keydown: this._onKeyDown
		}, this);
	},

	_onMouseMove: function (e) {
		if (!this._moved) {
			this._moved = true;

			this._box = L.DomUtil.create('div', 'leaflet-zoom-box', this._container);
			L.DomUtil.addClass(this._container, 'leaflet-crosshair');

			this._map.fire('boxzoomstart');
		}

		this._point = this._map.mouseEventToContainerPoint(e);

		var bounds = new L.Bounds(this._point, this._startPoint),
		    size = bounds.getSize();

		L.DomUtil.setPosition(this._box, bounds.min);

		this._box.style.width  = size.x + 'px';
		this._box.style.height = size.y + 'px';
	},

	_finish: function () {
		if (this._moved) {
			L.DomUtil.remove(this._box);
			L.DomUtil.removeClass(this._container, 'leaflet-crosshair');
		}

		L.DomUtil.enableTextSelection();
		L.DomUtil.enableImageDrag();

		L.DomEvent.off(document, {
			mousemove: this._onMouseMove,
		    mouseup: this._onMouseUp,
		    keydown: this._onKeyDown
		}, this);
	},

	_onMouseUp: function () {

		this._finish();

		if (!this._moved) { return; }

		var bounds = new L.LatLngBounds(
		        this._map.containerPointToLatLng(this._startPoint),
		        this._map.containerPointToLatLng(this._point));

		this._map
			.fitBounds(bounds)
			.fire('boxzoomend', {boxZoomBounds: bounds});
	},

	_onKeyDown: function (e) {
		if (e.keyCode === 27) {
			this._finish();
		}
	}
});

L.Map.addInitHook('addHandler', 'boxZoom', L.Map.BoxZoom);

/*
 * L.Map.Keyboard is handling keyboard interaction with the map, enabled by default.
 */

L.Map.mergeOptions({
	keyboard: true,
	keyboardPanOffset: 80,
	keyboardZoomOffset: 1
});

L.Map.Keyboard = L.Handler.extend({

	keyCodes: {
		left:    [37],
		right:   [39],
		down:    [40],
		up:      [38],
		zoomIn:  [187, 107, 61, 171],
		zoomOut: [189, 109, 173]
	},

	initialize: function (map) {
		this._map = map;

		this._setPanOffset(map.options.keyboardPanOffset);
		this._setZoomOffset(map.options.keyboardZoomOffset);
	},

	addHooks: function () {
		var container = this._map._container;

		// make the container focusable by tabbing
		if (container.tabIndex === -1) {
			container.tabIndex = '0';
		}

		L.DomEvent.on(container, {
		    focus: this._onFocus,
		    blur: this._onBlur,
		    mousedown: this._onMouseDown
		}, this);

		this._map.on({
			focus: this._addHooks,
		    blur: this._removeHooks
		}, this);
	},

	removeHooks: function () {
		this._removeHooks();

		L.DomEvent.off(this._map._container, {
		    focus: this._onFocus,
		    blur: this._onBlur,
		    mousedown: this._onMouseDown
		}, this);

		this._map.off({
			focus: this._addHooks,
		    blur: this._removeHooks
		}, this);
	},

	_onMouseDown: function () {
		if (this._focused) { return; }

		var body = document.body,
		    docEl = document.documentElement,
		    top = body.scrollTop || docEl.scrollTop,
		    left = body.scrollLeft || docEl.scrollLeft;

		this._map._container.focus();

		window.scrollTo(left, top);
	},

	_onFocus: function () {
		this._focused = true;
		this._map.fire('focus');
	},

	_onBlur: function () {
		this._focused = false;
		this._map.fire('blur');
	},

	_setPanOffset: function (pan) {
		var keys = this._panKeys = {},
		    codes = this.keyCodes,
		    i, len;

		for (i = 0, len = codes.left.length; i < len; i++) {
			keys[codes.left[i]] = [-1 * pan, 0];
		}
		for (i = 0, len = codes.right.length; i < len; i++) {
			keys[codes.right[i]] = [pan, 0];
		}
		for (i = 0, len = codes.down.length; i < len; i++) {
			keys[codes.down[i]] = [0, pan];
		}
		for (i = 0, len = codes.up.length; i < len; i++) {
			keys[codes.up[i]] = [0, -1 * pan];
		}
	},

	_setZoomOffset: function (zoom) {
		var keys = this._zoomKeys = {},
		    codes = this.keyCodes,
		    i, len;

		for (i = 0, len = codes.zoomIn.length; i < len; i++) {
			keys[codes.zoomIn[i]] = zoom;
		}
		for (i = 0, len = codes.zoomOut.length; i < len; i++) {
			keys[codes.zoomOut[i]] = -zoom;
		}
	},

	_addHooks: function () {
		L.DomEvent.on(document, 'keydown', this._onKeyDown, this);
	},

	_removeHooks: function () {
		L.DomEvent.off(document, 'keydown', this._onKeyDown, this);
	},

	_onKeyDown: function (e) {
		if (e.altKey || e.ctrlKey || e.metaKey) { return; }

		var key = e.keyCode,
		    map = this._map;

		if (key in this._panKeys) {

			if (map._panAnim && map._panAnim._inProgress) { return; }

			map.panBy(this._panKeys[key]);

			if (map.options.maxBounds) {
				map.panInsideBounds(map.options.maxBounds);
			}

		} else if (key in this._zoomKeys) {
			map.setZoom(map.getZoom() + this._zoomKeys[key]);

		} else {
			return;
		}

		L.DomEvent.stop(e);
	}
});

L.Map.addInitHook('addHandler', 'keyboard', L.Map.Keyboard);

/*
 * L.Handler.MarkerDrag is used internally by L.Marker to make the markers draggable.
 */

L.Handler.MarkerDrag = L.Handler.extend({
	initialize: function (marker) {
		this._marker = marker;
	},

	addHooks: function () {
		var icon = this._marker._icon;

		if (!this._draggable) {
			this._draggable = new L.Draggable(icon, icon);
		}

		this._draggable.on({
			dragstart: this._onDragStart,
			drag: this._onDrag,
			dragend: this._onDragEnd
		}, this).enable();

		L.DomUtil.addClass(icon, 'leaflet-marker-draggable');
	},

	removeHooks: function () {
		this._draggable.off({
			dragstart: this._onDragStart,
			drag: this._onDrag,
			dragend: this._onDragEnd
		}, this).disable();

		L.DomUtil.removeClass(this._marker._icon, 'leaflet-marker-draggable');
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_onDragStart: function () {
		this._marker
		    .closePopup()
		    .fire('movestart')
		    .fire('dragstart');
	},

	_onDrag: function () {
		var marker = this._marker,
		    shadow = marker._shadow,
		    iconPos = L.DomUtil.getPosition(marker._icon),
		    latlng = marker._map.layerPointToLatLng(iconPos);

		// update shadow position
		if (shadow) {
			L.DomUtil.setPosition(shadow, iconPos);
		}

		marker._latlng = latlng;

		marker
		    .fire('move', {latlng: latlng})
		    .fire('drag');
	},

	_onDragEnd: function (e) {
		this._marker
		    .fire('moveend')
		    .fire('dragend', e);
	}
});

/*
 * L.Control is a base class for implementing map controls. Handles positioning.
 * All other controls extend from this class.
 */

L.Control = L.Class.extend({
	options: {
		position: 'topright'
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	getPosition: function () {
		return this.options.position;
	},

	setPosition: function (position) {
		var map = this._map;

		if (map) {
			map.removeControl(this);
		}

		this.options.position = position;

		if (map) {
			map.addControl(this);
		}

		return this;
	},

	getContainer: function () {
		return this._container;
	},

	addTo: function (map) {
		this._map = map;

		var container = this._container = this.onAdd(map),
		    pos = this.getPosition(),
		    corner = map._controlCorners[pos];

		L.DomUtil.addClass(container, 'leaflet-control');

		if (pos.indexOf('bottom') !== -1) {
			corner.insertBefore(container, corner.firstChild);
		} else {
			corner.appendChild(container);
		}

		return this;
	},

	remove: function () {
		L.DomUtil.remove(this._container);

		if (this.onRemove) {
			this.onRemove(this._map);
		}

		this._map = null;

		return this;
	},

	_refocusOnMap: function () {
		if (this._map) {
			this._map.getContainer().focus();
		}
	}
});

L.control = function (options) {
	return new L.Control(options);
};


// adds control-related methods to L.Map

L.Map.include({
	addControl: function (control) {
		control.addTo(this);
		return this;
	},

	removeControl: function (control) {
		control.remove();
		return this;
	},

	_initControlPos: function () {
		var corners = this._controlCorners = {},
		    l = 'leaflet-',
		    container = this._controlContainer =
		            L.DomUtil.create('div', l + 'control-container', this._container);

		function createCorner(vSide, hSide) {
			var className = l + vSide + ' ' + l + hSide;

			corners[vSide + hSide] = L.DomUtil.create('div', className, container);
		}

		createCorner('top', 'left');
		createCorner('top', 'right');
		createCorner('bottom', 'left');
		createCorner('bottom', 'right');
	},

	_clearControlPos: function () {
		L.DomUtil.remove(this._controlContainer);
	}
});

/*
 * L.Control.Attribution is used for displaying attribution on the map (added by default).
 */

L.Control.Attribution = L.Control.extend({
	options: {
		position: 'bottomright',
		prefix: '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>'
	},

	initialize: function (options) {
		L.setOptions(this, options);

		this._attributions = {};
	},

	onAdd: function (map) {
		this._container = L.DomUtil.create('div', 'leaflet-control-attribution');
		L.DomEvent.disableClickPropagation(this._container);

		// TODO ugly, refactor
		for (var i in map._layers) {
			if (map._layers[i].getAttribution) {
				this.addAttribution(map._layers[i].getAttribution());
			}
		}

		this._update();

		return this._container;
	},

	setPrefix: function (prefix) {
		this.options.prefix = prefix;
		this._update();
		return this;
	},

	addAttribution: function (text) {
		if (!text) { return; }

		if (!this._attributions[text]) {
			this._attributions[text] = 0;
		}
		this._attributions[text]++;

		this._update();

		return this;
	},

	removeAttribution: function (text) {
		if (!text) { return; }

		if (this._attributions[text]) {
			this._attributions[text]--;
			this._update();
		}

		return this;
	},

	_update: function () {
		if (!this._map) { return; }

		var attribs = [];

		for (var i in this._attributions) {
			if (this._attributions[i]) {
				attribs.push(i);
			}
		}

		var prefixAndAttribs = [];

		if (this.options.prefix) {
			prefixAndAttribs.push(this.options.prefix);
		}
		if (attribs.length) {
			prefixAndAttribs.push(attribs.join(', '));
		}

		this._container.innerHTML = prefixAndAttribs.join(' | ');
	}
});

L.Map.mergeOptions({
	attributionControl: true
});

L.Map.addInitHook(function () {
	if (this.options.attributionControl) {
		this.attributionControl = (new L.Control.Attribution()).addTo(this);
	}
});

L.control.attribution = function (options) {
	return new L.Control.Attribution(options);
};

/*
 * L.Control.Zoom is used for the default zoom buttons on the map.
 */

L.Control.Zoom = L.Control.extend({
    options: {
        position: 'topleft',
        zoomInText: '+',
        zoomInTitle: 'Zoom in',
        zoomOutText: '-',
        zoomOutTitle: 'Zoom out'
    },

    onAdd: function (map) {
        var zoomName = 'leaflet-control-zoom',
            container = L.DomUtil.create('div', zoomName + ' leaflet-bar'),
            options = this.options;

        this._zoomInButton  = this._createButton(options.zoomInText, options.zoomInTitle,
                zoomName + '-in',  container, this._zoomIn);
        this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
                zoomName + '-out', container, this._zoomOut);

        this._updateDisabled();
        map.on('zoomend zoomlevelschange', this._updateDisabled, this);

        return container;
    },

    onRemove: function (map) {
        map.off('zoomend zoomlevelschange', this._updateDisabled, this);
    },

    _zoomIn: function (e) {
        this._map.zoomIn(e.shiftKey ? 3 : 1);
    },

    _zoomOut: function (e) {
        this._map.zoomOut(e.shiftKey ? 3 : 1);
    },

    _createButton: function (html, title, className, container, fn) {
        var link = L.DomUtil.create('a', className, container);
        link.innerHTML = html;
        link.href = '#';
        link.title = title;

        L.DomEvent
            .on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
            .on(link, 'click', L.DomEvent.stop)
            .on(link, 'click', fn, this)
            .on(link, 'click', this._refocusOnMap, this);

        return link;
    },

    _updateDisabled: function () {
        var map = this._map,
            className = 'leaflet-disabled';

        L.DomUtil.removeClass(this._zoomInButton, className);
        L.DomUtil.removeClass(this._zoomOutButton, className);

        if (map._zoom === map.getMinZoom()) {
            L.DomUtil.addClass(this._zoomOutButton, className);
        }
        if (map._zoom === map.getMaxZoom()) {
            L.DomUtil.addClass(this._zoomInButton, className);
        }
    }
});

L.Map.mergeOptions({
    zoomControl: true
});

L.Map.addInitHook(function () {
    if (this.options.zoomControl) {
        this.zoomControl = new L.Control.Zoom();
        this.addControl(this.zoomControl);
    }
});

L.control.zoom = function (options) {
    return new L.Control.Zoom(options);
};


/*
 * L.Control.Scale is used for displaying metric/imperial scale on the map.
 */

L.Control.Scale = L.Control.extend({
	options: {
		position: 'bottomleft',
		maxWidth: 100,
		metric: true,
		imperial: true
		// updateWhenIdle: false
	},

	onAdd: function (map) {
		var className = 'leaflet-control-scale',
		    container = L.DomUtil.create('div', className),
		    options = this.options;

		this._addScales(options, className + '-line', container);

		map.on(options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
		map.whenReady(this._update, this);

		return container;
	},

	onRemove: function (map) {
		map.off(this.options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
	},

	_addScales: function (options, className, container) {
		if (options.metric) {
			this._mScale = L.DomUtil.create('div', className, container);
		}
		if (options.imperial) {
			this._iScale = L.DomUtil.create('div', className, container);
		}
	},

	_update: function () {
		var map = this._map,
		    y = map.getSize().y / 2;

		var maxMeters = L.CRS.Earth.distance(
				map.containerPointToLatLng([0, y]),
				map.containerPointToLatLng([this.options.maxWidth, y]));

		this._updateScales(maxMeters);
	},

	_updateScales: function (maxMeters) {
		if (this.options.metric && maxMeters) {
			this._updateMetric(maxMeters);
		}
		if (this.options.imperial && maxMeters) {
			this._updateImperial(maxMeters);
		}
	},

	_updateMetric: function (maxMeters) {
		var meters = this._getRoundNum(maxMeters),
		    label = meters < 1000 ? meters + ' m' : (meters / 1000) + ' km';

		this._updateScale(this._mScale, label, meters / maxMeters);
	},

	_updateImperial: function (maxMeters) {
		var maxFeet = maxMeters * 3.2808399,
		    maxMiles, miles, feet;

		if (maxFeet > 5280) {
			maxMiles = maxFeet / 5280;
			miles = this._getRoundNum(maxMiles);
			this._updateScale(this._iScale, miles + ' mi', miles / maxMiles);

		} else {
			feet = this._getRoundNum(maxFeet);
			this._updateScale(this._iScale, feet + ' ft', feet / maxFeet);
		}
	},

	_updateScale: function (scale, text, ratio) {
		scale.style.width = (Math.round(this.options.maxWidth * ratio) - 10) + 'px';
		scale.innerHTML = text;
	},

	_getRoundNum: function (num) {
		var pow10 = Math.pow(10, (Math.floor(num) + '').length - 1),
		    d = num / pow10;

		d = d >= 10 ? 10 :
		    d >= 5 ? 5 :
		    d >= 3 ? 3 :
		    d >= 2 ? 2 : 1;

		return pow10 * d;
	}
});

L.control.scale = function (options) {
	return new L.Control.Scale(options);
};

/*
 * L.Control.Layers is a control to allow users to switch between different layers on the map.
 */

L.Control.Layers = L.Control.extend({
	options: {
		collapsed: true,
		position: 'topright',
		autoZIndex: true
	},

	initialize: function (baseLayers, overlays, options) {
		L.setOptions(this, options);

		this._layers = {};
		this._lastZIndex = 0;
		this._handlingClick = false;

		for (var i in baseLayers) {
			this._addLayer(baseLayers[i], i);
		}

		for (i in overlays) {
			this._addLayer(overlays[i], i, true);
		}
	},

	onAdd: function () {
		this._initLayout();
		this._update();

		return this._container;
	},

	addBaseLayer: function (layer, name) {
		this._addLayer(layer, name);
		return this._update();
	},

	addOverlay: function (layer, name) {
		this._addLayer(layer, name, true);
		return this._update();
	},

	removeLayer: function (layer) {
		layer.off('add remove', this._onLayerChange, this);

		delete this._layers[L.stamp(layer)];
		return this._update();
	},

	_initLayout: function () {
		var className = 'leaflet-control-layers',
		    container = this._container = L.DomUtil.create('div', className);

		// makes this work on IE touch devices by stopping it from firing a mouseout event when the touch is released
		container.setAttribute('aria-haspopup', true);

		if (!L.Browser.touch) {
			L.DomEvent
				.disableClickPropagation(container)
				.disableScrollPropagation(container);
		} else {
			L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
		}

		var form = this._form = L.DomUtil.create('form', className + '-list');

		if (this.options.collapsed) {
			if (!L.Browser.android) {
				L.DomEvent.on(container, {
					mouseenter: this._expand,
					mouseleave: this._collapse
				}, this);
			}

			var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
			link.href = '#';
			link.title = 'Layers';

			if (L.Browser.touch) {
				L.DomEvent
				    .on(link, 'click', L.DomEvent.stop)
				    .on(link, 'click', this._expand, this);
			} else {
				L.DomEvent.on(link, 'focus', this._expand, this);
			}

			// work around for Firefox Android issue https://github.com/Leaflet/Leaflet/issues/2033
			L.DomEvent.on(form, 'click', function () {
				setTimeout(L.bind(this._onInputClick, this), 0);
			}, this);

			this._map.on('click', this._collapse, this);
			// TODO keyboard accessibility
		} else {
			this._expand();
		}

		this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
		this._separator = L.DomUtil.create('div', className + '-separator', form);
		this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);

		container.appendChild(form);
	},

	_addLayer: function (layer, name, overlay) {
		layer.on('add remove', this._onLayerChange, this);

		var id = L.stamp(layer);

		this._layers[id] = {
			layer: layer,
			name: name,
			overlay: overlay
		};

		if (this.options.autoZIndex && layer.setZIndex) {
			this._lastZIndex++;
			layer.setZIndex(this._lastZIndex);
		}
	},

	_update: function () {
		if (!this._container) { return; }

		this._baseLayersList.innerHTML = '';
		this._overlaysList.innerHTML = '';

		var baseLayersPresent, overlaysPresent, i, obj;

		for (i in this._layers) {
			obj = this._layers[i];
			this._addItem(obj);
			overlaysPresent = overlaysPresent || obj.overlay;
			baseLayersPresent = baseLayersPresent || !obj.overlay;
		}

		this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';

		return this;
	},

	_onLayerChange: function (e) {
		if (!this._handlingClick) {
			this._update();
		}

		var overlay = this._layers[L.stamp(e.target)].overlay;

		var type = overlay ?
			(e.type === 'add' ? 'overlayadd' : 'overlayremove') :
			(e.type === 'add' ? 'baselayerchange' : null);

		if (type) {
			this._map.fire(type, e.target);
		}
	},

	// IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
	_createRadioElement: function (name, checked) {

		var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' +
				name + '"' + (checked ? ' checked="checked"' : '') + '/>';

		var radioFragment = document.createElement('div');
		radioFragment.innerHTML = radioHtml;

		return radioFragment.firstChild;
	},

	_addItem: function (obj) {
		var label = document.createElement('label'),
		    checked = this._map.hasLayer(obj.layer),
		    input;

		if (obj.overlay) {
			input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'leaflet-control-layers-selector';
			input.defaultChecked = checked;
		} else {
			input = this._createRadioElement('leaflet-base-layers', checked);
		}

		input.layerId = L.stamp(obj.layer);

		L.DomEvent.on(input, 'click', this._onInputClick, this);

		var name = document.createElement('span');
		name.innerHTML = ' ' + obj.name;

		label.appendChild(input);
		label.appendChild(name);

		var container = obj.overlay ? this._overlaysList : this._baseLayersList;
		container.appendChild(label);

		return label;
	},

	_onInputClick: function () {
		var inputs = this._form.getElementsByTagName('input'),
		    input, layer, hasLayer;

		this._handlingClick = true;

		for (var i = 0, len = inputs.length; i < len; i++) {
			input = inputs[i];
			layer = this._layers[input.layerId].layer;
			hasLayer = this._map.hasLayer(layer);

			if (input.checked && !hasLayer) {
				this._map.addLayer(layer);

			} else if (!input.checked && hasLayer) {
				this._map.removeLayer(layer);
			}
		}

		this._handlingClick = false;

		this._refocusOnMap();
	},

	_expand: function () {
		L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
	},

	_collapse: function () {
		L.DomUtil.removeClass(this._container, 'leaflet-control-layers-expanded');
	}
});

L.control.layers = function (baseLayers, overlays, options) {
	return new L.Control.Layers(baseLayers, overlays, options);
};

/*
 * L.PosAnimation fallback implementation that powers Leaflet pan animations
 * in browsers that don't support CSS3 Transitions.
 */

L.PosAnimation = L.DomUtil.TRANSITION ? L.PosAnimation : L.PosAnimation.extend({

	run: function (el, newPos, duration, easeLinearity) { // (HTMLElement, Point[, Number, Number])
		this.stop();

		this._el = el;
		this._inProgress = true;
		this._duration = duration || 0.25;
		this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);

		this._startPos = L.DomUtil.getPosition(el);
		this._offset = newPos.subtract(this._startPos);
		this._startTime = +new Date();

		this.fire('start');

		this._animate();
	},

	stop: function () {
		if (!this._inProgress) { return; }

		this._step();
		this._complete();
	},

	_animate: function () {
		// animation loop
		this._animId = L.Util.requestAnimFrame(this._animate, this);
		this._step();
	},

	_step: function () {
		var elapsed = (+new Date()) - this._startTime,
		    duration = this._duration * 1000;

		if (elapsed < duration) {
			this._runFrame(this._easeOut(elapsed / duration));
		} else {
			this._runFrame(1);
			this._complete();
		}
	},

	_runFrame: function (progress) {
		var pos = this._startPos.add(this._offset.multiplyBy(progress));
		L.DomUtil.setPosition(this._el, pos);

		this.fire('step');
	},

	_complete: function () {
		L.Util.cancelAnimFrame(this._animId);

		this._inProgress = false;
		this.fire('end');
	},

	_easeOut: function (t) {
		return 1 - Math.pow(1 - t, this._easeOutPower);
	}
});

/*
 * Provides L.Map with convenient shortcuts for using browser geolocation features.
 */

L.Map.include({
	_defaultLocateOptions: {
		timeout: 10000,
		watch: false
		// setView: false
		// maxZoom: <Number>
		// maximumAge: 0
		// enableHighAccuracy: false
	},

	locate: function (/*Object*/ options) {

		options = this._locateOptions = L.extend(this._defaultLocateOptions, options);

		if (!navigator.geolocation) {
			this._handleGeolocationError({
				code: 0,
				message: 'Geolocation not supported.'
			});
			return this;
		}

		var onResponse = L.bind(this._handleGeolocationResponse, this),
			onError = L.bind(this._handleGeolocationError, this);

		if (options.watch) {
			this._locationWatchId =
			        navigator.geolocation.watchPosition(onResponse, onError, options);
		} else {
			navigator.geolocation.getCurrentPosition(onResponse, onError, options);
		}
		return this;
	},

	stopLocate: function () {
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(this._locationWatchId);
		}
		if (this._locateOptions) {
			this._locateOptions.setView = false;
		}
		return this;
	},

	_handleGeolocationError: function (error) {
		var c = error.code,
		    message = error.message ||
		            (c === 1 ? 'permission denied' :
		            (c === 2 ? 'position unavailable' : 'timeout'));

		if (this._locateOptions.setView && !this._loaded) {
			this.fitWorld();
		}

		this.fire('locationerror', {
			code: c,
			message: 'Geolocation error: ' + message + '.'
		});
	},

	_handleGeolocationResponse: function (pos) {
		var lat = pos.coords.latitude,
		    lng = pos.coords.longitude,
		    latlng = new L.LatLng(lat, lng),

		    latAccuracy = 180 * pos.coords.accuracy / 40075017,
		    lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * lat),

		    bounds = L.latLngBounds(
		            [lat - latAccuracy, lng - lngAccuracy],
		            [lat + latAccuracy, lng + lngAccuracy]),

		    options = this._locateOptions;

		if (options.setView) {
			var zoom = this.getBoundsZoom(bounds);
			this.setView(latlng, options.maxZoom ? Math.min(zoom, options.maxZoom) : zoom);
		}

		var data = {
			latlng: latlng,
			bounds: bounds,
			timestamp: pos.timestamp
		};

		for (var i in pos.coords) {
			if (typeof pos.coords[i] === 'number') {
				data[i] = pos.coords[i];
			}
		}

		this.fire('locationfound', data);
	}
});

/**
* @preserve HTML5 Shiv 3.7.2 | @afarkas @jdalton @jon_neal @rem | MIT/GPL2 Licensed
*/
;(function(window, document) {
/*jshint evil:true */
  /** version */
  var version = '3.7.2';

  /** Preset options */
  var options = window.html5 || {};

  /** Used to skip problem elements */
  var reSkip = /^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i;

  /** Not all elements can be cloned in IE **/
  var saveClones = /^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i;

  /** Detect whether the browser supports default html5 styles */
  var supportsHtml5Styles;

  /** Name of the expando, to work with multiple documents or to re-shiv one document */
  var expando = '_html5shiv';

  /** The id for the the documents expando */
  var expanID = 0;

  /** Cached data for each document */
  var expandoData = {};

  /** Detect whether the browser supports unknown elements */
  var supportsUnknownElements;

  (function() {
    try {
        var a = document.createElement('a');
        a.innerHTML = '<xyz></xyz>';
        //if the hidden property is implemented we can assume, that the browser supports basic HTML5 Styles
        supportsHtml5Styles = ('hidden' in a);

        supportsUnknownElements = a.childNodes.length == 1 || (function() {
          // assign a false positive if unable to shiv
          (document.createElement)('a');
          var frag = document.createDocumentFragment();
          return (
            typeof frag.cloneNode == 'undefined' ||
            typeof frag.createDocumentFragment == 'undefined' ||
            typeof frag.createElement == 'undefined'
          );
        }());
    } catch(e) {
      // assign a false positive if detection fails => unable to shiv
      supportsHtml5Styles = true;
      supportsUnknownElements = true;
    }

  }());

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a style sheet with the given CSS text and adds it to the document.
   * @private
   * @param {Document} ownerDocument The document.
   * @param {String} cssText The CSS text.
   * @returns {StyleSheet} The style element.
   */
  function addStyleSheet(ownerDocument, cssText) {
    var p = ownerDocument.createElement('p'),
        parent = ownerDocument.getElementsByTagName('head')[0] || ownerDocument.documentElement;

    p.innerHTML = 'x<style>' + cssText + '</style>';
    return parent.insertBefore(p.lastChild, parent.firstChild);
  }

  /**
   * Returns the value of `html5.elements` as an array.
   * @private
   * @returns {Array} An array of shived element node names.
   */
  function getElements() {
    var elements = html5.elements;
    return typeof elements == 'string' ? elements.split(' ') : elements;
  }

  /**
   * Extends the built-in list of html5 elements
   * @memberOf html5
   * @param {String|Array} newElements whitespace separated list or array of new element names to shiv
   * @param {Document} ownerDocument The context document.
   */
  function addElements(newElements, ownerDocument) {
    var elements = html5.elements;
    if(typeof elements != 'string'){
      elements = elements.join(' ');
    }
    if(typeof newElements != 'string'){
      newElements = newElements.join(' ');
    }
    html5.elements = elements +' '+ newElements;
    shivDocument(ownerDocument);
  }

   /**
   * Returns the data associated to the given document
   * @private
   * @param {Document} ownerDocument The document.
   * @returns {Object} An object of data.
   */
  function getExpandoData(ownerDocument) {
    var data = expandoData[ownerDocument[expando]];
    if (!data) {
        data = {};
        expanID++;
        ownerDocument[expando] = expanID;
        expandoData[expanID] = data;
    }
    return data;
  }

  /**
   * returns a shived element for the given nodeName and document
   * @memberOf html5
   * @param {String} nodeName name of the element
   * @param {Document} ownerDocument The context document.
   * @returns {Object} The shived element.
   */
  function createElement(nodeName, ownerDocument, data){
    if (!ownerDocument) {
        ownerDocument = document;
    }
    if(supportsUnknownElements){
        return ownerDocument.createElement(nodeName);
    }
    if (!data) {
        data = getExpandoData(ownerDocument);
    }
    var node;

    if (data.cache[nodeName]) {
        node = data.cache[nodeName].cloneNode();
    } else if (saveClones.test(nodeName)) {
        node = (data.cache[nodeName] = data.createElem(nodeName)).cloneNode();
    } else {
        node = data.createElem(nodeName);
    }

    // Avoid adding some elements to fragments in IE < 9 because
    // * Attributes like `name` or `type` cannot be set/changed once an element
    //   is inserted into a document/fragment
    // * Link elements with `src` attributes that are inaccessible, as with
    //   a 403 response, will cause the tab/window to crash
    // * Script elements appended to fragments will execute when their `src`
    //   or `text` property is set
    return node.canHaveChildren && !reSkip.test(nodeName) && !node.tagUrn ? data.frag.appendChild(node) : node;
  }

  /**
   * returns a shived DocumentFragment for the given document
   * @memberOf html5
   * @param {Document} ownerDocument The context document.
   * @returns {Object} The shived DocumentFragment.
   */
  function createDocumentFragment(ownerDocument, data){
    if (!ownerDocument) {
        ownerDocument = document;
    }
    if(supportsUnknownElements){
        return ownerDocument.createDocumentFragment();
    }
    data = data || getExpandoData(ownerDocument);
    var clone = data.frag.cloneNode(),
        i = 0,
        elems = getElements(),
        l = elems.length;
    for(;i<l;i++){
        clone.createElement(elems[i]);
    }
    return clone;
  }

  /**
   * Shivs the `createElement` and `createDocumentFragment` methods of the document.
   * @private
   * @param {Document|DocumentFragment} ownerDocument The document.
   * @param {Object} data of the document.
   */
  function shivMethods(ownerDocument, data) {
    if (!data.cache) {
        data.cache = {};
        data.createElem = ownerDocument.createElement;
        data.createFrag = ownerDocument.createDocumentFragment;
        data.frag = data.createFrag();
    }


    ownerDocument.createElement = function(nodeName) {
      //abort shiv
      if (!html5.shivMethods) {
          return data.createElem(nodeName);
      }
      return createElement(nodeName, ownerDocument, data);
    };

    ownerDocument.createDocumentFragment = Function('h,f', 'return function(){' +
      'var n=f.cloneNode(),c=n.createElement;' +
      'h.shivMethods&&(' +
        // unroll the `createElement` calls
        getElements().join().replace(/[\w\-:]+/g, function(nodeName) {
          data.createElem(nodeName);
          data.frag.createElement(nodeName);
          return 'c("' + nodeName + '")';
        }) +
      ');return n}'
    )(html5, data.frag);
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Shivs the given document.
   * @memberOf html5
   * @param {Document} ownerDocument The document to shiv.
   * @returns {Document} The shived document.
   */
  function shivDocument(ownerDocument) {
    if (!ownerDocument) {
        ownerDocument = document;
    }
    var data = getExpandoData(ownerDocument);

    if (html5.shivCSS && !supportsHtml5Styles && !data.hasCSS) {
      data.hasCSS = !!addStyleSheet(ownerDocument,
        // corrects block display not defined in IE6/7/8/9
        'article,aside,dialog,figcaption,figure,footer,header,hgroup,main,nav,section{display:block}' +
        // adds styling not present in IE6/7/8/9
        'mark{background:#FF0;color:#000}' +
        // hides non-rendered elements
        'template{display:none}'
      );
    }
    if (!supportsUnknownElements) {
      shivMethods(ownerDocument, data);
    }
    return ownerDocument;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The `html5` object is exposed so that more elements can be shived and
   * existing shiving can be detected on iframes.
   * @type Object
   * @example
   *
   * // options can be changed before the script is included
   * html5 = { 'elements': 'mark section', 'shivCSS': false, 'shivMethods': false };
   */
  var html5 = {

    /**
     * An array or space separated string of node names of the elements to shiv.
     * @memberOf html5
     * @type Array|String
     */
    'elements': options.elements || 'abbr article aside audio bdi canvas data datalist details dialog figcaption figure footer header hgroup main mark meter nav output picture progress section summary template time video',

    /**
     * current version of html5shiv
     */
    'version': version,

    /**
     * A flag to indicate that the HTML5 style sheet should be inserted.
     * @memberOf html5
     * @type Boolean
     */
    'shivCSS': (options.shivCSS !== false),

    /**
     * Is equal to true if a browser supports creating unknown/HTML5 elements
     * @memberOf html5
     * @type boolean
     */
    'supportsUnknownElements': supportsUnknownElements,

    /**
     * A flag to indicate that the document's `createElement` and `createDocumentFragment`
     * methods should be overwritten.
     * @memberOf html5
     * @type Boolean
     */
    'shivMethods': (options.shivMethods !== false),

    /**
     * A string to describe the type of `html5` object ("default" or "default print").
     * @memberOf html5
     * @type String
     */
    'type': 'default',

    // shivs the document according to the specified `html5` object options
    'shivDocument': shivDocument,

    //creates a shived element
    createElement: createElement,

    //creates a shived documentFragment
    createDocumentFragment: createDocumentFragment,

    //extends list of elements
    addElements: addElements
  };

  /*--------------------------------------------------------------------------*/

  // expose html5
  window.html5 = html5;

  // shiv the document
  shivDocument(document);

}(this, document));

if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisArg */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = new Array(len);
    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++)
    {
      // NOTE: Absolute correctness would demand Object.defineProperty
      //       be used.  But this method is fairly new, and failure is
      //       possible only if Object.prototype or Array.prototype
      //       has a property |i| (very unlikely), so use a less-correct
      //       but more portable alternative.
      if (i in t)
        res[i] = fun.call(thisArg, t[i], i, t);
    }

    return res;
  };
}

/* reduce implemintation by Mozila https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FArray%2FReduce*/
if ('function' !== typeof Array.prototype.reduce) {
  Array.prototype.reduce = function(callback, opt_initialValue){
    'use strict';
    if (null === this || 'undefined' === typeof this) {
      // At the moment all modern browsers, that support strict mode, have
      // native implementation of Array.prototype.reduce. For instance, IE8
      // does not support strict mode, so this check is actually useless.
      throw new TypeError(
          'Array.prototype.reduce called on null or undefined');
    }
    if ('function' !== typeof callback) {
      throw new TypeError(callback + ' is not a function');
    }
    var index, value,
        length = this.length >>> 0,
        isValueSet = false;
    if (1 < arguments.length) {
      value = opt_initialValue;
      isValueSet = true;
    }
    for (index = 0; length > index; ++index) {
      if (this.hasOwnProperty(index)) {
        if (isValueSet) {
          value = callback(value, this[index], index, this);
        }
        else {
          value = this[index];
          isValueSet = true;
        }
      }
    }
    if (!isValueSet) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    return value;
  };
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.com/#x15.4.4.18
if (!Array.prototype.forEach) {

  Array.prototype.forEach = function forEach(callback, thisArg) {
    'use strict';
    var T, k;

    if (this == null) {
      throw new TypeError("this is null or not defined");
    }

    var kValue,
        // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
        O = Object(this),

        // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        len = O.length >>> 0; // Hack to convert O.length to a UInt32

    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if ({}.toString.call(callback) !== "[object Function]") {
      throw new TypeError(callback + " is not a function");
    }

    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if (arguments.length >= 2) {
      T = thisArg;
    }

    // 6. Let k be 0
    k = 0;

    // 7. Repeat, while k < len
    while (k < len) {

      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      if (k in O) {

        // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
        kValue = O[k];

        // ii. Call the Call internal method of callback with T as the this value and
        // argument list containing kValue, k, and O.
        callback.call(T, kValue, k, O);
      }
      // d. Increase k by 1.
      k++;
    }
    // 8. return undefined
  };
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function () {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function (obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some
if (!Array.prototype.some)
{
  Array.prototype.some = function(fun /*, thisArg */)
  {
    'use strict';

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== 'function')
      throw new TypeError();

    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++)
    {
      if (i in t && fun.call(thisArg, t[i], i, t))
        return true;
    }

    return false;
  };
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisArg */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = new Array(len);
    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++)
    {
      // NOTE: Absolute correctness would demand Object.defineProperty
      //       be used.  But this method is fairly new, and failure is
      //       possible only if Object.prototype or Array.prototype
      //       has a property |i| (very unlikely), so use a less-correct
      //       but more portable alternative.
      if (i in t)
        res[i] = fun.call(thisArg, t[i], i, t);
    }

    return res;
  };
}

//From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
if (!Array.prototype.filter)
{
  Array.prototype.filter = function(fun /*, thisArg */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun != "function")
      throw new TypeError();

    var res = [];
    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++)
    {
      if (i in t)
      {
        var val = t[i];

        // NOTE: Technically this should Object.defineProperty at
        //       the next index, as push can be affected by
        //       properties on Object.prototype and Array.prototype.
        //       But that method's new, and collisions should be
        //       rare, so use the more-compatible alternative.
        if (fun.call(thisArg, val, i, t))
          res.push(val);
      }
    }

    return res;
  };
}

//From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis
                                 ? this
                                 : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

//From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FArray%2FindexOf
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (searchElement, fromIndex) {
    if ( this === undefined || this === null ) {
      throw new TypeError( '"this" is null or not defined' );
    }

    var length = this.length >>> 0; // Hack to convert object.length to a UInt32

    fromIndex = +fromIndex || 0;

    if (Math.abs(fromIndex) === Infinity) {
      fromIndex = 0;
    }

    if (fromIndex < 0) {
      fromIndex += length;
      if (fromIndex < 0) {
        fromIndex = 0;
      }
    }

    for (;fromIndex < length; fromIndex++) {
      if (this[fromIndex] === searchElement) {
        return fromIndex;
      }
    }

    return -1;
  };
}

if (typeof Promise !== 'function') {
  (function() {
  var define, requireModule, require, requirejs;

  (function() {
    var registry = {}, seen = {};

    define = function(name, deps, callback) {
      registry[name] = { deps: deps, callback: callback };
    };

    requirejs = require = requireModule = function(name) {
    requirejs._eak_seen = registry;

      if (seen[name]) { return seen[name]; }
      seen[name] = {};

      if (!registry[name]) {
        throw new Error("Could not find module " + name);
      }

      var mod = registry[name],
          deps = mod.deps,
          callback = mod.callback,
          reified = [],
          exports;

      for (var i=0, l=deps.length; i<l; i++) {
        if (deps[i] === 'exports') {
          reified.push(exports = {});
        } else {
          reified.push(requireModule(resolve(deps[i])));
        }
      }

      var value = callback.apply(this, reified);
      return seen[name] = exports || value;

      function resolve(child) {
        if (child.charAt(0) !== '.') { return child; }
        var parts = child.split("/");
        var parentBase = name.split("/").slice(0, -1);

        for (var i=0, l=parts.length; i<l; i++) {
          var part = parts[i];

          if (part === '..') { parentBase.pop(); }
          else if (part === '.') { continue; }
          else { parentBase.push(part); }
        }

        return parentBase.join("/");
      }
    };
  })();

  define("promise/all",
    ["./utils","exports"],
    function(__dependency1__, __exports__) {
      "use strict";
      /* global toString */

      var isArray = __dependency1__.isArray;
      var isFunction = __dependency1__.isFunction;

      /**
        Returns a promise that is fulfilled when all the given promises have been
        fulfilled, or rejected if any of them become rejected. The return promise
        is fulfilled with an array that gives all the values in the order they were
        passed in the `promises` array argument.

        Example:

        ```javascript
        var promise1 = RSVP.resolve(1);
        var promise2 = RSVP.resolve(2);
        var promise3 = RSVP.resolve(3);
        var promises = [ promise1, promise2, promise3 ];

        RSVP.all(promises).then(function(array){
          // The array here would be [ 1, 2, 3 ];
        });
        ```

        If any of the `promises` given to `RSVP.all` are rejected, the first promise
        that is rejected will be given as an argument to the returned promises's
        rejection handler. For example:

        Example:

        ```javascript
        var promise1 = RSVP.resolve(1);
        var promise2 = RSVP.reject(new Error("2"));
        var promise3 = RSVP.reject(new Error("3"));
        var promises = [ promise1, promise2, promise3 ];

        RSVP.all(promises).then(function(array){
          // Code here never runs because there are rejected promises!
        }, function(error) {
          // error.message === "2"
        });
        ```

        @method all
        @for RSVP
        @param {Array} promises
        @param {String} label
        @return {Promise} promise that is fulfilled when all `promises` have been
        fulfilled, or rejected if any of them become rejected.
      */
      function all(promises) {
        /*jshint validthis:true */
        var Promise = this;

        if (!isArray(promises)) {
          throw new TypeError('You must pass an array to all.');
        }

        return new Promise(function(resolve, reject) {
          var results = [], remaining = promises.length,
          promise;

          if (remaining === 0) {
            resolve([]);
          }

          function resolver(index) {
            return function(value) {
              resolveAll(index, value);
            };
          }

          function resolveAll(index, value) {
            results[index] = value;
            if (--remaining === 0) {
              resolve(results);
            }
          }

          for (var i = 0; i < promises.length; i++) {
            promise = promises[i];

            if (promise && isFunction(promise.then)) {
              promise.then(resolver(i), reject);
            } else {
              resolveAll(i, promise);
            }
          }
        });
      }

      __exports__.all = all;
    });
  define("promise/asap",
    ["exports"],
    function(__exports__) {
      "use strict";
      var browserGlobal = (typeof window !== 'undefined') ? window : {};
      var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
      var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

      // node
      function useNextTick() {
        return function() {
          process.nextTick(flush);
        };
      }

      function useMutationObserver() {
        var iterations = 0;
        var observer = new BrowserMutationObserver(flush);
        var node = document.createTextNode('');
        observer.observe(node, { characterData: true });

        return function() {
          node.data = (iterations = ++iterations % 2);
        };
      }

      function useSetTimeout() {
        return function() {
          local.setTimeout(flush, 1);
        };
      }

      var queue = [];
      function flush() {
        for (var i = 0; i < queue.length; i++) {
          var tuple = queue[i];
          var callback = tuple[0], arg = tuple[1];
          callback(arg);
        }
        queue = [];
      }

      var scheduleFlush;

      // Decide what async method to use to triggering processing of queued callbacks:
      if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
        scheduleFlush = useNextTick();
      } else if (BrowserMutationObserver) {
        scheduleFlush = useMutationObserver();
      } else {
        scheduleFlush = useSetTimeout();
      }

      function asap(callback, arg) {
        var length = queue.push([callback, arg]);
        if (length === 1) {
          // If length is 1, that means that we need to schedule an async flush.
          // If additional callbacks are queued before the queue is flushed, they
          // will be processed by this flush that we are scheduling.
          scheduleFlush();
        }
      }

      __exports__.asap = asap;
    });
  define("promise/config",
    ["exports"],
    function(__exports__) {
      "use strict";
      var config = {
        instrument: false
      };

      function configure(name, value) {
        if (arguments.length === 2) {
          config[name] = value;
        } else {
          return config[name];
        }
      }

      __exports__.config = config;
      __exports__.configure = configure;
    });
  define("promise/polyfill",
    ["./promise","./utils","exports"],
    function(__dependency1__, __dependency2__, __exports__) {
      "use strict";
      /*global self*/
      var RSVPPromise = __dependency1__.Promise;
      var isFunction = __dependency2__.isFunction;

      function polyfill() {
        var local;

        if (typeof global !== 'undefined') {
          local = global;
        } else if (typeof window !== 'undefined' && window.document) {
          local = window;
        } else {
          local = self;
        }

        var es6PromiseSupport =
          "Promise" in local &&
          // Some of these methods are missing from
          // Firefox/Chrome experimental implementations
          "resolve" in local.Promise &&
          "reject" in local.Promise &&
          "all" in local.Promise &&
          "race" in local.Promise &&
          // Older version of the spec had a resolver object
          // as the arg rather than a function
          (function() {
            var resolve;
            new local.Promise(function(r) { resolve = r; });
            return isFunction(resolve);
          }());

        if (!es6PromiseSupport) {
          local.Promise = RSVPPromise;
        }
      }

      __exports__.polyfill = polyfill;
    });
  define("promise/promise",
    ["./config","./utils","./all","./race","./resolve","./reject","./asap","exports"],
    function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
      "use strict";
      var config = __dependency1__.config;
      var configure = __dependency1__.configure;
      var objectOrFunction = __dependency2__.objectOrFunction;
      var isFunction = __dependency2__.isFunction;
      var now = __dependency2__.now;
      var all = __dependency3__.all;
      var race = __dependency4__.race;
      var staticResolve = __dependency5__.resolve;
      var staticReject = __dependency6__.reject;
      var asap = __dependency7__.asap;

      var counter = 0;

      config.async = asap; // default async is asap;

      function Promise(resolver) {
        if (!isFunction(resolver)) {
          throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
        }

        if (!(this instanceof Promise)) {
          throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
        }

        this._subscribers = [];

        invokeResolver(resolver, this);
      }

      function invokeResolver(resolver, promise) {
        function resolvePromise(value) {
          resolve(promise, value);
        }

        function rejectPromise(reason) {
          reject(promise, reason);
        }

        try {
          resolver(resolvePromise, rejectPromise);
        } catch(e) {
          rejectPromise(e);
        }
      }

      function invokeCallback(settled, promise, callback, detail) {
        var hasCallback = isFunction(callback),
            value, error, succeeded, failed;

        if (hasCallback) {
          try {
            value = callback(detail);
            succeeded = true;
          } catch(e) {
            failed = true;
            error = e;
          }
        } else {
          value = detail;
          succeeded = true;
        }

        if (handleThenable(promise, value)) {
          return;
        } else if (hasCallback && succeeded) {
          resolve(promise, value);
        } else if (failed) {
          reject(promise, error);
        } else if (settled === FULFILLED) {
          resolve(promise, value);
        } else if (settled === REJECTED) {
          reject(promise, value);
        }
      }

      var PENDING   = void 0;
      var SEALED    = 0;
      var FULFILLED = 1;
      var REJECTED  = 2;

      function subscribe(parent, child, onFulfillment, onRejection) {
        var subscribers = parent._subscribers;
        var length = subscribers.length;

        subscribers[length] = child;
        subscribers[length + FULFILLED] = onFulfillment;
        subscribers[length + REJECTED]  = onRejection;
      }

      function publish(promise, settled) {
        var child, callback, subscribers = promise._subscribers, detail = promise._detail;

        for (var i = 0; i < subscribers.length; i += 3) {
          child = subscribers[i];
          callback = subscribers[i + settled];

          invokeCallback(settled, child, callback, detail);
        }

        promise._subscribers = null;
      }

      Promise.prototype = {
        constructor: Promise,

        _state: undefined,
        _detail: undefined,
        _subscribers: undefined,

        then: function(onFulfillment, onRejection) {
          var promise = this;

          var thenPromise = new this.constructor(function() {});

          if (this._state) {
            var callbacks = arguments;
            config.async(function invokePromiseCallback() {
              invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
            });
          } else {
            subscribe(this, thenPromise, onFulfillment, onRejection);
          }

          return thenPromise;
        },

        'catch': function(onRejection) {
          return this.then(null, onRejection);
        }
      };

      Promise.all = all;
      Promise.race = race;
      Promise.resolve = staticResolve;
      Promise.reject = staticReject;

      function handleThenable(promise, value) {
        var then = null,
        resolved;

        try {
          if (promise === value) {
            throw new TypeError("A promises callback cannot return that same promise.");
          }

          if (objectOrFunction(value)) {
            then = value.then;

            if (isFunction(then)) {
              then.call(value, function(val) {
                if (resolved) { return true; }
                resolved = true;

                if (value !== val) {
                  resolve(promise, val);
                } else {
                  fulfill(promise, val);
                }
              }, function(val) {
                if (resolved) { return true; }
                resolved = true;

                reject(promise, val);
              });

              return true;
            }
          }
        } catch (error) {
          if (resolved) { return true; }
          reject(promise, error);
          return true;
        }

        return false;
      }

      function resolve(promise, value) {
        if (promise === value) {
          fulfill(promise, value);
        } else if (!handleThenable(promise, value)) {
          fulfill(promise, value);
        }
      }

      function fulfill(promise, value) {
        if (promise._state !== PENDING) { return; }
        promise._state = SEALED;
        promise._detail = value;

        config.async(publishFulfillment, promise);
      }

      function reject(promise, reason) {
        if (promise._state !== PENDING) { return; }
        promise._state = SEALED;
        promise._detail = reason;

        config.async(publishRejection, promise);
      }

      function publishFulfillment(promise) {
        publish(promise, promise._state = FULFILLED);
      }

      function publishRejection(promise) {
        publish(promise, promise._state = REJECTED);
      }

      __exports__.Promise = Promise;
    });
  define("promise/race",
    ["./utils","exports"],
    function(__dependency1__, __exports__) {
      "use strict";
      /* global toString */
      var isArray = __dependency1__.isArray;

      /**
        `RSVP.race` allows you to watch a series of promises and act as soon as the
        first promise given to the `promises` argument fulfills or rejects.

        Example:

        ```javascript
        var promise1 = new RSVP.Promise(function(resolve, reject){
          setTimeout(function(){
            resolve("promise 1");
          }, 200);
        });

        var promise2 = new RSVP.Promise(function(resolve, reject){
          setTimeout(function(){
            resolve("promise 2");
          }, 100);
        });

        RSVP.race([promise1, promise2]).then(function(result){
          // result === "promise 2" because it was resolved before promise1
          // was resolved.
        });
        ```

        `RSVP.race` is deterministic in that only the state of the first completed
        promise matters. For example, even if other promises given to the `promises`
        array argument are resolved, but the first completed promise has become
        rejected before the other promises became fulfilled, the returned promise
        will become rejected:

        ```javascript
        var promise1 = new RSVP.Promise(function(resolve, reject){
          setTimeout(function(){
            resolve("promise 1");
          }, 200);
        });

        var promise2 = new RSVP.Promise(function(resolve, reject){
          setTimeout(function(){
            reject(new Error("promise 2"));
          }, 100);
        });

        RSVP.race([promise1, promise2]).then(function(result){
          // Code here never runs because there are rejected promises!
        }, function(reason){
          // reason.message === "promise2" because promise 2 became rejected before
          // promise 1 became fulfilled
        });
        ```

        @method race
        @for RSVP
        @param {Array} promises array of promises to observe
        @param {String} label optional string for describing the promise returned.
        Useful for tooling.
        @return {Promise} a promise that becomes fulfilled with the value the first
        completed promises is resolved with if the first completed promise was
        fulfilled, or rejected with the reason that the first completed promise
        was rejected with.
      */
      function race(promises) {
        /*jshint validthis:true */
        var Promise = this;

        if (!isArray(promises)) {
          throw new TypeError('You must pass an array to race.');
        }
        return new Promise(function(resolve, reject) {
          var results = [], promise;

          for (var i = 0; i < promises.length; i++) {
            promise = promises[i];

            if (promise && typeof promise.then === 'function') {
              promise.then(resolve, reject);
            } else {
              resolve(promise);
            }
          }
        });
      }

      __exports__.race = race;
    });
  define("promise/reject",
    ["exports"],
    function(__exports__) {
      "use strict";
      /**
        `RSVP.reject` returns a promise that will become rejected with the passed
        `reason`. `RSVP.reject` is essentially shorthand for the following:

        ```javascript
        var promise = new RSVP.Promise(function(resolve, reject){
          reject(new Error('WHOOPS'));
        });

        promise.then(function(value){
          // Code here doesn't run because the promise is rejected!
        }, function(reason){
          // reason.message === 'WHOOPS'
        });
        ```

        Instead of writing the above, your code now simply becomes the following:

        ```javascript
        var promise = RSVP.reject(new Error('WHOOPS'));

        promise.then(function(value){
          // Code here doesn't run because the promise is rejected!
        }, function(reason){
          // reason.message === 'WHOOPS'
        });
        ```

        @method reject
        @for RSVP
        @param {Any} reason value that the returned promise will be rejected with.
        @param {String} label optional string for identifying the returned promise.
        Useful for tooling.
        @return {Promise} a promise that will become rejected with the given
        `reason`.
      */
      function reject(reason) {
        /*jshint validthis:true */
        var Promise = this;

        return new Promise(function (resolve, reject) {
          reject(reason);
        });
      }

      __exports__.reject = reject;
    });
  define("promise/resolve",
    ["exports"],
    function(__exports__) {
      "use strict";
      function resolve(value) {
        /*jshint validthis:true */
        if (value && typeof value === 'object' && value.constructor === this) {
          return value;
        }

        var Promise = this;

        return new Promise(function(resolve) {
          resolve(value);
        });
      }

      __exports__.resolve = resolve;
    });
  define("promise/utils",
    ["exports"],
    function(__exports__) {
      "use strict";
      function objectOrFunction(x) {
        return isFunction(x) || (typeof x === "object" && x !== null);
      }

      function isFunction(x) {
        return typeof x === "function";
      }

      function isArray(x) {
        return Object.prototype.toString.call(x) === "[object Array]";
      }

      // Date.now is not available in browsers < IE9
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
      var now = Date.now || function() { return new Date().getTime(); };


      __exports__.objectOrFunction = objectOrFunction;
      __exports__.isFunction = isFunction;
      __exports__.isArray = isArray;
      __exports__.now = now;
    });
  requireModule('promise/polyfill').polyfill();
  }());
}

//DG inheritance
var oldDG = window.DG;
DG = new (
    (function () {
        var DgApi = function () {},
            DgApiCore = function () {};

        DgApiCore.prototype = L;
        DgApi.prototype = new DgApiCore();

        return DgApi;
    })()
)();

for (var prop in oldDG) {
    if (oldDG.hasOwnProperty(prop) && typeof DG[prop] === 'undefined') {
        DG[prop] = oldDG[prop];
    }
}

window.__dgApi__ = window.__dgApi__ || {};
DG.version = window.__dgApi__.version;
DG.debug = window.__dgApi__.debug;
DG.Icon.Default.imagePath  = '../img/vendors/leaflet';

/* eslint-disable */
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','http://www.google-analytics.com/analytics.js','ga');
/* eslint-enable */

/*global ga:false*/
ga('create', 'UA-38243181-2', 'none');
ga('send', 'pageview');

//track statistics
var newImg = new Image();
newImg.src = 'http://maps.api.2gis.ru/analytics/track-user.png?' +
            'sr=' + window.screen.width + 'x' + window.screen.height + '&' +
            'v=' + DG.version;

// Improve IHandler
DG.Map.include({
    addHandler: function (name, HandlerClass) {
        if (!HandlerClass) { return this; }

        var options = this.options[name],
            param = (options === Object(options)) ? options : null,
            handler = this[name] = new HandlerClass(this, param);

        this._handlers.push(handler);

        if (options) {
            handler.enable();
        }

        return this;
    }
});

// Apply class to map container for detect when we dont need hover effects
DG.Map.addInitHook(function () {
    if (!DG.Browser.touch) {
        DG.DomUtil.addClass(this._container, 'no-touch');
    }
});

var handlers = window.__dgApi__.callbacks || [],
    chain = Promise.resolve();

// dont pollute global space!
try {
    delete window.__dgApi__;
} catch(e) {
    window.__dgApi__ = undefined; // ie8 cant delete from window object
}

handlers.forEach(function (handlers) {
    chain = chain.then(handlers[0], handlers[1]);
});

DG.then = function (resolve, reject) {
    return chain.then(resolve, reject);
};

// IE8 throw error if `chain.catch`
/* eslint-disable dot-notation, no-console */
chain['catch'](function(err) {
    console.error(err);
});
/* eslint-enable dot-notation, no-console */

DG.plugin = function (plugins) {
    var count,
        jsReg = new RegExp(/.js$/i),
        cssReg = new RegExp(/.css$/i),

    promise = new Promise(function (resolve) {
        function checkLoading() {
            count--;

            if (count === 0) {
                resolve();
            }
        }

        function appendJS(link) {
            var js = document.createElement('script');
            js.setAttribute('type', 'text/javascript');
            js.setAttribute('src', link);
            js.onload = function () {
                checkLoading();
            };
            js.onerror = function () {
                checkLoading();
            };
            // load/error for IE
            js.onreadystatechange = function () {
                if (js.readyState === 'complete' || js.readyState === 'loaded') {
                    checkLoading();
                }
            };

            document.getElementsByTagName('head')[0].appendChild(js);
        }

        function appendCSS(link) {
            var css = document.createElement('link');
            css.setAttribute('rel', 'stylesheet');
            css.setAttribute('type', 'text/css');
            css.setAttribute('href', link);
            document.getElementsByTagName('head')[0].appendChild(css);

            checkLoading();
        }

        function isJs(url) {
            return jsReg.test(url);
        }

        function isCss(url) {
            return cssReg.test(url);
        }

        function appendAsset(asset) {
            if (isJs(asset)) {
                appendJS(asset);
            } else if (isCss(asset)) {
                appendCSS(asset);
            } else {
                count--;
            }
        }

        if (DG.Util.isArray(plugins)) {
            count = plugins.length;
            plugins.forEach(function (plugin) {
                appendAsset(plugin);
            });
        }

        if (typeof plugins === 'string') {
            count = 1;
            appendAsset(plugins);
        }
    });

    return promise;
};

DG.ajax = (function () {

    var win = window,
        doc = document,

        rurl = /^([\w.+-]+:)?(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,
        twoHundo = /^20\d$/,

        // Document location
        ajaxLocParts,
        ajaxLocation,

        byTag = 'getElementsByTagName',
        readyState = 'readyState',
        contentType = 'Content-Type',
        requestedWith = 'X-Requested-With',
        head = doc[byTag]('head')[0],
        uniqid = 0,
        callbackPrefix = 'l_dg_ajax_callback_' + (+new Date()),
        lastValue, // data stored by the most recent JSONP callback
        xmlHttpRequest = 'XMLHttpRequest',
        xDomainRequest = 'XDomainRequest',
        noop = function () {},
        defaultHeaders = {
            contentType: 'application/x-www-form-urlencoded',
            requestedWith: xmlHttpRequest,
            accept: {
                '*':  'text/javascript, text/html, application/xml, text/xml, */*',
                xml:  'application/xml, text/xml',
                html: 'text/html',
                text: 'text/plain',
                json: 'application/json, text/javascript',
                js:   'application/javascript, text/javascript'
            }
        },
        /*global XDomainRequest:false, ActiveXObject:false */
        xhr = function (o) {
            // is it x-domain
            if (o.crossDomain === true) {
                var xhr = win[xmlHttpRequest] ? new XMLHttpRequest() : null;
                if (xhr && 'withCredentials' in xhr) {
                    return xhr;
                } else if (win[xDomainRequest]) {
                    return new XDomainRequest();
                } else {
                    throw new Error('Browser does not support cross-origin requests');
                }
            } else if (win[xmlHttpRequest]) {
                return new XMLHttpRequest();
            } else {
                return new ActiveXObject('Microsoft.XMLHTTP');
            }
        },

        globalSetupOptions = {
            dataFilter: function (data) {
                return data;
            }
        };

    // IE may throw an exception when accessing
    // a field from window.location if document.domain has been set
    try {
        ajaxLocation = location.href;
    } catch (e) {
        // Use the href attribute of an A element
        // since IE will modify it given document.location
        ajaxLocation = document.createElement('a');
        ajaxLocation.href = '';
        ajaxLocation = ajaxLocation.href;
    }

    // Segment location into parts
    ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || [];

    function handleReadyState(r, success, error) {
        return function () {
            // use _aborted to mitigate against IE err c00c023f
            // (can't read props on aborted request objects)
            if (r._aborted) {
                return error(r.request);
            }
            if (r.request && r.request[readyState] === 4) {
                r.request.onreadystatechange = noop;
                if (twoHundo.test(r.request.status)) {
                    success(r.request);
                } else {
                    error(r.request);
                }
            }
        };
    }

    function setHeaders(http, o) {
        var headers = o.headers || {},
            h;

        headers.Accept = headers.Accept || defaultHeaders.accept[o.dataType] || defaultHeaders.accept['*'];

        // breaks cross-origin requests with legacy browsers
        if (!o.crossDomain && !headers[requestedWith]) {
            headers[requestedWith] = defaultHeaders.requestedWith;
        }
        if (!headers[contentType]) {
            headers[contentType] = o.contentType || defaultHeaders.contentType;
        }
        for (h in headers) {
            if (headers.hasOwnProperty(h) && 'setRequestHeader' in http) {
                http.setRequestHeader(h, headers[h]);
            }
        }
    }

    function setCredentials(http, o) {
        if (typeof o.withCredentials !== 'undefined' && typeof http.withCredentials !== 'undefined') {
            http.withCredentials = !!o.withCredentials;
        }
    }

    function generalCallback(data) {
        lastValue = data;
    }

    function urlappend(url, s) {
        return url + (/\?/.test(url) ? '&' : '?') + s;
    }

    function handleJsonp(o, fn, err, url) {
        var reqId = uniqid++,
            cbkey = o.jsonpCallback || 'callback', // the 'callback' key
            cbval = o.jsonpCallbackName || callbackPrefix,
            cbreg = new RegExp('((^|\\?|&)' + cbkey + ')=([^&]+)'),
            match = url.match(cbreg),
            script = doc.createElement('script'),
            loaded = 0,
            isIE10 = navigator.userAgent.indexOf('MSIE 10.0') !== -1;

        if (match) {
            if (match[3] === '?') {
                url = url.replace(cbreg, '$1=' + cbval); // wildcard callback func name
            } else {
                cbval = match[3]; // provided callback func name
            }
        } else {
            url = urlappend(url, cbkey + '=' + cbval); // no callback details, add 'em
        }

        win[cbval] = generalCallback;

        script.type = 'text/javascript';
        script.src = url;
        script.async = true;
        if (typeof script.onreadystatechange !== 'undefined' && !isIE10) {
            // need this for IE due to out-of-order onreadystatechange(), binding script
            // execution to an event listener gives us control over when the script
            // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
            //
            // if this hack is used in IE10 jsonp callback are never called
            script.event = 'onclick';
            script.htmlFor = script.id = '_request_' + reqId;
        }

        script.onerror = function () {
            script.onerror = script.onload = script.onreadystatechange = null;
            err({}, 'Request unknown error', {});
            lastValue = undefined;
            head.removeChild(script);
            loaded = 1;
        };
        script.onload = script.onreadystatechange = function () {
            if ((script[readyState] && script[readyState] !== 'complete' && script[readyState] !== 'loaded') || loaded) {
                return false;
            }
            script.onerror = script.onload = script.onreadystatechange = null;
            if (script.onclick) {
                script.onclick();
            }
            // Call the user callback with the last value stored and clean up values and scripts.
            fn(lastValue);
            lastValue = undefined;
            head.removeChild(script);
            loaded = 1;
        };

        // Add the script to the DOM head
        head.appendChild(script);

        // Enable JSONP timeout
        return {
            abort: function () {
                script.onerror = script.onload = script.onreadystatechange = null;
                err({}, 'Request is aborted: timeout', {});
                lastValue = undefined;
                head.removeChild(script);
                loaded = 1;
            }
        };
    }

    function getRequest(fn, err) {
        var o = this.options,
            method = (o.type || 'GET').toUpperCase(),
            url = typeof o === 'string' ? o : o.url,
            // convert non-string objects to query-string form unless o.processData is false
            data = (o.processData !== false && o.data && typeof o.data !== 'string') ? Ajax.toQueryString(o.data) : (o.data || null),
            http,
            sendWait = false;

        // if we're working on a GET request and we have data then we should append
        // query string to end of URL and not post data
        if ((o.type === 'jsonp' || method === 'GET') && data) {
            url = urlappend(url, data);
            data = null;
        }

        if (o.type === 'jsonp') {
            return handleJsonp(o, fn, err, url);
        }

        http = xhr(o);
        http.open(method, url, o.async === false ? false : true);

        setHeaders(http, o);
        setCredentials(http, o);

        if (win[xDomainRequest] && http instanceof win[xDomainRequest]) {
            http.onload = fn;
            http.onerror = err;
            sendWait = true;
        } else {
            http.onreadystatechange = handleReadyState(this, fn, err);
        }
        if (sendWait) {
            setTimeout(function () {
                http.send(data);
            }, 200);
        } else {
            http.send(data);
        }
        return http;
    }

    function buildParams(prefix, obj, traditional, add) {
        var name, i, v,
            rbracket = /\[\]$/;

        if (DG.Util.isArray(obj)) {
        // Serialize array item.
            for (i = 0; obj && i < obj.length; i++) {
                v = obj[i];
                if (traditional || rbracket.test(prefix)) {
                    // Treat each array item as a scalar.
                    add(prefix, v);
                } else {
                    buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']', v, traditional, add);
                }
            }
        } else if (obj && obj.toString() === '[object Object]') {
            // Serialize object item.
            for (name in obj) {
                if (obj.hasOwnProperty(name)) {
                    buildParams(prefix + '[' + name + ']', obj[name], traditional, add);
                }
            }
        } else {
            // Serialize scalar item.
            add(prefix, obj);
        }
    }

    function setType(url) {
        var m = url.match(/\.(json|jsonp|html|xml)(\?|$)/);
        return m ? m[1] : 'js';
    }

    function isCrossDomain(url) {
        var parts = rurl.exec(url.toLowerCase());
        return !!(parts &&
                (parts[1] !== ajaxLocParts[1] || parts[2] !== ajaxLocParts[2] ||
                    (parts[3] || (parts[1] === 'http:' ? '80' : '443')) !==
                        (ajaxLocParts[3] || (ajaxLocParts[1] === 'http:' ? '80' : '443')))
            );
    }

    function doRequest(o) {

        if (!('crossDomain' in o)) {
            o.crossDomain = isCrossDomain(o.url);
        }

        var self = {};
        self.promise = new Promise(function (resolve, reject) {
            self.abort = function () {
                self._aborted = true;
                reject('aborted');
            };

            self.url = o.url;
            self.timeout = null;
            self.options = o;

            self._aborted = false;
            self._erred = false;
            self._responseArgs = {};

            var type = o.type === 'jsonp' ? o.type : (o.dataType || setType(self.url));

            if (o.timeout) {
                self.timeout = setTimeout(function () {
                    self.abort();
                }, o.timeout);
            }

            function complete(resp) {
                if (o.timeout) {
                    clearTimeout(self.timeout);
                }
                self.timeout = null;
                if (self._erred) {
                    reject(resp);
                } else {
                    resolve(resp);
                }
            }

            function success(resp) {
                resp = (type !== 'jsonp') ? self.request : resp;
                // use global data filter on response text
                var filteredResponse = globalSetupOptions.dataFilter(resp.responseText, type),
                    r = filteredResponse;

                try {
                    resp.responseText = r;
                } catch (e) {
                    // can't assign this in IE<=8, just ignore
                }
                /* eslint-disable no-eval */
                if (r) {
                    switch (type) {
                    case 'json':
                        try {
                            resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')');
                        } catch (err) {
                            return error(resp, 'Could not parse JSON in response', err);
                        }
                        break;
                    case 'js':
                        resp = eval('(' + r + ')');
                        break;
                    case 'html':
                        resp = r;
                        break;
                    case 'xml':
                        resp = resp.responseXML && resp.responseXML.parseError && resp.responseXML.parseError.errorCode && resp.responseXML.parseError.reason ? null : resp.responseXML;
                        break;
                    }
                }
                /* eslint-enable no-eval */
                self._responseArgs.resp = resp;
                complete(resp);
            }

            function error(resp, msg, t) {
                resp = self.request;
                self._responseArgs.resp = resp;
                self._responseArgs.msg = msg;
                self._responseArgs.t = t;
                self._erred = true;
                complete(resp);
            }

            self.request = getRequest.call(self, success, error);
        });

        return self;
    }

    function Ajax(url, options) {

        if (Object.prototype.toString.call(url) === '[object Object]') {
            options = url;
            url = undefined;
        }
        options = options || {};
        options.url = url || options.url;

        var requestPromise = doRequest(options),
            resultPromise = requestPromise.promise;

        if (options.success || options.error || options.complete) {
            resultPromise.then(options.success, options.error);
        }

        resultPromise.abort = requestPromise.abort;

        return resultPromise;
    }

    Ajax.setup = function (options) {
        options = options || {};
        for (var k in options) {
            if (options.hasOwnProperty(k)) {
                globalSetupOptions[k] = options[k];
            }
        }
    };

    Ajax.toQueryString = function (o, trad) {
        var prefix, i,
            traditional = trad || false,
            s = [],
            enc = encodeURIComponent,
            add = function (key, value) {
                // If value is a function, invoke it and return its value
                if (typeof value == 'function') {
                    value = value();
                } else {
                    value = value || '';
                }

                s[s.length] = enc(key) + '=' + enc(value);
            };

        // If an array was passed in, assume that it is an array of form elements.
        if (DG.Util.isArray(o)) {
            for (i = 0; o && i < o.length; i++) {
                add(o[i].name, o[i].value);
            }
        } else {
            // If traditional, encode the "old" way (the way 1.3.2 or older
            // did it), otherwise encode params recursively.
            for (prefix in o) {
                if (o.hasOwnProperty(prefix)) {
                    buildParams(prefix, o[prefix], traditional, add);
                }
            }
        }

        // spaces should be + according to spec
        return s.join('&').replace(/%20/g, '+');
    };

    var testxhr = win[xmlHttpRequest] ? new XMLHttpRequest() : null;

    Ajax.corsSupport = !(!(testxhr && 'withCredentials' in testxhr) && !win[xDomainRequest]) &&
        // cors not available in IE and with cyrillic domain
        !(DG.Browser.ie && document.location.host.toLowerCase().search(/[а-я]/) != -1);

    return Ajax;
})();

DG.Label = DG.Layer.extend({

    options: {
        offset: new DG.Point(12, 15),
        className: 'dg-label',
        zIndexOffset: 0
    },

    _typeOfString : Object.prototype.toString.call('s'),
    _defaultZIndex: 100,

    initialize: function (content, options) {
        DG.Util.setOptions(this, options);

        this._animated = DG.Browser.any3d;
        this._content = content;
    },

    onAdd: function (map) {
        this._map = map;

        if (!this._el) {
            this._initDOM();
        }

        this._visible = true;

        this
            .setContent(this._content)
            ._onViewReset();

        map
            .on('viewreset', this._onViewReset, this)
            .on('zoomanim', this._onZoomAnimation, this);
    },

    onRemove: function (map) {
        map
            .off('viewreset', this._onViewReset, this)
            .off('zoomanim', this._onZoomAnimation, this);

        this._visible = false;

        this._el.removeChild(this._container);
        DG.Util.falseFn(this._container.offsetWidth); // we need reflow here
        this._container = null;

        map.getPanes().markerPane.removeChild(this._el);
        this._el = null;
    },

    _initDOM: function () {
        this._el = DG.DomUtil.create(
                        'div',
                        this.options.className + ' leaflet-zoom-' + (this._animated ? 'animated' : 'hide'),
                        this._map.getPanes().markerPane);
        this._el.style.zIndex = this._defaultZIndex + this.options.zIndexOffset;

        this._container = DG.DomUtil.create('div', this.options.className + '__content', this._el);
        DG.DomUtil.disableTextSelection(this._container);
        DG.DomEvent
            .disableClickPropagation(this._el)
            .on(this._container, 'mousewheel', DG.DomEvent.stopPropagation)
            .on(this._container, 'contextmenu', DG.DomEvent.stopPropagation);
    },

    _onViewReset: function () {
        if (this._visible && this._latlng) {
            DG.DomUtil.setPosition(this._el, this._map.latLngToLayerPoint(this._latlng).add(this.options.offset), DG.Browser.ie);
        }
    },

    _onZoomAnimation: function (opt) {
        if (this._latlng) {
            DG.DomUtil.setPosition(this._el, this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).add(this.options.offset));
        }
    },

    setOffset: function (point) {
        if (point instanceof DG.Point) {
            this.options.offset = point;
            this._onViewReset();
        }
        return this;
    },

    setZIndexOffset: function (zIndex) {
        if (!isNaN(+zIndex)) {
            this.options.zIndexOffset = +zIndex;
            if (this._visible) {
                this._el.style.zIndex = this._defaultZIndex + this.options.zIndexOffset;
            }
        }
        return this;
    },

    setContent: function (content) {
        if (Object.prototype.toString.call(content) !== this._typeOfString) {
            return this;
        }
        this._content = content;
        if (this._visible) {
            this._container.innerHTML = content;
        }
        return this;
    },

    setPosition: function (latlng) {
        if (!(latlng instanceof DG.LatLng)) {
            return this;
        }

        this._latlng = latlng;
        this._onViewReset();
        return this;
    }
});

DG.label = function (content, options) {
    return new DG.Label(content, options);
};

DG.Marker.include({

    bindLabel: function (content, options) {
        if (this._label) {
            this._label.setContent(content);
            if (options) {
                if (this.options.offset !== options.offset) {
                    this._label.setOffset(this.options.offset = options.offset);
                }
                if (this.options.static !== options.static) {
                    this.unbindLabel().bindLabel(content, options);
                }
            }
        } else {
            options = DG.extend({
                offset: new DG.Point(5, 5)
            }, options);

            this._label = DG.label(content, options);

            this.once('remove', this.unbindLabel);

            if (options.static) {
                this.showLabel();
            } else {
                this
                    .on('mouseover', this._mouseOverLabel)
                    .on('mouseout', this._mouseOutLabel)
                    .on('dragstart', this._dragStartLabel)
                    .on('dragend', this._dragEndLabel);
            }

            if (typeof this._map !== 'undefined') {
                this._updateLabelZIndex();
            } else {
                this.once('add', this._updateLabelZIndex);
            }
        }
        return this;
    },

    unbindLabel: function () {
        if (this._label) {
            this
                .hideLabel()
                .off('remove', this.unbindLabel)
                .off('mouseover', this._mouseOverLabel)
                .off('mouseout', this._mouseOutLabel)
                .off('dragstart', this._dragStartLabel)
                .off('dragend', this._dragEndLabel)
                .off('move', this._updatePosition)
                .off('add', this._updateLabelZIndex);

            this._label = null;
        }
        return this;
    },

    getLabel: function () {
        return this._label ? this._label : null;
    },

    _originalUpdateZIndex: DG.Marker.prototype._updateZIndex,
    _updateZIndex: function (offset) {
        this._originalUpdateZIndex(offset);
        this._updateLabelZIndex();
        return this;
    },

    _updateLabelZIndex: function () {
        if (this._label && this._icon) {
            this._label.setZIndexOffset(this._icon.style.zIndex);
        }
        return this;
    },

    showLabel : function () {
        if (this._label) {
            this
                .on('move', this._updatePosition)
                ._map.addLayer(this._label.setPosition(this.getLatLng()));
        }

        return this;
    },

    hideLabel : function () {
        if (this._label) {
            this
                .off('move', this._updatePosition)
                ._map.removeLayer(this._label);
        }
        return this;
    },

    _updatePosition : function () {
        this._label.setPosition(this.getLatLng());
    },

    _dragStartLabel: function () {
        this._label.isMarkerDragging = true;

        this.hideLabel();
    },

    _dragEndLabel: function () {
        this._label.isMarkerDragging = false;

        if (this._label.isMouseOverMarker) {
            this.showLabel();
        }
    },

    _mouseOverLabel: function () {
        this._label.isMouseOverMarker = true;

        if (!this._label.isMarkerDragging) {
            this.showLabel();
        }
    },

    _mouseOutLabel: function () {
        this._label.isMouseOverMarker = false;

        this.hideLabel();
    }
});

DG.Marker.addInitHook(function () {
    if (typeof this.options.label !== 'undefined') {
        this.bindLabel(this.options.label);
    }
});

DG.Path.include({
    bindLabel: function (content, options) {

        if (!this._label) {
            this._label = DG.label(content, options);
            this.on(this._labelEvents, this);
        } else {
            this._label.setContent(content);

            if (this._label.options.offset !== options.offset) {
                this._label.setOffset(options.offset);
            }
        }
        return this;
    },

    unbindLabel: function () {
        if (this._label) {
            this.off(this._labelEvents, this);
            this._map.removeLayer(this._label);
            this._label = null;
        }
        return this;
    },

    getLabel: function () {
        return this._label ? this._label : null;
    },

    _labelEvents : {
        'mouseover': function (event) {
            this._map.addLayer(this._label.setPosition(event.latlng));
        },
        'mousemove': function (event) {
            this._label.setPosition(event.latlng);
        },
        'mouseout': function () {
            this._map.removeLayer(this._label);
        },
        'remove': function () {
            this._map.removeLayer(this._label);
        }
    }
});

DG.Path.addInitHook(function () {
    if (typeof this.options.label !== 'undefined') {
        this.bindLabel(this.options.label);
    }
});

DG.Wkt = {};

DG.Wkt.toGeoJSON = function (_) {
    if (DG.Util.isArray(_)) {
        _ = _[0];
    }
    var parts = _.split(';');
    _ = parts.pop();

    var i = 0,
        srid = (parts.shift() || '').split('=').pop();

    function $(re) {
        var match = _.substring(i).match(re);
        if (!match) {
            return null;
        }
        else {
            i += match[0].length;
            return match[0];
        }
    }

    function crs(obj) {
        if (obj && srid.match(/\d+/)) {
            obj.crs = {
                type: 'name',
                'properties': {
                    name: 'urn:ogc:def:crs:EPSG::' + srid
                }
            };
        }

        return obj;
    }

    function white() { $(/^\s*/); }

    function multicoords() {
        white();
        var depth = 0, rings = [], stack = [rings],
            pointer = rings, elem;
        while (elem =
            $(/^(\()/) ||
            $(/^(\))/) ||
            $(/^(\,)/) ||
            $(/^[-+]?([0-9]*\.[0-9]+|[0-9]+)/)) {
            if (elem === '(') {
                stack.push(pointer);
                pointer = [];
                stack[stack.length - 1].push(pointer);
                depth++;
            } else if (elem === ')') {
                pointer = stack.pop();
                depth--;
                if (depth === 0) {
                    break;
                }
            } else if (elem === ',') {
                pointer = [];
                stack[stack.length - 1].push(pointer);
            } else {
                pointer.push(parseFloat(elem));
            }
            white();
        }
        stack.length = 0;
        if (depth !== 0) {
            return null;
        }
        return rings;
    }

    function coords() {
        var list = [], item, pt;
        while (pt =
            $(/^[-+]?([0-9]*\.[0-9]+|[0-9]+)/) ||
            $(/^(\,)/)) {
            if (pt === ',') {
                list.push(item);
                item = [];
            } else {
                if (!item) {
                    item = [];
                }
                item.push(parseFloat(pt));
            }
            white();
        }
        if (item) {
            list.push(item);
        }
        return list.length ? list : null;
    }

    function point() {
        if (!$(/^(point)/i)) { return null; }
        white();
        if (!$(/^(\()/)) { return null; }
        var c = coords();
        white();
        if (!$(/^(\))/)) { return null; }
        return {
            type: 'Point',
            coordinates: c[0]
        };
    }

    function multipoint() {
        if (!$(/^(multipoint)/i)) { return null; }
        white();
        var c = multicoords();
        white();
        return {
            type: 'MultiPoint',
            coordinates: c
        };
    }

    function multilinestring() {
        if (!$(/^(multilinestring)/i)) { return null; }
        white();
        var c = multicoords();
        white();
        return {
            type: 'MultiLineString',
            coordinates: c
        };
    }

    function linestring() {
        if (!$(/^(linestring)/i)) { return null; }
        white();
        if (!$(/^(\()/)) { return null; }
        var c = coords();
        if (!$(/^(\))/)) { return null; }
        return {
            type: 'LineString',
            coordinates: c
        };
    }

    function polygon() {
        if (!$(/^(polygon)/i)) { return null; }
        white();
        return {
            type: 'Polygon',
            coordinates: multicoords()
        };
    }

    function multipolygon() {
        if (!$(/^(multipolygon)/i)) { return null; }
        white();
        return {
            type: 'MultiPolygon',
            coordinates: multicoords()
        };
    }

    function geometrycollection() {
        var geometries = [], geometry;

        if (!$(/^(geometrycollection)/i)) { return null; }
        white();

        if (!$(/^(\()/)) { return null; }
        while (geometry = root()) {
            geometries.push(geometry);
            white();
            $(/^(\,)/);
            white();
        }
        if (!$(/^(\))/)) { return null; }

        return {
            type: 'GeometryCollection',
            geometries: geometries
        };
    }

    function root() {
        return point() ||
            linestring() ||
            polygon() ||
            multipoint() ||
            multilinestring() ||
            multipolygon() ||
            geometrycollection();
    }

    return crs(root());
};

DG.Wkt.geoJsonLayer = function (data, opts) {
    return DG.geoJson(DG.Wkt.toGeoJSON(data), opts);
};

DG.Wkt.toLatLngs = function (data) {
    var coords = DG.Wkt.toGeoJSON(data).coordinates;
    return DG.Util.isArray(coords) ?
        coords
            .map(function (coord) {
                return DG.Util.isArray(coord[0]) ? DG.GeoJSON.coordsToLatLngs(coord) : [DG.GeoJSON.coordsToLatLng(coord)];
            })
            .reduce(function (arr, coord) {
                return arr.concat(coord);
            }) :
        DG.GeoJSON.coordsToLatLngs(coords);
};

DG.Wkt.toPoints = function (data) {
    return DG.Wkt.toGeoJSON(data).coordinates;
};

DG.Wkt.pointsToLatLngOnMap = function (wkt, map) {
    return (function parsePoints(points) {
        return (Array.isArray(points) && Array.isArray(points[0])) ?
            points.map(parsePoints) :
            map.containerPointToLatLng(points);
    })(DG.Wkt.toPoints(wkt));
};

DG.configTheme = DG.configTheme || {};

DG.configTheme.balloonOptions = {
    offset: {
        x: 1,
        y: -43
    }
};

(function(window, undefined) {
    'use strict';

    if (!window) return; // Server side

var
    _baron = window.baron, // Stored baron value for noConflict usage
    $ = window.jQuery, // Trying to use jQuery
    origin = {
        v: { // Vertical
            x: 'Y', pos: 'top', crossPos: 'left', size: 'height', crossSize: 'width',
            client: 'clientHeight', crossClient: 'clientWidth', offset: 'offsetHeight', crossOffset: 'offsetWidth', offsetPos: 'offsetTop',
            scroll: 'scrollTop', scrollSize: 'scrollHeight'
        },
        h: { // Horizontal
            x: 'X', pos: 'left', crossPos: 'top', size: 'width', crossSize: 'height',
            client: 'clientWidth', crossClient: 'clientHeight', offset: 'offsetWidth', crossOffset: 'offsetHeight', offsetPos: 'offsetLeft',
            scroll: 'scrollLeft', scrollSize: 'scrollWidth'
        }
    },

    each = function(obj, iterator) {
        var i = 0;

        if (obj.length === undefined || obj === window) obj = [obj];

        while (obj[i]) {
            iterator.call(this, obj[i], i);
            i++;
        }
    },

    baron = function(params) { // this - window or jQuery instance
        var jQueryMode = false,//(this && this[0] && this[0].nodeType),
            roots,
            $;

        params = params || {};
        $ = params.$ || window.jQuery;

        if (jQueryMode) {
            params.root = roots = this;
        } else {
            roots = $(params.root || params.scroller);
        }

        return new baron.fn.constructor(roots, params, $);
    };

    baron.fn = {
        constructor: function(roots, input, $) {
            var params = validate(input);

            params.$ = $;
            each.call(this, roots, function(root, i) {
                var localParams = clone(params);

                if (params.root && params.scroller) {
                    localParams.scroller = params.$(params.scroller, root);
                    if (!localParams.scroller.length) {
                        localParams.scroller = root;
                    }
                } else {
                    localParams.scroller = root;
                }

                localParams.root = root;
                this[i] = init(localParams);
                this.length = i + 1;
            });

            this.params = params;
        },

        dispose: function() {
            var params = this.params;

            each(this, function(item) {
                item.dispose(params);
            });
            this.params = null;
        },

        update: function() {
            var i = 0;

            while (this[i]) {
                this[i].update.apply(this[i], arguments);
                i++;
            }
        },

        baron: function(params) {
            params.root = [];
            params.scroller = this.params.scroller;

            each.call(this, this, function(elem) {
                params.root.push(elem.root);
            });
            params.direction = (this.params.direction == 'v') ? 'h' : 'v';
            params._chain = true;

            return baron(params);
        }
    };

    function manageEvents(item, eventManager, mode) {
        item._eventHandlers = item._eventHandlers || [ // Creating new functions for one baron item only one time
            {
                // onScroll:
                element: item.scroller,

                handler: function(e) {
                    item.scroll(e);
                },

                type: 'scroll'
            }, {
                // onMouseDown:
                element: item.bar,

                handler: function(e) {
                    e.preventDefault ? e.preventDefault() : e.returnValue = false; // Text selection disabling in Opera... and all other browsers?
                    item.selection(); // Disable text selection in ie8
                    item.drag.now = 1; // Save private byte
                },

                type: 'touchstart mousedown'
            }, {
                // onMouseUp:
                element: document,

                handler: function() {
                    item.selection(1); // Enable text selection
                    item.drag.now = 0;
                },

                type: 'mouseup blur touchend'
            }, {
                // onCoordinateReset:
                element: item.bar,

                handler: function(e) {
                    if (e.button != 2) { // Not RM
                        item._pos0(e);
                    }
                },

                type: 'touchstart mousedown'
            }, {
                // onMouseMove:
                element: document,

                handler: function(e) {
                    if (item.drag.now) {
                        item.drag(e);
                    }
                },

                type: 'mousemove touchmove'
            }, {
                // onResize:
                element: window,

                handler: function() {
                    item.update();
                },

                type: 'resize'
            }, {
                // sizeChange:
                element: item.root,

                handler: function() {
                    item.update();
                },

                type: 'sizeChange'
            }
        ];

        each(item._eventHandlers, function(event) {
            if (event.element) {
                eventManager(event.element, event.type, event.handler, mode);
            }
        });

        // if (item.scroller) {
        //     event(item.scroller, 'scroll', item._eventHandlers.onScroll, mode);
        // }
        // if (item.bar) {
        //     event(item.bar, 'touchstart mousedown', item._eventHandlers.onMouseDown, mode);
        // }
        // event(document, 'mouseup blur touchend', item._eventHandlers.onMouseUp, mode);
        // event(document, 'touchstart mousedown', item._eventHandlers.onCoordinateReset, mode);
        // event(document, 'mousemove touchmove', item._eventHandlers.onMouseMove, mode);
        // event(window, 'resize', item._eventHandlers.onResize, mode);
        // if (item.root) {
        //     event(item.root, 'sizeChange', item._eventHandlers.onResize, mode); // Custon event for alternate baron update mechanism
        // }
    }

    function manageAttr(node, direction, mode) {
        var attrName = 'data-baron-' + direction;

        if (mode == 'on') {
            node.setAttribute(attrName, 'inited');
        } else if (mode == 'off') {
            node.removeAttribute(attrName);
        } else {
            return node.getAttribute(attrName);
        }
    }

    function init(params) {
        if (manageAttr(params.root, params.direction)) return;

        var out = new item.prototype.constructor(params); // __proto__ of returning object is baron.prototype

        manageEvents(out, params.event, 'on');

        manageAttr(out.root, params.direction, 'on');

        out.update();

        return out;
    }

    function clone(input) {
        var output = {};

        input = input || {};

        for (var key in input) {
            if (input.hasOwnProperty(key)) {
                output[key] = input[key];
            }
        }

        return output;
    }

    function validate(input) {
        var output = clone(input);

        output.direction = output.direction || 'v';

        var event = input.event || function(elem, event, func, mode) {
            output.$(elem)[mode || 'on'](event, func);
        };

        output.event = function(elems, e, func, mode) {
            each(elems, function(elem) {
                event(elem, e, func, mode);
            });
        };

        return output;
    }

    function fire(eventName) {
        /* jshint validthis:true */
        if (this.events && this.events[eventName]) {
            for (var i = 0 ; i < this.events[eventName].length ; i++) {
                var args = Array.prototype.slice.call( arguments, 1 );

                this.events[eventName][i].apply(this, args);
            }
        }
    }

    var item = {};

    item.prototype = {
        constructor: function(params) {
            var $,
                barPos,
                scrollerPos0,
                track,
                resizePauseTimer,
                scrollPauseTimer,
                pause,
                scrollLastFire,
                resizeLastFire;

            resizeLastFire = scrollLastFire = new Date().getTime();

            $ = this.$ = params.$;
            this.event = params.event;
            this.events = {};

            function getNode(sel, context) {
                return $(sel, context)[0]; // Can be undefined
            }

            // DOM elements
            this.root = params.root; // Always html node, not just selector
            this.scroller = getNode(params.scroller); // (params.scroller) ? getNode(params.scroller, this.root) : this.root;
            this.bar = getNode(params.bar, this.root);
            track = this.track = getNode(params.track, this.root);
            if (!this.track && this.bar) {
                track = this.bar.parentNode;
            }
            this.clipper = this.scroller.parentNode;

            // Parameters
            this.direction = params.direction;
            this.origin = origin[this.direction];
            this.barOnCls = params.barOnCls;
            this.barTopLimit = 0;
            pause = params.pause * 1000 || 0;

            // Updating height or width of bar
            function setBarSize(size) {
                /* jshint validthis:true */
                var barMinSize = this.barMinSize || 20;

                if (size > 0 && size < barMinSize) {
                    size = barMinSize;
                }

                if (this.bar) {
                    $(this.bar).css(this.origin.size, parseInt(size, 10) + 'px');
                }
            }

            // Updating top or left bar position
            function posBar(pos) {
                /* jshint validthis:true */
                if (this.bar) {
                    $(this.bar).css(this.origin.pos, +pos + 'px');
                }
            }

            // Free path for bar
            function k() {
                /* jshint validthis:true */
                return track[this.origin.client] - this.barTopLimit - this.bar[this.origin.offset];
            }

            // Relative content top position to bar top position
            function relToPos(r) {
                /* jshint validthis:true */
                return r * k.call(this) + this.barTopLimit;
            }

            // Bar position to relative content position
            function posToRel(t) {
                /* jshint validthis:true */
                return (t - this.barTopLimit) / k.call(this);
            }

            // Cursor position in main direction in px // Now with iOs support
            this.cursor = function(e) {
                return e['client' + this.origin.x] || (((e.originalEvent || e).touches || {})[0] || {})['page' + this.origin.x];
            };

            // Text selection pos preventing
            function dontPosSelect() {
                return false;
            }

            this.pos = function(x) { // Absolute scroller position in px
                var ie = 'page' + this.origin.x + 'Offset',
                    key = (this.scroller[ie]) ? ie : this.origin.scroll;

                if (x !== undefined) this.scroller[key] = x;

                return this.scroller[key];
            };

            this.rpos = function(r) { // Relative scroller position (0..1)
                var free = this.scroller[this.origin.scrollSize] - this.scroller[this.origin.client],
                    x;

                if (r) x = this.pos(r * free);
                else x = this.pos();

                return x / (free || 1);
            };

            // Switch on the bar by adding user-defined CSS classname to scroller
            this.barOn = function(dispose) {
                if (this.barOnCls) {
                    if (dispose || this.scroller[this.origin.client] >= this.scroller[this.origin.scrollSize]) {
                        $(this.root).removeClass(this.barOnCls);
                    } else {
                        $(this.root).addClass(this.barOnCls);
                    }
                }
            };

            this._pos0 = function(e) {
                scrollerPos0 = this.cursor(e) - barPos;
            };

            this.drag = function(e) {
                this.scroller[this.origin.scroll] = posToRel.call(this, this.cursor(e) - scrollerPos0) * (this.scroller[this.origin.scrollSize] - this.scroller[this.origin.client]);
            };

            // Text selection preventing on drag
            this.selection = function(enable) {
                this.event(document, 'selectpos selectstart', dontPosSelect, enable ? 'off' : 'on');
            };

            // onResize & DOM modified handler
            this.resize = function() {
                var self = this,
                    delay = 0;

                if (new Date().getTime() - resizeLastFire < pause) {
                    clearTimeout(resizePauseTimer);
                    delay = pause;
                }

                function upd() {
                    var delta = self.scroller[self.origin.crossOffset] - self.scroller[self.origin.crossClient];

                    if (params.freeze && !self.clipper.style[self.origin.crossSize]) { // Sould fire only once
                        $(self.clipper).css(self.origin.crossSize, self.clipper[self.origin.crossClient] - delta + 'px');
                    }
                    $(self.scroller).css(self.origin.crossSize, self.clipper[self.origin.crossClient] + delta + 'px');

                    Array.prototype.unshift.call(arguments, 'resize');
                    fire.apply(self, arguments);

                    resizeLastFire = new Date().getTime();
                }

                if (delay) {
                    resizePauseTimer = setTimeout(upd, delay);
                } else {
                    upd();
                }
            };

            // onScroll handler
            this.scroll = function() {
                var oldBarSize, newBarSize,
                    delay = 0,
                    self = this;

                if (new Date().getTime() - scrollLastFire < pause) {
                    clearTimeout(scrollPauseTimer);
                    delay = pause;
                }

                function upd() {
                    if (self.bar) {
                        newBarSize = (track[self.origin.client] - self.barTopLimit) * self.scroller[self.origin.client] / self.scroller[self.origin.scrollSize];

                        // Positioning bar
                        if (oldBarSize != newBarSize) {
                            setBarSize.call(self, newBarSize);
                            oldBarSize = newBarSize;
                        }

                        barPos = relToPos.call(self, self.rpos());

                        posBar.call(self, barPos);
                    }

                    Array.prototype.unshift.call( arguments, 'scroll' );
                    fire.apply(self, arguments);

                    scrollLastFire = new Date().getTime();
                }

                if (delay) {
                    scrollPauseTimer = setTimeout(upd, delay);
                } else {
                    upd();
                }

            };

            return this;
        },

        update: function(params) {
            fire.call(this, 'upd', params); // Обновляем параметры всех плагинов

            this.resize(1);
            this.barOn();
            this.scroll();

            return this;
        },

        dispose: function(params) {
            manageEvents(this, this.event, 'off');
            manageAttr(this.root, params.direction, 'off');
            $(this.scroller).css(this.origin.crossSize, '');
            this.barOn(true);
            fire.call(this, 'dispose');
        },

        on: function(eventName, func, arg) {
            var names = eventName.split(' ');

            for (var i = 0 ; i < names.length ; i++) {
                if (names[i] == 'init') {
                    func.call(this, arg);
                } else {
                    this.events[names[i]] = this.events[names[i]] || [];

                    this.events[names[i]].push(function(userArg) {
                        func.call(this, userArg || arg);
                    });
                }
            }
        }
    };

    baron.fn.constructor.prototype = baron.fn;
    item.prototype.constructor.prototype = item.prototype;

    // Use when you need "baron" global var for another purposes
    baron.noConflict = function() {
        window.baron = _baron; // Restoring original value of "baron" global var

        return baron;
    };

    baron.version = '0.6.6';

    if ($ && $.fn) { // Adding baron to jQuery as plugin
        $.fn.baron = baron;
    }
    window.baron = baron; // Use noConflict method if you need window.baron var for another purposes
    if (window['module'] && module.exports) {
        module.exports = baron.noConflict();
    }
})(window);
/* Fixable elements plugin for baron 0.6+ */
(function(window, undefined) {
    var fix = function(userParams) {
        var elements, viewPortSize,
            params = { // Default params
                outside: '',
                before: '',
                after: '',
                past: '',
                future: '',
                radius: 0,
                minView: 0
            },
            topFixHeights = [], // inline style for element
            topRealHeights = [], // real offset position when not fixed
            headerTops = [],
            scroller = this.scroller,
            eventManager = this.event,
            $ = this.$,
            self = this;

        function fixElement(i, pos) {
            if (viewPortSize < (params.minView || 0)) { // No headers fixing when no enought space for viewport
                pos = undefined;
            }

            if (pos !== undefined) {
                pos += 'px';
                this.$(elements[i]).css(this.origin.pos, pos).addClass(params.outside);
            } else {
                this.$(elements[i]).css(this.origin.pos, '').removeClass(params.outside);
            }
        }

        function bubbleWheel(e) {
            try {
                i = document.createEvent('WheelEvent'); // i - for extra byte
                // evt.initWebKitWheelEvent(deltaX, deltaY, window, screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey);
                i.initWebKitWheelEvent(e.originalEvent.wheelDeltaX, e.originalEvent.wheelDeltaY);
                scroller.dispatchEvent(i);
                e.preventDefault();
            } catch (e) {}
        }

        function init(_params) {
            var pos;

            for (var key in _params) {
                params[key] = _params[key];
            }

            elements = this.$(params.elements, this.scroller);

            if (elements) {
                viewPortSize = this.scroller[this.origin.client];
                for (var i = 0 ; i < elements.length ; i++) {
                    // Variable header heights
                    pos = {};
                    pos[this.origin.size] = elements[i][this.origin.offset];
                    if (elements[i].parentNode !== this.scroller) {
                        this.$(elements[i].parentNode).css(pos);
                    }
                    pos = {};
                    pos[this.origin.crossSize] = elements[i].parentNode[this.origin.crossClient];
                    this.$(elements[i]).css(pos);

                    // Between fixed headers
                    viewPortSize -= elements[i][this.origin.offset];

                    headerTops[i] = elements[i].parentNode[this.origin.offsetPos]; // No paddings for parentNode

                    // Summary elements height above current
                    topFixHeights[i] = (topFixHeights[i - 1] || 0); // Not zero because of negative margins
                    topRealHeights[i] = (topRealHeights[i - 1] || Math.min(headerTops[i], 0));

                    if (elements[i - 1]) {
                        topFixHeights[i] += elements[i - 1][this.origin.offset];
                        topRealHeights[i] += elements[i - 1][this.origin.offset];
                    }

                    if ( !(i == 0 && headerTops[i] == 0)/* && force */) {
                        this.event(elements[i], 'mousewheel', bubbleWheel, 'off');
                        this.event(elements[i], 'mousewheel', bubbleWheel);
                    }
                }

                if (params.limiter && elements[0]) { // Bottom edge of first header as top limit for track
                    if (this.track && this.track != this.scroller) {
                        pos = {};
                        pos[this.origin.pos] = elements[0].parentNode[this.origin.offset];
                        this.$(this.track).css(pos);
                    } else {
                        this.barTopLimit = elements[0].parentNode[this.origin.offset];
                    }
                    // this.barTopLimit = elements[0].parentNode[this.origin.offset];
                    this.scroll();
                }

                if (params.limiter === false) { // undefined (in second fix instance) should have no influence on bar limit
                    this.barTopLimit = 0;
                }
            }

            var event = {
                element: elements,

                handler: function() {
                    var parent = $(this)[0].parentNode,
                        top = parent.offsetTop,
                        num;

                    // finding num -> elements[num] === this
                    for (var i = 0 ; i < elements.length ; i++ ) {
                        if (elements[i] === this) num = i;
                    }

                    var pos = top - topFixHeights[num];

                    if (params.scroll) { // User defined callback
                        params.scroll({
                            x1: self.scroller.scrollTop,
                            x2: pos
                        });
                    } else {
                        self.scroller.scrollTop = pos;
                    }
                },

                type: 'click'
            };

            if (params.clickable) {
                this._eventHandlers.push(event); // For auto-dispose
                eventManager(event.element, event.type, event.handler, 'off');
                eventManager(event.element, event.type, event.handler, 'on');
            }
        }

        this.on('init', init, userParams);

        this.on('init scroll', function() {
            var fixState, hTop,
                fixFlag = []; // 1 - past, 2 - future, 3 - current (not fixed)

            if (elements) {
                var change;

                // fixFlag update
                for (var i = 0 ; i < elements.length ; i++) {
                    fixState = 0;
                    if (headerTops[i] - this.pos() < topRealHeights[i] + params.radius) {
                        // Header trying to go up
                        fixState = 1;
                        hTop = topFixHeights[i];
                    } else if (headerTops[i] - this.pos() > topRealHeights[i] + viewPortSize - params.radius) {
                        // Header trying to go down
                        fixState = 2;
                        hTop = topFixHeights[i] + viewPortSize;
                    } else {
                        // Header in viewport
                        fixState = 3;
                        hTop = undefined;
                    }
                    if (fixState != fixFlag[i]) {
                        fixElement.call(this, i, hTop);
                        fixFlag[i] = fixState;
                        change = true;
                    }
                }

                // Adding positioning classes (on last top and first bottom header)
                if (change) { // At leats one change in elements flag structure occured
                    for (i = 0 ; i < elements.length ; i++) {
                        if (fixFlag[i] == 1 && params.past) {
                            this.$(elements[i]).addClass(params.past).removeClass(params.future);
                        }

                        if (fixFlag[i] == 2 && params.future) {
                            this.$(elements[i]).addClass(params.future).removeClass(params.past);
                        }

                        if (fixFlag[i] == 3 && (params.future || params.past)) {
                            this.$(elements[i]).removeClass(params.past).removeClass(params.future);
                        }

                        if (fixFlag[i] != fixFlag[i + 1] && fixFlag[i] == 1 && params.before) {
                            this.$(elements[i]).addClass(params.before).removeClass(params.after); // Last top fixed header
                        } else if (fixFlag[i] != fixFlag[i - 1] && fixFlag[i] == 2 && params.after) {
                            this.$(elements[i]).addClass(params.after).removeClass(params.before); // First bottom fixed header
                        } else {
                            this.$(elements[i]).removeClass(params.before).removeClass(params.after);
                        }
                    }
                }
            }
        });

        this.on('resize upd', function(updParams) {
            init.call(this, updParams && updParams.fix);
        });
    };

    baron.fn.fix = function(params) {
        var i = 0;

        while (this[i]) {
            fix.call(this[i], params);
            i++;
        }

        return this;
    };
})(window);
/* Controls plugin for baron 0.6+ */
(function(window, undefined) {
    var controls = function(params) {
        var forward, backward, track, screen,
            self = this; // AAAAAA!!!!!11

        screen = params.screen || 0.9;

        if (params.forward) {
            forward = this.$(params.forward, this.clipper);

            this.event(forward, 'click', function() {
                var y = self.pos() - params.delta || 30;

                self.pos(y);
            });
        }

        if (params.backward) {
            backward = this.$(params.backward, this.clipper);

            this.event(backward, 'click', function() {
                var y = self.pos() + params.delta || 30;

                self.pos(y);
            });
        }

        if (params.track) {
            if (params.track === true) {
                track = this.track;
            } else {
                track = this.$(params.track, this.clipper)[0];
            }

            if (track) {
                this.event(track, 'mousedown', function(e) {
                    var x = e['offset' + self.origin.x],
                        xBar = self.bar[self.origin.offsetPos],
                        sign = 0;

                    if (x < xBar) {
                        sign = -1;
                    } else if (x > xBar + self.bar[self.origin.offset]) {
                        sign = 1;
                    }

                    var y = self.pos() + sign * screen * self.scroller[self.origin.client];
                    self.pos(y);
                });
            }
        }

    };

    baron.fn.controls = function(params) {
        var i = 0;

        while (this[i]) {
            controls.call(this[i], params);
            i++;
        }

        return this;
    };
})(window);
/* Pull to load plugin for baron 0.6+ */
(function(window, undefined) {
    var pull = function(params) {
        var block = this.$(params.block),
            size = params.size || this.origin.size,
            limit = params.limit || 80,
            onExpand = params.onExpand,
            elements = params.elements || [],
            inProgress = params.inProgress || '',
            self = this,
            _insistence = 0,
            _zeroXCount = 0,
            _interval,
            _timer,
            _x = 0,
            _onExpandCalled,
            _waiting = params.waiting || 500,
            _on;

        function getSize() {
            return self.scroller[self.origin.scroll] + self.scroller[self.origin.offset];
        }

        // Scroller content height
        function getContentSize() {
            return self.scroller[self.origin.scrollSize];
        }

        // Scroller height
        function getScrollerSize() {
            return self.scroller[self.origin.client];
        }

        function step(x, force) {
            var k = x * 0.0005;

            return Math.floor(force - k * (x + 550));
        }

        function toggle(on) {
            _on = on;

            if (on) {
                update(); // First time with no delay
                _interval = setInterval(update, 200);
            } else {
                clearInterval(_interval);
            }
        }

        function update() {
            var pos = {},
                height = getSize(),
                scrollHeight = getContentSize(),
                dx,
                op4,
                scrollInProgress = _insistence == 1;

            op4 = 0; // Возвращающая сила
            if (_insistence > 0) {
                op4 = 40;
            }
            //if (_insistence > -1) {
                dx = step(_x, op4);
                if (height >= scrollHeight - _x && _insistence > -1) {
                    if (scrollInProgress) {
                        _x += dx;
                    }
                } else {
                    _x = 0;
                }

                if (_x < 0) _x = 0;

                pos[size] = _x + 'px';
                if (getScrollerSize() <= getContentSize()) {
                    self.$(block).css(pos);
                    for (var i = 0 ; i < elements.length ; i++) {
                        self.$(elements[i].self).css(elements[i].property, Math.min(_x / limit * 100, 100) + '%');
                    }
                }

                if (inProgress && _x) {
                    self.$(self.root).addClass(inProgress);
                }

                if (_x == 0) {
                    if (params.onCollapse) {
                        params.onCollapse();
                    }
                }

                _insistence = 0;
                _timer = setTimeout(function() {
                    _insistence = -1;
                }, _waiting);
            //}

            if (onExpand && _x > limit && !_onExpandCalled) {
                onExpand();
                _onExpandCalled = true;
            }

            if (_x == 0) {
                _zeroXCount++;
            } else {
                _zeroXCount = 0;

            }
            if (_zeroXCount > 1) {
                toggle(false);
                _onExpandCalled = false;
                if (inProgress) {
                    self.$(self.root).removeClass(inProgress);
                }
            }
        }

        this.on('init', function() {
            toggle(true);
        });

        this.on('dispose', function() {
            toggle(false);
        });

        this.event(this.scroller, 'mousewheel DOMMouseScroll', function(e) {
            var down = e.wheelDelta < 0 || (e.originalEvent && e.originalEvent.wheelDelta < 0) || e.detail > 0;

            if (down) {
                _insistence = 1;
                clearTimeout(_timer);
                if (!_on && getSize() >= getContentSize()) {
                    toggle(true);
                }
            }
            //  else {
            //     toggle(false);
            // }
        });
    };

    baron.fn.pull = function(params) {
        var i = 0;

        while (this[i]) {
            pull.call(this[i], params);
            i++;
        }

        return this;
    };
})(window);

// 2GIS-related popup content wrapper and offset
(function () {
    var offsetX = DG.configTheme.balloonOptions.offset.x,
        offsetY = DG.configTheme.balloonOptions.offset.y,
        originalInitialize = DG.Popup.prototype.initialize,
        originalInitLayout = DG.Popup.prototype._initLayout,
        originalOnAdd = DG.Popup.prototype.onAdd,
        originalAdjustPan = DG.Popup.prototype._adjustPan,
        graf = baron.noConflict();

    var BaronDomHelper = function (element) {
        this[0] = element;
        this.length = 1;
    };
    BaronDomHelper.prototype = {
        setAttribute: function (name, value) {
            this[0].setAttribute(name, value);
            return this;
        },
        getAttribute: function (name) {
            return this[0].getAttribute(name);
        },
        removeAttribute: function (name) {
            this[0].removeAttribute(name);
            return this;
        },
        css: function (style, value) {
            if (value) {
                this[0].style[style] = value;
                return this;
            } else {
                return DG.DomUtil.getStyle(this[0], style);
            }
        }
    };

    DG.Popup.prototype.options.offset = DG.point(offsetX, offsetY);

    DG.Popup.mergeOptions({
        border: 16,
        mapControlsWidth: 60
    });

    DG.Popup.include({
        _headerContent: null,
        _footerContent: null,

        //baron elements references
        _scroller: null,
        _scrollerBar: null,
        _barWrapper: null,
        _baron: null,
        _isBaronExist: false,

        _popupShowClass: 'leaflet-popup_show_true',
        _popupHideClass: 'leaflet-popup_show_false',

        _popupTipClass: 'leaflet-popup-tip-container',
        _tipSVGPath: 'M0 0c12.643 0 28 7.115 28 44h2c0-36.885 15.358-44 28-44h-58z',

        _isAutoPanPaddingUserDefined: false,

        initialize: function (options, source) { // (Object, Object)
            this._popupStructure = {};
            this._isAutoPanPaddingUserDefined = options && options.hasOwnProperty('autoPanPadding');
            originalInitialize.call(this, options, source);
        },

        onAdd: function (map) { // (Map)
            map.on('entranceshow', this._closePopup, this);
            originalOnAdd.call(this, map);
            this._animateOpening();
        },

        onRemove: function (map) { // (Map)
            this._animateClosing();
            map.off('entranceshow', this._closePopup, this);

            if (DG.DomUtil.TRANSITION) {
                this._removeTimeout = setTimeout(L.bind(L.DomUtil.remove, L.DomUtil, this._container), 200);
            } else {
                L.DomUtil.remove(this._container);
            }

            map.fire('popupclose', {popup: this});

            if (this._source) {
                this._source.fire('popupclose', {popup: this}, true);
            }
        },

        setContent: function (content) { // (DOMElement | Object | HTML) -> Popup
            if (!this._isNode(content) && typeof content === 'object') {
                Object.keys(content).forEach(function (item) {
                    this['_' + item + 'Content'] = content[item];
                }, this);
            } else {
                this._bodyContent = content;
            }

            this.update();

            return this;
        },

        setHeaderContent: function (content) { // (HTML) -> Popup
            this._headerContent = content;
            this.update();

            return this;
        },

        setFooterContent: function (content) { // (HTML) -> Popup
            this._footerContent = content;
            this.update();

            return this;
        },

        getContent: function() { // () -> HTML
            return this._bodyContent;
        },

        getHeaderContent: function() { // () -> HTML
            return this._headerContent;
        },

        getFooterContent: function() { // () -> HTML
            return this._footerContent;
        },

        clear: function () { // () -> Popup
            Object.keys(this._popupStructure).forEach(this._clearElement, this);

            // think about move this set to another public method
            this._isBaronExist = false;
            return this;
        },

        clearHeader: function () { // () -> Popup
            return this._clearElement('header');
        },

        clearFooter: function () { // () -> Popup
            return this._clearElement('footer');
        },

        findElement: function (element) { // (String) -> DOMElement
            return this._contentNode.querySelector(element);
        },

        _animateOpening: function () {
            DG.DomUtil.addClass(this._innerContainer, this._popupShowClass);
            DG.DomUtil.removeClass(this._innerContainer, this._popupHideClass);
        },

        _animateClosing: function () {
            DG.DomUtil.addClass(this._innerContainer, this._popupHideClass);
            DG.DomUtil.removeClass(this._innerContainer, this._popupShowClass);
        },

        _closePopup: function () {
            this._map.closePopup(this);
        },

        _isNode: function (o) { // (Object) -> Boolean
            return (o.nodeName ? true : false);
        },

        _initLayout: function () {
            originalInitLayout.call(this);
            this._innerContainer = DG.DomUtil.create('div', 'leaflet-popup-inner ' + this._popupHideClass, this._container);

            // Prevents mouse events from leaking through close button
            // See https://github.com/2gis/mapsapi/pull/153/
            DG.DomEvent.disableClickPropagation(this._innerContainer);

            if (this.options.closeButton) {
                this._innerContainer.appendChild(this._detachEl(this._closeButton));
            }

            this._innerContainer.appendChild(this._detachEl(this._wrapper));

            var tip = this._detachEl(this._tipContainer);

            if (DG.Browser.svg) {
                var path = DG.SVG.create('path');
                var svgClass = this._popupTipClass + ' ' + this._popupTipClass + '_svg';

                path.setAttribute('d', this._tipSVGPath);

                tip = DG.SVG.create('svg');
                tip.setAttribute('class', svgClass);

                tip.appendChild(path);
                DG.DomEvent.disableClickPropagation(path);
            } else {
                DG.DomUtil.addClass(tip, this._popupTipClass + '_image');
                DG.DomEvent.disableClickPropagation(tip);
            }

            this._innerContainer.appendChild(tip);
        },

        _clearElement: function (elem) { // (DOMElement) -> Popup
            this['_' + elem + 'Content'] = null;
            this._detachEl(this._popupStructure[elem]);
            delete this._popupStructure[elem];
            return this;
        },

        _updateScrollPosition: function () {
            if (this._baron) {
                this._baron.update();
            }
        },

        resize: function () {
            var scrolled = this._updateLayout();
            this._updatePosition();

            if (!scrolled) {
                if (this._isBaronExist) {
                    this._scrollerWrapper.style.height = '';
                    DG.DomUtil.removeClass(this._scroller, 'dg-scroller');

                    DG.DomUtil.addClass(this._scroller, 'dg-scroller_hidden_true');
                    DG.DomUtil.removeClass(this._scroller, 'dg-scroller');
                    DG.DomEvent.off(this._scroller, 'scroll', this._onScroll);
                }
            } else if (this._isBaronExist) {
                DG.DomUtil.removeClass(this._scroller, 'dg-scroller_hidden_true');
                DG.DomUtil.addClass(this._scroller, 'dg-scroller');

                var scrollTop = this._isBaronExist ? this._scroller.scrollTop : false;

                if (scrollTop) {
                    this._scroller.scrollTop = scrollTop;
                }

                var innerHeight = this.options.maxHeight - this.options.border * 2 - this._getDelta();
                this._scrollerWrapper.style.height = innerHeight + 'px';

                this._updateScrollPosition();
            } else {
                this._initBaronScroller();
                this._initBaron();
            }

            this._adjustPan();
            this._bindAdjustPanOnTransitionEnd();
        },

        _adjustPan: function (e) {
            if (!this._map) { return; }

            if (e) {
                if (e.propertyName === 'max-height') {
                    setTimeout(originalAdjustPan.bind(this), 1); //JSAPI-3409 fix safari glich
                    DG.DomEvent.off(this._wrapper, DG.DomUtil.TRANSITION_END, this._adjustPan);
                }

                return;
            }

            var options = this.options;

            if (!options.autoPan) { return; }

            var map = this._map,
                containerHeight = this._container.offsetHeight,
                containerWidth = this._containerWidth,
                layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom);

            if (this._zoomAnimated) {
                layerPos._add(L.DomUtil.getPosition(this._container));
            }

            var autoPanPadding = [options.autoPanPadding[0], options.autoPanPadding[1]];

            // if width of map is more then width of popup and controls
            // set default autoPanPadding to width controls
            if (
                !this._isAutoPanPaddingUserDefined &&
                    this._map._container.offsetWidth >= options.maxWidth + options.mapControlsWidth * 2
            ) {
                autoPanPadding[0] = options.mapControlsWidth;
            }

            var containerPos = map.layerPointToContainerPoint(layerPos),
                padding = L.point(autoPanPadding),
                paddingTL = L.point(options.autoPanPaddingTopLeft || padding),
                paddingBR = L.point(options.autoPanPaddingBottomRight || padding),
                size = map.getSize(),
                dx = 0,
                dy = 0;

            if (containerPos.x + containerWidth + paddingBR.x > size.x) { // right
                dx = containerPos.x + containerWidth - size.x + paddingBR.x;
            }
            if (containerPos.x - dx - paddingTL.x < 0) { // left
                dx = containerPos.x - paddingTL.x;
            }
            if (containerPos.y + containerHeight + paddingBR.y > size.y) { // bottom
                dy = containerPos.y + containerHeight - size.y + paddingBR.y;
            }
            if (containerPos.y - dy - paddingTL.y < 0) { // top
                dy = containerPos.y - paddingTL.y;
            }

            if (dx || dy) {
                map
                    .fire('autopanstart')
                    .panBy([dx, dy]);
            }
        },

        _bindAdjustPanOnTransitionEnd: function () {
            if (DG.DomUtil.TRANSITION) {
                DG.DomEvent.on(this._wrapper, DG.DomUtil.TRANSITION_END, this._adjustPan, this);
            } else {
                this._adjustPan();
            }
        },

        _isContentHeightEnough: function () { // () -> Boolean
            var options = this.options;

            if (!options.maxHeight) {
                return true;
            }

            var popupHeight = this._popupStructure.body ?
                this._popupStructure.body.offsetHeight + this._getDelta() :
                this._contentNode.offsetHeight;

            popupHeight += options.border * 2;

            return popupHeight <= options.maxHeight;
        },

        _initBaronScroller: function () {
            var contentNode = this._popupStructure.body.parentNode,
                scrollerWrapper = this._scrollerWrapper = DG.DomUtil.create('div', 'dg-scroller__wrapper', contentNode),
                scroller = this._scroller = DG.DomUtil.create('div', 'dg-scroller', scrollerWrapper),
                barWrapper = this._barWrapper = DG.DomUtil.create('div', 'dg-scroller__bar-wrapper', scroller),
                innerHeight = this.options.maxHeight - this.options.border * 2;

            this._scrollerBar = DG.DomUtil.create('div', 'dg-scroller__bar', barWrapper);
            scroller.appendChild(this._detachEl(this._popupStructure.body));

            innerHeight -= this._getDelta();
            scrollerWrapper.style.height = Math.max(18, innerHeight) + 'px';
            scrollerWrapper.style.width = contentNode.offsetWidth + 5 + 'px'; //TODO

            this._isBaronExist = true;

            this._switchEvents();
        },

        _onScroll: function (e) {
            this.fire('scroll', {originalEvent: e});
        },

        _onClick: function (e) {
            e.target = e.target || e.srcElement;

            if (!this._moving) {
                this.fire('click', {originalEvent: e});
            }
        },

        _onStart: function (e) {
            this._moved = false;

            if (this._moving) { return; }

            var first = e.touches ? e.touches[0] : e;

            this._startPoint = new DG.Point(first.clientX, first.clientY);

            this._toggleTouchEvents();
        },

        _onEnd: function (e) {
            this._toggleTouchEvents(true);

            this._onClick(e);

            this._moving = false;
        },

        _onMove: function (e) {

            if (e.touches && e.touches.length > 1) {
                this._moved = true;
                return;
            }

            var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
                newPoint = DG.point(first.clientX, first.clientY),
                offset = Math.abs(newPoint.subtract(this._startPoint).y);

            if (!offset || offset < 10) { return; }

            this._moving = this._moved = true;

        },

        _initBaron: function () {
            var context = this._scrollerWrapper;
            this._baron = graf({
                scroller: '.dg-scroller',
                bar: '.dg-scroller__bar',
                track: '.dg-scroller__bar-wrapper',
                $: function (selector) {
                    var node = {}.toString.call(selector) === '[object String]' ?
                        context.querySelector(selector) : selector;

                    return new BaronDomHelper(node);
                },
                event: function (elem, event, func, mode) {
                    event.split(' ').forEach(function (type) {
                        DG.DomEvent[mode || 'on'](elem, type, func);
                    });
                }
            });
        },

        _initHeader: function () {
            this._popupStructure.header = DG.DomUtil.create('header', 'dg-popup__header', this._contentNode);
        },

        _initFooter: function () {
            this._popupStructure.footer = DG.DomUtil.create('footer', 'dg-popup__footer', this._contentNode);
        },

        _initBodyContainer: function () {
            this._popupStructure.wrapper = DG.DomUtil.create('div', 'dg-popup__container-wrapper', this._contentNode);
            this._popupStructure.body = DG.DomUtil.create('div', 'dg-popup__container', this._popupStructure.wrapper);
        },

        update: function () {
            if (!this._map) { return; }

            if (!DG.Browser.ielt9) {
                this._container.style.visibility = 'hidden';
            }
            this._switchEvents(true);

            this._clearNode(this._contentNode);
            this._isBaronExist = false;

            // init popup content dom structure
            if (this._headerContent) { this._initHeader(); }
            if (this._bodyContent) { this._initBodyContainer(); }
            if (this._footerContent) { this._initFooter(); }

            this._updatePopupStructure();
            this.resize();

            DG.DomEvent.on(this._wrapper, 'click', DG.DomEvent.stopPropagation);
            this._switchEvents();

            if (DG.Browser.ielt9) {
                var elem = this._popupStructure.footer;
                if (elem) {
                    elem.className += ' ie8';
                }
            }

            if (!DG.Browser.ielt9) {
                this._container.style.visibility = '';
            }
        },

        _getDelta: function () { // () -> Number
            var delta = 0,
                popup = this._popupStructure;

            if (popup.header) {
                delta += popup.header.offsetHeight;
            }
            if (popup.footer) {
                delta += popup.footer.offsetHeight;
            }

            return delta;
        },

        _updateLayout: function () {
            var opts = this.options,
                content = this._contentNode, // leaflet-popup-content
                wrapper = this._wrapper, // leaflet-popup-content-wrapper
                style = content.style,
                wrapperStyle = wrapper.style,
                width,
                scrolledClass = 'leaflet-popup-scrolled',
                result = false;

            style.margin = opts.border + 'px';

            DG.DomUtil.removeClass(content, scrolledClass);

            if (this._isContentHeightEnough()) {
                wrapperStyle.maxHeight = content.offsetHeight + opts.border * 2 + 'px';
            } else {
                wrapperStyle.maxHeight = opts.maxHeight + 'px';
                DG.DomUtil.addClass(content, scrolledClass);
                result = true;
            }

            var availableWidth = opts.autoPanPadding[0] * 2;

            if (opts.sprawling) {
                width = opts.maxWidth;

                width = Math.min(width, this._map._container.offsetWidth - availableWidth);
                width = Math.max(width, opts.minWidth);
            } else {
                wrapperStyle.width = '';

                style.whiteSpace = 'nowrap';
                width = wrapper.offsetWidth;
                style.whiteSpace = '';

                width = Math.min(width, this._map._container.offsetWidth - availableWidth);
                width = Math.min(Math.max(width, opts.minWidth), opts.maxWidth);
            }

            wrapperStyle.width = width + 'px';

            this._containerWidth = this._container.offsetWidth;

            return result;
        },

        _updatePopupStructure: function () {
            Object.keys(this._popupStructure).forEach(function (item) {
                this._insertContent(this['_' + item + 'Content'], this._popupStructure[item]);
            }, this);

            this.fire('contentupdate');
        },

        _insertContent: function (content, node) { // (String | DOMElement, DOMElement)
            if (!content || !node) { return; }

            if (typeof content === 'string') {
                node.innerHTML = content;
            } else {
                this._clearNode(node);
                node.appendChild(content);
            }
        },

        _clearNode: function (node) { // (DOMElement)
            while (node.hasChildNodes()) {
                node.removeChild(node.firstChild);
            }
        },

        _detachEl: function (elem) { // (DOMElement) -> DOMElement
            if (elem.parentNode) {
                elem.parentNode.removeChild(elem);
            }
            return elem;
        },

        _switchEvents: function (on) { // (Boolean)
            var switcher = on ? 'off' : 'on';

            if (!DG.Browser.touch) {
                DG.DomEvent[switcher](this._contentNode, 'click', this._onClick, this);
            } else {
                DG.DomEvent[switcher](this._contentNode, 'touchstart mousedown mousemove', this._onStart, this);
            }

            if (this._isBaronExist) {
                DG.DomEvent[switcher](this._scroller, 'scroll', this._onScroll, this);
            }
        },

        _toggleTouchEvents: function (on) {
            var switcher = on ? 'off' : 'on';

            DG.DomEvent
                [switcher](this._contentNode, 'touchmove', this._onMove, this)
                [switcher](this._contentNode, 'touchend', this._onEnd, this);
        }

    });
}());


DG.Map.include({
    _markerClass: 'dg-customization__marker_type_mushroom',
    _markerShowClass: 'dg-customization__marker_appear',
    _markerHideClass: 'dg-customization__marker_disappear',
    _dgHideClass: 'dg-popup_hidden_true',
    openPopup: function (popup, latlng, options) { // (Popup) or (String || HTMLElement, LatLng[, Object])
        if (!(popup instanceof L.Popup)) {
            var content = popup;

            popup = new L.Popup(options).setContent(content);
        }

        if (latlng) {
            popup.setLatLng(latlng);
        }

        if (this.hasLayer(popup)) {
            return this;
        }

        this.closePopup();
        this._popup = popup;

        if (popup._source && popup._source._icon) {
            if (popup._source._icon.className.indexOf(this._markerClass) !== -1) {
                DG.DomUtil.removeClass(popup._source._icon, this._markerShowClass);
                DG.DomUtil.addClass(popup._source._icon, this._markerHideClass);
            } else {
                DG.DomUtil.addClass(popup._source._icon, this._dgHideClass);
                if (popup._source._shadow) {
                    DG.DomUtil.addClass(popup._source._shadow, this._dgHideClass);
                }
            }
        }

        return this.addLayer(popup);
    },

    closePopup: function (popup) {  // (Popup) -> Popup
        if (!popup || popup === this._popup) {
            popup = this._popup;
            this._popup = null;
        }
        if (popup) {
            if (popup._source && popup._source._icon) {
                if (popup._source._icon.className.indexOf(this._markerClass) !== -1) {
                    DG.DomUtil.removeClass(popup._source._icon, this._markerHideClass);
                    DG.DomUtil.addClass(popup._source._icon, this._markerShowClass);
                } else {
                    DG.DomUtil.removeClass(popup._source._icon, this._dgHideClass);
                    if (popup._source._shadow) {
                        DG.DomUtil.removeClass(popup._source._shadow, this._dgHideClass);
                    }
                }
            }
            this.removeLayer(popup);
        }

        return this;
    }
});

DG.Dictionary = {};

DG.Dictionary.ru = {
    pluralRules: function (n) { // (Number)
        if (n % 10 === 1 && n % 100 !== 11) { // 1, 21
            return 0;
        }
        if ((n % 10 >= 2 && n % 10 <= 4 && (n % 10) % 1 === 0) && (n % 100 < 12 || n % 100 > 14)) { // 2, 3
            return 1;
        }

        if ((n % 10 === 0) || (n % 10 >= 5 && n % 10 <= 9 && (n % 10) % 1 === 0) || (n % 100 >= 11 && (n % 100) <= 14 && (n % 100) % 1 === 0)) { // 13, 17
            return 2;
        }
    }
};

DG.Dictionary.en = {
    pluralRules: function (n) { // (Number)
        if (n === 1) { // 1
            return 0;
        } else {
            return 1; //0, 2, 3, 4 ..
        }
    }
};

DG.Dictionary.it = {
    pluralRules: function (n) { // (Number)
        if (n === 1) { // 1
            return 0;
        } else {
            return 1; //0, 2, 3, 4 ..
        }
    }
};

DG.Dictionary.cs = {
    pluralRules: function (n) { // (Number)
        return (n === 1) ? 0 : (n >= 2 && n <= 4) ? 1 : 2;
    }
};

DG.Dictionary.es = {
    pluralRules: function (n) { // (Number)
        return (n >= 2) ? 1 : 0;
    }
};

DG.Locale = {
    t: function (msg, argument) { // (String, Number) -> String
        var result,
            lang = this._map.options.currentLang,
            msgIsset = false,
            dictionaryMsg,
            exp;
        if (typeof this.constructor.Dictionary[lang] === 'undefined') {
            lang = 'ru';
            this._map.setLang(lang);
        }
        dictionaryMsg = this.constructor.Dictionary[lang][msg];
        msgIsset = typeof dictionaryMsg !== 'undefined';
        if (!msgIsset) {
            return msg;
        }
        result = msgIsset ? dictionaryMsg : msg;

        if (argument !== undefined) {
            argument = parseInt(argument, 10);
            argument = isNaN(argument) ? 0 : argument;
            exp = this.constructor.Dictionary[lang].pluralRules(argument);
            result = dictionaryMsg[exp];
        }

        result = DG.Util.template(result, {n: argument});
        return result ? result : msg;
    }
};

function getPageLang() {
    var root = document.documentElement,
        lang = root.lang || (root.getAttributeNS && root.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang')) || 'ru';

    return lang;
}

DG.Map.mergeOptions({
    currentLang: getPageLang()
});

DG.Map.include({

    setLang: function (lang) { // (String)
        if (lang && Object.prototype.toString.call(lang) === '[object String]') {
            this.options.currentLang = lang;
            this.fire('langchange', {'lang': lang});
        }
    },

    getLang: function () { // () -> String
        return this.options.currentLang;
    }
});

DG.RoundControl = DG.Control.extend({
    includes: DG.Mixin.Events,

    options: {
        position: 'topright',
        iconClass: 'default'
    },

    onAdd: function (map) {
        var controlClass = this._controlCLass = 'dg-control-round',
            controlIconClass = this._controlIconCLass = this._controlCLass + '__icon',
            container = DG.DomUtil.create('div', '');

        if (this._disable) {
            return container;
        }
        DG.DomUtil.addClass(container, controlClass);

        var link = this._link = DG.DomUtil.create(
            'a',
            controlIconClass + ' ' + controlIconClass + '_name_' + this.options.iconClass,
            container
        );

        link.href = '#';

        this._renderTranslation();

        this._map = map;

        DG.DomEvent
            .on(container, 'click', this._toggleControl, this)
            .on(container, 'dblclick', DG.DomEvent.stopPropagation)
            .on(link, 'mousedown', DG.DomEvent.stopPropagation);

        this.fireEvent('add');

        return container;
    },

    onRemove: function () {
        this.fireEvent('remove');
        DG.DomEvent.off(this._link, 'click', this._toggleControl);
    },

    setState: function (state) {
        if (!this._link || !this._container) {
            return this;
        }

        if (this._state) {
            DG.DomUtil.removeClass(this._container, this._controlCLass + '_state_' + this._state);
            DG.DomUtil.removeClass(this._link, this._controlIconCLass + '_state_' + this._state);

            this._state = null;
        }

        if (state) {
            this._state = state;

            DG.DomUtil.addClass(this._container, this._controlCLass + '_state_' + this._state);
            DG.DomUtil.addClass(this._link, this._controlIconCLass + '_state_' + this._state);
        }

        return this;
    },

    _toggleControl: function (e) {
        DG.DomEvent.stop(e);
        this.fireEvent('click');
    }
});

DG.RoundControl.include(DG.Locale);

DG.roundControl = function (options) {
    return new DG.RoundControl(options);
};

DG.ProjectDetector = DG.Handler.extend({
    initialize: function (map) { // (Object)
        this._map = map;
        this._osmViewport = false;
        this.project = null;
        this._loadProjectList();
    },

    addHooks: function () {
        this._map.on('move', this._projectWatch, this);
    },

    removeHooks: function () {
        this._map.off('move', this._projectWatch, this);
    },

    getProject: function () {
        if (!this.project) { return false; }

        return DG.Util.extend({}, this.project);
    },

    getProjectsList: function () {
        return this._projectList.slice(0);
    },

    isProjectHere: function (coords, project, checkMethod) {
        if (!coords) { return null; }

        if (!(coords instanceof DG.LatLng) && !(coords instanceof DG.LatLngBounds)) {
            coords = DG.latLng(coords);
        }

        coords = (coords instanceof DG.LatLngBounds) ?
            DG.latLngBounds(coords.getSouthWest().wrap(), coords.getNorthEast().wrap()) : coords.wrap();

        checkMethod = checkMethod || ((coords instanceof DG.LatLngBounds) ?  'intersects' : 'contains');

        if (project) {
            return this._testProject(checkMethod, coords, project);
        } else {
            return this._projectList.filter(this._testProject.bind(this, checkMethod, coords))[0];
        }
    },

    _projectWatch: function () {
        if (this._osmViewport === (this.project && this._boundInProject(this.project, 'contains'))) {
            this._osmViewport = !this._osmViewport;
            this._map.attributionControl._update(null, this._osmViewport);
        }

        if (this.project && this._boundInProject(this.project) && this._zoomInProject(this.project)) { return; }

        if (this.project) {
            this.project = null;
            this._map.fire('projectleave');
        }

        this._searchProject();

        if (this.project) {
            if (this._osmViewport === (this.project && this._boundInProject(this.project, 'contains'))) {
                this._osmViewport = !this._osmViewport;
            }
            this._map.attributionControl._update(null, this._osmViewport, this.project.country_code);
        }
    },

    _wktToBnd: function (wkt) {
        var arr,
            pointsArr,
            bracketsContent,
            regExp;

        wkt = wkt.replace(/, /g, ',');
        wkt.replace(' (', '(');

        arr = /^POLYGON\((.*)\)/.exec(wkt);
        regExp = /\((.*?)\)/g;

        bracketsContent = (regExp).exec(arr[1]);
        pointsArr = bracketsContent[1].split(',');

        // Create a LatLng array of all points in WKT
        pointsArr = pointsArr.map(function(pointString) {
            var numbers = pointString.split(' ');

            return DG.latLng(
                parseFloat(numbers[1]),
                parseFloat(numbers[0])
            );
        });

        var bound = DG.latLngBounds(pointsArr);

        return [
            [bound.getSouthWest().lat, bound.getSouthWest().lng],
            [bound.getNorthEast().lat, bound.getNorthEast().lng]
        ];
    },

    _checkProject: function (project) {
        function check(value) {
            return value !== undefined && value !== null;
        }

        return project &&
                project.bounds &&
                check(project.code) &&
                check(project.domain) &&
                check(project.country_code) &&
                project.zoom_level &&
                    check(project.zoom_level.min) &&
                    check(project.zoom_level.max) &&
                project.time_zone &&
                    check(project.time_zone.offset);
    },

    _loadProjectList: function () {
        var self = this;

        if (!DG.projectsList) {
            DG.projectsList = DG.fallbackProjectsList;
        }
        delete DG.fallbackProjectsList;

        this._projectList = DG.projectsList
            .filter(self._checkProject)
            .map(function (project) {
                var bound = self._wktToBnd(project.bounds);
                var latLngBounds = new DG.LatLngBounds(bound);

                /* eslint-disable camelcase */
                return {
                    code: project.code,
                    minZoom: project.zoom_level.min,
                    maxZoom: project.zoom_level.max,
                    timeOffset: project.time_zone.offset,
                    bound: bound,
                    latLngBounds: latLngBounds,
                    traffic: !!project.flags.traffic,
                    transport: !!project.flags.public_transport,
                    roads: !!project.flags.road_network,
                    country_code: project.country_code,
                    domain: project.domain
                };
                /* eslint-enable camelcase */
            });
    },

    _searchProject: function () {
        this._projectList
            .filter(function (project) {
                return (this._boundInProject(project) && this._zoomInProject(project));
            }, this)
            .some(function (project) {
                var self = this;

                this.project = project;
                setTimeout(function () {
                    self._map.fire('projectchange', {'getProject': self.getProject.bind(self)});
                }, 1);

                return true;
            }, this);
    },

    _boundInProject: function (project, checkMethod) {
        try {
            return this.isProjectHere(this._map.getBounds(), project, checkMethod);
        } catch (e) {
            return false;
        }
    },

    _testProject: function (method, coords, project) {
        return project.latLngBounds[method](coords);
    },

    _zoomInProject: function (project) {
        return (this._map.getZoom() >= project.minZoom);
    }
});

DG.Map.mergeOptions({
    projectDetector: true
});

DG.Map.addInitHook('addHandler', 'projectDetector', DG.ProjectDetector);

DG.configTheme = DG.configTheme || {};

DG.configTheme.markersData = {
    iconSize: [22, 34],
    className: 'dg-customization__marker dg-customization__marker_type_mushroom',
    iconAnchor: [10, 32]
};

//Inject observing localization change
var controlAddTo = DG.Control.prototype.addTo;

DG.Control.include({
    addTo: function (map) {
        map.on('langchange', this._renderTranslation, this);

        return controlAddTo.call(this, map);
    },
    _renderTranslation: function () {}
});

// Applies 2GIS divIcon to marker
DG.Marker.prototype.options.icon = DG.divIcon(DG.configTheme.markersData);

// Add some browser detection
DG.Browser.safari51 = DG.Browser.safari && navigator.userAgent.indexOf('Version/5.1') !== -1;

// Fix bug with tileLayer minZoom
// https://github.com/2gis/mapsapi/pull/13
DG.GridLayer.include({
    _update: function () {

        if (!this._map) { return; }

        var bounds = this._map.getPixelBounds(),
            zoom = this._map.getZoom(),
            tileSize = this._getTileSize();

        if (zoom > this.options.maxZoom ||
            zoom < this.options.minZoom) {
            this._clearBgBuffer();
            return;
        }

        // tile coordinates range for the current view
        var tileBounds = L.bounds(
            bounds.min.divideBy(tileSize).floor(),
            bounds.max.divideBy(tileSize).floor());

        this._addTiles(tileBounds);

        if (this.options.unloadInvisibleTiles) {
            this._removeOtherTiles(tileBounds);
        }
    }
});

// Fix for https://github.com/2gis/mapsapi/issues/111 , remove on the next leaflet version
L.Draggable.include({
    _onMove: function (e) {
        if (e.touches && e.touches.length > 1) {
            this._moved = true;
            return;
        }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
            newPoint = new L.Point(first.clientX, first.clientY),
            offset = newPoint.subtract(this._startPoint);

        if (!offset.x && !offset.y) { return; }
        if (L.Browser.touch && Math.abs(offset.x) + Math.abs(offset.y) < 3) { return; }

        L.DomEvent.preventDefault(e);

        if (!this._moved) {
            this.fire('dragstart');

            this._moved = true;
            this._startPos = L.DomUtil.getPosition(this._element).subtract(offset);

            L.DomUtil.addClass(document.body, 'leaflet-dragging');

            this._lastTarget = e.target || e.srcElement;
            L.DomUtil.addClass(this._lastTarget, 'leaflet-drag-target');
        }

        this._newPos = this._startPos.add(offset);
        this._moving = true;

        L.Util.cancelAnimFrame(this._animRequest);
        this._animRequest = L.Util.requestAnimFrame(this._updatePosition, this, true, this._dragStartTarget);
    },
    _onUp: function () {
        L.DomUtil.removeClass(document.body, 'leaflet-dragging');

        if (this._lastTarget) {
            L.DomUtil.removeClass(this._lastTarget, 'leaflet-drag-target');
            this._lastTarget = null;
        }

        for (var i in L.Draggable.MOVE) {
            L.DomEvent
                .off(document, L.Draggable.MOVE[i], this._onMove, this)
                .off(document, L.Draggable.END[i], this._onUp, this);
        }

        L.DomUtil.enableImageDrag();
        L.DomUtil.enableTextSelection();

        if (this._moved && this._moving) {
            // ensure drag is not fired after dragend
            L.Util.cancelAnimFrame(this._animRequest);

            this.fire('dragend', {
                distance: this._newPos.distanceTo(this._startPos)
            });
        }

        this._moving = false;
    }
});

var panBy = DG.Map.prototype.panBy,
    getBoundsZoom = DG.Map.prototype.getBoundsZoom;

// Restrict zoom level according to 2gis projects, in case if dgTileLayer is only one
DG.Map.include({

    // number of tileLayers without 2gis layers
    _tileLayersNumber: 0,

    _mapMaxZoomCache: undefined,

    //TODO try refactor it after up on new leaflet (> 0.7)
    initialize: function (id, options) { // (HTMLElement or String, Object)
        options = L.setOptions(this, options);

        this._initContainer(id);
        this._initLayout();

        // hack for https://github.com/Leaflet/Leaflet/issues/1980
        this._onResize = L.bind(this._onResize, this);

        this._initEvents();

        if (options.maxBounds) {
            this.setMaxBounds(options.maxBounds);
        }

        this._handlers = [];

        this._layers = {};
        this._zoomBoundLayers = {};

        this.callInitHooks();

        this._addLayers(options.layers);

        if (options.center && options.zoom !== undefined) {
            this.setView(L.latLng(options.center), options.zoom, {reset: true});
        }

        this._sizeChanged = true;
    },

    setView: function (center, zoom, options) {
        this._restrictZoom(center);

        zoom =  this._limitZoom(zoom === undefined ? this._zoom : zoom);
        center = this._limitCenter(DG.latLng(center), zoom, this.options.maxBounds);
        options = options || {};

        if (options.animate) {
            options.animate = this._testAnimation(center);
        }

        if (this._panAnim) {
            this._panAnim.stop();
        }

        if (this._loaded && !options.reset && options !== true) {

            if (options.animate !== undefined) {
                options.zoom = DG.extend({animate: options.animate}, options.zoom);
                options.pan = DG.extend({animate: options.animate}, options.pan);
            }

            // try animating pan or zoom
            var animated = (this._zoom !== zoom) ?
            this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom, options.zoom) :
                this._tryAnimatedPan(center, options.pan);

            if (animated) {
                // prevent resize handler call, the view will refresh after animation anyway
                clearTimeout(this._sizeTimer);
                return this;
            }
        }

        // animation didn't start, just reset the map view
        this._resetView(center, zoom);

        return this;
    },

    panBy: function (offset, options) {
        var map = panBy.call(this, offset, options);

        var zoom = this._restrictZoom(this.getCenter());
        if (this.getZoom() > zoom) {
            this.setZoom(zoom);
        }

        return map;
    },

    getBoundsZoom: function (bounds, inside, padding) {
        this._restrictZoom(bounds);
        return getBoundsZoom.call(this, bounds, inside, padding);
    },

    _testAnimation: function (coords) {//if we jump to other project - disable animation
        if (this.projectDetector.enabled()) {
            var projectFrom = this.projectDetector.getProject(),
                projectTo = this.projectDetector.isProjectHere(coords);

            if (projectFrom && projectTo) {
                return projectFrom.code === projectTo.code;
            }
        }

        return true;
    },

    _updateTileLayers: function (e) {
        if (!(e.layer instanceof DG.TileLayer) || e.layer._isDg) { return; }

        if (e.type === 'layeradd') {
            this._tileLayersNumber++;
        } else {
            this._tileLayersNumber--;
        }
    },

    _restrictZoom: function (coords) {
        if (this._layers &&
            this.projectDetector.enabled() &&
            (this._tileLayersNumber === 0)) {

            var mapOptions = this.options,
                isMapMaxZoom = !!mapOptions.maxZoom,
                dgTileLayer = this.baseLayer,
                project = this.projectDetector.isProjectHere(coords);
            if (isMapMaxZoom) {
                if (!this._mapMaxZoomCache) { this._mapMaxZoomCache = mapOptions.maxZoom; }
                mapOptions.maxZoom = (this._mapMaxZoomCache && project) ? this._mapMaxZoomCache :  '13';
                if (project) {
                    this._mapMaxZoomCache = mapOptions.maxZoom;
                }

                return mapOptions.maxZoom;
            } else {
                dgTileLayer.options.maxZoom = project ? project.maxZoom : '13';
                dgTileLayer.options.maxNativeZoom = dgTileLayer.options.maxZoom;
                this._updateZoomLevels();

                return dgTileLayer.options.maxZoom;
            }
        }
    },

    // Fix for https://github.com/2gis/mapsapi/issues/34
    // Remove on the next leaflet version
    // Add prepreclick event before preclick than geoclicker can track popup state
    // https://github.com/2gis/mapsapi/pull/96
    _fireMouseEvent: function (obj, e, type, propagate, latlng) {
        type = type || e.type;

        if (L.DomEvent._skipped(e)) { return; }

        if (type === 'click') {
            var draggableObj = obj.options.draggable === true ? obj : this;
            if (!e._simulated && ((draggableObj.dragging && draggableObj.dragging.moved()) ||
                (this.boxZoom && this.boxZoom.moved()))) {
                L.DomEvent.stopPropagation(e);
                return;
            }
            obj.fire('prepreclick');
            obj.fire('preclick');
        }

        if (!obj.listens(type, propagate)) { return; }

        if (type === 'contextmenu') {
            L.DomEvent.preventDefault(e);
        }
        if (type === 'click' || type === 'dblclick' || type === 'contextmenu') {
            L.DomEvent.stopPropagation(e);
        }

        var data = {
            originalEvent: e,
            containerPoint: this.mouseEventToContainerPoint(e)
        };

        data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
        data.latlng = latlng || this.layerPointToLatLng(data.layerPoint);

        obj.fire(type, data, propagate);
    }
});

DG.Map.addInitHook(function () {
    this.on('layeradd layerremove', this._updateTileLayers);
});

// fix bug with dragging map into new parallel world
// remove on next leaflet version
DG.Map.Drag.include({
    _onDrag: function () {
        if (this._map.options.inertia) {
            var time = this._lastTime = +new Date(),
                pos = this._lastPos = this._draggable._absPos || this._draggable._newPos;

            this._positions.push(pos);
            this._times.push(time);

            if (time - this._times[0] > 200) {
                this._positions.shift();
                this._times.shift();
            }
        }

        this._map
            .fire('move')
            .fire('drag');
    },
    _onPreDrag: function () {
        // TODO refactor to be able to adjust map pane position after zoom
        var worldWidth = this._worldWidth,
            halfWidth = Math.round(worldWidth / 2),
            dx = this._initialWorldOffset,
            x = this._draggable._newPos.x,
            newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx,
            newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx,
            newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;

        this._draggable._absPos = this._draggable._newPos.clone();
        this._draggable._newPos.x = newX;
    }
});

(function () {
    var errorUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEX28t5R0k5UAAAAH0lEQVR4Xu3AAQkAAADCMPunNsdhWxwAAAAAAAAAwAEhAAABg2UP5AAAAABJRU5ErkJggg==';
    var errorRuUrl = 'http://2gis.github.io/mapsapi/img/nomap_ru.png';

    var BaseLayer = DG.TileLayer.extend({
        initialize: function (url, options) {
            this._isDg = true;
            DG.TileLayer.prototype.initialize.call(this, url, options);
        }
    });

    DG.Map.addInitHook(function () {
        this.baseLayer = new BaseLayer('http://tile{s}.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1', {
                subdomains: '0123',
                errorTileUrl: this.getLang() === 'ru' ? errorRuUrl : errorUrl,
                /* global true */
                detectRetina: true,
                maxZoom: 19,
                maxNativeZoom: 19
            }
        ).addTo(this);

        this.on('langchange', function(ev) {
            if (ev.lang === 'ru') {
                this.baseLayer.options.errorTileUrl = errorRuUrl;
            } else {
                this.baseLayer.options.errorTileUrl = errorUrl;
            }
        });
    });
})();

DG.Control.Zoom.include(DG.Locale);
DG.Control.Zoom.Dictionary = {};

DG.Control.Zoom.include({
    // TODO: think about pull request to leaflet with zoom control button's titles as options
    onAdd: function (map) {
        var zoomName = 'dg-zoom',
            buttonTemplate = '<div class="dg-control-round__icon ' + zoomName + '__control ' + zoomName + '__button ' + zoomName + '__button_type_{type}"></div>',
            container = DG.DomUtil.create('div', zoomName);

        this._map = map;

        this._zoomInButton = this._createButton(DG.Util.template(buttonTemplate, {type : 'in'}), this.t('zoom_in'), 'dg-control-round ' + zoomName + '__in', container, this._zoomIn, this);
        this._zoomOutButton = this._createButton(DG.Util.template(buttonTemplate, {type : 'out'}), this.t('zoom_out'), 'dg-control-round ' + zoomName + '__out', container, this._zoomOut, this);

        this._eventListeners = {};
        this._eventListeners.zoomend = this._eventListeners.zoomlevelschange = this._updateDisabled;
        this._updateDisabled();
        map.on(this._eventListeners, this);

        return container;
    },

    _originalCreateButton: DG.Control.Zoom.prototype._createButton,

    _createButton: function () {
        var args = Array.prototype.slice.call(arguments);
        var link = this._originalCreateButton.apply(this, args);

        var icon = link.children[0];
        var linkActiveClass = 'dg-control-round_state_active';
        var iconActiveClass = 'dg-control-round__icon_state_active';

        DG.DomEvent
            .on(link, 'touchstart', function () {
                DG.DomUtil.addClass(link, linkActiveClass);
                DG.DomUtil.addClass(icon, iconActiveClass);
            })
            .on(link, 'touchend touchcancel', function () {
                DG.DomUtil.removeClass(link, linkActiveClass);
                DG.DomUtil.removeClass(icon, iconActiveClass);
            });

        return link;
    },

    onRemove: function (map) {
        map.off(this._eventListeners, this);
    },

    _renderTranslation: function () {
        this._zoomInButton.title = this.t('zoom_in');
        this._zoomOutButton.title = this.t('zoom_out');
    }
});

DG.Control.Zoom.Dictionary.ru = {
    zoom_in : 'Приблизить',
    zoom_out : 'Отдалить'
};
DG.Control.Zoom.Dictionary.it = {
    zoom_in : 'Zoom avanti',
    zoom_out : 'Zoom indietro'
};
DG.Control.Zoom.Dictionary.cs = {
    zoom_in : 'Přiblížit',
    zoom_out : 'Oddálit'
};
DG.Control.Zoom.Dictionary.en = {
    zoom_in : 'Zoom in',
    zoom_out : 'Zoom out'
};
DG.Control.Zoom.Dictionary.es = {
    zoom_in : 'Acercar',
    zoom_out : 'Alejar'
};

/*! Dust - Asynchronous Templating - v2.6.1
* http://linkedin.github.io/dustjs/
* Copyright (c) 2015 Aleksander Williams; Released under the MIT License */
(function(root) {
  var dust = {
        "version": "2.6.1"
      },
      NONE = 'NONE',
      ERROR = 'ERROR',
      WARN = 'WARN',
      INFO = 'INFO',
      DEBUG = 'DEBUG',
      loggingLevels = [DEBUG, INFO, WARN, ERROR, NONE],
      EMPTY_FUNC = function() {},
      logger = {},
      originalLog,
      loggerContext;

  dust.debugLevel = NONE;

  dust.config = {
    whitespace: false,
    amd: false
  };

  // Directive aliases to minify code
  dust._aliases = {
    "write": "w",
    "end": "e",
    "map": "m",
    "render": "r",
    "reference": "f",
    "section": "s",
    "exists": "x",
    "notexists": "nx",
    "block": "b",
    "partial": "p",
    "helper": "h"
  };

  // Try to find the console in global scope
  if (root && root.console && root.console.log) {
    loggerContext = root.console;
    originalLog = root.console.log;
  }

  // robust logger for node.js, modern browsers, and IE <= 9.
  logger.log = loggerContext ? function() {
      // Do this for normal browsers
      if (typeof originalLog === 'function') {
        logger.log = function() {
          originalLog.apply(loggerContext, arguments);
        };
      } else {
        // Do this for IE <= 9
        logger.log = function() {
          var message = Array.prototype.slice.apply(arguments).join(' ');
          originalLog(message);
        };
      }
      logger.log.apply(this, arguments);
  } : function() { /* no op */ };

  /**
   * Log dust debug statements, info statements, warning statements, and errors.
   * Filters out the messages based on the dust.debuglevel.
   * This default implementation will print to the console if it exists.
   * @param {String|Error} message the message to print/throw
   * @param {String} type the severity of the message(ERROR, WARN, INFO, or DEBUG)
   * @public
   */
  dust.log = function(message, type) {
    type = type || INFO;
    if (dust.debugLevel !== NONE && dust.indexInArray(loggingLevels, type) >= dust.indexInArray(loggingLevels, dust.debugLevel)) {
      if(!dust.logQueue) {
        dust.logQueue = [];
      }
      dust.logQueue.push({message: message, type: type});
      logger.log('[DUST:' + type + ']', message);
    }
  };

  dust.helpers = {};

  dust.cache = {};

  dust.register = function(name, tmpl) {
    if (!name) {
      return;
    }
    dust.cache[name] = tmpl;
  };

  dust.render = function(name, context, callback) {
    var chunk = new Stub(callback).head;
    try {
      dust.load(name, chunk, Context.wrap(context, name)).end();
    } catch (err) {
      chunk.setError(err);
    }
  };

  dust.stream = function(name, context) {
    var stream = new Stream(),
        chunk = stream.head;
    dust.nextTick(function() {
      try {
        dust.load(name, stream.head, Context.wrap(context, name)).end();
      } catch (err) {
        chunk.setError(err);
      }
    });
    return stream;
  };

  dust.renderSource = function(source, context, callback) {
    return dust.compileFn(source)(context, callback);
  };

  dust.compileFn = function(source, name) {
    // name is optional. When name is not provided the template can only be rendered using the callable returned by this function.
    // If a name is provided the compiled template can also be rendered by name.
    name = name || null;
    var tmpl = dust.loadSource(dust.compile(source, name));
    return function(context, callback) {
      var master = callback ? new Stub(callback) : new Stream();
      dust.nextTick(function() {
        if(typeof tmpl === 'function') {
          tmpl(master.head, Context.wrap(context, name)).end();
        }
        else {
          dust.log(new Error('Template [' + name + '] cannot be resolved to a Dust function'), ERROR);
        }
      });
      return master;
    };
  };

  dust.load = function(name, chunk, context) {
    var tmpl = dust.cache[name];
    if (tmpl) {
      return tmpl(chunk, context);
    } else {
      if (dust.onLoad) {
        return chunk.map(function(chunk) {
          dust.onLoad(name, function(err, src) {
            if (err) {
              return chunk.setError(err);
            }
            if (!dust.cache[name]) {
              dust.loadSource(dust.compile(src, name));
            }
            dust.cache[name](chunk, context).end();
          });
        });
      }
      return chunk.setError(new Error('Template Not Found: ' + name));
    }
  };

  dust.loadSource = function(source, path) {
    return eval(source);
  };

  if (Array.isArray) {
    dust.isArray = Array.isArray;
  } else {
    dust.isArray = function(arr) {
      return Object.prototype.toString.call(arr) === '[object Array]';
    };
  }

  // indexOf shim for arrays for IE <= 8
  // source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
  dust.indexInArray = function(arr, item, fromIndex) {
    fromIndex = +fromIndex || 0;
    if (Array.prototype.indexOf) {
      return arr.indexOf(item, fromIndex);
    } else {
    if ( arr === undefined || arr === null ) {
      throw new TypeError( 'cannot call method "indexOf" of null' );
    }

    var length = arr.length; // Hack to convert object.length to a UInt32

    if (Math.abs(fromIndex) === Infinity) {
      fromIndex = 0;
    }

    if (fromIndex < 0) {
      fromIndex += length;
      if (fromIndex < 0) {
        fromIndex = 0;
      }
    }

    for (;fromIndex < length; fromIndex++) {
      if (arr[fromIndex] === item) {
        return fromIndex;
      }
    }

    return -1;
    }
  };

  dust.nextTick = (function() {
    return function(callback) {
      setTimeout(callback,0);
    };
  } )();

  dust.isEmpty = function(value) {
    if (dust.isArray(value) && !value.length) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    return (!value);
  };

  // apply the filter chain and return the output string
  dust.filter = function(string, auto, filters) {
    if (filters) {
      for (var i=0, len=filters.length; i<len; i++) {
        var name = filters[i];
        if (name === 's') {
          auto = null;
        }
        else if (typeof dust.filters[name] === 'function') {
          string = dust.filters[name](string);
        }
        else {
          dust.log('Invalid filter [' + name + ']', WARN);
        }
      }
    }
    // by default always apply the h filter, unless asked to unescape with |s
    if (auto) {
      string = dust.filters[auto](string);
    }
    return string;
  };

  dust.filters = {
    h: function(value) { return dust.escapeHtml(value); },
    j: function(value) { return dust.escapeJs(value); },
    u: encodeURI,
    uc: encodeURIComponent,
    js: function(value) { return dust.escapeJSON(value); },
    jp: function(value) {
      if (!JSON) {dust.log('JSON is undefined.  JSON parse has not been used on [' + value + ']', WARN);
        return value;
      } else {
        return JSON.parse(value);
      }
    }
  };

  function Context(stack, global, blocks, templateName) {
    this.stack  = stack;
    this.global = global;
    this.blocks = blocks;
    this.templateName = templateName;
  }

  dust.makeBase = function(global) {
    return new Context(new Stack(), global);
  };

  Context.wrap = function(context, name) {
    if (context instanceof Context) {
      return context;
    }
    return new Context(new Stack(context), {}, null, name);
  };

  /**
   * Public API for getting a value from the context.
   * @method get
   * @param {string|array} path The path to the value. Supported formats are:
   * 'key'
   * 'path.to.key'
   * '.path.to.key'
   * ['path', 'to', 'key']
   * ['key']
   * @param {boolean} [cur=false] Boolean which determines if the search should be limited to the
   * current context (true), or if get should search in parent contexts as well (false).
   * @public
   * @returns {string|object}
   */
  Context.prototype.get = function(path, cur) {
    if (typeof path === 'string') {
      if (path[0] === '.') {
        cur = true;
        path = path.substr(1);
      }
      path = path.split('.');
    }
    return this._get(cur, path);
  };

  /**
   * Get a value from the context
   * @method _get
   * @param {boolean} cur Get only from the current context
   * @param {array} down An array of each step in the path
   * @private
   * @return {string | object}
   */
  Context.prototype._get = function(cur, down) {
    var ctx = this.stack,
        i = 1,
        value, first, len, ctxThis, fn;
    first = down[0];
    len = down.length;

    if (cur && len === 0) {
      ctxThis = ctx;
      ctx = ctx.head;
    } else {
      if (!cur) {
        // Search up the stack for the first value
        while (ctx) {
          if (ctx.isObject) {
            ctxThis = ctx.head;
            value = ctx.head[first];
            if (value !== undefined) {
              break;
            }
          }
          ctx = ctx.tail;
        }

        if (value !== undefined) {
          ctx = value;
        } else {
          ctx = this.global ? this.global[first] : undefined;
        }
      } else if (ctx) {
        // if scope is limited by a leading dot, don't search up the tree
        if(ctx.head) {
          ctx = ctx.head[first];
        } else {
          //context's head is empty, value we are searching for is not defined
          ctx = undefined;
        }
      }

      while (ctx && i < len) {
        ctxThis = ctx;
        ctx = ctx[down[i]];
        i++;
      }
    }

    // Return the ctx or a function wrapping the application of the context.
    if (typeof ctx === 'function') {
      fn = function() {
        try {
          return ctx.apply(ctxThis, arguments);
        } catch (err) {
          dust.log(err, ERROR);
          throw err;
        }
      };
      fn.__dustBody = !!ctx.__dustBody;
      return fn;
    } else {
      if (ctx === undefined) {
        dust.log('Cannot find the value for reference [{' + down.join('.') + '}] in template [' + this.getTemplateName() + ']');
      }
      return ctx;
    }
  };

  Context.prototype.getPath = function(cur, down) {
    return this._get(cur, down);
  };

  Context.prototype.push = function(head, idx, len) {
    return new Context(new Stack(head, this.stack, idx, len), this.global, this.blocks, this.getTemplateName());
  };

  Context.prototype.rebase = function(head) {
    return new Context(new Stack(head), this.global, this.blocks, this.getTemplateName());
  };

  Context.prototype.current = function() {
    return this.stack.head;
  };

  Context.prototype.getBlock = function(key, chk, ctx) {
    if (typeof key === 'function') {
      var tempChk = new Chunk();
      key = key(tempChk, this).data.join('');
    }

    var blocks = this.blocks;

    if (!blocks) {
      dust.log('No blocks for context[{' + key + '}] in template [' + this.getTemplateName() + ']', DEBUG);
      return;
    }
    var len = blocks.length, fn;
    while (len--) {
      fn = blocks[len][key];
      if (fn) {
        return fn;
      }
    }
  };

  Context.prototype.shiftBlocks = function(locals) {
    var blocks = this.blocks,
        newBlocks;

    if (locals) {
      if (!blocks) {
        newBlocks = [locals];
      } else {
        newBlocks = blocks.concat([locals]);
      }
      return new Context(this.stack, this.global, newBlocks, this.getTemplateName());
    }
    return this;
  };

  Context.prototype.getTemplateName = function() {
    return this.templateName;
  };

  function Stack(head, tail, idx, len) {
    this.tail = tail;
    this.isObject = head && typeof head === 'object';
    this.head = head;
    this.index = idx;
    this.of = len;
  }

  function Stub(callback) {
    this.head = new Chunk(this);
    this.callback = callback;
    this.out = '';
  }

  Stub.prototype.flush = function() {
    var chunk = this.head;

    while (chunk) {
      if (chunk.flushable) {
        this.out += chunk.data.join(''); //ie7 perf
      } else if (chunk.error) {
        this.callback(chunk.error);
        dust.log('Chunk error [' + chunk.error + '] thrown. Ceasing to render this template.', WARN);
        this.flush = EMPTY_FUNC;
        return;
      } else {
        return;
      }
      chunk = chunk.next;
      this.head = chunk;
    }
    this.callback(null, this.out);
  };

  function Stream() {
    this.head = new Chunk(this);
  }

  Stream.prototype.flush = function() {
    var chunk = this.head;

    while(chunk) {
      if (chunk.flushable) {
        this.emit('data', chunk.data.join('')); //ie7 perf
      } else if (chunk.error) {
        this.emit('error', chunk.error);
        dust.log('Chunk error [' + chunk.error + '] thrown. Ceasing to render this template.', WARN);
        this.flush = EMPTY_FUNC;
        return;
      } else {
        return;
      }
      chunk = chunk.next;
      this.head = chunk;
    }
    this.emit('end');
  };

  Stream.prototype.emit = function(type, data) {
    if (!this.events) {
      dust.log('No events to emit', INFO);
      return false;
    }
    var handler = this.events[type];
    if (!handler) {
      dust.log('Event type [' + type + '] does not exist', WARN);
      return false;
    }
    if (typeof handler === 'function') {
      handler(data);
    } else if (dust.isArray(handler)) {
      var listeners = handler.slice(0);
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i](data);
      }
    } else {
      dust.log('Event Handler [' + handler + '] is not of a type that is handled by emit', WARN);
    }
  };

  Stream.prototype.on = function(type, callback) {
    if (!this.events) {
      this.events = {};
    }
    if (!this.events[type]) {
      if(callback) {
        this.events[type] = callback;
      } else {
        dust.log('Callback for type [' + type + '] does not exist. Listener not registered.', WARN);
      }
    } else if(typeof this.events[type] === 'function') {
      this.events[type] = [this.events[type], callback];
    } else {
      this.events[type].push(callback);
    }
    return this;
  };

  Stream.prototype.pipe = function(stream) {
    this.on('data', function(data) {
      try {
        stream.write(data, 'utf8');
      } catch (err) {
        dust.log(err, ERROR);
      }
    }).on('end', function() {
      try {
        return stream.end();
      } catch (err) {
        dust.log(err, ERROR);
      }
    }).on('error', function(err) {
      stream.error(err);
    });
    return this;
  };

  function Chunk(root, next, taps) {
    this.root = root;
    this.next = next;
    this.data = []; //ie7 perf
    this.flushable = false;
    this.taps = taps;
  }

  Chunk.prototype.write = function(data) {
    var taps  = this.taps;

    if (taps) {
      data = taps.go(data);
    }
    this.data.push(data);
    return this;
  };

  Chunk.prototype.end = function(data) {
    if (data) {
      this.write(data);
    }
    this.flushable = true;
    this.root.flush();
    return this;
  };

  Chunk.prototype.map = function(callback) {
    var cursor = new Chunk(this.root, this.next, this.taps),
        branch = new Chunk(this.root, cursor, this.taps);

    this.next = branch;
    this.flushable = true;
    try {
      callback(branch);
    } catch(e) {
      dust.log(e, ERROR);
      branch.setError(e);
    }
    return cursor;
  };

  Chunk.prototype.tap = function(tap) {
    var taps = this.taps;

    if (taps) {
      this.taps = taps.push(tap);
    } else {
      this.taps = new Tap(tap);
    }
    return this;
  };

  Chunk.prototype.untap = function() {
    this.taps = this.taps.tail;
    return this;
  };

  Chunk.prototype.render = function(body, context) {
    return body(this, context);
  };

  Chunk.prototype.reference = function(elem, context, auto, filters) {
    if (typeof elem === 'function') {
      // Changed the function calling to use apply with the current context to make sure
      // that "this" is wat we expect it to be inside the function
      elem = elem.apply(context.current(), [this, context, null, {auto: auto, filters: filters}]);
      if (elem instanceof Chunk) {
        return elem;
      }
    }
    if (!dust.isEmpty(elem)) {
      return this.write(dust.filter(elem, auto, filters));
    } else {
      return this;
    }
  };

  Chunk.prototype.section = function(elem, context, bodies, params) {
    // anonymous functions
    if (typeof elem === 'function' && !elem.__dustBody) {
      try {
        elem = elem.apply(context.current(), [this, context, bodies, params]);
      } catch(e) {
        dust.log(e, ERROR);
        return this.setError(e);
      }
      // functions that return chunks are assumed to have handled the body and/or have modified the chunk
      // use that return value as the current chunk and go to the next method in the chain
      if (elem instanceof Chunk) {
        return elem;
      }
    }
    var body = bodies.block,
        skip = bodies['else'];

    // a.k.a Inline parameters in the Dust documentations
    if (params) {
      context = context.push(params);
    }

    /*
    Dust's default behavior is to enumerate over the array elem, passing each object in the array to the block.
    When elem resolves to a value or object instead of an array, Dust sets the current context to the value
    and renders the block one time.
    */
    //non empty array is truthy, empty array is falsy
    if (dust.isArray(elem)) {
      if (body) {
        var len = elem.length, chunk = this;
        if (len > 0) {
          // any custom helper can blow up the stack
          // and store a flattened context, guard defensively
          if(context.stack.head) {
            context.stack.head['$len'] = len;
          }
          for (var i=0; i<len; i++) {
            if(context.stack.head) {
              context.stack.head['$idx'] = i;
            }
            chunk = body(chunk, context.push(elem[i], i, len));
          }
          if(context.stack.head) {
            context.stack.head['$idx'] = undefined;
            context.stack.head['$len'] = undefined;
          }
          return chunk;
        }
        else if (skip) {
          return skip(this, context);
        }
      }
    } else if (elem  === true) {
     // true is truthy but does not change context
      if (body) {
        return body(this, context);
      }
    } else if (elem || elem === 0) {
       // everything that evaluates to true are truthy ( e.g. Non-empty strings and Empty objects are truthy. )
       // zero is truthy
       // for anonymous functions that did not returns a chunk, truthiness is evaluated based on the return value
      if (body) {
        return body(this, context.push(elem));
      }
     // nonexistent, scalar false value, scalar empty string, null,
     // undefined are all falsy
    } else if (skip) {
      return skip(this, context);
    }
    dust.log('Not rendering section (#) block in template [' + context.getTemplateName() + '], because above key was not found', DEBUG);
    return this;
  };

  Chunk.prototype.exists = function(elem, context, bodies) {
    var body = bodies.block,
        skip = bodies['else'];

    if (!dust.isEmpty(elem)) {
      if (body) {
        return body(this, context);
      }
    } else if (skip) {
      return skip(this, context);
    }
    dust.log('Not rendering exists (?) block in template [' + context.getTemplateName() + '], because above key was not found', DEBUG);
    return this;
  };

  Chunk.prototype.notexists = function(elem, context, bodies) {
    var body = bodies.block,
        skip = bodies['else'];

    if (dust.isEmpty(elem)) {
      if (body) {
        return body(this, context);
      }
    } else if (skip) {
      return skip(this, context);
    }
    dust.log('Not rendering not exists (^) block check in template [' + context.getTemplateName() + '], because above key was found', DEBUG);
    return this;
  };

  Chunk.prototype.block = function(elem, context, bodies) {
    var body = bodies.block;

    if (elem) {
      body = elem;
    }

    if (body) {
      return body(this, context);
    }
    return this;
  };

  Chunk.prototype.partial = function(elem, context, params) {
    var partialContext;
    //put the params context second to match what section does. {.} matches the current context without parameters
    // start with an empty context
    partialContext = dust.makeBase(context.global);
    partialContext.blocks = context.blocks;
    if (context.stack && context.stack.tail){
      // grab the stack(tail) off of the previous context if we have it
      partialContext.stack = context.stack.tail;
    }
    if (params){
      //put params on
      partialContext = partialContext.push(params);
    }

    if(typeof elem === 'string') {
      partialContext.templateName = elem;
    }

    //reattach the head
    partialContext = partialContext.push(context.stack.head);

    var partialChunk;
    if (typeof elem === 'function') {
      partialChunk = this.capture(elem, partialContext, function(name, chunk) {
        partialContext.templateName = partialContext.templateName || name;
        dust.load(name, chunk, partialContext).end();
      });
    } else {
      partialChunk = dust.load(elem, this, partialContext);
    }
    return partialChunk;
  };

  Chunk.prototype.helper = function(name, context, bodies, params) {
    var chunk = this;
    // handle invalid helpers, similar to invalid filters
    if(dust.helpers[name]) {
      try {
        return dust.helpers[name](chunk, context, bodies, params);
      } catch(e) {
        dust.log('Error in ' + name + ' helper: ' + e, ERROR);
        return chunk.setError(e);
      }
    } else {
      dust.log('Invalid helper [' + name + ']', WARN);
      return chunk;
    }
  };

  Chunk.prototype.capture = function(body, context, callback) {
    return this.map(function(chunk) {
      var stub = new Stub(function(err, out) {
        if (err) {
          chunk.setError(err);
        } else {
          callback(out, chunk);
        }
      });
      body(stub.head, context).end();
    });
  };

  Chunk.prototype.setError = function(err) {
    this.error = err;
    this.root.flush();
    return this;
  };

  // Chunk aliases
  for(var f in Chunk.prototype) {
    if(dust._aliases[f]) {
      Chunk.prototype[dust._aliases[f]] = Chunk.prototype[f];
    }
  }

  function Tap(head, tail) {
    this.head = head;
    this.tail = tail;
  }

  Tap.prototype.push = function(tap) {
    return new Tap(tap, this);
  };

  Tap.prototype.go = function(value) {
    var tap = this;

    while(tap) {
      value = tap.head(value);
      tap = tap.tail;
    }
    return value;
  };

  var HCHARS = /[&<>"']/,
      AMP    = /&/g,
      LT     = /</g,
      GT     = />/g,
      QUOT   = /\"/g,
      SQUOT  = /\'/g;

  dust.escapeHtml = function(s) {
    if (typeof s === "string" || (s && typeof s.toString === "function")) {
      if (typeof s !== "string") {
        s = s.toString();
      }
      if (!HCHARS.test(s)) {
        return s;
      }
      return s.replace(AMP,'&amp;').replace(LT,'&lt;').replace(GT,'&gt;').replace(QUOT,'&quot;').replace(SQUOT, '&#39;');
    }
    return s;
  };

  var BS = /\\/g,
      FS = /\//g,
      CR = /\r/g,
      LS = /\u2028/g,
      PS = /\u2029/g,
      NL = /\n/g,
      LF = /\f/g,
      SQ = /'/g,
      DQ = /"/g,
      TB = /\t/g;

  dust.escapeJs = function(s) {
    if (typeof s === 'string') {
      return s
        .replace(BS, '\\\\')
        .replace(FS, '\\/')
        .replace(DQ, '\\"')
        .replace(SQ, '\\\'')
        .replace(CR, '\\r')
        .replace(LS, '\\u2028')
        .replace(PS, '\\u2029')
        .replace(NL, '\\n')
        .replace(LF, '\\f')
        .replace(TB, '\\t');
    }
    return s;
  };

  dust.escapeJSON = function(o) {
    if (!JSON) {
      dust.log('JSON is undefined.  JSON stringify has not been used on [' + o + ']', WARN);
      return o;
    } else {
      return JSON.stringify(o)
        .replace(LS, '\\u2028')
        .replace(PS, '\\u2029')
        .replace(LT, '\\u003c');
    }
  };

  if (typeof define === "function" && define.amd && define.amd.dust === true) {
    define("dust.core", function() {
      return dust;
    });
  } else if (typeof exports === 'object') {
    module.exports = dust;
  } else {
    root.dust = dust;
  }

})((function(){return this;})());

if (typeof define === "function" && define.amd && define.amd.dust === true) {
    define(["require", "dust.core"], function(require, dust) {
        dust.onLoad = function(name, cb) {
            require([name], function() {
                cb();
            });
        };
        return dust;
    });
}

/*! dustjs-helpers - v1.6.1
* https://github.com/linkedin/dustjs-helpers
* Copyright (c) 2015 Aleksander Williams; Released under the MIT License */
(function(root, factory) {
  if (typeof define === 'function' && define.amd && define.amd.dust === true) {
    define(['dust.core'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('dustjs-linkedin'));
  } else {
    factory(root.dust);
  }
}(this, function(dust) {

// Use dust's built-in logging when available
var _log = dust.log ? function(msg, level) {
  level = level || "INFO";
  dust.log(msg, level);
} : function() {};

var _deprecatedCache = {};
function _deprecated(target) {
  if(_deprecatedCache[target]) { return; }
  _log("Deprecation warning: " + target + " is deprecated and will be removed in a future version of dustjs-helpers", "WARN");
  _log("For help and a deprecation timeline, see https://github.com/linkedin/dustjs-helpers/wiki/Deprecated-Features#" + target.replace(/\W+/g, ""), "WARN");
  _deprecatedCache[target] = true;
}

function isSelect(context) {
  return context.stack.tail &&
         typeof context.stack.tail.head.__select__ !== "undefined";
}

function getSelectState(context) {
  return context.get('__select__');
}

function addSelectState(context, key) {
  var head = context.stack.head,
      newContext = context.rebase();

  if(context.stack && context.stack.tail) {
    newContext.stack = context.stack.tail;
  }

  return newContext
  .push({ "__select__": {
      isResolved: false,
      isDefaulted: false,
      isDeferredComplete: false,
      deferreds: [],
      key: key
    }
  })
  .push(head, context.stack.index, context.stack.of);
}

// Utility method : toString() equivalent for functions
function jsonFilter(key, value) {
  if (typeof value === "function") {
    //to make sure all environments format functions the same way
    return value.toString()
      //remove all leading and trailing whitespace
      .replace(/(^\s+|\s+$)/mg, '')
      //remove new line characters
      .replace(/\n/mg, '')
      //replace , and 0 or more spaces with ", "
      .replace(/,\s*/mg, ', ')
      //insert space between ){
      .replace(/\)\{/mg, ') {')
    ;
  }
  return value;
}

// Utility method: to invoke the given filter operation such as eq/gt etc
function filter(chunk, context, bodies, params, filterOp) {
  params = params || {};
  var body = bodies.block,
      actualKey,
      expectedValue,
      selectState,
      filterOpType = params.filterOpType || '';

  // Currently we first check for a key on the helper itself, then fall back to
  // looking for a key on the {@select} that contains it. This is undocumented
  // behavior that we may or may not support in the future. (If we stop supporting
  // it, just switch the order of the test below to check the {@select} first.)
  if (params.hasOwnProperty("key")) {
    actualKey = dust.helpers.tap(params.key, chunk, context);
  } else if (isSelect(context)) {
    selectState = getSelectState(context);
    actualKey = selectState.key;
    // Once one truth test in a select passes, short-circuit the rest of the tests
    if (selectState.isResolved) {
      filterOp = function() { return false; };
    }
  } else {
    _log("No key specified for filter in {@" + filterOpType + "}");
    return chunk;
  }
  expectedValue = dust.helpers.tap(params.value, chunk, context);
  // coerce both the actualKey and expectedValue to the same type for equality and non-equality compares
  if (filterOp(coerce(expectedValue, params.type, context), coerce(actualKey, params.type, context))) {
    if (isSelect(context)) {
      if(filterOpType === 'default') {
        selectState.isDefaulted = true;
      }
      selectState.isResolved = true;
    }
    // Helpers without bodies are valid due to the use of {@any} blocks
    if(body) {
      return chunk.render(body, context);
    } else {
      return chunk;
    }
  } else if (bodies['else']) {
    return chunk.render(bodies['else'], context);
  }
  return chunk;
}

function coerce(value, type, context) {
  if (typeof value !== "undefined") {
    switch (type || typeof value) {
      case 'number': return +value;
      case 'string': return String(value);
      case 'boolean':
        value = (value === 'false' ? false : value);
        return Boolean(value);
      case 'date': return new Date(value);
      case 'context': return context.get(value);
    }
  }

  return value;
}

var helpers = {

  // Utility helping to resolve dust references in the given chunk
  // uses the Chunk.render method to resolve value
  /*
   Reference resolution rules:
   if value exists in JSON:
    "" or '' will evaluate to false, boolean false, null, or undefined will evaluate to false,
    numeric 0 evaluates to true, so does, string "0", string "null", string "undefined" and string "false".
    Also note that empty array -> [] is evaluated to false and empty object -> {} and non-empty object are evaluated to true
    The type of the return value is string ( since we concatenate to support interpolated references

   if value does not exist in JSON and the input is a single reference: {x}
     dust render emits empty string, and we then return false

   if values does not exist in JSON and the input is interpolated references : {x} < {y}
     dust render emits <  and we return the partial output

  */
  "tap": function(input, chunk, context) {
    // return given input if there is no dust reference to resolve
    // dust compiles a string/reference such as {foo} to a function
    if (typeof input !== "function") {
      return input;
    }

    var dustBodyOutput = '',
      returnValue;

    //use chunk render to evaluate output. For simple functions result will be returned from render call,
    //for dust body functions result will be output via callback function
    returnValue = chunk.tap(function(data) {
      dustBodyOutput += data;
      return '';
    }).render(input, context);

    chunk.untap();

    //assume it's a simple function call if return result is not a chunk
    if (returnValue.constructor !== chunk.constructor) {
      //use returnValue as a result of tap
      return returnValue;
    } else if (dustBodyOutput === '') {
      return false;
    } else {
      return dustBodyOutput;
    }
  },

  "sep": function(chunk, context, bodies) {
    var body = bodies.block;
    if (context.stack.index === context.stack.of - 1) {
      return chunk;
    }
    if (body) {
      return body(chunk, context);
    } else {
      return chunk;
    }
  },

  "first": function(chunk, context, bodies) {
    if (context.stack.index === 0) {
      return bodies.block(chunk, context);
    }
    return chunk;
  },

  "last": function(chunk, context, bodies) {
    if (context.stack.index === context.stack.of - 1) {
      return bodies.block(chunk, context);
    }
    return chunk;
  },

  /**
   * contextDump helper
   * @param key specifies how much to dump.
   * "current" dumps current context. "full" dumps the full context stack.
   * @param to specifies where to write dump output.
   * Values can be "console" or "output". Default is output.
   */
  "contextDump": function(chunk, context, bodies, params) {
    var p = params || {},
      to = p.to || 'output',
      key = p.key || 'current',
      dump;
    to = dust.helpers.tap(to, chunk, context);
    key = dust.helpers.tap(key, chunk, context);
    if (key === 'full') {
      dump = JSON.stringify(context.stack, jsonFilter, 2);
    }
    else {
      dump = JSON.stringify(context.stack.head, jsonFilter, 2);
    }
    if (to === 'console') {
      _log(dump);
      return chunk;
    }
    else {
      // encode opening brackets when outputting to html
      dump = dump.replace(/</g, '\\u003c');

      return chunk.write(dump);
    }
  },
  /**
   if helper for complex evaluation complex logic expressions.
   Note : #1 if helper fails gracefully when there is no body block nor else block
          #2 Undefined values and false values in the JSON need to be handled specially with .length check
             for e.g @if cond=" '{a}'.length && '{b}'.length" is advised when there are chances of the a and b been
             undefined or false in the context
          #3 Use only when the default ? and ^ dust operators and the select fall short in addressing the given logic,
             since eval executes in the global scope
          #4 All dust references are default escaped as they are resolved, hence eval will block malicious scripts in the context
             Be mindful of evaluating a expression that is passed through the unescape filter -> |s
   @param cond, either a string literal value or a dust reference
                a string literal value, is enclosed in double quotes, e.g. cond="2>3"
                a dust reference is also enclosed in double quotes, e.g. cond="'{val}'' > 3"
    cond argument should evaluate to a valid javascript expression
   **/

  /**
   * math helper
   * @param key is the value to perform math against
   * @param method is the math method,  is a valid string supported by math helper like mod, add, subtract
   * @param operand is the second value needed for operations like mod, add, subtract, etc.
   * @param round is a flag to assure that an integer is returned
   */
  "math": function ( chunk, context, bodies, params ) {
    //key and method are required for further processing
    if( params && typeof params.key !== "undefined" && params.method ){
      var key  = params.key,
          method = params.method,
          // operand can be null for "abs", ceil and floor
          operand = params.operand,
          round = params.round,
          mathOut = null;

      key = parseFloat(dust.helpers.tap(key, chunk, context));
      operand = parseFloat(dust.helpers.tap(operand, chunk, context));
      //  TODO: handle  and tests for negatives and floats in all math operations
      switch(method) {
        case "mod":
          if(operand === 0 || operand === -0) {
            _log("Division by 0 in {@math} helper", "WARN");
          }
          mathOut = key % operand;
          break;
        case "add":
          mathOut = key + operand;
          break;
        case "subtract":
          mathOut = key - operand;
          break;
        case "multiply":
          mathOut = key * operand;
          break;
        case "divide":
          if(operand === 0 || operand === -0) {
            _log("Division by 0 in {@math} helper", "WARN");
          }
          mathOut = key / operand;
          break;
        case "ceil":
          mathOut = Math.ceil(key);
          break;
        case "floor":
          mathOut = Math.floor(key);
          break;
        case "round":
          mathOut = Math.round(key);
          break;
        case "abs":
          mathOut = Math.abs(key);
          break;
        case "toint":
          mathOut = parseInt(key, 10);
          break;
        default:
          _log("{@math}: method " + method + " not supported");
     }

      if (mathOut !== null){
        if (round) {
          mathOut = Math.round(mathOut);
        }
        if (bodies && bodies.block) {
          // with bodies act like the select helper with mathOut as the key
          // like the select helper bodies['else'] is meaningless and is ignored
          context = addSelectState(context, mathOut);
          return chunk.render(bodies.block, context);
        } else {
          // self closing math helper will return the calculated output
          return chunk.write(mathOut);
        }
       } else {
        return chunk;
      }
    }
    // no key parameter and no method
    else {
      _log("Key is a required parameter for math helper along with method/operand!");
    }
    return chunk;
  },
   /**
   select helper works with one of the eq/ne/gt/gte/lt/lte/default providing the functionality
   of branching conditions
   @param key,  ( required ) either a string literal value or a dust reference
                a string literal value, is enclosed in double quotes, e.g. key="foo"
                a dust reference may or may not be enclosed in double quotes, e.g. key="{val}" and key=val are both valid
   @param type (optional), supported types are  number, boolean, string, date, context, defaults to string
   **/
  "select": function(chunk, context, bodies, params) {
    var body = bodies.block,
        state, key, len, x;

    if (params.hasOwnProperty("key")) {
      key = dust.helpers.tap(params.key, chunk, context);
      // bodies['else'] is meaningless and is ignored
      if (body) {
        context = addSelectState(context, key);
        state = getSelectState(context);
        chunk = chunk.render(body, context);
        // Resolve any deferred blocks (currently just {@any} blocks)
        if(state.deferreds.length) {
          state.isDeferredComplete = true;
          for(x=0, len=state.deferreds.length; x<len; x++) {
            state.deferreds[x]();
          }
        }
      } else {
        _log("Missing body block in {@select}");
      }
    } else {
      _log("No key provided for {@select}", "WARN");
    }
    return chunk;
  },

  /**
   eq helper compares the given key is same as the expected value
   It can be used standalone or in conjunction with select for multiple branching
   @param key,  The actual key to be compared ( optional when helper used in conjunction with select)
                either a string literal value or a dust reference
                a string literal value, is enclosed in double quotes, e.g. key="foo"
                a dust reference may or may not be enclosed in double quotes, e.g. key="{val}" and key=val are both valid
   @param value, The expected value to compare to, when helper is used standalone or in conjunction with select
   @param type (optional), supported types are  number, boolean, string, date, context, defaults to string
   Note : use type="number" when comparing numeric
   **/
  "eq": function(chunk, context, bodies, params) {
    params.filterOpType = "eq";
    return filter(chunk, context, bodies, params, function(expected, actual) { return actual === expected; });
  },

  /**
   ne helper compares the given key is not the same as the expected value
   It can be used standalone or in conjunction with select for multiple branching
   @param key,  The actual key to be compared ( optional when helper used in conjunction with select)
                either a string literal value or a dust reference
                a string literal value, is enclosed in double quotes, e.g. key="foo"
                a dust reference may or may not be enclosed in double quotes, e.g. key="{val}" and key=val are both valid
   @param value, The expected value to compare to, when helper is used standalone or in conjunction with select
   @param type (optional), supported types are  number, boolean, string, date, context, defaults to string
   Note : use type="number" when comparing numeric
   **/
  "ne": function(chunk, context, bodies, params) {
    params.filterOpType = "ne";
    return filter(chunk, context, bodies, params, function(expected, actual) { return actual !== expected; });
  },

  /**
   lt helper compares the given key is less than the expected value
   It can be used standalone or in conjunction with select for multiple branching
   @param key,  The actual key to be compared ( optional when helper used in conjunction with select)
                either a string literal value or a dust reference
                a string literal value, is enclosed in double quotes, e.g. key="foo"
                a dust reference may or may not be enclosed in double quotes, e.g. key="{val}" and key=val are both valid
   @param value, The expected value to compare to, when helper is used standalone  or in conjunction with select
   @param type (optional), supported types are  number, boolean, string, date, context, defaults to string
   Note : use type="number" when comparing numeric
   **/
  "lt": function(chunk, context, bodies, params) {
    params.filterOpType = "lt";
    return filter(chunk, context, bodies, params, function(expected, actual) { return actual < expected; });
  },

  /**
   lte helper compares the given key is less or equal to the expected value
   It can be used standalone or in conjunction with select for multiple branching
   @param key,  The actual key to be compared ( optional when helper used in conjunction with select)
                either a string literal value or a dust reference
                a string literal value, is enclosed in double quotes, e.g. key="foo"
                a dust reference may or may not be enclosed in double quotes, e.g. key="{val}" and key=val are both valid
   @param value, The expected value to compare to, when helper is used standalone or in conjunction with select
   @param type (optional), supported types are  number, boolean, string, date, context, defaults to string
   Note : use type="number" when comparing numeric
  **/
  "lte": function(chunk, context, bodies, params) {
    params.filterOpType = "lte";
    return filter(chunk, context, bodies, params, function(expected, actual) { return actual <= expected; });
  },

  /**
   gt helper compares the given key is greater than the expected value
   It can be used standalone or in conjunction with select for multiple branching
   @param key,  The actual key to be compared ( optional when helper used in conjunction with select)
                either a string literal value or a dust reference
                a string literal value, is enclosed in double quotes, e.g. key="foo"
                a dust reference may or may not be enclosed in double quotes, e.g. key="{val}" and key=val are both valid
   @param value, The expected value to compare to, when helper is used standalone  or in conjunction with select
   @param type (optional), supported types are  number, boolean, string, date, context, defaults to string
   Note : use type="number" when comparing numeric
   **/
  "gt": function(chunk, context, bodies, params) {
    params.filterOpType = "gt";
    return filter(chunk, context, bodies, params, function(expected, actual) { return actual > expected; });
  },

 /**
   gte helper, compares the given key is greater than or equal to the expected value
   It can be used standalone or in conjunction with select for multiple branching
   @param key,  The actual key to be compared ( optional when helper used in conjunction with select)
                either a string literal value or a dust reference
                a string literal value, is enclosed in double quotes, e.g. key="foo"
                a dust reference may or may not be enclosed in double quotes, e.g. key="{val}" and key=val are both valid
   @param value, The expected value to compare to, when helper is used standalone or in conjunction with select
   @param type (optional), supported types are  number, boolean, string, date, context, defaults to string
   Note : use type="number" when comparing numeric
  **/
  "gte": function(chunk, context, bodies, params) {
    params.filterOpType = "gte";
    return filter(chunk, context, bodies, params, function(expected, actual) { return actual >= expected; });
  },

  /**
   * {@any}
   * Outputs as long as at least one truth test inside a {@select} has passed.
   * Must be contained inside a {@select} block.
   * The passing truth test can be before or after the {@any} block.
   */
  "any": function(chunk, context, bodies, params) {
    var selectState;

    if(!isSelect(context)) {
      _log("{@any} used outside of a {@select} block", "WARN");
    } else {
      selectState = getSelectState(context);
      if(selectState.isDeferredComplete) {
        _log("{@any} nested inside {@any} or {@none} block. It needs its own {@select} block", "WARN");
      } else {
        chunk = chunk.map(function(chunk) {
          selectState.deferreds.push(function() {
            if(selectState.isResolved && !selectState.isDefaulted) {
              chunk = chunk.render(bodies.block, context);
            }
            chunk.end();
          });
        });
      }
    }
    return chunk;
  },

  /**
   * {@none}
   * Outputs if no truth tests inside a {@select} pass.
   * Must be contained inside a {@select} block.
   * The position of the helper does not matter.
   */
  "none": function(chunk, context, bodies, params) {
    var selectState;

    if(!isSelect(context)) {
      _log("{@none} used outside of a {@select} block", "WARN");
    } else {
      selectState = getSelectState(context);
      if(selectState.isDeferredComplete) {
        _log("{@none} nested inside {@any} or {@none} block. It needs its own {@select} block", "WARN");
      } else {
        chunk = chunk.map(function(chunk) {
          selectState.deferreds.push(function() {
            if(!selectState.isResolved) {
              chunk = chunk.render(bodies.block, context);
            }
            chunk.end();
          });
        });
      }
    }
    return chunk;
  },

  /**
   * {@default}
   * Outputs if no truth test inside a {@select} has passed.
   * Must be contained inside a {@select} block.
   */
  "default": function(chunk, context, bodies, params) {
    params.filterOpType = "default";
    // Deprecated for removal in 1.7
    _deprecated("{@default}");
    if(!isSelect(context)) {
      _log("{@default} used outside of a {@select} block", "WARN");
      return chunk;
    }
    return filter(chunk, context, bodies, params, function() { return true; });
  },

  /**
  * size helper prints the size of the given key
  * Note : size helper is self closing and does not support bodies
  * @param key, the element whose size is returned
  */
  "size": function( chunk, context, bodies, params ) {
    var key, value=0, nr, k;
    params = params || {};
    key = params.key;
    if (!key || key === true) { //undefined, null, "", 0
      value = 0;
    }
    else if(dust.isArray(key)) { //array
      value = key.length;
    }
    else if (!isNaN(parseFloat(key)) && isFinite(key)) { //numeric values
      value = key;
    }
    else if (typeof key  === "object") { //object test
      //objects, null and array all have typeof ojbect...
      //null and array are already tested so typeof is sufficient http://jsperf.com/isobject-tests
      nr = 0;
      for(k in key){
        if(Object.hasOwnProperty.call(key,k)){
          nr++;
        }
      }
      value = nr;
    } else {
      value = (key + '').length; //any other value (strings etc.)
    }
    return chunk.write(value);
  }


};

  for(var key in helpers) {
    dust.helpers[key] = helpers[key];
  }

  return dust;

}));

DG.dust = function (tmpl) {
    return function (name, data) {
        if (!dust.cache[name]) {
            dust.loadSource(tmpl[name]);
        }

        var result;

        dust.render(name, data, function (err, html) {
            result = html;
        });

        return result;
    };
};

if (DG.debug) { dust.debugLevel = 'ERROR'; }

DG.Control.Attribution.include(DG.Locale);
DG.Control.Attribution.Dictionary = {};
DG.Control.Attribution.include({
    options: {
        position: 'bottomright'
    },

    _getLink: function (linkType) {
        /* eslint-disable camelcase */
        var dictionary = {
            ru: {
                copyright_logo: 'http://info.2gis.ru/?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_apilink: 'http://api.2gis.ru/?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_license: 'http://help.2gis.ru/licensing-agreement/'
            },

            it: {
                copyright_logo: 'http://2gis.it/?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_apilink: 'http://2gis.it/?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_license: 'http://2gis.it/'
            },

            cz: {
                copyright_logo: 'http://praha.2gis.cz/?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_apilink: 'http://praha.2gis.cz/?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_license: 'http://law.2gis.cz/licensing-agreement/'
            },

            cl: {
                copyright_logo: 'http://santiago.2gis.cl/?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_apilink: 'http://santiago.2gis.cl/?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_license: 'http://law.2gis.cl/licensing-agreement/'
            },

            cy: {
                copyright_logo: 'http://info.2gis.com.cy/lemesos?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_apilink: 'http://info.2gis.com.cy/lemesos?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_license: 'http://law.2gis.com.cy/licensing-agreement/'
            },

            ae: {
                copyright_logo: 'http://info.2gis.ae/dubai?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_apilink: 'http://info.2gis.ae/dubai?utm_source=copyright&utm_medium=map&utm_campaign=partners',
                copyright_license: 'http://law.2gis.ae/licensing-agreement/'
            }
        };
        /* eslint-enable camelcase */

        var countryCode = (this._countryCode in dictionary) ? this._countryCode : 'ru';

        return dictionary[countryCode][linkType];
    },

    onAdd: function (map) {
        if (!map._copyright) {
            map._copyright = true;
            this._first = true;
        }

        this._container = DG.DomUtil.create('div', 'dg-attribution');
        DG.DomEvent.disableClickPropagation(this._container);

        for (var i in map._layers) {
            if (map._layers[i].getAttribution) {
                this.addAttribution(map._layers[i].getAttribution());
            }
        }

        this._update();

        return this._container;
    },

    _update: function (lang, osm, countryCode) {
        if (!this._map) { return; }

        if (typeof osm !== 'undefined') {
            this._osm = osm;
        }

        if (typeof countryCode !== 'undefined') {
            this._countryCode = countryCode;
        }

        var attribs = [];

        for (var i in this._attributions) {
            if (this._attributions[i]) {
                attribs.push(i);
            }
        }

        var prefixAndAttribs = [],
            copyright = '';

        if (this._first) {
            copyright = this._getAttributionHTML(lang);
        }

        if (this.options.prefix) {
            prefixAndAttribs.push(this.options.prefix);
        }
        if (attribs.length) {
            prefixAndAttribs.push(attribs.join(', '));
        }

        this._container.innerHTML = copyright + prefixAndAttribs.join(' | ');
    },
    /* global __DGAttribution_TMPL__ */
    _tmpl: DG.dust({"copyright":"(function(){dust.register(\"copyright\",body_0);function body_0(chk,ctx){return chk.write(\"<div class=\\\"dg-attribution__copyright\\\"><ul class=\\\"dg-attribution__links\\\"><li class=\\\"dg-attribution__link-item\\\">\").exists(ctx.get([\"osm\"], false),ctx,{\"block\":body_1},null).write(\"<a href=\\\"\").reference(ctx.get([\"copyright_apilink\"], false),ctx,\"h\").write(\"\\\" target=\\\"_blank\\\" class=\\\"dg-attribution__link\\\">\").notexists(ctx.get([\"osm\"], false),ctx,{\"block\":body_2},null).reference(ctx.get([\"API_2GIS\"], false),ctx,\"h\").write(\"</a></li><li class=\\\"dg-attribution__link-item\\\"><a href=\\\"\").reference(ctx.get([\"copyright_license\"], false),ctx,\"h\").write(\"\\\" target=\\\"_blank\\\" class=\\\"dg-attribution__link\\\">\").reference(ctx.get([\"license_agreement\"], false),ctx,\"h\").write(\"</a></li></ul><a href=\\\"\").reference(ctx.get([\"copyright_logo\"], false),ctx,\"h\").write(\"\\\" target=\\\"_blank\\\" class=\\\"dg-attribution__logo-url\\\"></a></div>\");}function body_1(chk,ctx){return chk.write(\"© <a href=\\\"http://www.openstreetmap.org/copyright\\\" target=\\\"_blank\\\" class=\\\"dg-attribution__link\\\">OpenStreetMap contributors</a>, \");}function body_2(chk,ctx){return chk.reference(ctx.get([\"work_on\"], false),ctx,\"h\").write(\" \");}return body_0;})();"}),
    _getData: function (lang) {
        return {
            'osm': this._osm,
            'work_on': this.t('work_on'),
            'lang': lang || this._map.getLang(),
            'copyright_apilink': this._getLink('copyright_apilink'),
            'copyright_license': this._getLink('copyright_license'),
            'copyright_logo': this._getLink('copyright_logo'),
            'license_agreement': this.t('license_agreement'),
            'API_2GIS': this.t('API_2GIS')
        };
    },
    _getAttributionHTML: function (lang) {
        return this._tmpl('copyright', this._getData(lang));
    },
    _renderTranslation: function (e) {
        this._update(e.lang);
    }
});

DG.Map.addInitHook(function () {
    if (!this._copyright) {
        DG.control.attribution().addTo(this);
    }
});

DG.Control.Attribution.Dictionary.ru = {
    license_agreement: 'Лицензионное соглашение',
    work_on: 'Работает на',
    API_2GIS: 'API 2ГИС'
};

DG.Control.Attribution.Dictionary.it = {
	license_agreement : 'Accordo di licenza',
    work_on: ' ',
	API_2GIS: '2GIS API'
};

DG.Control.Attribution.Dictionary.cs = {
	license_agreement: 'Licenční smlouva',
	work_on: 'Pracuje na',
    API_2GIS: 'API 2GIS'
};

DG.Control.Attribution.Dictionary.en = {
    license_agreement: 'License agreement',
    work_on: 'Uses',
    API_2GIS: '2GIS API'
};

DG.Control.Attribution.Dictionary.es = {
	license_agreement : 'Acuerdo de licencia',
    work_on: ' ',
	API_2GIS: '2GIS API'
};

DG.Control.Location = DG.RoundControl.extend({

    statics: {
        Dictionary: {}
    },

    options: {
        iconClass: 'locate',
        position: DG.Browser.touch ? 'bottomright' : 'topleft',
        drawCircle: true,
        follow: true,  // follow with zoom and pan the user's location
        stopFollowingOnDrag: false, // if follow is true, stop following when map is dragged
        metric: true,
        onLocationError: function (/*err*/) {
            // this event is called in case of any location error
            // that is not a time out error.
            // console.log(err.message);
        },
        onLocationOutsideMapBounds: function (/*context*/) {
            // this event is repeatedly called when the location changes
            // console.log(context.t('outsideMapBoundsMsg'));
        },
        locateOptions: {}
    },

    initialize: function (options) {
        DG.Util.setOptions(this, options);

        if (!navigator.geolocation) {
            this._disable = true;
            return;
        }

        this._event = undefined;

        this._locateOptions = {
            watch: true,  // if you overwrite this, visualization cannot be updated
            setView: false,
            maximumAge: Infinity
        };
        DG.extend(this._locateOptions, this.options.locateOptions);

        this._resetVariables();

        this.on({
            'click': this._handleLocate,
            'add': this._initLocate
        });
    },

    _initLocate: function () {
        this._layer = new DG.LayerGroup();
        this._layer.addTo(this._map);

        // event hooks
        this._map.on({
            'locationfound': this._onLocationFound,
            'locationerror': this._onLocationError
        }, this);
    },

    _handleLocate: function () {
        if (this._active && (!this._event ||
            (this._map.getBounds().contains(this._event.latlng) ||
            this._isOutsideMapBounds()))) {
            this._stopLocate();
        } else {
            this._locateOnNextLocationFound = true;

            if (!this._active) {
                this._map.locate(this._locateOptions);
            }

            this._active = true;

            if (this.options.follow) {
                this._startFollowing();
            }

            this._clearError();

            if (this._event) {
                this._visualizeLocation();
            } else {
                this.setState('requesting');
            }
        }
    },

    _onLocationFound: function (e) {
        // no need to do anything if the location has not changed
        if (this._event &&
            (this._event.latlng.lat === e.latlng.lat &&
             this._event.latlng.lng === e.latlng.lng &&
             this._event.accuracy === e.accuracy)) {
            return;
        }

        if (!this._active) {
            return;
        }

        this._event = e;

        if (this.options.follow && this._following) {
            this._locateOnNextLocationFound = true;
        }

        this._visualizeLocation();
    },

    _startFollowing: function () {
        this._following = true;
        if (this.options.stopFollowingOnDrag) {
            this._map.on('dragstart', this._stopFollowing);
        }
    },

    _stopFollowing: function () {
        this._following = false;
        if (this.options.stopFollowingOnDrag) {
            this._map.off('dragstart', this._stopFollowing);
        }
        this._visualizeLocation();
    },

    _isOutsideMapBounds: function () {
        if (this._event === undefined) {
            return false;
        }
        return this._map.options.maxBounds &&
            !this._map.options.maxBounds.contains(this._event.latlng);
    },

    _visualizeLocation: function () {
        if (this._event.accuracy === undefined) {
            this._event.accuracy = 0;
        }

        var radius = this._event.accuracy;

        if (this._locateOnNextLocationFound) {
            if (this._isOutsideMapBounds()) {
                this.options.onLocationOutsideMapBounds(this);
            } else {
                /* global 13:false*/
                var zoom = this._map.projectDetector.getProject().maxZoom || 13;
                this._map.setView(this._event.latlng, zoom);
            }
            this._locateOnNextLocationFound = false;
        }

        // circle with the radius of the location's accuracy
        var style = {
            clickable: false,
            color: '#FFF',
            fillColor: '#FFF',
            fillOpacity: 0.4,
            weight: 0,
            opacity: 0.3
        };
        if (this.options.drawCircle) {
            if (!this._circle) {
                this._circle = DG.circle(this._event.latlng, radius, style)
                    .addTo(this._layer);
            } else {
                this._circle.setLatLng(this._event.latlng).setRadius(radius);
            }
        }

        var markerClass = 'dg-location__pin';

        markerClass += this._following ? (' ' + markerClass + 'state_following') : '';
        // small inner marker
        var m = {
            icon: DG.divIcon({
                className: markerClass,
                iconSize: [20, 20]
            })
        };

        if (!this._marker) {
            this._marker = DG.marker(this._event.latlng, m)
                .bindLabel(this.t('you_are_here'))
                .addTo(this._layer);
        } else {
            this._marker.setLatLng(this._event.latlng);
        }

        DG.DomEvent.on(this._marker, 'click', function () {
            this._map.fireEvent('dgLocateClick');
        }, this);

        if (!this._container) {
            return;
        }

        this.setState('active');
    },

    _resetVariables: function () {
        this._active = false;
        this._following = false;
    },


    _stopLocate: function () {
        this._map.stopLocate();
        this._map.off('dragstart', this._stopFollowing);

        this.setState();
        this._resetVariables();

        this._layer.clearLayers();
        this._marker = undefined;
        this._circle = undefined;
        this._event = undefined;
    },

    _onLocationError: function (err) {
        // ignore time out error if the location is watched
        if (err.code === 3 && this._locateOptions.watch) {
            return;
        }

        this._stopLocate();
        this._error = DG.DomUtil.create('div', 'dg-label dg-label_name_location-error', this._container);
        this._errorText = DG.DomUtil.create('div', 'dg-label__content', this._error);
        this._errorText.innerHTML = this.t('cant_find');

        var self = this;
        setTimeout(function () {
            self._clearError();
        }, 3000);

        //show location error
        this.options.onLocationError(err);
    },

    _clearError: function () {
        if (this._error) {
            this._container.removeChild(this._error);
            this._error = undefined;
            this._errorText = undefined;
        }
    },

    _renderTranslation: function () {
        if (this._link) {
            this._link.title = this.t('button_title');
        }
        if (this._marker) {
            this._marker.bindLabel(this.t('you_are_here'));
        }
    }
});

DG.control.location = function (options) {
    return new DG.Control.Location(options);
};

DG.Map.addInitHook(function () {
    if (this.options.locationControl) {
        this.locationControl = DG.control.location(this.options.locationControl);
        this.addControl(this.locationControl);
    }
});

DG.Control.Location.Dictionary.ru = {
	 cant_find : 'Мы не смогли Вас найти',
	 you_are_here : 'Вы здесь',
	 button_title : 'Найти Вас на карте'
};
DG.Control.Location.Dictionary.it = {
	 cant_find : 'Non siamo riusciti a localizzarti',
	 you_are_here : 'Voi siete qui',
	 button_title : 'Trova la tua posizione sulla mappa'
};
DG.Control.Location.Dictionary.cs = {
	 cant_find : 'Nepodařilo se nám určit Vaši polohu',
	 you_are_here : 'Jste tady',
	 button_title : 'Určit Vaši polohu na mapě'
};
DG.Control.Location.Dictionary.en = {
	 cant_find : 'We can\'t find you',
	 you_are_here : 'You are here',
	 button_title : 'Show your location'
};
DG.Control.Location.Dictionary.es = {
	 cant_find : 'No pudimos encontrarte',
	 you_are_here : 'Tú estás aquí',
	 button_title : 'Encontrarte en el mapa'
};
// Inspired by Sindre Sorhus screenfull
/*global Element */
DG.Screenfull = DG.Class.extend({
    _apiMap: [
        [
            'requestFullscreen',
            'exitFullscreen',
            'fullscreenElement',
            'fullscreenEnabled',
            'fullscreenchange',
            'fullscreenerror'
        ],
        [
            'webkitRequestFullscreen',
            'webkitExitFullscreen',
            'webkitFullscreenElement',
            'webkitFullscreenEnabled',
            'webkitfullscreenchange',
            'webkitfullscreenerror'

        ],
        [
            'mozRequestFullScreen',
            'mozCancelFullScreen',
            'mozFullScreenElement',
            'mozFullScreenEnabled',
            'mozfullscreenchange',
            'mozfullscreenerror'
        ],
        [
            'msRequestFullscreen',
            'msExitFullscreen',
            'msFullscreenElement',
            'msFullscreenEnabled',
            'MSFullscreenChange',
            'MSFullscreenError'
        ]
    ],

    initialize: function () {
        this.api = this._api();
    },

    request: function (elem) {
        var request = this.api.requestFullscreen;

        elem = elem || document.documentElement;
        elem[request](Element.ALLOW_KEYBOARD_INPUT);
    },

    exit: function () {
        document[this.api.exitFullscreen]();
    },

    isFullscreen: function () {
        return !!document[this.api.fullscreenElement];
    },

    isAvailable: function () {
        return Boolean(this.api);
    },

    _api: function () {
        var api = {},
            apiMap = this._apiMap;

        apiMap.forEach(function (val) {
            if (val && val[1] in document) {
                val.forEach(function (method, i) {
                    api[apiMap[0][i]] = method;
                });
            }
        });

        return api.requestFullscreen ? api : false;
    }
});

DG.screenfull = new DG.Screenfull();

DG.Control.Fullscreen = DG.RoundControl.extend({

    statics: {
        Dictionary: {}
    },

    options: {
        position: 'topright',
        iconClass: 'fullscreen'
    },

    initialize: function (options) {
        DG.Util.setOptions(this, options);
        this._isFullscreen = false;
        this.on('click', this._toggleFullscreen);
    },

    _toggleFullscreen: function () {
        if (!this._isFullscreen) {
            this._toggle(true, 'request', 'on', 'requestfullscreen');
        } else {
            this._toggle(false, 'exit', 'on', 'cancelfullscreen');
        }

        this._renderTranslation();
        this._map.invalidateSize();
    },

    _renderTranslation: function () {
        this._link.title = this.t(this._isFullscreen ? 'title_min' : 'title_max');
    },

    _toggle: function (isEnabled, method, list, event) {
        var container = this._map._container;

        this._isFullscreen = isEnabled;
        this.setState(isEnabled ? 'active' : '');

        DG.screenfull[method](container);
        DG.DomEvent[list](document, DG.screenfull.api.fullscreenchange, this._onFullScreenStateChange, this);
        this._map.fire(event);
    },

    _onFullScreenStateChange: function () {
        if (!DG.screenfull.isFullscreen()) {
            this._toggle(false, 'exit', 'on', 'cancelfullscreen');
        }
    }
});

DG.control.fullscreen = function (options) {
    return new DG.Control.Fullscreen(options);
};

DG.Map.mergeOptions({
    fullscreenControl: true
});

DG.Map.addInitHook(function () {
    if (this.options.fullscreenControl) {
        this.fullscreenControl = DG.control.fullscreen(this.options.fullscreenControl);

        if (DG.screenfull.isAvailable()) {
            this.addControl(this.fullscreenControl);
        }
    }
});

DG.Control.Fullscreen.Dictionary.ru = {
    title_max : 'Развернуть',
    title_min : 'Восстановить'
};

DG.Control.Fullscreen.Dictionary.it = {
    title_max : 'Espandi',
    title_min : 'Ripristina'
};

DG.Control.Fullscreen.Dictionary.cs = {
     title_max : 'Rozbalit',
     title_min : 'Obnovit'
};

DG.Control.Fullscreen.Dictionary.en = {
    title_max : 'Expand',
    title_min : 'Restore'
};

DG.Control.Fullscreen.Dictionary.es = {
    title_max : 'Maximizar',
    title_min : 'Restaurar'
};

DG.Meta = {};

DG.Meta.Layer = DG.Layer.extend({

    options: {
        tileSize: 256,

        minZoom: 0,
        maxZoom: 19,
        zoomOffset: 0,
        eventBubbling: 'transparent'
        // maxNativeZoom: <Number>,
        // detectRetina: <Number>,
        // zoomReverse: <Number>
        // attribution: <String>,
        // zIndex: <Number>,
        // bounds: <LatLngBounds>
    },

    initialize: function (source, options) { // (String, Object)
        DG.TileLayer.prototype.initialize.call(this, null, options);
        delete this._url;

        this._currentTile = false;
        this._currentTileData = false;
        this._hoveredObject = null;

        this._origin = DG.Meta.origin(source, {
            dataFilter: this.options.dataFilter
        });
    },

    getOrigin: function () { // () -> Object
        return this._origin;
    },

    onAdd: function (map) {
        this._reset();
        this._addDomEvents();

        map.on('rulerstart', this._removeDomEvents, this);
        map.on('rulerend', this._addDomEvents, this);
    },

    onRemove: function (map) {
        this._removeDomEvents();

        map.off('rulerstart', this._removeDomEvents, this);
        map.off('rulerend', this._addDomEvents, this);
    },

    getEvents: function () {
        var events = {
            viewreset: this._reset
        };

        return events;
    },

    _addDomEvents: function () {
        DG.DomEvent.on(this._map.getPane('tilePane'), this._domEvents, this);
    },

    _removeDomEvents: function () {
        DG.DomEvent.off(this._map.getPane('tilePane'), this._domEvents, this);
    },

    _getZoomForUrl: DG.TileLayer.prototype._getZoomForUrl,
    _getTileSize: DG.TileLayer.prototype._getTileSize,
    _getTileNumBounds: DG.GridLayer.prototype._getTileNumBounds,
    _isValidTile: DG.GridLayer.prototype._isValidTile,
    _wrapCoords: DG.GridLayer.prototype._wrapCoords,
    _resetWrap: DG.GridLayer.prototype._resetWrap,

    _domEvents: {
        mousemove: function (event) { // (MouseEvent)
            var tileSize = this._getTileSize(),
                layerPoint = this._map.mouseEventToLayerPoint(event),
                tileOriginPoint = this._map.getPixelOrigin().add(layerPoint),
                tileCoord = tileOriginPoint.divideBy(tileSize).floor(),
                mouseTileOffset,
                tileKey,
                hoveredObject,
                zoom = this._map.getZoom();

            if (zoom > (this.options.maxZoom + this.options.zoomOffset) ||
                zoom < (this.options.minZoom - this.options.zoomOffset) ||
                !this._isValidTile(tileCoord)) {
                return;
            }

            this._wrapCoords(tileCoord);

            tileCoord.z = this._getZoomForUrl();
            tileCoord.key = tileSize;
            tileKey = this._origin.getTileKey(tileCoord);

            if (tileKey !== this._currentTile) {
                this._currentTile = tileKey;
                this._currentTileData = false;
            }

            if (this._currentTileData === false) {
                this._currentTileData = this._origin.getTileData(tileCoord);
            } else {
                mouseTileOffset = DG.point(tileOriginPoint.x % tileSize, tileOriginPoint.y % tileSize);
                hoveredObject = this._getHoveredObject(tileCoord, mouseTileOffset);

                if (this._hoveredEntity !== hoveredObject) {
                    this._fireMouseEvent('mouseout', event);

                    this._hoveredEntity = hoveredObject;
                    this._fireMouseEvent('mouseover', event);
                }

                this._fireMouseEvent('mousemove', event);
            }
        },
        mouseout: function (event) {
            this._fireMouseEvent('mouseout', event);
            this._hoveredEntity = null;
            this._currentTile = false;
        },

        click: function (event) {
            this._fireMouseEvent('click', event);
        },

        dblclick: function (event) {
            this._fireMouseEvent('dblclick', event);
        },

        mousedown: function (event) {
            this._fireMouseEvent('mousedown', event);
        },

        contextmenu: function (event) {
            this._fireMouseEvent('contextmenu', event);
        }
    },

    _fireMouseEvent: function (type, mouseEvent) {
        if (this._hoveredEntity) {
            this.fire(type, {
                meta: this._hoveredEntity,
                latlng: this._map.mouseEventToLatLng(mouseEvent)
            });
            if (this.options.eventBubbling === 'layer') {
                DG.DomEvent.stop(mouseEvent);
            }
        }
    },

    _getHoveredObject: function (coords, mouseTileOffset) {
        for (var i = this._currentTileData.length - 1; i >= 0; i--) {
            if (DG.PolyUtil.contains(mouseTileOffset, this._currentTileData[i].geometry.coordinates[0])) {
                return this._currentTileData[i];
            }
        }

        return null;
    },

    _reset: function () {
        this._tileNumBounds = this._getTileNumBounds();
        this._resetWrap(this._tileNumBounds);
    }

});

DG.Meta.layer = function (source, options) {
    return new DG.Meta.Layer(source, options);
};

DG.Meta.Origin = DG.Class.extend({

    options: {
        subdomains: '0123',
        dataFilter: null
    },

    _url: false,

    initialize: function (url, options) { // (String, Object)
        this._url = url;
        this._requests = {};

        this._tileStorage = {};
        this._dataStorage = {};

        options = DG.setOptions(this, options);

        if (typeof options.subdomains === 'string') {
            options.subdomains = options.subdomains.split('');
        }
    },

    getTileData: function (coord) { // (Object) -> Object
        var tileKey = this.getTileKey(coord),
            self = this;

        if (typeof this._tileStorage[tileKey] === 'undefined' && typeof this._requests[tileKey] === 'undefined') {
            this._tileStorage[tileKey] = false;
            this._requests[tileKey] = this._requestData(coord).then(function (data) {
                self.setTileData(tileKey, self.options.dataFilter ? self.options.dataFilter(data, coord) : data);
                delete self._requests[tileKey];
            });
        }

        if (this._tileStorage[tileKey].constructor === Object) {
            return Object.keys(this._tileStorage[tileKey]).map(function (id) {
                return DG.extend({geometry: this._tileStorage[tileKey][id]}, this._dataStorage[id]);
            }, this);
        }

        return this._tileStorage[tileKey];
    },

    setTileData: function (key, data) { // (Object/String, Object) -> Object
        if (typeof key !== 'string') {
            key = this.getTileKey(key);
        }

        data.forEach(function (entity) {
            if (entity.geometry.constructor !== Object) {
                entity.geometry = DG.Wkt.toGeoJSON(entity.geometry);
            }
            if (!this._tileStorage[key]) {
                this._tileStorage[key] = {};
            }
            this._tileStorage[key][entity.id] = entity.geometry;
            delete entity.geometry;
            this._dataStorage[entity.id] = entity;
        }, this);

        return this;
    },

    flush: function () { // () -> Object
        this._tileStorage = {};
        this._dataStorage = {};
        Object.keys(this._requests).forEach(function (tileKey) {
            if (this[tileKey].abort) {
                this[tileKey].abort();
            }
        }, this._requests);

        return this;
    },

    setURL: function (url, flush) { // (String, Boolean) -> Object
        this._url = url;
        if (flush) {
            this.flush();
        }

        return this;
    },

    getTileKey: function (coord) { // (Object)-> String
        return [coord.x, coord.y, coord.z, coord.key].join(':');
    },

    _requestData: function (key) { // (String)
        if (this._url) {
            return this._performRequest(key);
        } else {
            return Promise.resolve([]);
        }
    },

    _performRequest: function (coords) { // (Object) -> Promise
        return DG.ajax(this._prepareURL(coords), {
            type: 'get',
            dataType: 'json'
        });
    },

    _prepareURL: function (coords) { // (Object) -> String
        return DG.Util.template(this._url, {
            x: coords.x,
            y: coords.y,
            z: coords.z,
            s: this._getSubdomain(coords)
        });
    },

    _getSubdomain: DG.TileLayer.prototype._getSubdomain

});

DG.Meta.origin = function (source, options) {
    return new DG.Meta.Origin(source, options);
};

// ray tracing method: http://algolist.ru/maths/geom/belong/poly2d.php

DG.PolyUtil.contains = function (point, geometry) { // (DG.LatLng, Array) -> Boolean
    var edges, i, len,
        parity = 0,
        vertices = [];

    for (i = 0, len = geometry.length; i < len; i++) {
        vertices.push(DG.point(geometry[i]));
    }

    edges = this._getEdges(vertices);
    for (i = 0, len = edges.length; i < len; i++) {
        switch (this._getEdgeType(edges[i], point)) {
            case 'TOUCHING':
                return true;
            case 'CROSSING':
                parity = 1 - parity;
                break;
        }
    }
    return parity ? true : false;
};

// returns array with edge objects
DG.PolyUtil._getEdges = function (vertices) { // (Array) -> Array
    var edges = [];
    var edge;
    var startPoint;
    var endPoint;

    for (var i = 0, len = vertices.length; i < len; i++) {
        startPoint = vertices[i];
        endPoint = (i !== len - 1) ? vertices[i + 1] : vertices[0];
        edge = {
            startPoint: startPoint,
            endPoint: endPoint
        };
        edges.push(edge);
    }

    return edges;
};

// result should be: 'CROSSING', 'INESSENTIAL' or 'TOUCHING'
DG.PolyUtil._getEdgeType = function (edge, point) { // (Object, DG.Point) -> String
    var pointPosition = this._classify(edge, point);
    switch (pointPosition) {
        case 'LEFT':
            return ((edge.startPoint.y < point.y) && (point.y <= edge.endPoint.y)) ? 'CROSSING' : 'INESSENTIAL';
        case 'RIGHT':
            return ((edge.endPoint.y < point.y) && (point.y <= edge.startPoint.y)) ? 'CROSSING' : 'INESSENTIAL';
        case 'BETWEEN':
        case 'ORIGIN':
        case 'DESTINATION':
            return 'TOUCHING';
        default:
            return 'INESSENTIAL';
    }
};

// determines the position of a point relative to the edge
// result should be: 'LEFT', 'RIGHT', 'BEHIND', 'BEYOND', 'ORIGIN', 'DESTINATION', 'BETWEEN'
DG.PolyUtil._classify = function (edge, point) { // (Object, DG.Point) -> String
    var a;
    var b;
    var sa;

    a = {
        x: edge.endPoint.x - edge.startPoint.x,
        y: edge.endPoint.y - edge.startPoint.y
    };
    b = {
        x: point.x - edge.startPoint.x,
        y: point.y - edge.startPoint.y
    };

    sa = a.x * b.y - b.x * a.y;
    if (sa > 0) {
        return 'LEFT';
    }
    if (sa < 0) {
        return 'RIGHT';
    }
    if ((a.x * b.x < 0) || (a.y * b.y < 0)) {
        return 'BEHIND';
    }
    if (this._getLengthSquared(a) < this._getLengthSquared(b)) {
        return 'BEYOND';
    }
    if (DG.PolyUtil._areEquals(edge.startPoint, point)) {
        return 'ORIGIN';
    }
    if (DG.PolyUtil._areEquals(edge.endPoint, point)) {
        return 'DESTINATION';
    }
    return 'BETWEEN';
};

DG.PolyUtil._getLengthSquared = function (point) { // (DG.Point) -> Number
    return Math.pow(point.x, 2) + Math.pow(point.y, 2);
};

DG.PolyUtil._areEquals = function (point1, point2) { // (DG.Point, DG.Point) -> Boolean
    return point1.x === point2.x && point1.y === point2.y;
};

/* global 15,true */

DG.Map.mergeOptions({
    poi: !DG.Browser.touch
});

DG.Poi = DG.Handler.extend({

    options: {
        disableLabel: false
    },

    statics: {
        metaURL: 'http://tile{s}.maps.2gis.com/?x={x}&y={y}&z={z}&v=1&type=poi'
    },

    initialize: function (map, options) { // (Object)
        this._map = map;
        DG.Util.setOptions(this, options);
        this._metaLayer = DG.Meta.layer(DG.Poi.metaURL, {
            minZoom: 15,
            maxNativeZoom: 19,
            detectRetina: true,
            eventBubbling: 'layer',
            dataFilter: DG.bind(this._processData, this)
        });
    },

    addHooks: function () {
        this._map.addLayer(this._metaLayer);
        if (!this.options.disableLabel) {
            this._labelHelper = DG.label();
            this._metaLayer.on(this._layerEventsListeners, this);
        }
    },

    removeHooks: function () {
        this._map.removeLayer(this._metaLayer);
        if (!this.options.disableLabel) {
            this._metaLayer.off(this._layerEventsListeners, this);
            this._map.removeLayer(this._labelHelper);
            this._labelHelper = null;
        }
    },

    getMetaLayer : function () {
        return this._metaLayer;
    },

    _processData : function (data, coord) {
        var map = this._map,
            tileOriginPoint = coord.multiplyBy(this._metaLayer._getTileSize());

        if (data.responseText === '') {
            return [];
        }

        return data.result.poi.map(function (item) {
            var geoJson = DG.Wkt.toGeoJSON(item.hover);

            geoJson.coordinates[0] = geoJson.coordinates[0].map(function (revertedLatlng) {
                return map
                        .project([revertedLatlng[1], revertedLatlng[0]]).round()
                        .subtract(tileOriginPoint);
            });
            return {
                id: item.id,
                hint: item.links[0].name,
                linked: item.links[0],
                geometry: geoJson
            };
        });
    },

    _layerEventsListeners : {
        mouseover: function (e) { // (Object)
            this._setCursor('pointer');
            this._labelHelper
                .setPosition(e.latlng)
                .setContent(e.meta.hint);
            this._map.addLayer(this._labelHelper);
        },

        mouseout: function () {
            this._setCursor('');
            this._map.removeLayer(this._labelHelper);
        },

        mousemove: function (e) { // (Object)
            this._labelHelper.setPosition(e.latlng);
        }
    },

    _setCursor: function (cursor) { // (String)
        this._map.getContainer().style.cursor = cursor;
    }

});

DG.Map.addInitHook('addHandler', 'poi', DG.Poi);

DG.Entrance = DG.Layer.extend({

    options: {
        vectors: []
    },

    statics: {
        SHOW_FROM_ZOOM: DG.Browser.svg ? 16 : 17
    },

    initialize: function (options) { // (Object)
        DG.setOptions(this, options);
    },

    onAdd: function (map) { // (DG.Map)
        this._map = map;
        this._initArrows().addTo(map);
        this._eventHandler = new DG.Entrance.EventHandler(map, this);
        this._eventHandler.enable();

        // hide without event by default
        this._arrows.eachLayer(function (arrow) {
            arrow.setStyle({visibility: 'hidden'});
        });
        this._isShown = false;
    },

    addTo: function (map) { // (DG.Map) -> DG.Entrance
        map.addLayer(this);
        return this;
    },

    onRemove: function () { // (DG.Map)
        this._isShown = false;
        this._removeArrows();
        this._map = null;
        this._eventHandler.disable();
        this._eventHandler = null;
        this._arrows = null;
    },

    removeFrom: function (map) { // (DG.Map) -> DG.Entrance
        map.removeLayer(this);
        return this;
    },

    show: function (fitBounds) { // () -> DG.Entrance
        if (!this._arrows) {
            return this;
        }
        if (fitBounds !== false) {
            this._fitBounds();
        }
        if (this._isAllowedZoom()) {
            this._arrows.eachLayer(function (arrow) {
                arrow.setStyle({visibility: 'visible'});
                if (DG.Path.ANIMATION_AVAILABLE) {
                    arrow.runAnimation('animateArrowPathGeom');
                }
            });
            if (!this._isShown) {
                this._map.fire('entranceshow');
                this._isShown = true;
            }
        }

        return this;
    },

    hide: function () { // () -> DG.Entrance

        if (this.isShown() && this._arrows) {
            this._arrows.eachLayer(function (arrow) {
                arrow.setStyle({visibility: 'hidden'});
            });
            this._isShown = false;
            this._map.fire('entrancehide');
        }

        return this;
    },

    isShown: function () { // () -> Boolean
        return this._isShown;
    },

    getBounds: function () { // () -> DG.LatLngBounds
        return this._arrows.getBounds();
    },

    _initArrows: function () { // () -> DG.FeatureGroup
        this._arrows = DG.featureGroup();

        this.options.vectors
            .map(function (vector) {
                return DG.Wkt.toLatLngs(vector);
            })
            .forEach(function (latlngs) {
                // stroke
                this._arrows.addLayer(DG.Entrance.arrow(latlngs, this._getArrowStrokeOptions()));
                // basis
                this._arrows.addLayer(DG.Entrance.arrow(latlngs, this._getArrowOptions()));
            }, this);

        return this._arrows;
    },

    _removeArrows: function () {
        this._map.removeLayer(this._arrows.clearLayers());
    },

    _getFitZoom: function () {
        return this._map.projectDetector.getProject().maxZoom || DG.Entrance.SHOW_FROM_ZOOM;
    },

    _fitBounds: function () {
        var map = this._map,
            fitZoom,
            bounds = this.getBounds();

        if (!map.getBounds().contains(bounds) || !this._isAllowedZoom()) {
            fitZoom = this._getFitZoom();
            if (!map.projectDetector.getProject()) {
                map.once('moveend', function () {
                    map.setZoom(this._getFitZoom());
                }, this);
            }
            map.setView(bounds.getCenter(), fitZoom, {
                animate : true
            });
        }
    },

    _isAllowedZoom: function () {
        return this._map.getZoom() >= DG.Entrance.SHOW_FROM_ZOOM;
    },

    _getArrowStrokeOptions: function () {
        return {
            clickable: false,
            color: '#fff',
            weight: 6,
            byZoom: {
                16: {
                    marker: {
                        viewBox: '0 0 24 24',
                        refX: 12,
                        refY: 12,
                        markerHeight: 24,
                        markerWidth: 24,
                        path: {
                            d:  'M9.313,18.984c2.246-1.468,7.101-5.562,' +
                                '7.101-5.562c0.781-0.781,0.781-2.047,0-' +
                                '2.828c0,0-5.242-4.023-7.101-5.102C9.74' +
                                ',5.354,8.583,5.93,8.125,6.5C7.902,6.77' +
                                '7,9,11.614,9,11.614v0.789c0,0-0.879,4.' +
                                '237-0.905,5.285C8.09,17.891,9.108,19.1' +
                                '18,9.313,18.984z'
                        }
                    },
                    lastPointOffset: 2,
                    vmlEndArrow: 'none',
                    weight: 6,
                    iconWidth: 4
                },
                17: {
                    marker: {
                        viewBox: '0 0 24 24',
                        refX: 12,
                        refY: 12,
                        markerHeight: 24,
                        markerWidth: 24,
                        path: {
                            d:  'M7.912,21.498c3.106-2.029,9.859-7.873,' +
                                '9.859-7.873c2.059-1.807,2.142-1.542,0.' +
                                '146-3.208c0,0-7.434-6.084-10.005-7.576' +
                                'C7.583,2.649,6.903,3.446,6.271,4.233c-' +
                                '0.308,0.384,2.209,6.051,2.209,6.051v3.' +
                                '388c0,0-2.215,4.583-2.25,6.03C6.222,19' +
                                '.986,7.629,21.684,7.912,21.498z'
                        }
                    },
                    lastPointOffset: 0,
                    vmlEndArrow: 'none',
                    weight: 7,
                    iconWidth: 6
                },
                18: {
                    marker: {
                        viewBox: '0 0 24 24',
                        refX: 12,
                        refY: 12,
                        markerHeight: 24,
                        markerWidth: 24,
                        path: {
                            d:  'M7.61,22.688c4.045-2.642,11.312-8.906,' +
                                '11.312-8.906c1.92-1.781,1.938-2-0.124-' +
                                '3.781c0,0-8.151-6.334-11.5-8.276C6.87,' +
                                '1.475,5.516,2.62,5.732,3.093c2.146,4.6' +
                                '94,2.063,4.741,2.612,7.469l0.016,2.75c' +
                                '0,0-1.573,5.458-2.619,7.958C5.599,21.6' +
                                '11,7.241,22.93,7.61,22.688z'
                        }
                    },
                    lastPointOffset: !DG.Browser.vml ? -5 : -2,
                    vmlEndArrow: 'none',
                    weight: 8,
                    iconWidth: 8
                },
                19: {
                    marker: {
                        viewBox: '0 0 24 24',
                        refX: 12,
                        refY: 12,
                        markerHeight: 27,
                        markerWidth: 27,
                        path: {
                            d:  'M6.254472,23.8475c4.560355,-2.972281 1' +
                                '2.747538,-10.032785 12.747538,-10.0327' +
                                '85c2.167521,-2.006556 2.178242,-2.2533' +
                                '53 -0.13949,-4.25991c0,0 -9.185101,-7.' +
                                '13562 -12.962148,-9.324594c-0.482861,-' +
                                '0.278985 -2.006558,1.008645 -1.759761,' +
                                '1.534428c2.414306,5.290015 2.414306,5.' +
                                '290015 3.272724,8.294486l0,3.433681c0,' +
                                '0 -2.081665,5.933829 -3.261997,8.75588' +
                                '9c-0.160951,0.386288 1.684652,1.867062' +
                                ' 2.103134,1.598804z'
                        }
                    },
                    lastPointOffset: !DG.Browser.vml ? -5 : -2,
                    vmlEndArrow: 'none',
                    weight: 10,
                    iconWidth: 12
                }
            }
        };
    },

    _getArrowOptions: function () {
        return {
            clickable: false,
            color: '#0085a0',
            weight: 3,
            byZoom: {
                16: {
                    marker: {
                        refX: 12,
                        refY: 12,
                        markerHeight: 24,
                        markerWidth: 24,
                        path: {
                            d:  'M11.068,13.011L9.5,17.285l6.379-5.169L9' +
                                '.313,7.19l1.717,3.824'
                        }
                    },
                    lastPointOffset: 2,
                    weight: 2,
                    iconWidth: 4
                },
                17: {
                    marker: {
                        refX: 12,
                        refY: 12,
                        markerHeight: 24,
                        markerWidth: 24,
                        path: {
                            d:  'M10.354,13.969l-2.184,5.18L16.993,12L7.' +
                                '912,5.188l2.38,4.781'
                        }
                    },
                    lastPointOffset: 0,
                    weight: 3,
                    iconWidth: 6
                },
                18: {
                    marker: {
                        refX: 12,
                        refY: 12,
                        markerHeight: 24,
                        markerWidth: 24,
                        path: {
                            d:  'M10.281,13.781L7.42,21.271l11.488-9.308' +
                                'L7.083,3.093L10.219,10'
                        }
                    },
                    lastPointOffset: !DG.Browser.vml ? -5 : 0,
                    weight: 4,
                    iconWidth: 8
                },
                19: {
                    marker: {
                        refX: 12,
                        refY: 12,
                        markerHeight: 27,
                        markerWidth: 27,
                        path: {
                            d:  'M9.344783,13.814714l-3.326375,8.476902' +
                                'l12.983603,-10.51565l-13.305513,-9.979' +
                                '137l3.648286,7.940389'
                        }
                    },
                    lastPointOffset: !DG.Browser.vml ? -5 : 0,
                    weight: 5,
                    iconWidth: 12
                }
            }
        };
    }
});

DG.Path.ANIMATION_AVAILABLE =
    DG.Browser.svg &&
    !DG.Browser.mobileWebkit &&
    navigator.userAgent.toLowerCase().indexOf('presto') === -1 &&
    Object.prototype.toString.call(
        DG.SVG.create('animate').beginElement) === '[object Function]';


DG.Path.include(!DG.Path.ANIMATION_AVAILABLE ? {} : {

    runAnimation: function () {
        var animationEl = this._animationEl = this._addAnimation();

        if (animationEl) {
            animationEl.beginElement();
            this._removeAnimation(animationEl);
        }

        return this;
    },

    stopAnimation: function (name) { // (String) -> DG.Path
        if (this.animations[name]) {
            this.animations[name].endElement();
        }
        return this;
    },

    _addAnimation: function () { // () -> SVGAnimateElement|null
        var animOptions = this.options.animation,
            points = this._rings[0],
            animationEl = null;

        if (animOptions && points.length > 0) {
            animationEl = DG.SVG.create('animate');

            // calculate values if attributeName: 'd' was used to animate
            if (animOptions.getValues) {
                animOptions.values = animOptions.getValues(points);
            }

            Object.keys(animOptions)
                .filter(function (name) {
                    return {}.toString.call(animOptions[name]) !== '[object Function]';
                })
                .forEach(function (name) {
                    animationEl.setAttribute(name, animOptions[name]);
                });

            this._path.appendChild(animationEl);
        }

        return animationEl;
    },

    _removeAnimation: function (animationEl) {
        this._map.once('zoomstart', function () {
            if (animationEl) {
                this._path.removeChild(animationEl);
            }
            this._animationEl = null;
        }, this);
    }
});

DG.Entrance.Arrow = DG.Polyline.extend({
    initialize: function (latlngs, options) { // (Array, Object)
        options = options || {};

        this._setLatLngs(latlngs);

        if (DG.Path.ANIMATION_AVAILABLE) {
            options.animation = this.getArrowAnimation(this._convertLatLngs(latlngs));
        }

        this._markers = [];

        L.setOptions(this, options);
    },

    onAdd: function (map) { // (DG.Map)
        var renderer = this._renderer = map.getArrowRenderer();
        renderer._initPath(this);

        // defined in children classes
        this._project();
        this._update();
        this._updateStyleByZoom();

        renderer._addPath(this);
        renderer._initMarkers(this);
    },

    onRemove: function (map) { // (DG.Map)
        DG.Polyline.prototype.onRemove.call(this, map);

        this._renderer._removeMarkers(this);
    },

    getEvents: function () {
        return {
            viewreset: this._project,
            move: this._update,
            zoomend: this._updateStyleByZoom
        };
    },

    _projectLatlngs: function (latlngs, result) {
        DG.Polyline.prototype._projectLatlngs.call(this, latlngs, result);
        this._offsetLastPathPoint();
    },

    _update: function () {
        DG.Polyline.prototype._update.call(this);

        this._renderer._updateMarker(this);
    },

    _updateStyleByZoom: function () {
        var optionsByZoom = this.options.byZoom,
            zoom = this._map.getZoom();

        this.setStyle(optionsByZoom[zoom]);
    },

    _offsetLastPathPoint: function () {
        var origPoints = this._rings[0],
            style = this.options.byZoom[this._map.getZoom()],
            pointsLen = origPoints.length,
            lastSegmentLen = origPoints[pointsLen - 1].distanceTo(origPoints[pointsLen - 2]),
            lastSegmentInPercents,
            offsetVector,
            offsetTo;

        if (style) {
            offsetVector = {
                x: origPoints[pointsLen - 1].x - origPoints[pointsLen - 2].x,
                y: origPoints[pointsLen - 1].y - origPoints[pointsLen - 2].y
            };

            // сравнение длины последнего сегмента пути с размером иконки стрелки
            if (lastSegmentLen > style.iconWidth) {
                lastSegmentInPercents = Math.abs(style.lastPointOffset / lastSegmentLen);

                offsetTo = {
                    x: offsetVector.x * lastSegmentInPercents,
                    y: offsetVector.y * lastSegmentInPercents
                };

                // move last point forward/back by offsetVector direction
                if (style.lastPointOffset > 0) {
                    origPoints[pointsLen - 1].x += offsetTo.x;
                    origPoints[pointsLen - 1].y += offsetTo.y;
                } else {
                    origPoints[pointsLen - 1].x -= offsetTo.x;
                    origPoints[pointsLen - 1].y -= offsetTo.y;
                }
            } else {
                // удлиняем последний участок, если он меньше стрелки
                lastSegmentInPercents = lastSegmentLen / style.iconWidth;

                if (offsetVector.x !== 0) {
                    origPoints[pointsLen - 1].x = origPoints[pointsLen - 2].x + offsetVector.x / lastSegmentInPercents;
                }

                if (offsetVector.y !== 0) {
                    origPoints[pointsLen - 1].y = origPoints[pointsLen - 2].y + offsetVector.y / lastSegmentInPercents;
                }
            }
        }
    }

});

DG.Entrance.arrow = function (latlngs, options) {
    return new DG.Entrance.Arrow(latlngs, options);
};

DG.Entrance.Arrow.SVG = DG.SVG.extend({

    getEvents: function () {
        var events = {
            move: this._update
        };
        if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
        }
        if (DG.Browser.ie) {
            events.moveend = events.mousemove = events.zoomend = this._refresh; //JSAPI-3379
        }
        return events;
    },

    _initMarkers: function (layer) {
        var marker, markerStyle,
            optionsByZoom =  layer.options.byZoom,
            id = layer._markerId = 'arrow-marker-' + DG.Util.stamp(layer);

        Object.keys(optionsByZoom).map(function (zoom) {
            marker = DG.SVG.create('marker');
            markerStyle = optionsByZoom[zoom].marker;

            Object.keys(markerStyle)
                .filter(function (key) {
                    return key !== 'polygon' && key !== 'path';
                })
                .forEach(function (key) {
                    marker.setAttribute(key, markerStyle[key]);
                });

            marker.id = id + '-' + zoom;
            marker.setAttribute('orient', 'auto');
            marker.setAttribute('markerUnits', 'userSpaceOnUse');
            marker.setAttribute('stroke-width', '0');

            if (markerStyle.path) {
                marker.appendChild(this._getMarkerChild('path', markerStyle.path, layer));
            }

            if (markerStyle.polygon) {
                marker.appendChild(this._getMarkerChild('polygon', markerStyle.polygon, layer));
            }


            layer._markers.push(marker);
            this._getDefs().appendChild(marker);
        }, this);

        this._updateMarker(layer);
    },

    _getMarkerChild: function (type, options, layer) {
        var markerPath = DG.SVG.create('path'),
            vector = (type === 'path') ? 'd' : 'points';

        markerPath.setAttribute(vector, options[vector]);

        markerPath.setAttribute('fill', options.color ? options.color : layer.options.color);

        return markerPath;
    },

    _getDefs: function () {
        this._defs = this._defs || DG.SVG.create('defs');
        if (!this._defs.parentNode) {
            this._container.appendChild(this._defs);
        }
        return this._defs;
    },

    _updateMarker: function (layer) {
        var zoom = layer._map.getZoom(),
            bound = layer._map.getBounds(),
            lastPoint = layer._latlngs[layer._latlngs.length - 1],
            url = (zoom >= DG.Entrance.SHOW_FROM_ZOOM && bound.contains(lastPoint)) ? layer._markerId + '-' + zoom : '';

        layer._path.setAttribute('marker-end', 'url(#' + url + ')');
    },

    _removeMarkers: function (layer) {
        var defs = this._getDefs(),
            markers = layer._markers;

        if (!defs && !markers) { return; }

        markers.forEach(function (marker) {
            defs.removeChild(marker);
        });
        markers.length = 0;
    },

    _refresh: function () {
        this._container.parentNode.insertBefore(this._container, this._container);
    },

    _updateStyle: function (layer) {
        var path = layer._path,
            options = layer.options;

        DG.SVG.prototype._updateStyle.call(this, layer);

        path.setAttribute('visibility', options.visibility);

        layer._markers.forEach(function (marker) {
            marker.setAttribute('fill-opacity', options.opacity);
        });

        this._updateMarker(layer);
    }
});


L.Map.include({
    getArrowRenderer: function () {
        var renderer = this._arrowRenderer;

        if (!renderer) {
            renderer = this._arrowRenderer = new DG.Entrance.Arrow.SVG();
        }

        if (!this.hasLayer(renderer)) {
            this.addLayer(renderer);
        }

        return renderer;
    }
});

// redefine some SVG methods to handle VML syntax which is similar but with some differences
DG.Entrance.Arrow.SVG.include(!L.Browser.vml ? {} : {

    _initMarkers: function (layer) {
        layer._markers = L.SVG.create('stroke');
        this._updateMarker(layer);
        layer._container.appendChild(layer._markers);
    },

    _updateMarker: function (layer) {
        var style = layer.options.byZoom[layer._map.getZoom()];

        layer._markers.endarrow =
            (style && style.vmlEndArrow) ? style.vmlEndArrow : 'classic';
    },

    _removeMarkers: function (layer) {
        layer._container.removeChild(layer._markers);
    },

    _updateStyle: function (layer) {
        var options = layer.options,
            container = layer._container;

        DG.SVG.prototype._updateStyle.call(this, layer);

        if (options.visibility) {
            container.style.visibility = options.visibility;
        }
    }
});

// Extends DG.Entrance.Arrow with SVG-specific animation options
if (DG.Browser.svg) {

    DG.Entrance.Arrow.include({

        getArrowAnimation: function (vertices) { // (Number) -> Object
            var animateArrow = {
                id: 'animateArrowPathGeom',
                attributeName: 'd',
                fill: 'freeze',
                begin: 'indefinite'
            };

            animateArrow.getValues = this._getAnimationValues(vertices.length);
            animateArrow.keyTimes = this._getAnimateTiming(vertices);
            animateArrow.dur = this._getAnimationTime(vertices.length);

            return animateArrow;
        },

        _getAnimationValues: function (verticesCount) {
            return (verticesCount === 2) ? this._getShakeAnimationValues : this._getSlideAnimationValues;
        },

        _getSlideAnimationValues: function (points) { // (Array) -> String
            var d = '',
                prevPoint = '',
                curPoint = '',
                M = 'M ' + points[0].x + ' ' + points[0].y,
                l = 'l -1 0';

            d = M + ' ' + l + '; ';
            for (var i = 1; i < points.length; i++) {
                curPoint += (points[i].x - points[i - 1].x) + ' ' + (points[i].y - points[i - 1].y);

                if (i === points.length - 1) {
                    curPoint = (points[i].x - points[i - 1].x) + ' ' + (points[i].y - points[i - 1].y);
                    d += M + ' l ' + prevPoint  + curPoint + ';';
                    break;
                }

                d += M + ' l ' + curPoint + '; ';
                d += M + ' l ' + curPoint + ' ' + l + '; ';
                curPoint += ' l ';
                prevPoint += (points[i].x - points[i - 1].x) + ' ' + (points[i].y - points[i - 1].y) + ' l ';
            }

            return d;
        },

        _getShakeAnimationValues: function (points) { // (Array) -> String
            var px0, py0,
                // config coefficient values for arrow animation
                relDiff = [1, 0.4, 1, 0.84, 1, 0.94, 1],
                dx = points[1].x - points[0].x,
                dy = points[1].y - points[0].y,
                l = ' l ' + dx + ' ' + dy;

            px0 = points[0].x - dx;
            py0 = points[0].y - dy;

            return relDiff.reduce(
                function (d, step) {
                    return d + ' M ' + (px0 + dx * step) + ' ' + (py0 + dy * step) + l + ';';
                },
                'M ' + px0 + ' ' + py0 + l + '; '
            );
        },

        _getPolylineLength: function (latlngs) {
            var len = 0;
            for (var i = 1; i < latlngs.length; i++) {
                len += latlngs[i - 1].distanceTo(latlngs[i]);
            }
            return len;
        },

        _getAnimateTiming: function (latlngs) {
            var resultArr = [0],
                polyLen = this._getPolylineLength(latlngs),
                result,
                segmentRatio,
                segmentLength;

            if (latlngs.length === 2) {
                result = '0; 0.33; 0.495; 0.66; 0.77; 0.88; 0.935; 1';
            }
            else if (latlngs.length === 3) {
                result = '0; 0.33; 0.34; 1';
            }
            else if (latlngs.length === 4) {
                result = '0; 0.25; 0.26; 0.5; 0.51; 1';
            }
            else {
                for (var i = 1; i < latlngs.length; i++) {
                    segmentLength = latlngs[i - 1].distanceTo(latlngs[i]);
                    segmentRatio = segmentLength / polyLen;

                    resultArr.push(resultArr[resultArr.length - 1] + segmentRatio);

                    if (i < latlngs.length - 1) {
                        // 2 points for each vertice (but not for first and last)
                        resultArr.push(resultArr[resultArr.length - 1]);
                    }
                    else {
                        // last point should be 1, but some times it looks like 0.9999...
                        resultArr[resultArr.length - 1] = 1;
                    }

                }
                result = resultArr.join('; ');
            }

            return result;
        },

        _getAnimationTime: function (verticesCount) {
            if (verticesCount === 2) { return '0.7s'; }
            else if (verticesCount === 3 || verticesCount === 4) { return '0.5s'; }
            else { return '0.7s'; }
        }
    });
}

DG.Entrance.EventHandler = DG.Handler.extend({

    initialize: function (map, entrance) { // (DG.Map, DG.Entrance)
        this._map = map;
        this._entrance = entrance;
    },

    addHooks: function () {
        this._map.on(this._events(), this);
    },

    removeHooks: function () {
        this._map.off(this._events(), this);
    },

    _events: function () {
        return {
            'layeradd': this._removeEntrance,
            'zoomend': this._showOrHideEntrance,
            'projectleave': this._showOrHideEntrance
        };
    },

    _showOrHideEntrance: function () { // (DG.Event)
        if (this._map.getZoom() >= DG.Entrance.SHOW_FROM_ZOOM) {
            this._entrance.show(false);
        }
        else {
            this._entrance.hide();
        }
    },

    _removeEntrance: function (e) { // (DG.LayerEvent)
        if (e.layer instanceof DG.Popup ||
            (e.layer instanceof DG.Entrance && e.layer !== this._entrance)) {

            this._entrance.removeFrom(this._map);
        }
    }
});

DG.Map.mergeOptions({
    geoclicker: false
});

DG.Geoclicker = DG.Handler.extend({
    clickCount: 0,
    pendingClick: 0,
    timeout: 250, // should be equal to 'delay' value in DoubleTap event

    initialize: function (map, options) { // (Object)
        this._map = map;
        this._controller = new DG.Geoclicker.Controller(map, options);
    },

    addHooks: function () {
        this._toggleEvents(true);

        this._map
            .on('rulerstart', this._pause, this)
            .on('rulerend', this._unpause, this);
    },

    removeHooks: function () {
        this._toggleEvents();

        this._map
            .off('rulerstart', this._pause, this)
            .off('rulerend', this._unpause, this);
    },

    _pause: function () {
        this._toggleEvents();
    },

    _unpause: function () {
        // Reenable event handling only in case geoclicker is enabled
        if (this.enabled()) {
            this._toggleEvents(true);
        }
    },

    _toggleEvents: function (flag) {
        this._map[flag ? 'on' : 'off'](this._mapEventsListeners, this);
        if (this._map.poi) {
            this._map.poi.getMetaLayer()[flag ? 'on' : 'off']('click', this._mapEventsListeners.click, this);
        }
    },

    getController: function () {
        return this._controller;
    },

    _checkOpenPopup: function () {
        if (DG.Browser.mobile && this._map._popup &&
            (this._map._popup.options.closeOnClick ||
            this._map.options.closePopupOnClick)) {
            this.popupWasOpen = true;
        }
    },

    _mapEventsListeners: {
        langchange: function () {
            this._controller.reinvokeHandler();
        },

        popupclose: function (e) { // (Object)
            this._controller.handlePopupClose(e.popup);
        },

        prepreclick: function () {
            this._checkOpenPopup();
        },

        click: function (e) { // (Object)
            if (this.clickCount === 0) {
                this.clickCount = 1;
                this._singleClick(e);
            } else {
                this.clickCount = 0;
                clearTimeout(this.pendingClick);
                this.popupWasOpen = false;
            }
        }
    },

    _singleClick: function (e) { // (Object)
        var self = this;

        clearTimeout(this.pendingClick);

        this.pendingClick = setTimeout(function () {
            // prepreclick event not available in meta layer
            if (e.meta) {
                self._checkOpenPopup();
                self._map.closePopup();
            }

            if (!self.popupWasOpen) {
                var zoom = self._map.getZoom();
                self._controller.handleClick(e.latlng, zoom, e.meta);
            }

            self.clickCount = 0;
            self.popupWasOpen = false;
        }, this.timeout);
    }
});

DG.Map.addInitHook('addHandler', 'geoclicker', DG.Geoclicker);

DG.Geoclicker.clampHelper = function (el, lineClamp) {
    var measure, text, lineWidth,
        lineStart, lineCount, wordStart,
        line, lineText, wasNewLine,
        ce = document.createElement.bind(document),
        ctn = document.createTextNode.bind(document);

    // measurement element is made a child of the clamped element to get it's style
    measure = ce('span');

    (function (s) {
        s.position = 'absolute'; // prevent page reflow
        s.whiteSpace = 'pre'; // cross-browser width results
        s.visibility = 'hidden'; // prevent drawing
        s.margin = '0 18px 8px 0';
    })(measure.style);

    // make sure the element belongs to the document
    if (!el.ownerDocument || el.ownerDocument !== document) {
        return;
    }
    // reset to safe starting values
    lineStart = wordStart = 0;
    lineCount = 1;
    wasNewLine = false;
    lineWidth = el.clientWidth;
    // get all the text, remove any line changes
    text = (el.textContent || el.innerText).replace(/\n/g, ' ');
    // remove all content
    while (el.firstChild !== null) {
        el.removeChild(el.firstChild);
    }
    // add measurement element within so it inherits styles
    el.appendChild(measure);
    // http://ejohn.org/blog/search-and-dont-replace/
    text.replace(/ |-/g, function (m, pos) {
        // ignore any further processing if we have total lines
        if (lineCount === lineClamp) {
            return;
        }
        // create a text node and place it in the measurement element
        measure.appendChild(ctn(text.substr(lineStart, pos - lineStart)));
        // have we exceeded allowed line width?
        if (lineWidth < measure.clientWidth) {
            if (wasNewLine) {
                // we have a long word so it gets a line of it's own
                lineText = text.substr(lineStart, pos + 1 - lineStart);
                // next line start position
                lineStart = pos + 1;
            } else {
                // grab the text until this word
                lineText = text.substr(lineStart, wordStart - lineStart);
                // next line start position
                lineStart = wordStart;
            }
            // create a line element
            line = ce('span');
            // add text to the line element
            line.appendChild(ctn(lineText));
            // add the line element to the container
            el.appendChild(line);
            line.className = 'dg-map-geoclicker__clamped-line';
            // yes, we created a new line
            wasNewLine = true;
            lineCount++;
        } else {
            // did not create a new line
            wasNewLine = false;
        }
        // remember last word start position
        wordStart = pos + 1;
        // clear measurement element
        measure.removeChild(measure.firstChild);
    });
    // remove the measurement element from the container
    el.removeChild(measure);
    // create the last line element
    line = ce('span');
    // give styles required for text-overflow to kick in
    line.className = 'dg-map-geoclicker__clamped-line dg-map-geoclicker__clamped-line_last';
    // add all remaining text to the line element
    line.appendChild(ctn(text.substr(lineStart)));
    // add the line element to the container
    el.appendChild(line);
};

DG.Geoclicker.Provider = {};

DG.Geoclicker.Provider.CatalogApi = DG.Class.extend({
    options: {
        urlGeoSearch: 'http://catalog.api.2gis.ru/2.0/geo/search',
        urlGeoGet: 'http://catalog.api.2gis.ru/2.0/geo/get',
        urlDetails: 'http://catalog.api.2gis.ru/2.0/catalog/branch/get',
        urlFirmsInHouse: 'http://catalog.api.2gis.ru/2.0/catalog/branch/list',
        data: {
            key: 'ruxlih0718'
        },
        geoFields: 'items.geometry.selection,items.links,items.adm_div,items.address,items.floors,items.description',
        firmInfoFields: 'items.reviews,items.photos,items.links,items.external_content',

        timeoutMs: 5000
    },

    initialize: function (map) { // (Object)
        this._map = map;
    },

    getLocations: function (options) { // (Object)
        // Callback will receive array of found results or void if errors occurred or nothing was found.
        var zoom = options.zoom,
            latlng = options.latlng,
            beforeRequest = options.beforeRequest || function () {},
            types = this.getTypesByZoom(zoom),
            q = latlng.lng + ',' + latlng.lat;

        if (!types) {
            return Promise.reject('no type');
        }

        beforeRequest();

        return this.geoSearch(q, types, zoom).then(DG.bind(function (result) {
            return this._filterResponse(result, types);
        }, this));
    },

    firmsInHouse: function (houseId, parameters) { // (String, Function, Number)
        parameters = parameters || {};

        /* eslint-disable camelcase */
        var params = DG.extend(this.options.data, {
            building_id: houseId,
            page: parameters.page || 1
        });
        /* eslint-enable camelcase */

        return this._performRequest(params, this.options.urlFirmsInHouse);
    },

    getFirmInfo: function (firmId) {
        return this._performRequest({
            type: 'filial',
            id: firmId,
            fields: this.options.firmInfoFields
        }, this.options.urlDetails);
    },

    geoSearch: function (q, types, zoomlevel) { // (String, String, Number)
        /* eslint-disable camelcase */
        var params = {
            point: q,
            type: types,
            zoom_level: zoomlevel,
            fields: this.options.geoFields
        };
        /* eslint-enable camelcase */

        return this._performRequest(params, this.options.urlGeoSearch);
    },

    geoGet: function (id) {
        var params = {
            id: id,
            fields: this.options.geoFields
        };

        return this._performRequest(params, this.options.urlGeoGet);
    },

    cancelLastRequest: function () {
        if (this._lastRequest) {
            this._lastRequest.abort();
        }
    },

    getTypesByZoom: function (zoom) { // (Number) -> String|Null
        var types = {
            'adm_div.settlement':   8,
            'adm_div.city':         8,
            'adm_div.division':     11,
            'adm_div.district':     12,
            'street':               14,
            'building':             14,
            'adm_div.place':        15,
            'poi':                  15,
            'attraction':           17
        },
        selectedTypes = [];

        Object.keys(types).forEach(function (type) {
            if (zoom >= types[type]) {
                selectedTypes.push(type);
            }
        });

        if (selectedTypes.length) {
            return selectedTypes.join(',');
        } else {
            return null;
        }
    },

    _performRequest: function (params, url) { // (Object, String, Function, Function)
        var source = this.options.data,
            data = DG.extend({ // TODO clone function should be used instead of manually copying
                key: source.key
            }, params),
            type = 'get';

        this.cancelLastRequest();

        if (!DG.ajax.corsSupport) {
            type = data.format = 'jsonp';
        }

        this._lastRequest = DG.ajax(url, {
            type: type,
            data: data,
            timeout: this.options.timeoutMs
        });

        return this._lastRequest;
    },

    _filterResponse: function (response, allowedTypes) { // (Object, Array) -> Boolean|Object
        var result = {}, i, item, found, data, type;

        if (this._isNotFound(response)) {
            return false;
        }

        data = response.result.items;

        for (i = data.length - 1; i >= 0; i--) {
            item = data[i];

            type = item.type;
            if (item.subtype) {
                type += '.' + item.subtype;
            }

            if (allowedTypes && allowedTypes.indexOf(type) === -1) {
                continue;
            }

            result[type] = item;
            found = true;
        }

        if (found) {
            return result;
        } else {
            return false;
        }
    },

    _isNotFound: function (response) { // (Object) -> Boolean
        return !response ||
               !!response.meta && !!response.meta.error ||
               !response.result ||
               !response.result.items ||
               !response.result.items.length;
    }

});

DG.Geoclicker.Handler = {};

DG.Geoclicker.Handler.Default = DG.Class.extend({

    includes: DG.Locale,

    statics: {
        Dictionary: {}
    },

    _eventHandlers: {},

    initialize: function (controller, view, map) { // (Object, Object, Object)
        this._controller = controller;
        this._view = view;
        this._map = map;
    },

    handle: function () { // () -> Promise
        return Promise.resolve({
            tmpl: 'popupHeader',
            data: {'title': this.t('we_have_not')}
        });
    },

    addClickEvent: function () {
        this._view._popup.on('click', this._runEventHandlers, this);
        this._map.once('popupclose', this._removeClickEvent, this);
    },

    _removeClickEvent: function () {
        this._view._popup.off('click', this._runEventHandlers, this);
    },

    _addEventHandler: function (el, handler) { // (String, Function)
        this._eventHandlers[el] = handler;
    },

    _runEventHandlers: function(e) {
        var target = e.originalEvent.target;

        for (var eventClass in this._eventHandlers) {
            if (this._eventHandlers.hasOwnProperty(eventClass) && target.className.indexOf(eventClass) > -1) {
                DG.DomEvent.preventDefault(e.originalEvent);
                this._eventHandlers[eventClass].call(this, target);
                return;
            }
        }
    },

    _clearEventHandlers: function () {
        this._eventHandlers = {};
    },

    _getDirectionsUrl: function (name) {
        return DG.Util.template('http://2gis.{domain}/{projectCode}/center/{center}/zoom/{zoom}/routeTab/rsType/{rsType}/to/{point}╎{name}', {
            'domain': this._map.projectDetector.getProject().domain,
            'projectCode': this._map.projectDetector.getProject().code,
            'center': this._map.getCenter().lng + ',' + this._map.getCenter().lat,
            'zoom': this._map.getZoom(),
            'name': encodeURIComponent(name),
            'rsType': this._map.projectDetector.getProject().transport ? 'bus' : 'car',
            'point': this._popup._latlng.lng + ',' + this._popup._latlng.lat
        });
    },

    _getDrilldown: function (object) {
        var admDivs = [],
            result;

        if (object.adm_div) {
            admDivs = object.adm_div
                .reduce(function(admDivs, admDiv) {
                    if (admDiv.name) {
                        admDivs.push(admDiv.name);
                    }

                    return admDivs;
                }, [])
                .reverse();
        }

        if (admDivs.length && object.address && object.address.postcode) {
            admDivs.push(object.address.postcode);
        }

        result = admDivs.join(', ');

        return result;
    }

});


DG.Geoclicker.Handler.HandlerExample = DG.Geoclicker.Handler.Default.extend({

    handle: function (results, type) { // (Object, String) -> Promise
        return Promise.resolve({
            tmpl: type + ':<br/>' + results[type].id
        });
    }
});

DG.Geoclicker.Handler.ApiError = DG.Geoclicker.Handler.Default.extend({
    handle: function () { // () -> Promise
        var header = this._view.render({
            tmpl: 'popupHeader',
            data: {
                title: this.t('apiErrorTitle')
            }
        });

        return Promise.resolve({
            header: header,
            tmpl: this.t('apiErrorBody')
        });
    }
});

DG.Geoclicker.Handler.CityArea = DG.Geoclicker.Handler.Default.extend({

    _polylineStyleDefault : {
        fillColor: '#ff9387',
        color: '#ff9387',
        clickable: false,
        noClip: true,
        opacity: 1
    },

    _polylineStyles : {
        11 : {
            fillOpacity: 0.18,
            weight: 1
        },
        12 : {
            fillOpacity: 0.12,
            weight: 1
        },
        13 : {
            fillOpacity: 0.08,
            weight: 2
        },
        18 : {
            fillOpacity: 0,
            weight: 3
        }
    },

    handle: function (results, type) { // (Object, String) -> Promise
        if (!results[type]) {
            return false;
        }

        if (!this._stylesInited) {
            this._initStyles();
        }

        this._popup = this._view.getPopup();

        this._geometryZoomStyle = this._getPolyStyleNum();
        this._geometry = DG.Wkt.geoJsonLayer(results[type].geometry.selection, {
            style: this._polylineStyles[this._geometryZoomStyle]
        }).addTo(this._map);

        this._map
            .on('zoomend', this._updateGeometry, this)
            .once('popupclose', this._clearPopup, this);

        return Promise.resolve(this._fillCityAreaObject(results, type));
    },

    _fillCityAreaObject: function (results, type) {
        var data = {
            name: this.t('noname'),
            drilldown: '',
            purpose: this.t(type),
            type: type.split('.').join('_')
        };

        data.drilldown = this._getDrilldown(results[type]);

        if (results[type].name) {
            data.name = results[type].name;
        }

        return {
            tmpl: 'cityarea',
            data: data,
            header: this._view.render({
                tmpl: 'popupHeader',
                data: {'title': data.name}
            })
        };
    },

    _initStyles : function () {
        this._stylesInited = true;

        Object.keys(this._polylineStyles).forEach(function (zoom) {
            DG.extend(this._polylineStyles[zoom], this._polylineStyleDefault);
        }, this);
    },

    _getPolyStyleNum: function () {
        var mapZoom = this._map.getZoom();

        return Object.keys(this._polylineStyles).filter(function (zoom) {
            return mapZoom <= zoom;
        })[0] || false;
    },

    _updateGeometry: function () {
        var newStyle = this._getPolyStyleNum();

        if (newStyle && newStyle !== this._geometryZoomStyle) {
            this._geometryZoomStyle = newStyle;
            this._geometry.setStyle(this._polylineStyles[newStyle]);
        }
    },

    _clearPopup: function () {
        this._map
                .removeLayer(this._geometry)
                .off('zoomend', this._updateGeometry, this);
    }

});

/*global FirmCard */
DG.Geoclicker.Handler.House = DG.Geoclicker.Handler.Default.extend({

    _firmsOnPage: 20,
    _scrollThrottleInterval: 400,
    _scrollHeightReserve: 60,

    options: {
        'showBooklet': true,
        'showPhotos': true,
        'showRouteSearch': true
    },

    handle: function (results) { // (Object) -> Promise
        if (!results.building) {
            return false;
        }

        // initialization setup
        this.firmCard = null;
        this._page = 1;
        this._houseObject = null;
        this._firmList = null;
        this._firmListObject = null;
        this._firmCardObject = null;
        this._onScroll = false;
        this._isFirmlistOpen = false;

        this._id = results.building.id;
        this._totalPages = 1;
        this._api = this._controller.getCatalogApi();
        this._popup = this._view.getPopup();
        this._initedPopupClose = false;
        this._directionsUrl = this._getDirectionsUrl(results.building.name);
        this._firmListLoader = this._view.initLoader(true);

        this._houseObject = this._fillHouseObject(results.building);

        return Promise.resolve(this._houseObject);
    },

    _isRouteSearchAllowed: function() { //() -> Boolean
        var project = this._controller.getMap().projectDetector.getProject();
        return project.transport || project.roads;
    },

    _firmCardSetup: function () { //() -> Object
        return {
            render: this._view._templates,
            lang: this._map.getLang(),
            domain: this._controller.getMap().projectDetector.getProject().domain,
            ajax: DG.bind(this._api.getFirmInfo, this._api),
            timezoneOffset: this._controller.getMap().projectDetector.getProject().timeOffset,
            map: this._map,
            popup: this._popup,
            isMobile: DG.Browser.mobile,
            showEntrance: DG.Entrance,
            gotoUrl: this._directionsUrl,
            onFirmReady: DG.bind(this._onFirmReady, this),
            onToggle: DG.bind(this._popup.resize, this._popup),
            showBooklet: this.options.showBooklet,
            showPhotos: this.options.showPhotos,
            showRouteSearch: this.options.showRouteSearch && this._isRouteSearchAllowed(),
            t: DG.bind(this.t, this)
        };
    },

    // init single firm card in case of poi
    _fillFirmCardObject: function (firmId) {
        var options = this._firmCardSetup();

        this.firmCard = new FirmCard(firmId, options);
        this._initPopupClose();
        return this.firmCard.getContainer();
    },

    _firmListSetup: function() {
        var options = this._firmCardSetup();

        DG.extend(options, {
            backBtn: DG.bind(this._showHousePopup, this),
            onFirmClick: DG.bind(this._onFirmListClick, this),
            onShowLess: DG.bind(this._showHousePopup, this),
            pasteLoader: DG.bind(this._pasteLoader, this)
        });

        return {
            firmCard: options,
            firmlistItemTmpl: 'firmlistItem',
            onListReady: DG.bind(this._renderFirmList, this)
        };
    },

    _initShortFirmList: function (firms) { //(Object) -> DOMElement
        var options = this._firmListSetup();

        this._shortFirmList = new FirmCard.List(firms, options);

        return this._shortFirmList.renderList();
    },

    _initFirmList: function (res) { //(Object) -> Promise
        if (!res) { return false; }

        var results = res.result.items,
            options = this._firmListSetup();

        options.firmCard.backBtn = DG.bind(this._showListPopup, this);

        this._shortFirmList._toggleEventHandlers(true);

        this._firmList = new FirmCard.List(results, options);

        this._firmListObject = this._fillFirmListObject(this._firmList.renderList());
        this._clearAndRenderPopup(this._firmListObject);
    },

    _fillFirmListObject: function (firmList) { //(DOMElement) -> Object
        var self = this;

        return {
            tmpl: firmList,
            header: this._header,
            footer: this._view.render({
                tmpl: 'popupFooterBtns',
                data: {
                    btns: [
                        {
                            name: 'back',
                            label: this.t('back_button'),
                            icon: true
                        }
                    ]
                }
            }),
            afterRender: function () {
                self._initPopupClose();

                if (self._totalPages > 1 && self._firmListLoader) {
                    // "this" here is self._firmListObject
                    this.tmpl.parentNode.appendChild(self._firmListLoader);
                }
            }
        };
    },

    _onFirmReady: function (firmContentObject) {
        var self = this;
        firmContentObject.afterRender = function () {
            var headerTitle = self._popup._popupStructure.header.firstChild;
            if (!DG.Browser.ielt9) {
                if (headerTitle.offsetHeight > 72) { //TODO: magic number
                    DG.DomUtil.addClass(headerTitle, 'dg-popup__header-teaser');
                    if (!DG.Browser.webkit) {
                        DG.Geoclicker.clampHelper(headerTitle, 3);
                    }
                }
            }
        };
        this._clearAndRenderPopup(firmContentObject);
    },

    _showHousePopup: function () {
        this._popup.off('scroll', this._onScroll);
        this._clearAndRenderPopup(this._houseObject);
        this._shortFirmList._toggleEventHandlers();
    },

    _onFirmListClick: function () {
        this._popup.off('scroll', this._onScroll);
    },

    _pasteLoader: function () {
        var loaderWrapper  = DG.DomUtil.create('div', 'dg-map-geoclicker__preloader-wrapper'),
            loader = this._view.initLoader();

        loaderWrapper.insertBefore(loader, loaderWrapper.firstChild);
        loaderWrapper.style.height = this._popup._contentNode.offsetHeight - 1 + 'px'; // MAGIC
        loaderWrapper.style.width = this._popup._contentNode.offsetWidth + 'px';
        this._clearAndRenderPopup({tmpl: loaderWrapper});
    },

    _initPopupClose: function () {
        if (this._initedPopupClose) { return; }

        this._controller.getMap().once('popupclose', DG.bind(this._onPopupClose, this));
        this._initedPopupClose = true;
    },

    _showListPopup: function () {
        var firmList = this._firmListObject;

        this._pasteLoader();

        if (!firmList) {
            firmList = this._api.firmsInHouse(this._id).then(DG.bind(this._initFirmList, this));
        } else {
            this._clearAndRenderPopup(firmList);
            this._firmList._toggleEventHandlers();
        }

        if (!this._onScroll) {
            this._onScroll = DG.Util.throttle(this._handlePopupScroll, this._scrollThrottleInterval, this);
        }

        this._popup.on('scroll', this._onScroll);
    },

    _renderFirmList: function () {
        if (!this._isFirmlistOpen) {
            this._popup.resize();
            this._isFirmlistOpen = true;
        }
    },

    _onPopupClose: function () {
        this._initedPopupClose = false;
        if (this._firmList) {
            this._firmList.clearList();
            this._firmList = null;
            this._popup.off('scroll', this._onScroll);
        }
        this._firmId = null;
        if (this.firmCard) {
            this.firmCard._toggleEventHandlers(true);
            this.firmCard = null;
        }
        this._firmListLoader = null;
        this._page = 1;
        this._clearEventHandlers();
    },

    _initShowMore: function () {
        var link = this._popup.findElement('.dg-popup__button_name_all');

        if (link) {
            this._addEventHandler('dg-popup__button_name_all', DG.bind(this._showListPopup, this));
        }
    },

    _clearAndRenderPopup: function (popupObject) {
        this._clearEventHandlers();
        this._popup.clear('header', 'footer');
        this._view.renderPopup(popupObject);
    },

    _appendFirmList: function (res) { // (Object)
        this._firmList.addFirms(res.result.items);
        this._popup._updateScrollPosition();
    },

    _handlePopupScroll: function (e) {
        var scroller = e.originalEvent.target || e.target._scroller;

        DG.DomEvent.stop(e);

        if (this._totalPages <= 1) { return; }
        if (scroller && scroller.scrollHeight <= scroller.scrollTop + scroller.offsetHeight + this._scrollHeightReserve) {
            this._handlePaging();
        }
    },

    _handlePaging: function () {
        this._page++;

        if (this._totalPages && this._page <= this._totalPages) {
            this._api.firmsInHouse(this._id, {page: this._page}).then(DG.bind(this._appendFirmList, this));
        }

        if (this._page === this._totalPages) {
            var loader = this._firmListLoader;

            if (loader && loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }

            this._popup.off('scroll', this._onScroll);
        }
    }
});

DG.Geoclicker.Handler.House.include({
    _getAddressString: function (house) {
        if (!house.address || !house.address.components) {
            return '';
        }

        return house.address.components
            .filter(function (component) {
                return component.type === 'street_number';
            })
            .map(function (component) {
                return component.street + ', ' + component.number;
            })
            .join(' / ');
    },

    _fillBody: function (house) { // // (Object) -> (DOMElement)
        var data = {},
            wrapper = DG.DomUtil.create('div', 'dg-building-callout__body'),
            filials = house.links.branches;

        var drilldown = this._getDrilldown(house);

        if (house.building_name) {
            data.address = {
                header: this._getAddressString(house),
                drilldown: drilldown
            };
        } else if (drilldown) {
            data.address = {
                drilldown: drilldown
            };
        }

        data.purpose = house.purpose_name +
            (house.floors ? ', ' + this.t('n_floors', house.floors.ground_count) : '');

        if (house.links.branches.count > 0) {
            this._totalPages = Math.ceil(house.links.branches.count / this._firmsOnPage);
        }

        if (house.links.attractions && house.links.attractions.length) {
            data.attractions = house.links.attractions.reduce(function(attractions, attraction) {
                if (attraction.name) {
                    attractions.push(attraction.name);
                }

                return attractions;
            }, []);
        }

        wrapper.innerHTML = this._view.render({
            tmpl: 'house',
            data: data
        });

        if (filials.items) {
            wrapper.appendChild(this._initShortFirmList(filials.items));
        }

        return wrapper;
    },

    _fillHeader: function (house) { // (Object) -> (HTMLString)
        var header = {};

        if (house.building_name) {
            header.title = house.building_name;
        } else if (house.address && house.address.components) {
            header.title = this._getAddressString(house);
        } else {
            header.title = house.purpose_name;
        }

        this._header = this._view.render({
            tmpl: 'popupHeader',
            data: header
        });

        return this._header;
    },

    _fillFooter: function (house) { // (Object) -> (HTMLString)
        var btns = [];
        var houseFilials = house.links.branches;

        // Decide if we need to display 'more organisations' button
        if (
            houseFilials.items &&
            houseFilials.items.length &&
            houseFilials.count > houseFilials.items.length
        ) {
            btns.push(this._getShowAllData(houseFilials.count));
        }

        if (this._isRouteSearchAllowed()) {
            btns.push({
                name: 'goto',
                label: this.t('go_to'),
                icon: true,
                href: this._directionsUrl
            });
        }

        return this._view.render({
            tmpl: 'popupFooterBtns',
            data: {'btns': btns}
        });
    },

    _getShowAllData: function (filialsCount) {
        return {
            name: 'all',
            label: this.t('show_organization_in_building', filialsCount)
        };
    },

    _fillHouseObject: function (house) { // (Object) -> (Object)
        var self = this;

        return {
            header: this._fillHeader(house),
            tmpl: this._fillBody(house),
            footer: this._fillFooter(house),
            afterRender: function () {
                self._initShowMore();
                self._initPopupClose();
            }
        };
    }
});

DG.Geoclicker.Handler.Poi = DG.Geoclicker.Handler.House.extend({

    handle: function (results) { // (Object) -> Promise
        if (!results.poi) {
            return false;
        }

        // initialization setup
        this.firmCard = null;
        this._page = 1;
        this._houseObject = null;
        this._firmList = null;
        this._firmListObject = null;
        this._firmCardObject = null;
        this._onScroll = false;
        this._isFirmlistOpen = false;

        this._id = results.poi.reference.id;
        this._totalPages = 1;
        this._api = this._controller.getCatalogApi();
        this._popup = this._view.getPopup();
        this._initedPopupClose = false;
        this._directionsUrl = this._getDirectionsUrl(results.poi.reference.name);
        this._firmListLoader = this._view.initLoader(true);

        // If the POI refers to a building (e.g. galleries in Santiago),
        // show a building callout
        if (results.poi.reference.type === 'building') {
            var self = this;

            return self._api.geoGet(results.poi.reference.id)
                .then(function (result) {
                    self._houseObject = self._fillHouseObject(result.result.items[0]);
                    return Promise.resolve(self._houseObject);
                });
        }

        // Otherwise, show a firm callout
        if (results.poi.reference.type === 'branch') {
            this._fillFirmCardObject(results.poi.reference.id);
            return true;
        }

        return false;
    }

});

DG.Geoclicker.Handler.Sight = DG.Geoclicker.Handler.Default.extend({

    handle: function (results) { // (Object, String) -> Promise
        if (!results.attraction) {
            return false;
        }

        this._popup = this._view.getPopup();
        this._initedPopupClose = false;

        return Promise.resolve(this._fillSightObject(results));
    },

    _fillSightObject: function (results) { // (Object) -> Object
        var attraction = results.attraction,
            data = {},
            self = this,
            footer = {
                btns: [
                    {
                        name: 'goto',
                        label: this.t('go_to'),
                        icon: true
                    }
                ]
            };

        if (attraction.name) {
            data.buildingName = attraction.name;
            data.purpose = attraction.subtype_name;
        } else {
            data.buildingName = attraction.subtype_name;
        }

        data.description = attraction.description;

        data.drillDown = this._getDrilldown(attraction);

        if (this._checkDescFieldHeight(data.description)) {
            data.showMoreText = this.t('show_more_about_sight');
        }

        footer.btns[0].href = this._getDirectionsUrl(data.buildingName);

        return {
            tmpl: 'sight',
            data: data,
            header: this._view.render({
                tmpl: 'popupHeader',
                data: {'title': data.buildingName}
            }),
            footer: this._view.render({
                tmpl: 'popupFooterBtns',
                data: footer
            }),
            afterRender: function () {
                if (self._needShowMore) {
                    self._initShowMore();
                }
                self._initPopupClose();
            }
        };
    },

    _initPopupClose: function () {
        if (this._initedPopupClose) {
            return;
        }

        this._controller.getMap().once('popupclose', DG.bind(this._clearPopup, this));
        this._initedPopupClose = true;
    },

    _clearPopup: function () {
        this._initedPopupClose = false;
        this._clearEventHandlers();
    },

    _showMoreText: function () {
        this._desc.style.maxHeight = '100%';
        this._link.parentNode.removeChild(this._link);
        this._popup.resize();
    },

    _initShowMore: function () {
        this._link = this._popup.findElement('.dg-map-geoclicker__show-more-sights-link');
        this._desc = this._popup.findElement('.dg-map-geoclicker__sight-description');

        if (this._link && this._desc) {
            this._addEventHandler('dg-map-geoclicker__show-more-sights-link', DG.bind(this._showMoreText, this));
        }
    },

    _checkDescFieldHeight: function (desc) {
        var el = DG.DomUtil.create('div', ''),
            height;

        el.style.visibility = 'hidden';
        el.innerHTML = desc;

        this._popup._contentNode.appendChild(el);
        height = el.offsetHeight;
        this._popup._contentNode.removeChild(el);
        this._needShowMore = (height > 40);

        return this._needShowMore;
    }
});

DG.Geoclicker.View = DG.Class.extend({

    initialize: function (map, options) { // (Object, Object)
        this._map = map;
        this._popup = DG.popup({
            maxHeight: 300,
            minHeight: 50,
            maxWidth: 385,
            minWidth: 310,
            sprawling: true,
            closeOnClick: true
        });

        /*global __DGGeoclicker_TMPL__ */
        this._templates = DG.dust({"cityarea":"(function(){dust.register(\"cityarea\",body_0);function body_0(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__purpose dg-map-geoclicker__purpose_type_\").reference(ctx.get([\"type\"], false),ctx,\"h\").write(\"\\\">\").reference(ctx.get([\"purpose\"], false),ctx,\"h\").write(\"</div>\").section(ctx.get([\"drilldown\"], false),ctx,{\"block\":body_1},null);}function body_1(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__drilldown\\\">\").reference(ctx.get([\"drilldown\"], false),ctx,\"h\").write(\"</div>\");}return body_0;})();","firmCardAddr":"(function(){dust.register(\"firmCardAddr\",body_0);function body_0(chk,ctx){return chk.write(\"<address class=\\\"dg-firm-card__address dg-firm-card__icon\\\">\").reference(ctx.get([\"address\"], false),ctx,\"h\").section(ctx.get([\"comment\"], false),ctx,{\"block\":body_1},null).write(\"</address>\");}function body_1(chk,ctx){return chk.write(\"<span class=\\\"dg-firm-card__comment\\\">&mdash; \").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</span>\");}return body_0;})();","firmCardContacts":"(function(){dust.register(\"firmCardContacts\",body_0);function body_0(chk,ctx){return chk.section(ctx.get([\"groups\"], false),ctx,{\"block\":body_1},null);}function body_1(chk,ctx){return chk.section(ctx.get([\"contacts\"], false),ctx,{\"block\":body_2},null);}function body_2(chk,ctx){return chk.helper(\"select\",ctx,{\"block\":body_3},{\"key\":ctx.get([\"type\"], false),\"type\":\"string\"});}function body_3(chk,ctx){return chk.helper(\"eq\",ctx,{\"block\":body_4},{\"value\":\"phone\",\"type\":\"string\"}).helper(\"eq\",ctx,{\"block\":body_6},{\"value\":\"fax\",\"type\":\"string\"}).helper(\"eq\",ctx,{\"block\":body_8},{\"value\":\"website\",\"type\":\"string\"}).helper(\"eq\",ctx,{\"block\":body_9},{\"value\":\"email\",\"type\":\"string\"});}function body_4(chk,ctx){return chk.write(\"<div class=\\\"dg-firm-card__phone dg-firm-card__icon\\\"><span class=\\\"dg-firm-card__phone-num\\\">\").reference(ctx.get([\"text\"], false),ctx,\"h\").section(ctx.get([\"comment\"], false),ctx,{\"block\":body_5},null).write(\"</span></div>\");}function body_5(chk,ctx){return chk.write(\"<span class=\\\"dg-firm-card__comment\\\" title=\\\"\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"\\\">&mdash;&nbsp;&nbsp;\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</span>\");}function body_6(chk,ctx){return chk.write(\"<div class=\\\"dg-firm-card__phone dg-firm-card__icon\\\"><span class=\\\"dg-firm-card__phone-num\\\">\").reference(ctx.get([\"text\"], false),ctx,\"h\").section(ctx.get([\"comment\"], false),ctx,{\"block\":body_7},null).write(\"</span></div>\");}function body_7(chk,ctx){return chk.write(\"<span class=\\\"dg-firm-card__comment\\\" title=\\\"\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"\\\">&mdash;&nbsp;&nbsp;\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</span>\");}function body_8(chk,ctx){return chk.write(\"<div class=\\\"dg-firm-card__link dg-firm-card__site dg-firm-card__icon\\\"><a href=\\\"\").reference(ctx.get([\"url\"], false),ctx,\"h\").write(\"\\\" target=\\\"_blank\\\" class=\\\"dg-link_scheme_dark dg-firm-card__sitelink\\\">\").reference(ctx.get([\"text\"], false),ctx,\"h\").write(\"</a></div>\");}function body_9(chk,ctx){return chk.write(\"<div class=\\\"dg-firm-card__link dg-firm-card__email dg-firm-card__icon\\\"><a href=\\\"mailto: \").reference(ctx.get([\"value\"], false),ctx,\"h\").write(\"\\\">\").reference(ctx.get([\"value\"], false),ctx,\"h\").write(\"</a></div>\");}return body_0;})();","firmCardHeader":"(function(){dust.register(\"firmCardHeader\",body_0);function body_0(chk,ctx){return chk.write(\"<div class=\\\"dg-popup__header-title dg-popup__header-title_for_firmcard\\\" title=\\\"\").reference(ctx.get([\"firmName\"], false),ctx,\"h\").write(\"\\\">\").reference(ctx.get([\"firmName\"], false),ctx,\"h\").write(\"</div>\").exists(ctx.get([\"links\"], false),ctx,{\"block\":body_1},null);}function body_1(chk,ctx){return chk.write(\"<div class=\\\"dg-popup__header-links\\\">\").section(ctx.get([\"links\"], false),ctx,{\"block\":body_2},null).write(\"</div>\");}function body_2(chk,ctx){return chk.helper(\"eq\",ctx,{\"else\":body_3,\"block\":body_6},{\"key\":body_7,\"value\":\"flamp_stars\",\"type\":\"string\"});}function body_3(chk,ctx){return chk.write(\"<a class=\\\"dg-popup__header-link dg-popup__link dg-popup__link_type_\").reference(ctx.get([\"name\"], false),ctx,\"h\").write(\"\\\"\").exists(ctx.get([\"href\"], false),ctx,{\"else\":body_4,\"block\":body_5},null).write(\">\").reference(ctx.get([\"label\"], false),ctx,\"h\").write(\"</a>\");}function body_4(chk,ctx){return chk.write(\"href=\\\"javascript:void(0)\\\"\");}function body_5(chk,ctx){return chk.write(\"href=\").reference(ctx.get([\"href\"], false),ctx,\"h\").write(\" target=\\\"_blank\\\"\");}function body_6(chk,ctx){return chk.write(\"<div class=\\\"dg-popup__rating\\\"><div class=\\\"dg-popup__rating-stars\\\" style=\\\"width: \").reference(ctx.get([\"width\"], false),ctx,\"h\").write(\"%\\\"></div></div>\");}function body_7(chk,ctx){return chk.reference(ctx.get([\"name\"], false),ctx,\"h\");}return body_0;})();","firmCardRubric":"(function(){dust.register(\"firmCardRubric\",body_0);function body_0(chk,ctx){return chk.section(ctx.get([\"rubrics\"], false),ctx,{\"block\":body_1},null);}function body_1(chk,ctx){return chk.write(\"<section class=\\\"dg-firm-card__rubrics\\\">\").exists(ctx.get([\"primary\"], false),ctx,{\"block\":body_2},null).exists(ctx.get([\"additional\"], false),ctx,{\"block\":body_4},null).write(\"</section>\");}function body_2(chk,ctx){return chk.write(\"<ul class=\\\"dg-firm-card__rubrics-list dg-firm-card__rubrics-list_type_primary\\\">\").section(ctx.get([\"primary\"], false),ctx,{\"block\":body_3},null).write(\"</ul>\");}function body_3(chk,ctx){return chk.write(\"<li class=\\\"dg-firm-card__rubrics-list-item\\\">\").reference(ctx.get([\"name\"], false),ctx,\"h\").write(\"</li>\");}function body_4(chk,ctx){return chk.write(\"<ul class=\\\"dg-firm-card__rubrics-list dg-firm-card__rubrics-list_type_additional\\\">\").section(ctx.get([\"additional\"], false),ctx,{\"block\":body_5},null).write(\"</ul>\");}function body_5(chk,ctx){return chk.write(\"<li class=\\\"dg-firm-card__rubrics-list-item\\\">\").reference(ctx.get([\"name\"], false),ctx,\"h\").write(\"</li>\");}return body_0;})();","firmCardSchedule":"(function(){dust.register(\"firmCardSchedule\",body_0);function body_0(chk,ctx){return chk.write(\"<div class=\\\"dg-firm-card__schedule dg-schedule dg-schedule_open_\").exists(ctx.getPath(false, [\"forecast\",\"open\"]),ctx,{\"else\":body_1,\"block\":body_2},null).write(\" dg-schedule_works-everyday_\").exists(ctx.getPath(false, [\"schedule\",\"everyday\"]),ctx,{\"else\":body_3,\"block\":body_4},null).write(\"\\\">\").exists(ctx.get([\"schedule\"], false),ctx,{\"block\":body_5},null).write(\"</div>\");}function body_1(chk,ctx){return chk.write(\"false\");}function body_2(chk,ctx){return chk.write(\"true\");}function body_3(chk,ctx){return chk.write(\"false\");}function body_4(chk,ctx){return chk.write(\"true\");}function body_5(chk,ctx){return chk.exists(ctx.getPath(false, [\"forecast\",\"today\"]),ctx,{\"block\":body_6},null).section(ctx.getPath(false, [\"forecast\",\"now\"]),ctx,{\"block\":body_10},null).notexists(ctx.getPath(false, [\"schedule\",\"everyday\"]),ctx,{\"block\":body_12},null);}function body_6(chk,ctx){return chk.write(\"<div class=\\\"dg-schedule__today\\\"><div class=\\\"dg-schedule__today-inner\\\">\").reference(ctx.getPath(false, [\"forecast\",\"today\",\"text\"]),ctx,\"h\").write(\"&nbsp;\").exists(ctx.getPath(false, [\"forecast\",\"today\",\"from\"]),ctx,{\"block\":body_7},null).exists(ctx.getPath(false, [\"schedule\",\"lunch\"]),ctx,{\"block\":body_8},null).write(\"</div></div>\");}function body_7(chk,ctx){return chk.reference(ctx.getPath(false, [\"forecast\",\"today\",\"from\"]),ctx,\"h\").write(\"&ndash;\").reference(ctx.getPath(false, [\"forecast\",\"today\",\"to\"]),ctx,\"h\");}function body_8(chk,ctx){return chk.write(\",&nbsp;\").reference(ctx.getPath(false, [\"forecast\",\"today\",\"lunchStr\"]),ctx,\"h\").write(\"&nbsp;\").section(ctx.getPath(false, [\"schedule\",\"lunch\"]),ctx,{\"block\":body_9},null);}function body_9(chk,ctx){return chk.reference(ctx.get([\"from\"], false),ctx,\"h\").write(\"&ndash;\").reference(ctx.get([\"to\"], false),ctx,\"h\");}function body_10(chk,ctx){return chk.write(\"<div class=\\\"dg-schedule__now\\\"><span class=\\\"dg-schedule__now-text\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").section(ctx.getPath(false, [\"schedule\",\"comment\"]),ctx,{\"block\":body_11},null).write(\"</span></div>\");}function body_11(chk,ctx){return chk.write(\", \").reference(ctx.getPath(true, []),ctx,\"h\");}function body_12(chk,ctx){return chk.exists(ctx.getPath(false, [\"schedule\",\"week\"]),ctx,{\"block\":body_13},null);}function body_13(chk,ctx){return chk.exists(ctx.getPath(false, [\"schedule\",\"week\",\"evently\"]),ctx,{\"block\":body_14},null).exists(ctx.getPath(false, [\"schedule\",\"week\",\"table\"]),ctx,{\"block\":body_22},null);}function body_14(chk,ctx){return chk.write(\"<div class=\\\"dg-schedule__table\\\">\").section(ctx.getPath(false, [\"schedule\",\"week\",\"evently\"]),ctx,{\"block\":body_15},null).write(\"</div>\");}function body_15(chk,ctx){return chk.write(\"<div class=\\\"dg-schedule__string\\\">\").exists(ctx.get([\"alltime\"], false),ctx,{\"block\":body_16},null).exists(ctx.get([\"everyday\"], false),ctx,{\"else\":body_17,\"block\":body_18},null).exists(ctx.get([\"holiday\"], false),ctx,{\"else\":body_19,\"block\":body_21},null).write(\"</div>\");}function body_16(chk,ctx){return chk.reference(ctx.get([\"alltimeStr\"], false),ctx,\"h\");}function body_17(chk,ctx){return chk.reference(ctx.get([\"dayList\"], false),ctx,\"h\");}function body_18(chk,ctx){return chk.reference(ctx.getPath(false, [\"forecast\",\"today\",\"text\"]),ctx,\"h\");}function body_19(chk,ctx){return chk.write(\"<span class=\\\"schedule__string-time\\\">&nbsp;\").reference(ctx.get([\"from\"], false),ctx,\"h\").write(\"&ndash;\").reference(ctx.get([\"to\"], false),ctx,\"h\").write(\"</span>\").section(ctx.get([\"lunch\"], false),ctx,{\"block\":body_20},null);}function body_20(chk,ctx){return chk.write(\"<p>\").reference(ctx.get([\"lunchStr\"], false),ctx,\"h\").write(\"&mdash;<span class=\\\"schedule__string-time\\\">\").reference(ctx.get([\"from\"], false),ctx,\"h\").write(\"&ndash;\").reference(ctx.get([\"to\"], false),ctx,\"h\").write(\"</span></p>\");}function body_21(chk,ctx){return chk.write(\"&nbsp;&mdash;<span class=\\\"schedule__string-time\\\">&nbsp;\").reference(ctx.get([\"holidayStr\"], false),ctx,\"h\").write(\"</span>\");}function body_22(chk,ctx){return chk.write(\"<div><div class=\\\"dg-schedule__table\\\"><div class=\\\"dg-schedule__tc dg-schedule__tc_pre\\\"><div class=\\\"dg-schedule__day-name\\\">&nbsp;</div><div class=\\\"dg-schedule__table-clock dg-schedule__td\\\"></div>\").exists(ctx.getPath(false, [\"schedule\",\"week\",\"hasLunch\"]),ctx,{\"block\":body_23},null).write(\"</div>\").section(ctx.getPath(false, [\"schedule\",\"week\",\"table\"]),ctx,{\"block\":body_24},null).write(\"</div>  </div>\");}function body_23(chk,ctx){return chk.write(\"<div class=\\\"dg-schedule__table-lunch dg-schedule__td\\\"></div>\");}function body_24(chk,ctx){return chk.helper(\"if\",ctx,{\"block\":body_25},{\"cond\":body_26}).write(\"<div class=\\\"dg-schedule__tc\").exists(ctx.get([\"active\"], false),ctx,{\"block\":body_27},null).write(\"\\\"><div class=\\\"dg-schedule__day-name\\\">\").reference(ctx.get([\"key\"], false),ctx,\"h\").write(\"</div><div class=\\\"dg-schedule__td\\\">\").exists(ctx.get([\"from\"], false),ctx,{\"else\":body_28,\"block\":body_29},null).write(\"</div>\").section(ctx.get([\"lunch\"], false),ctx,{\"block\":body_30},null).write(\"</div> \").helper(\"if\",ctx,{\"block\":body_33},{\"cond\":body_34});}function body_25(chk,ctx){return chk.write(\"<span class=\\\"dg-schedule__table-cell-group\\\">\");}function body_26(chk,ctx){return chk.write(\"(\").reference(ctx.get([\"$idx\"], false),ctx,\"h\").write(\" == \").reference(ctx.get([\"$len\"], false),ctx,\"h\").write(\" - 2)\");}function body_27(chk,ctx){return chk.write(\" dg-schedule__tc_active_true\");}function body_28(chk,ctx){return chk.write(\"&ndash;\");}function body_29(chk,ctx){return chk.reference(ctx.get([\"from\"], false),ctx,\"h\").write(\" \").reference(ctx.get([\"to\"], false),ctx,\"h\");}function body_30(chk,ctx){return chk.write(\"<div class=\\\"dg-schedule__td\\\">\").exists(ctx.get([\"from\"], false),ctx,{\"else\":body_31,\"block\":body_32},null).write(\"</div>\");}function body_31(chk,ctx){return chk.write(\"&ndash;\");}function body_32(chk,ctx){return chk.reference(ctx.get([\"from\"], false),ctx,\"h\").write(\" \").reference(ctx.get([\"to\"], false),ctx,\"h\");}function body_33(chk,ctx){return chk.write(\"</span>\");}function body_34(chk,ctx){return chk.write(\"(\").reference(ctx.get([\"$idx\"], false),ctx,\"h\").write(\" == \").reference(ctx.get([\"$len\"], false),ctx,\"h\").write(\")\");}return body_0;})();","firmlistItem":"(function(){dust.register(\"firmlistItem\",body_0);function body_0(chk,ctx){return chk.write(\"<a id=\\\"\").reference(ctx.getPath(false, [\"firm\",\"id\"]),ctx,\"h\").write(\"\\\" class=\\\"dg-popup__link\\\" href=\\\"#\\\">\").reference(ctx.getPath(false, [\"firm\",\"name\"]),ctx,\"h\").write(\"</a>\");}return body_0;})();","frimCardPayments":"(function(){dust.register(\"frimCardPayments\",body_0);function body_0(chk,ctx){return chk.exists(ctx.get([\"payments\"], false),ctx,{\"block\":body_1},null);}function body_1(chk,ctx){return chk.write(\"<section class=\\\"dg-firm-card__aa\\\"><ul class=\\\"dg-firm-card__aa-list\\\">\").section(ctx.get([\"payments\"], false),ctx,{\"block\":body_2},null).write(\"</ul></section>\");}function body_2(chk,ctx){return chk.write(\"<li class=\\\"dg-firm-card__aa-list-item\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</li>\");}return body_0;})();","house":"(function(){dust.register(\"house\",body_0);function body_0(chk,ctx){return chk.section(ctx.get([\"address\"], false),ctx,{\"block\":body_1},null).section(ctx.get([\"purpose\"], false),ctx,{\"block\":body_4},null).section(ctx.get([\"attractions\"], false),ctx,{\"block\":body_5},null);}function body_1(chk,ctx){return chk.write(\"<address class=\\\"dg-map-geoclicker__address\\\">\").section(ctx.getPath(false, [\"address\",\"header\"]),ctx,{\"block\":body_2},null).section(ctx.getPath(false, [\"address\",\"drilldown\"]),ctx,{\"block\":body_3},null).write(\"</address>\");}function body_2(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__address-header\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</div>\");}function body_3(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__address-drilldown\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</div>\");}function body_4(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__purpose\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</div>\");}function body_5(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__purpose dg-map-geoclicker__purpose_type_sight\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</div>\");}return body_0;})();","loader":"(function(){dust.register(\"loader\",body_0);function body_0(chk,ctx){return chk.write(\"<div class=\\\"dg-preloader dg-preloader_scheme_regular dg-preloader_animation_\").exists(ctx.get([\"anim\"], false),ctx,{\"else\":body_1,\"block\":body_2},null).exists(ctx.get([\"small\"], false),ctx,{\"block\":body_3},null).write(\"\\\"></div>\");}function body_1(chk,ctx){return chk.write(\"false\");}function body_2(chk,ctx){return chk.write(\"true\");}function body_3(chk,ctx){return chk.write(\" dg-preloader_size_small\");}return body_0;})();","popupFooter":"(function(){dust.register(\"popupFooter\",body_0);function body_0(chk,ctx){return chk.write(\"<div class=\\\"dg-popup__footer-title\\\"><a class=\\\"dg-popup__show-less-house-link\\\" href=\\\"javascript:void(0)\\\">\").reference(ctx.get([\"hideFirmsText\"], false),ctx,\"h\").write(\"</a></div>\");}return body_0;})();","popupFooterBtns":"(function(){dust.register(\"popupFooterBtns\",body_0);function body_0(chk,ctx){return chk.exists(ctx.get([\"btns\"], false),ctx,{\"block\":body_1},null);}function body_1(chk,ctx){return chk.write(\"<footer class=\\\"dg-popup__footer-buttons\\\">\").section(ctx.get([\"btns\"], false),ctx,{\"block\":body_2},null).write(\"</footer>\");}function body_2(chk,ctx){return chk.write(\"<div class=\\\"dg-popup__footer-button-wrapper\\\"><a class=\\\"dg-popup__button_name_\").reference(ctx.get([\"name\"], false),ctx,\"h\").write(\" dg-popup__footer-button\").exists(ctx.get([\"icon\"], false),ctx,{\"block\":body_3},null).write(\"\\\"\").exists(ctx.get([\"href\"], false),ctx,{\"else\":body_4,\"block\":body_5},null).write(\">\").reference(ctx.get([\"label\"], false),ctx,\"h\").write(\"</a></div>\");}function body_3(chk,ctx){return chk.write(\" dg-popup__footer-icon-button\");}function body_4(chk,ctx){return chk.write(\"href=\\\"javascript:void(0)\\\"\");}function body_5(chk,ctx){return chk.write(\"href=\").reference(ctx.get([\"href\"], false),ctx,\"h\").write(\" target=\\\"_blank\\\"\");}return body_0;})();","popupHeader":"(function(){dust.register(\"popupHeader\",body_0);function body_0(chk,ctx){return chk.section(ctx.get([\"title\"], false),ctx,{\"block\":body_1},null);}function body_1(chk,ctx){return chk.write(\"<div class=\\\"dg-popup__header-title\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</div>\");}return body_0;})();","sight":"(function(){dust.register(\"sight\",body_0);function body_0(chk,ctx){return chk.section(ctx.get([\"purpose\"], false),ctx,{\"block\":body_1},null).section(ctx.get([\"address\"], false),ctx,{\"block\":body_2},null).section(ctx.get([\"description\"], false),ctx,{\"block\":body_5},null);}function body_1(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__purpose dg-map-geoclicker__purpose_type_sight\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</div>\");}function body_2(chk,ctx){return chk.write(\"<address class=\\\"dg-map-geoclicker__address\\\">\").section(ctx.getPath(false, [\"address\",\"header\"]),ctx,{\"block\":body_3},null).section(ctx.getPath(false, [\"address\",\"drilldown\"]),ctx,{\"block\":body_4},null).write(\"</address>\");}function body_3(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__address-header\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</div>\");}function body_4(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__address-drilldown\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</div>\");}function body_5(chk,ctx){return chk.write(\"<div class=\\\"dg-map-geoclicker__sight-description\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</div>\").section(ctx.get([\"showMoreText\"], false),ctx,{\"block\":body_6},null);}function body_6(chk,ctx){return chk.write(\"<a class=\\\"dg-map-geoclicker__show-more-sights-link\\\" href=\\\"javascript:void(0)\\\">\").reference(ctx.getPath(true, []),ctx,\"h\").write(\"</a>\");}return body_0;})();"});

        if (options) {
            DG.Util.setOptions(this, options);
        }
    },

    initLoader: function (isSmall) {
        var loader = document.createElement('div');
        loader.innerHTML = this._templates('loader',
            {
                small: isSmall,
                anim: this._detectCssAnimation()
            }
        );

        return loader.firstChild;
    },

    showPopup: function (latlng, content) { // (Object)
        this._popup
                .setContent(content)
                .setLatLng(latlng)
                .openOn(this._map);
    },

    render: function (options) { // (Object) -> String
        var html,
            data = {};

        options = options || {};
        options.tmpl = options.tmpl || '';

        if (options.data) {
            html = this._templates(options.tmpl, options.data);
        } else {
            html = options.tmpl;
        }

        if (options.beforeRender) {
            options.beforeRender();
        }

        if (options.popup) {
            if (options.header) {
                data.header = options.header;
            }
            if (options.footer) {
                data.footer = options.footer;
            }
            data.body = html;
            this._popup.setContent(data);
        }
        if (options.afterRender) {
            options.afterRender();
        }

        return html;
    },

    renderPopup: function (options) { // (Object) -> String
        options.popup = true;
        return this.render(options);
    },

    getPopup: function () { // () -> Object
        return this._popup;
    },

    _detectCssAnimation: function () {
        var animation = false,
            domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
            elm = document.createElement('div');

        if (elm.style.animationName) { animation = true; }

        if (animation === false) {
            for (var i = 0; i < domPrefixes.length; i++) {
                if (elm.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
                    animation = true;
                    break;
                }
            }
        }
        return animation;
    }
});

DG.Geoclicker.Controller = DG.Class.extend({

    options: {
        // if handler worked successfully, it should return rendering object that will be processed in View , otherwise it should return false
        // default handler always should return rendering object
        'handlersSequence': {
            'poi': DG.Geoclicker.Handler.Poi,
            'attraction': DG.Geoclicker.Handler.Sight,
            'building': DG.Geoclicker.Handler.House,
            'street': DG.Geoclicker.Handler.CityArea,
            'adm_div.place': DG.Geoclicker.Handler.CityArea,
            'adm_div.district': DG.Geoclicker.Handler.CityArea,
            'adm_div.division': DG.Geoclicker.Handler.CityArea,
            'adm_div.settlement': DG.Geoclicker.Handler.CityArea,
            'adm_div.city': DG.Geoclicker.Handler.CityArea,

            'default': DG.Geoclicker.Handler.Default,

            'apiError': DG.Geoclicker.Handler.ApiError

//            station_platform
//            project
//            station
//            crossbroad
//            metro
        }
    },

    initialize: function (map, options) { // (Object, Object)
        this._options = options;
        this._handlers = {};
        this._catalogApi = new DG.Geoclicker.Provider.CatalogApi(map);
        this._map = map;
        this._view = new DG.Geoclicker.View(map);

        this._renderHandlerResult = DG.bind(this._renderHandlerResult, this);
        this._lastHandleClickArguments = null;
    },

    handlePopupClose: function (popup) { // (Object)
        if (popup === this._view.getPopup()) {
            this._lastHandleClickArguments = null;
            this._catalogApi.cancelLastRequest();
        }
    },

    handleClick: function (latlng, zoom, meta) { // (Object, Number, Object)
        var self = this,
            args = Array.prototype.slice.call(arguments, 0);

        function beforeRequest() {
            var loader = self._view.initLoader();
            self._view._popup.clear();
            self._view.showPopup(latlng, loader);
            self._lastHandleClickArguments = args;
        }

        if (meta && meta.linked) {
            beforeRequest();
            self.handleResponse({
                poi: {
                    reference: meta.linked
                }
            });
        } else {
            this._catalogApi.getLocations({
                latlng: latlng,
                zoom: zoom,
                beforeRequest: beforeRequest
            }).then(function (result) {
                self.handleResponse(result);
            }, function (error) {
                self.handleResponse(error);
            });
        }
    },

    handleResponse: function (result) { // (Object)
        var type;

        if (!result) {
            this._runHandler('default');
            return;
        }

        if (result === 'no type') {
            return;
        }

        if (result === 'aborted') {
            this._runHandler('apiError');
            return;
        }

        type = this.findHandler(result);

        while (type) {
            if (this._runHandler(type, result)) {
                return;
            }
            delete result[type];

            type = this.findHandler(result);
        }
        this._runHandler('default');
    },

    findHandler: function (result) { // (Object) -> String|Null
        for (var i in this.options.handlersSequence) {
            if (result[i]) {
                return i;
            }
        }

        return null;
    },

    getCatalogApi: function () { // () -> Object
        return this._catalogApi;
    },

    getMap: function () {
        return this._map;
    },

    reinvokeHandler: function () {
        if (this._lastHandleClickArguments) {
            this.handleClick.apply(this, this._lastHandleClickArguments);
        }
    },

    _runHandler: function (type, data) { // (String, Object) -> Boolean
        data = data || {};
        this._initHandlerOnce(type);
        this._handlers[type].addClickEvent();

        var handlerResult = this._handlers[type].handle(data, type);

        return handlerResult && handlerResult.then ?
            handlerResult.then(this._renderHandlerResult) :
            handlerResult;
    },

    _renderHandlerResult: function (result) {
        this._view.renderPopup(result);
    },

    _initHandlerOnce: function (type) { // (String)
        if (!this._handlers[type]) {
            this._handlers[type] = new this.options.handlersSequence[type](this, this._view, this._map, this._options);
        }
    }
});

DG.Geoclicker.Handler.Default.Dictionary.it = DG.extend({
    apiErrorTitle: 'Oh oh, c\'è&nbsp;un&nbsp;errore',
    apiErrorBody: 'I nostri server si rifiutano di rispondere. Stiamo facendo del nostro meglio per convincerli a&nbsp;comportarsi bene. Ritorna tra qualche minuto.',
    we_have_not : 'Non disponiamo ancora di informazioni su questo posto',
    noname : 'Nome non indicato',
    'adm_div.place' : 'Luogo',
    'adm_div.division' : 'Zona',
    'adm_div.settlement' : 'Comune',
    street : 'Via',
    'adm_div.district' : 'Municipalità',
    'adm_div.city' : 'Сittà',
    go_to : 'Come arrivare',
    show_organization_in_building : ['{n} azienda in tutto', '{n} aziende in tutto'],
    show_more_about_sight : 'Maggiori informazioni',
    back_button: 'Indietro',
    n_floors : ['{n} piano', '{n} piani']
}, DG.Dictionary.it);

DG.Geoclicker.Handler.Default.Dictionary.ru = DG.extend({
    apiErrorTitle: 'Ошибочка вышла',
    apiErrorBody: 'Наши серверы отказываются отвечать. Мы уже прикладываем все силы, чтобы вразумить их. Возвращайтесь к&nbsp;нам через&nbsp;несколько минут.',
    we_have_not : 'Это место мы ещё не успели изучить',
    noname: 'Без названия',
    'adm_div.place': 'Место',
    'adm_div.division': 'Округ',
    'adm_div.settlement': 'Населенный пункт',
    street: 'Улица',
    'adm_div.district': 'Район',
    'adm_div.city': 'Город',
    go_to: 'Проехать сюда',
    show_organization_in_building: ['Всего {n} организация', 'Всего {n} организации', 'Всего {n} организаций'],
    show_more_about_sight: 'Подробнее',
    back_button: 'Назад',
    n_floors: ['{n} этаж', '{n} этажа', '{n} этажей']
}, DG.Dictionary.ru);

DG.Geoclicker.Handler.Default.Dictionary.en = DG.extend({
    apiErrorTitle: 'Oops! Error detected.',
    apiErrorBody: 'Our servers are not responding. We are doing our best to straighten them out. Please return to us in a few minutes.',
    we_have_not: 'We haven\'t collected info about this place yet',
    noname : 'No name',
    'adm_div.place' : 'Place',
    'adm_div.division' : 'Area',
    'adm_div.settlement' : 'Village',
    street : 'Street',
    'adm_div.district' : 'District',
    'adm_div.city' : 'City',
    go_to : 'Directions to here',
    show_organization_in_building : ['{n} organization total', '{n} organizations total'],
    back_button : 'Back',
    show_more_about_sight : 'More information',
    n_floors : ['{n} floor', '{n} floors']
}, DG.Dictionary.en);

DG.Geoclicker.Handler.Default.Dictionary.cs = DG.extend({
    apiErrorTitle: 'Chybička se&nbsp;vloudila',
    apiErrorBody: 'Naše servery odmítají reagovat. Již nyní vynakládáme veškeré úsilí, abychom je přivedli k rozumu. Zkuste akci opakovat za několik minut.',
    we_have_not : 'O tomto místě zatím nemáme informace',
    noname : 'Bez názvu',
    'adm_div.place' : 'Místo',
    'adm_div.division' : 'Správní obvod',
    'adm_div.settlement' : 'Obec',
    street : 'Ulice',
    'adm_div.district' : 'Městská část',
    'adm_div.city' : 'Město',
    go_to : 'Cesta sem',
    show_organization_in_building : ['Celkem {n} organizace', 'Celkem {n} organizace', 'Celkem {n} organizací'],
    back_button : 'Zpět',
    show_more_about_sight : 'Více',
    n_floors : ['{n} patro', '{n} patra', '{n} pater']
}, DG.Dictionary.cs);

DG.Geoclicker.Handler.Default.Dictionary.es = DG.extend({
    apiErrorTitle: 'Vaya, ha ocurrido un error',
    apiErrorBody: 'Nuestros servidores se niegan a responder. Ya nos estamos esforzando por hacerlos entrar en razón. Vuelva con nosotros pasados unos minutos.',
    we_have_not : 'Todavía no hemos recopilado la información sobre este lugar',
    noname : 'Sin nombre',
    'adm_div.place' : 'Lugar',
    'adm_div.division' : 'Comuna',
    'adm_div.settlement' : 'Población',
    street : 'Calle',
    'adm_div.district' : 'Comuna',
    'adm_div.city' : 'Ciudad',
    go_to : 'Ir para allá',
    show_organization_in_building : ['Total {n} organización', 'Total {n} organizaciones', 'Total {n} organizaciones'],
    show_more_about_sight : 'Read more',
    back_button: 'Atrás',
    n_floors : ['{n} piso', '{n} pisos']
}, DG.Dictionary.es);

var FirmCard = function (firm, options) {
    this._setOptions(options);
    this._firmContentObject = {};
    this._schedule = new FirmCard.Schedule({
        localLang: this.options.lang,
        dict: this.dict
    });

    this.render(firm);
};

FirmCard.prototype = {

    render: function (firmId) {
        if (!firmId) { return; }

        if (firmId !== this._firmId) {
            this._firmContentObject = {};
            this._renderCardById(firmId);
        } else {
            this._toggleEventHandlers();
        }

        return this._firmContentObject;
    },

    getSchedule: function () {
        return this._schedule;
    },

    getContainer: function () {
        return this._container;
    },

    _renderCardById: function (firmId) {
        var self = this;

        this.options.ajax(firmId).then(function (res) {
            if (!res) { return false; }
            var data = res.result.items;
            if (data !== 'undefined') {
                self._firmData = data[0];

                // Support for old WebAPI format.
                // TODO: remove this call after WebAPI release
                self._convertWebsite();

                self._firmId = firmId;
                self._renderFirmCard();
                self._toggleEventHandlers();
            }
        }, function (error) {
            self._renderError();
        });
    },

    _createFirmContainer: function () {
        var firm = document.createElement('div');
        firm.setAttribute('id', 'dg-map-firm-full-' + this._firmId);
        firm.setAttribute('class', 'dg-map-firm-full');

        return firm;
    },

    _getPaymentTypes: function (data) {
        var result = [],
            groupName = 'general_payment_type';

        if (!data.attribute_groups) {
            return result;
        }

        data.attribute_groups.forEach(function (group) {
            if (group.name) {
                return;
            }

            group.attributes.forEach(function (attr) {
                if (attr.tag.substring(0, groupName.length) === groupName) {
                    result.push(attr.name);
                }
            });
        });

        return result;
    },

    _groupRubrics: function (data) {
        var result = {
            primary: [],
            additional: []
        };

        if (!data.rubrics || !data.rubrics.length) {
            return result;
        }

        data.rubrics.forEach(function (rubric) {
            result[rubric.kind].push(rubric);
        });

        return result;
    },

    // Support for old WebAPI format.
    // TODO: remove this function after WebAPI release
    _convertWebsite: function () {
        if (!this._firmData.contact_groups) {
            return;
        }

        this._firmData.contact_groups.forEach(function (group) {
            if (!group.contacts) {
                return;
            }

            group.contacts.forEach(function (contact) {
                if (contact.type != 'website') {
                    return;
                }

                if (!contact.url) {
                    contact.url = contact.value;
                }
            });
        });
    },

    _renderFirmCard: function () {
        var firmCardBody, schedule, forecast, links, btns, paymentTypes, rubrics,
            data = this._firmData,
            container = this._container = this._createFirmContainer();

        schedule = this._schedule.transform(data.schedule, {
            zoneOffset: this.options.timezoneOffset,
            apiLang: this.options.lang,
            localLang: this.options.lang
        });

        forecast = this._schedule.forecast(schedule);

        paymentTypes = this._getPaymentTypes(data);
        rubrics = this._groupRubrics(data);

        firmCardBody = this._buildFirmCardBody(
            this._getConfigFirmCardBody(data, schedule, forecast, paymentTypes, rubrics)
        );

        links = this._fillHeaderLinks();
        btns = this._fillFooterButtons();

        //fill object for view render
        this._firmContentObject.header = this.options.render('firmCardHeader', {'firmName': data.name, 'links': links});
        container.innerHTML = firmCardBody;
        this._firmContentObject.tmpl = container;
        if (btns.length) {
            this._footerContainer = document.createElement('div');

            this._footerContainer.innerHTML = this.options.render('popupFooterBtns', {'btns': btns});
            this._firmContentObject.footer = this._footerContainer;
        }

        if (this.options.onFirmReady) {
            this.options.onFirmReady(this._firmContentObject);
        }
    },

    _renderError: function() {
        this._firmContentObject.header = this.options.render('popupHeader', {
            title: this.options.t('apiErrorTitle')
        });

        this._firmContentObject.tmpl = this.options.t('apiErrorBody');

        if (this.options.onFirmReady) {
            this.options.onFirmReady(this._firmContentObject);
        }
    },

    _getConfigFirmCardBody: function (data, schedule, forecast, attributes, rubrics) {
        return [
            {
                tmpl: 'firmCardAddr',
                data: {
                    address: data.address_name,
                    comment: data.address_comment
                }
            },
            {
                tmpl: 'firmCardContacts',
                data: {
                    groups: data.contact_groups
                }
            },
            {
                tmpl: 'firmCardSchedule',
                data: {
                    schedule: schedule,
                    forecast: forecast
                }
            },
            {
                tmpl: 'frimCardPayments',
                data: {
                    payments: attributes
                }
            },
            {
                tmpl: 'firmCardRubric',
                data: {
                    rubrics: rubrics
                }
            }
        ];
    },

    _buildFirmCardBody: function (parts) {
        var self = this;
        return parts.reduce(function (body, item) {
            var html = self.options.render(item.tmpl, item.data);
            return body + html;
        }, '');
    },

    _fillFooterButtons: function () {
        var btns = [];

        if (this.options.backBtn) {
            btns.push({ name: 'firm-card-back',
                        label: this.dict.t(this.options.lang, 'btnBack'),
                        icon: true
            });
        }

        if (this.options.showRouteSearch) {
            btns.push({ name: 'goto',
                        label: this.dict.t(this.options.lang, 'btnFindWay'),
                        icon: true,
                        href: this.options.gotoUrl
            });
        }

        if (
            this._firmData.links &&
                this._firmData.links.entrances &&
                this.options.showEntrance
        ) {
            btns.push({ name: 'show-entrance',
                        label: this.dict.t(this.options.lang, 'btnEntrance'),
                        icon: true
            });
        }

        return btns;
    },

    _fillHeaderLinks: function () {
        var links = [],
            reviewData = this._firmData.reviews,
            booklet,
            link;

        if (this._firmData.external_content) {
            this._firmData.external_content.forEach(function (el) {
                if (el && el.type == 'booklet') {
                    booklet = el;
                }
            });
        }

        if (reviewData && reviewData.is_reviewable) {
            links.push({
                name: 'flamp_stars',
                width: reviewData.rating * 20
            });
            links.push({
                name: 'flamp_reviews',
                label: this.dict.t(this.options.lang, 'linkReviews', reviewData.review_count ? reviewData.review_count : 0),
                href: FirmCard.DataHelper.getFlampUrl(this._firmId)
            });
        }

        // Retrieve photo data from external content block
        var photos;
        var externalContent = this._firmData.external_content;

        for (var i = 0; i < externalContent.length; i++) {
            if (
                externalContent[i].type == 'photo_album' &&
                externalContent[i].subtype == 'common'
            ) {
                photos = externalContent[i];
                break;
            }
        }

        if (!this.options.isMobile && photos && photos.count && this.options.showPhotos) {
            link = L.Util.template('http://2gis.{domain}/photos/{id}', {
                'id': this._firmId,
                'domain': this.options.domain
            });

            links.push({name: 'photos',
                href: link,
                label: this.dict.t(this.options.lang, 'linkPhoto', photos.count)
            });
        }

        if (!this.options.isMobile && booklet && booklet.url && this.options.showBooklet) {
            links.push({
                name: 'booklet',
                href:  booklet.url,
                label: this.dict.t(this.options.lang, 'linkBooklet')
            });
        }


        return links;
    },

    _events: {
        'dg-popup__button_name_firm-card-back': function() {
            this.options.backBtn();
            this._toggleEventHandlers(true);
        },
        'dg-popup__button_name_show-entrance': function() {
            var ent = new this.options.showEntrance({'vectors': this._firmData.links.entrances[0].geometry.vectors});
            ent.addTo(this.options.map).show();
            this._toggleEventHandlers(true);
        },
        'dg-schedule__today': function(target) {
            this._onToggleSchedule(target);
        }
    },

    _toggleEventHandlers: function (flag) {
        this.options.popup[flag ? 'off' : 'on']('click', this._onClick, this);
        this.options.map[flag ? 'off' : 'on']('popupclose', this._onClose, this);
    },

    _onClick: function (e) {
        var target = e.originalEvent.target;

        for (var eventClass in this._events) {
            if (this._events.hasOwnProperty(eventClass) && target.className.indexOf(eventClass) > -1) {
                DG.DomEvent.preventDefault(e.originalEvent);
                this._events[eventClass].call(this, target);
                return;
            }
        }
    },

    _onClose: function (e) {
        this._toggleEventHandlers(true);
    },

    _onToggleSchedule: function (target) {
        var schedule = this._container.querySelector('.dg-schedule__table'),
            forecast = this._container.querySelector('.dg-schedule__now'),
            showClass = ' dg-schedule__today_shown_true';

        if (!schedule) { return; }

        if (schedule.style.display === 'block') {
            schedule.style.display = 'none';
            forecast.style.display = 'block';
            target.className = target.className.replace(showClass, '');
        } else {
            forecast.style.display = 'none';
            schedule.style.display = 'block';
            target.className += showClass;
        }

        if (this.options.onToggle) {
            this.options.onToggle();
        }
    },

    _setOptions: function (options) {
        var option,
            options = options || {};

        this.options = options;
        options.lang = options.lang || 'ru';

        for (option in options) {
            if (options.hasOwnProperty(option)) {
                this.options[option] = options[option];
            }
        }
    },

    _hasTouch: function () {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    }
};

FirmCard.DataHelper = {

	FLAMP_URL : 'http://flamp.ru/r/',
	FLAMP_GOOGLE_ANALYTICS : 'utm_source=api2gis&utm_medium=api&utm_campaign=geoclicker',

	payMethods : [
		'americanexpress',
		'cash',
		'dinersclub',
		'goldcrown',
		'internet',
		'mastercard',
		'noncash',
		'visa'
	],

	_msgs : {},

	getFlampUrl : function (id) {
	    return this.FLAMP_URL.concat(id, '?', this.FLAMP_GOOGLE_ANALYTICS);
	},

	msg : function (msg) {
		if (this._msgs.hasOwnProperty(msg)) {
			return this._msgs[msg];
		}
		console && console.log("Cant't find translation for '" + msg + "'.");
		return msg.toString().replace('_', ' ');
	},

	getProjectTime: function (timezoneOffset, time) {
        var now, utc;

        if (time) {
            now = new Date(time);
        } else {
            now = new Date();
        }

        if (timezoneOffset) {
            utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            return new Date(utc + (60000 * timezoneOffset));
        } else {
            return now;
        }
    }
};

/* global
    FirmCard: false
*/
(function () {
    FirmCard.List = function (firms, options) {
        this._firms = {}; // {'firmID': firmDomObj}
        this._setOptions(options);

        this._container = options && options.container || document.createElement('ul');
        this._container.setAttribute('class', 'dg-building-callout__list');

        this._eventHandlersInited = false;
        this._firmCard = this._createFirm();
        this.renderList(firms);
    };

    FirmCard.List.prototype = {

        renderList: function (firms) {
            if (firms) {
                this._toggleEventHandlers();
                this.addFirms(firms);
            }
            if (this.options.onListReady) {
                this.options.onListReady(this._container);
            }

            return this._container;
        },

        _processFirms: function (firms, action) {
            if (!firms) { return; }
            var method = '_' + action + 'Firm';
            if (this._isArray(firms)) {
                for (var i = 0, l = firms.length; i < l; i++) {
                    this[method](firms[i]);
                }
            } else {
                this[method](firms);
            }

        },

        addFirms: function(firms) {
            this._processFirms(firms, 'add');
        },

        removeFirms: function(firms) {
            this._processFirms(firms, 'remove');
        },

        setLang: function (newLang) {
            this.options.firmCard.lang = newLang;
        },

        getLang: function () {
            return this.options.firmCard.lang;
        },

        getContainer: function () {
            return this._container;
        },

        clearList : function () {
            this._firms = {};
            this._toggleEventHandlers(true);
            this._clearContainer();
        },

        _removeFirm: function (id) {
            if (!this._firms[id]) { return false; }
            this._container.removeChild(this._firms[id]);
            delete this._firms[id];
        },

        _addFirm: function (firmData) {
            var tmpl = this.options.firmlistItemTmpl,
                domFirm, firm, content;

            firm = {
                name: firmData.name,
                id: firmData.id.split('_').slice(0, 1)
            };

            if (!(firm.id in this._firms)) {

                domFirm = this._createListItem();

                content = tmpl ? this.options.firmCard.render(tmpl, {'firm': firm}) : firm.name;

                domFirm.insertAdjacentHTML('beforeend', content);

                this._firms[firm.id] = domFirm;
                this._container.appendChild(domFirm);
            }
        },

        _createListItem: function () {
            var item = document.createElement('li');
            item.setAttribute('class', 'dg-building-callout__list-item');

            return item;
        },

        _isArray: function (obj) {
            return {}.toString.call(obj) === '[object Array]';
        },

        _createFirm: function (firmData) {
            return new FirmCard(firmData, this.options.firmCard);
        },

        _isEmptyObj: function (obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    return false;
                }
            }

            return true;
        },

        _events: {
            'dg-popup__link': function(target) {
                var s = this._firmCard.render(target.id);

                this.options.firmCard[this._isEmptyObj(s) ? 'pasteLoader' : 'onFirmReady'](s);

                this.options.firmCard.onFirmClick && this.options.firmCard.onFirmClick();

                this._toggleEventHandlers(true);
            },
            'dg-building-callout__list-item': function(target) {
                target = target.children[0];

                this._events['dg-popup__link'].call(this, target);
            },
            'dg-popup__button_name_back': function() {
                this.options.firmCard.onShowLess();

                this._toggleEventHandlers(true);
            }
        },

        _toggleEventHandlers : function (flag) {
            this.options.firmCard.popup[flag ? 'off' : 'on']('click', this._onClick, this);
        },

        _onClick: function (e) {
            var target = e.originalEvent.target;

            for (var eventClass in this._events) {
                if (this._events.hasOwnProperty(eventClass) && target.className.indexOf(eventClass) > -1) {
                    DG.DomEvent.preventDefault(e.originalEvent);
                    this._events[eventClass].call(this, target);
                    return;
                }
            }
        },

        _clearContainer: function () {
            var container = this._container;

            while (container.hasChildNodes()) {
                container.removeChild(container.firstChild);
            }
        },

        _setOptions: function (options) {
            options || (options = {});
            this.options = options;
            this.options.firmCard || (this.options.firmCard = {});

            if (!options.firmCard.lang) {
                this.options.firmCard.lang = 'ru';
            }

            for (var option in options) {
                if (options.hasOwnProperty(option)) {
                    this.options[option] = options[option];
                }
            }
        }
    };
})();

/*global
    FirmCard:false
*/
FirmCard.Schedule = function (options) {
    options = options || {};

    this.localLang = options.localLang || 'ru';
    this.dict = options.dict;
    return this;
};

FirmCard.Schedule.prototype = {

    setLang: function (lang) {
        this.localLang = lang || 'ru';
        return this;
    },

    transform: function (model, params) {
        if (!model) {
            return;
        }
        params = params || {};

        function bind(fn, obj) { // (Function, Object) -> Function
            var args = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : null;
            return function () {
                return fn.apply(obj, args || arguments);
            };
        }

        var todayKey, // Mon, Tue ...
            today, // Объект модели - текущий день недели
            from, // Самое раннее время открытия за день
            to, // Самое позднее время закрытия за день
            zoneOffset = params.zoneOffset || 0,
            schedule = {}, // Объект-расписание, формируемый под шаблон
            now = params.now || FirmCard.DataHelper.getProjectTime(zoneOffset).getTime(), // Current timestamp in milliseconds
            weekKeys = [], // Ключи дней недели, определяют порядок дней и первый день недели. 0 - первый день недели в регионе (не обязательно Mon)
            weekKeysLocal = [],
            weekFullKeysLocal = [],
            weekKeysShort =  [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ],
            weekKeysFull = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
            localLang = params.localLang || this.localLang,
            localWorkingDays = params.localWorkingDays || [0, 1, 1, 1, 1, 1, 0],
            firstdayOffset = params.firstdayOffset || 1,
            minHoursToDisplayClosure = params.minHoursToDisplayClosure || 4,
            t = bind(this.dict.t, this.dict);


        function capitaliseFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        function getHours(str) {
            return str.substr(0, 2);
        }

        function getMinutes(str) {
            return str.substr(3, 2);
        }

        // Конвертация временной точки формата апи в формат отображения (25:00 -> 01:00)
        function formatTime(str) {
            var hours = +getHours(str) % 24 + '';

            if (hours.length === 1) {
                hours = '0' + hours;
            }

            return hours + ':' + getMinutes(str);
        }

        // Конвертация int числа в номер дня недели (диапазон 0-6)
        function dayNum(n) {
            return n % 7;
        }


        /* jshint ignore:start */
        // Возвращает последний элемент массива
        // Взято из Underscore.js http://underscorejs.org/#last
        function getArrayLast(arr, n) {
            if ( arr == null ) return void 0;
            if (   n == null ) return arr[ arr.length - 1 ];
            return slice.call( arr, Math.max(arr.length - n , 0) );
        }


        // Выполняет глубокое сравнение объектов
        // Взято из Underscore.js http://underscorejs.org/#isEqual
        // Упрощено для тех трёх сравнений, которые выполняются в Shedule.js
        function isEqual(obj1, obj2) {
            if ( obj1 === obj2 ) return true;
            if ( ! ( obj1 instanceof Object ) || ! ( obj2 instanceof Object ) ) return false;
            if ( obj1.constructor !== obj2.constructor ) return false;
            for ( var prop in obj1 ) {
                if ( ! obj1.hasOwnProperty( prop ) ) continue;
                if ( ! obj2.hasOwnProperty( prop ) ) return false;
                if ( obj1[ prop ] === obj2[ prop ] ) continue;
                if ( typeof( obj1[ prop ] ) !== "object" ) return false;
                if ( ! isEqual( obj1[ prop ],  obj2[ prop ] ) ) return false;
            }
            for ( prop in obj2 ) {
            if ( obj2.hasOwnProperty( prop ) && ! obj1.hasOwnProperty( prop ) ) return false;
            }

            return true;
        }

        // Generate an integer Array containing an arithmetic progression. A port of
        // the native Python `range()` function. See
        // [the Python documentation](http://docs.python.org/library/functions.html#range).
        function range(start, stop, step) {
        if (arguments.length <= 1) {
            stop = start || 0;
            start = 0;
        }
        step = arguments[2] || 1;

        var length = Math.max(Math.ceil((stop - start) / step), 0);
        var idx = 0;
        var range = new Array(length);
        while(idx < length) {
            range[idx++] = start;
            start += step;
        }

        return range;
        }


        //Заполняет свойства объекта значениями по умолчанию
        //Взято из Underscore.js http://underscorejs.org/#defaults
        function fillDefaults(obj) {
         var args = Array.prototype.slice.call(arguments, 1);
         args.forEach(function(source) {
            if (source) {
                for (var prop in source) {
                    if (obj[prop] === void 0) obj[prop] = source[prop];
                }
            }
        });
        return obj;
        }

        //Сортирует значения согласно с итератором
        //Взято с Underscore.js http://underscorejs.org/#sortBy
        function sortBy(obj, iterator){
            return pluck(obj.map( function(value, index, list) {
                return {
                        value: value,
                        index: index,
                        criteria: iterator.call(this, value, index, list)
                        };
                }).sort(function(left, right) {
                        var a = left.criteria;
                        var b = right.criteria;
                        if (a !== b) {
                        if (a > b || a === void 0) return 1;
                        if (a < b || b === void 0) return -1;
                        }
                return left.index - right.index;
                }), 'value');
        }

        /* jshint ignore:end */

        function pluck(arr, key){
            var i, rv = [];
            for (i = 0; i < arr.length; ++i) {
            rv[i] = arr[i][key];
            }
            return rv;
        }


        // Преобразовать расписание на день в упорядоченный массив временных отсечек (string)
        // Сейчас полагается, что API уже выдаёт сортированный массив
        function getSortedTimePoints(day) {
            var points = [],
                from, to,
                deltaHours, deltaMinutes;

            if (!day || !day.working_hours) {
                return [];
            }

            for (var i = 0 ; i < day.working_hours.length ; i++) {
                from = day.working_hours[i].from;
                to = day.working_hours[i].to;

                deltaHours = getHours(to) - getHours(from);
                deltaMinutes = getMinutes(to) - getMinutes(from);
                if (deltaHours < 0 || (deltaHours === 0 && deltaMinutes <= 0)) { // Если "до" меньше или равно "от" - значит указывает на завтра
                    to = (+getHours(to) + 24) + ':' + getMinutes(to); // (01:00 -> 25:00)
                }

                points[i * 2] = {
                    time: from,
                    type: 'open'
                };
                points[i * 2 + 1] = {
                    time: to,
                    type: day.working_hours.length - 1 === i ? 'close' : 'lunch'
                };
            }

            return points;
        }

        // Возвращает массив timestamp всех точек, всех дней недели, от сегодняшнего и в будущее
        // Например, сегодня среда, отсечки будут взяты для дат со среды (сегодня) по следующий вторник включительно
        function getTimeStamps(model) {
            var timestamps = [],
                out = [],
                timePoints,
                num = weekKeys.indexOf(todayKey); // Номер сегодняшнего дня недели (для данного региона)


            // Цикл по дням недели начиная с сегодняшнего
            var j; // Номер текущего дня в массиве weekKeys
            for (var i = 0 ; i < 7 ; i++) {
                j = dayNum(num + i);
                timePoints = getSortedTimePoints(model[weekKeys[j]]);
                // Цикл по точкам времени с конвертацией в timestamp
                timePoints.forEach(
                    /* jshint -W083 */
                    function (point) {
                    // now - обязательно! иначе будет браться текущий timestamp что чревато несовпадениями при медленном быстродействии
                    // Вычислить таймстемп для данного дня недели, часа и минуты, в будущем, но ближайший к now
                    var tsp = new Date(now);
                    tsp.setDate(tsp.getDate()+i);
                    tsp.setHours(getHours(point.time));
                    tsp.setMinutes(getMinutes(point.time));
                    var ts = tsp.getTime();



                    timestamps.push({
                        ts: ts,
                        type: point.type
                    });

                    if (timestamps[timestamps.length - 1] && timestamps[timestamps.length - 2]) {
                        // Парно удаляем совпадающие точки (они не имеют смысла - это сегодня 24:00 и завтра 00:00)
                        if (timestamps[timestamps.length - 1].ts === timestamps[timestamps.length - 2].ts) {
                            timestamps.pop();
                            timestamps.pop();
                        }
                    }

                    if (timestamps[timestamps.length - 1] && timestamps[timestamps.length - 2]) {
                        // Парно переносим точки в будущее, если они обе в прошлом (первая точка ([0]) должна быть всегда открытием!)
                        if (timestamps[timestamps.length - 1].ts <= now && timestamps[timestamps.length - 2].ts <= now) {
                            timestamps[timestamps.length - 1].ts += (7 * 24 * 60 * 60 * 1000);
                            timestamps[timestamps.length - 2].ts += (7 * 24 * 60 * 60 * 1000);
                        }
                    }
                }
                /* jshint +W083 */
                );
            }

            // Сортируем на возрастание, ведь возможно были переносы в будущее
            timestamps = sortBy(timestamps, function (timestamp) { return timestamp.ts; });

            // Удаляем попарно совпадающие точки времени
            i = 0;
            while (i < timestamps.length) {
                if (timestamps[i + 1] && timestamps[i].ts === timestamps[i + 1].ts) {
                    i++;
                } else {
                    out.push(timestamps[i].ts);
                }
                i++;
            }

            // Проверка на ежедневно-круглосуточность
            if (out.length === 2 && (out[1] - out[0]) === (7 * 24 * 60 * 60 * 1000)) {
                return [];
            }

            return timestamps;
        }

        function whenOpenInverse(h, d, num) {
            if (d === 1 && h > minHoursToDisplayClosure ) {
                return t(localLang, 'tommorow');
            } else if (d > 1) {
                /* jshint -W015 */
                switch (num) {
                    case 0: return t(localLang, 'nextSun');
                    case 1: return t(localLang, 'nextMon');
                    case 2: return t(localLang, 'nextTue');
                    case 3: return t(localLang, 'nextWed');
                    case 4: return t(localLang, 'nextThu');
                    case 5: return t(localLang, 'nextFri');
                    case 6: return t(localLang, 'nextSat');
                }
                /* jshint +W015 */
            }

            return;
        }


        //Возвращает интервал в целых днях, с поправкой на смену дня в полночь, между
        //@param timestampEnd и @param dateStart
        function dayInterval(timestampEnd, dateStart) {

            var oneDay = 1000 * 60 * 60 * 24,
                dateEnd = new Date(timestampEnd.ts);

            var diff;

            diff = Math.round((dateEnd - dateStart) / oneDay);

            if( timestampEnd.type==='open' && dateEnd.getHours() < 1 )
                { diff ++; }

            return diff;
        }


        // Поместить данные в объект для шаблона о сегодняшнем дне
        function setTodayString(today) {

            var timePoints,
                periods = [],
                timestamps;

            schedule.now = {};

            // Timestamps всех отсечек
            timestamps = getTimeStamps(model);

            if (!timestamps.length) {
                schedule.always = true; // Работает ежедневно круглосуточно
                schedule.now.open = true;
            }


            for (var i = 0 ; i < timestamps.length ; i++) {
                // Попали между точками i-1 и i // Мы находимся заведомо в будущем относительно 1
                if (now >= (timestamps[i - 1] && timestamps[i - 1].ts || 0) && now < timestamps[i].ts) {
                    var h = Math.floor((timestamps[i].ts - now) / (1000 * 60 * 60)), // Количество часов до следующего timestamp
                        m = Math.floor((timestamps[i].ts - now) / (1000 * 60) - h * 60), // Количество минут (без часов) до следующего timestamp
                        dayNow = new Date(now),

                        // открыто если следующая итерация не открытие
                        nowIsOpen = timestamps[i].type !== 'open';

                        //var d = dayOfYear(dayTs) - dayOfYear(dayNow);
                        //var d = dayInterval(dayTs, dayNow, nowIsOpen);
                        var d = dayInterval(timestamps[i], dayNow);



                    // округляем минуты до кратных 5
                    m = Math.floor(m / 10) * 10 ? Math.floor(m / 10) * 10 : 5;

                    schedule.now.open = nowIsOpen;
                    schedule.now.lunch = !!(timestamps[i - 1] && timestamps[i - 1].type === 'lunch' || getArrayLast(timestamps).type === 'lunch');

                    schedule.will = {
                        willType: timestamps[i].type,
                        d: d,
                        h: h,
                        m: m
                    };

                    // Когда закроется или откроется
                    var willWhen = new Date(timestamps[i].ts);
                    schedule.will.when = whenOpenInverse(h, d, willWhen.getDay());


                    var willTill = new Date(timestamps[i].ts),
                        strHours = willTill.getHours(),
                        strMinutes = willTill.getMinutes();

                    if (strHours < 10) { strHours = '0' + strHours; }
                    if (strMinutes < 10) { strMinutes = '0' + strMinutes; }

                    schedule.will.till = strHours+':'+strMinutes;
                }
            }

            if (!today) {
                return; // На сегодня расписания нет - сейчас закрыто
            }

            timePoints = pluck(getSortedTimePoints(today), 'time');

            // Цикл по периодам работы за день
            for (i = 2 ; i < timePoints.length ; i = i + 2) {
                periods.push({ from: timePoints[i - 1], to: timePoints[i] });
            }

            from = formatTime(timePoints[0]);
            to = formatTime(timePoints[timePoints.length - 1]);

            if (from === to) { // Круглосуточно
                schedule.today = {
                    alltime: true,
                    alltimeStr: t(localLang, 'worksAroundTheClock'),
                    from: '00:00',
                    to: '24:00'
                };
            } else { // От from до to
                schedule.today = {
                    from: from,
                    to: to
                };
            }

            if (periods.length > 0) { // Перерывы на обед
                schedule.lunch = periods;
                schedule.lunchStr = t(localLang, 'lunch');
            }
        }

        // Формирование объекта-таблицы-расписания для шаблона
        function makeTable() {
            var column = [],
                hasLunch = false;

            for (var j = 0 ; j < 7 ; j++) {
                var dayKey = weekKeys[j],
                    lunchMaxLength = 0;

                column[j] = {};

                if (model[dayKey]) {
                    var day = model[dayKey],
                        timePoints = pluck(getSortedTimePoints(day), 'time'),
                        lunch = []; // Отрезки времени (отсортированные моменты) на обеды

                    // Цикл по периодам работы за день
                    for (var i = 2 ; i < timePoints.length ; i = i + 2) {
                        hasLunch = true;
                        lunch.push({ from: timePoints[i - 1], to: timePoints[i] });
                    }
                    lunchMaxLength = Math.max(timePoints.length / 2, lunchMaxLength);

                    column[j] = {
                        from: formatTime(timePoints[0]),
                        to: formatTime(timePoints[timePoints.length - 1]),
                        lunch: lunch
                    };
                }

                if (dayKey === todayKey) { // Сегодняшний день надо подсветить
                    column[j].active = true;
                }

                column[j].key = weekKeysLocal[j];
            }

            // Дополнение пустыми объектами массивов lunch
            column.forEach( function (col) {
                if (col.lunch) {
                    fillDefaults(col.lunch, range(1, lunchMaxLength));
                }
            });

            return {
                table: column,
                hasLunch: hasLunch
            };
        }

        // Сгенерировать строку для всех дней model, совпадающих с day
        function makeSimpleString(day, model) {
            var points,
                out = {
                    dayList: [],
                    lunch: []
                },
                lunchesTime = [];

            if (day && day.working_hours && day.working_hours.length) {
                points = pluck(getSortedTimePoints(day), 'time');
                points.forEach( function (point, key) {
                    if (key === 0) {
                        out.from = formatTime(point);
                    } else if (key === points.length - 1) {
                        out.to = formatTime(point);
                    } else {
                        lunchesTime.push(formatTime(point));
                    }
                });
                for (var i = 0; i < lunchesTime.length; i += 2) {
                    out.lunch.push({
                        from: lunchesTime[i],
                        to: lunchesTime[i + 1],
                        lunchStr: capitaliseFirstLetter(t(localLang, 'lunch'))
                    });
                }

                if (out.from == '00:00' && out.to == '00:00') {
                    out.to = '24:00';
                }

                if (day.round_the_clock) {
                    out.alltime = true;
                    out.alltimeStr = t(localLang, 'worksAroundTheClock');
                }
            } else { // Выходной
                out.holiday = true;
            }

            // Формируем список дней на локальном языке
            var groupWorkingDays = [0, 0, 0, 0, 0, 0, 0]; // Флаги работы фирмы в дни текущей группы
            var flow = 0;

            weekKeys.forEach( function (dayKey, numKey) { // 'Mon', 0
                if (isEqual(model[dayKey], day) || (!model[dayKey] && day === null)) {
                    out.dayList.push(weekFullKeysLocal[numKey]);
                    groupWorkingDays[dayNum(numKey + firstdayOffset)] = 1;
                    flow++;
                } else {
                    if (flow > 2) { // Более 2 дней подряд
                        var lastDay = out.dayList.pop();

                        for (var i = 1 ; i < flow - 1 ; i++) {
                            out.dayList.pop();
                        }

                        out.dayList[out.dayList.length - 1] += ' — ' + lastDay;
                    }

                    flow = 0;
                }
            });

            // Список дней в данной группе идентичен списку будних дней, значит можно заменить словом "Будни"
            out.budni = isEqual(localWorkingDays, groupWorkingDays);
            // Список рабочих дней - все дни недели, значит нужно выводить фразу "Ежедневно"
            out.everyday = ( Math.min.apply(Math, groupWorkingDays) === 1 );

            if ( out.holiday ) { out.holidayStr = t(localLang, 'restDay', out.dayList.length).slice(2); }

            // Делаем из массива строку и поднимаем первый символ
            out.dayList = out.dayList.join(', ');
            out.dayList = out.dayList.charAt(0).toUpperCase() + out.dayList.slice(1);


            return out;
        }

        // Возвращает массив simple строк на основе массива дней days
        function makeAdvancedString(days, model) {
            var out = [];

            for (var i = days.length - 1 ; i >= 0 ; i--) {
                out.push(makeSimpleString(days[i], model));
            }

            return out;
        }

        // Заполняем названия дней недели, 1 - понедельник. В заполненных массивах понедельник это 0

        for (var i = 0 ; i < 7 ; i++) {
            weekKeys[i] = weekKeysShort[i];
            weekKeysLocal[i] = this.dict.t(localLang, weekKeysShort[i].toLowerCase());
            weekFullKeysLocal[i] = this.dict.t(localLang, weekKeysFull[i]);
        }

        // Вычисляем сегодняшний день недели (ссылку на объект дня в модели)
        todayKey = weekKeysShort[(new Date(now).getDay()-firstdayOffset) % 7];
        today = model[todayKey]; // Объект расписания - текущий день недели
        setTodayString(today); // Сделать объект для шаблона - строка, которая описывает время работы сегодня

        // Находим количество разных расписаний и сохраняем их в массив
        var apiDifferentDays = [], // Массив различающихся дней из модели
            apiScheduleDaysCount = 0, // Количество описанных дней в расписании модели
            apiDifferentDaysCount = 0, // Количество разных дней в расписании модели
            differentWorkingHoursCount = []; // Количество рабочих часов в разных днях

        Object.keys(model).forEach( function(day) {
            if (model[day] && model[day].working_hours) { // Проверяем что это день, а не комментарий или что-то ещё
                apiScheduleDaysCount++;
                if (!isEqual(model[day], getArrayLast(apiDifferentDays))) {
                    apiDifferentDays.push(model[day]);
                }
            }
        });

        apiDifferentDaysCount = apiDifferentDays.length;
        // Если не все дни описаны в модели, значит есть ещё один тип дней - выходной (отсутствущий в модели)
        if (apiScheduleDaysCount < 7) {
            apiDifferentDaysCount++;
        }

        // Если разных более 2, то упростить не получится - делаем таблицу
        if (apiDifferentDaysCount > 2) {
            schedule.week = makeTable(model);
        } else { // Иначе, составляем комментарий из двух строк

            // Случай, когда все одинаковые
            if (apiDifferentDaysCount === 1) {
                schedule.week = {
                    evently: [makeSimpleString(model[weekKeys[0]], model)]
                };
            } else { // Остаётся случай, когда есть два типа дней
                // Определяем день с наибольшим количеством рабочих часов из числа разных дней
                for (i = 0 ; i < apiDifferentDaysCount ; i++) {
                    differentWorkingHoursCount[i] = 0;

                    if (apiDifferentDays[i]) {
                        var points = pluck(getSortedTimePoints(apiDifferentDays[i]), 'time');

                        for (var j = 0 ; j < points.length ; j = j + 2) {
                            var hours = (getHours(points[j + 1]) + getMinutes(points[j + 1]) / 60) - (getHours(points[j]) + getMinutes(points[j]) / 60);
                            differentWorkingHoursCount[i] += hours;
                        }
                    } else { // Выходной
                        apiDifferentDays[i] = null;
                    }
                }

                var apiSortedDifferentDays = sortBy(apiDifferentDays, function (day, key) {
                    return differentWorkingHoursCount[key];
                });

                schedule.week = {
                    evently: makeAdvancedString(apiSortedDifferentDays, model)
                };
            }
        }

        schedule.comment = model.comment;
        if (schedule.week && schedule.week.evently && schedule.week.evently.length === 1) {
            schedule.everyday = schedule.week.evently[0].everyday;
        }
        return schedule;
    },

    forecast: function (schedule, params) {
        var interval = '',
        open,
        today = {},
        nowText,
        maxHours = params && params.maxHours || 1;

        if (!schedule) {
            return {};
        }

        if (schedule.always) { // Круглосуточно ежедневно - более ничего выводить не нужно
            return {
                today: {
                    text: this.dict.t(this.localLang, 'aroundTheClock')
                },
                open: true
            };
        }

        // Формируем строку - через сколько произойдёт следующая инверсия открытости
        if (schedule.will && schedule.will.h < maxHours) {
            if (schedule.will.h) {
                interval += this.dict.t(this.localLang, 'nHours', schedule.will.h) + ' ';
            }

            if (schedule.will.m) {
                interval += this.dict.t(this.localLang, 'nMins', schedule.will.m);
            }
        }

        // Данные на сегодня
        if (schedule.today) {
            today.text = this.dict.t(this.localLang, 'today');
            if (schedule.everyday) {
                today.text = this.dict.t(this.localLang, 'everyday');
            }
            today.from = schedule.today.from;
            today.to = schedule.today.to;
            today.lunch = schedule.lunch;
            if (today.lunch) {
                today.lunchStr = this.dict.t(this.localLang, 'lunch');
            }
        } else {
            today.text = this.dict.t(this.localLang, 'todayIsRestDay');
        }

        // Текущий статус и прогноз
        if (schedule.always) { // Если круглосуточно, ничего кроме "Круглосуточно" выводить не нужно
            today.text = this.dict.t(this.localLang, 'aroundTheClock');
            open = true;
        } else if (schedule.now) {
            open = schedule.now.open;
            if (open) { // открыто
                if (schedule.will && schedule.will.willType === 'lunch') {
                    // далее - закрытие на обед
                    if (schedule.will && schedule.will.h < maxHours) {
                        // менее maxHours до закрытия  на обед
                        nowText = this.dict.t(this.localLang, '_in') + ' ' + this.dict.t(this.localLang, 'nMins', interval) + this.dict.t(this.localLang, 'isClosingOnDinner');
                    } else {
                        // больше maxHours до закрытия  на обед
                        nowText = this.dict.t(this.localLang, 'isOpen');
                    }

                } else {
                    // далее просто закрытие
                    if (schedule.will.h < maxHours) {
                        // менее maxHours до закрытия просто
                        nowText = this.dict.t(this.localLang, 'closeIn') + this.dict.t(this.localLang, 'nMins', interval);
                    } else {
                        // больше maxHours до закрытия просто
                        nowText = this.dict.t(this.localLang, 'isOpen');
                    }
                }
            } else { // закрыто
                if (schedule.will && schedule.will.when) {
                    // откроется не сегодня
                    nowText = this.dict.t(this.localLang, 'open') + schedule.will.when;
                } else {
                    // откроется сегодня
                    if (schedule.now && schedule.now.lunch) {
                        // сейчас обед
                        if (schedule.will.h < maxHours) {
                            // менее maxHours до открытия с обеда
                            nowText = this.dict.t(this.localLang, 'Lunch') + this.dict.t(this.localLang, 'openIn') + this.dict.t(this.localLang, 'nMins', interval);
                        } else {
                            // больше maxHours до открытия с обеда
                            nowText = this.dict.t(this.localLang, 'Lunch') + this.dict.t(this.localLang, 'openAt') + schedule.will.till;
                        }
                    } else {
                        // просто закрыто
                        if (schedule.will && schedule.will.h < maxHours) {
                            // менее maxHours до открытия просто
                            nowText = this.dict.t(this.localLang, 'openIn') + this.dict.t(this.localLang, 'nMins', interval);
                        } else {
                            // больше maxHours до открытия просто
                            nowText = this.dict.t(this.localLang, 'openAt') + schedule.will.till;
                        }
                    }
                }
            }
        }

        return {
            today: today,
            now: nowText,
            open: open,
            week: schedule.week,
            comment: schedule.comment,
            everyday: schedule.everyday
        };
    }
};

/*global
    FirmCard:false
*/
// FirmCard.dictionary = {};

FirmCard.prototype.dict = {

    t: function (lang, msg, argument) { // (String, Number) -> String
        var result,
            msgIsset = false,
            dictionaryMsg,
            exp;

        if (typeof this[lang] === 'undefined') {
            lang = 'ru';
        }
        dictionaryMsg = this[lang][msg];
        msgIsset = typeof dictionaryMsg !== 'undefined';
        if (!msgIsset) {
            return msg;
        }
        result = msgIsset ? dictionaryMsg : msg;

        if (argument !== undefined) {
            argument = parseInt(argument, 10);
            argument = isNaN(argument) ? 0 : argument;
            exp = this[lang].pluralRules(argument);
            result = argument + ' ' + dictionaryMsg[exp];
        }
        return result ? result : msg;
    },

    ru: {
        pluralRules: function (n) { // (Number)
            if (n % 10 === 1 && n % 100 !== 11) { // 1, 21
                return 0;
            }
            if ((n % 10 >= 2 && n % 10 <= 4 && (n % 10) % 1 === 0) && (n % 100 < 12 || n % 100 > 14)) { // 2, 3
                return 1;
            }

            if ((n % 10 === 0) || (n % 10 >= 5 && n % 10 <= 9 && (n % 10) % 1 === 0) || (n % 100 >= 11 && (n % 100) <= 14 && (n % 100) % 1 === 0)) { // 13, 17
                return 2;
            }
        },

        btnBack: 'Назад',
        btnFindWay: 'Проехать сюда',
        btnEntrance: 'Найти вход',
        linkReviews: ['отзыв', 'отзыва', 'отзывов'],
        linkPhoto: ['фото', 'фото', 'фото'],
        linkBooklet: 'Буклет',
        tommorow: 'завтра',
        afterTommorow: 'послезавтра',
        afterWeek: 'через неделю',
        nextSun: 'в воскресенье',
        nextMon: 'в понедельник',
        nextTue: 'во вторник',
        nextWed: 'в среду',
        nextThu: 'в четверг',
        nextFri: 'в пятницу',
        nextSat: 'в субботу',
        willOpen: 'откроется',
        willClose: 'закроется',
        isOpen: 'Открыто',
        openTill: 'Открыто до ',
        closeIn: 'Закроется через ',
        openAt: 'Откроется в ',
        openIn: 'Откроется через ',
        open: 'Откроется ',
        nHours: ['час', 'часа', 'часов'],
        nMins: ['минуту', 'минуты', 'минут'],
        lunch: 'обед',
        Lunch: 'Обед. ',
        workingDays: 'Рабочие дни',
        weekdays: 'Будние дни',
        restDay: ['выходной', 'выходные','выходные'],
        reviewsOnFlamp: 'Отзывы на Флампе',
        writeReviewOnFlamp: 'Написать отзыв на Флампе',
        payment: 'оплата',
        everyday: 'Ежедневно c',
        worksAroundTheClock: 'Работает круглосуточно',
        aroundTheClock: 'Круглосуточно',
        knowMore: 'узнать больше',
        toClose: 'до закрытия',
        monday: 'понедельник',
        tuesday: 'вторник',
        wednesday: 'среда',
        thursday: 'четверг',
        friday: 'пятница',
        saturday: 'суббота',
        sunday: 'воскресенье',
        mon: 'пон',
        tue: 'втр',
        wed: 'срд',
        thu: 'чтв',
        fri: 'птн',
        sat: 'сбт',
        sun: 'вск',
        toLunch: 'до обеда',
        today: 'Сегодня',
        lessThenHour: 'менее часа',
        youCouldLate: 'вы можете не успеть',
        workingTime: 'рабочее время',
        showAllOrgInRubric: 'Показать все организации рубрики',
        todayIsRestDay: 'Сегодня выходной',
        internet: 'Оплата через Интернет',
        noncash: 'Безналичный расчет',
        goldcrown: 'Золотая Корона',
        dinersclub: 'Diners Club',
        mastercard: 'Mastercard',
        maestrocard: 'MaestroCard',
        visa: 'Visa',
        cash: 'Наличный расчет',
        americanexpress: 'American Express',
        hour : 'час',
        less: 'менее',
        _in : 'Через',
        isClosingOnDinner : ' закрывается на обед'
    },

    it: {
        pluralRules: function (n) { // (Number)
            if (n === 1) { // 1
                return 0;
            } else {
                return 1; //0, 2, 3, 4 ..
            }
        },

        btnBack: 'Indietro',
        btnFindWay: 'Come arrivare ',
        btnEntrance: 'Trova l\'ingresso',
        linkReviews: ['recensione', 'recensioni'],
        linkPhoto: ['fotografia', 'fotografie'],
        linkBooklet: 'Sull\'azienda',
        tommorow: 'domani',
        afterTommorow: 'dopodomani',
        afterWeek: 'tra una settimana',
        nextSun: 'la domenica',
        nextMon: 'il lunedi',
        nextTue: 'il martedì',
        nextWed: 'il mercoledì',
        nextThu: 'il giovedi',
        nextFri: 'il venerdì',
        nextSat: 'il sabato',
        willOpen: 'apre',
        willClose: 'ciuso',
        isOpen: 'Aperto',
        openTill: 'Aperto fino alle ',
        closeIn: 'Chiude tra ',
        openAt: 'Apre alle ',
        openIn: 'Apre tra ',
        open: 'Apre ',
        nHours: ['ora', 'ore'],
        nMins: ['minuto', 'minuti'],
        lunch: 'pausa pranzo',
        Lunch: 'Pausa pranzo. ',
        workingDays: 'Giorni feriali',
        weekdays: 'Giorni feriali',
        restDay: ['chiusura','chiusura'],
        reviewsOnFlamp: 'Recensioni su Flamp',
        writeReviewOnFlamp: 'Scrivi una recensione su Flamp',
        payment: 'pagamento',
        everyday: 'Ogni giorno dalole',
        worksAroundTheClock: 'Operativo 24 ore su 24',
        aroundTheClock: '24 ore su 24',
        knowMore: 'ulteriori informazioni',
        toClose: 'fino alla chiusura',
        monday: 'lunedi',
        tuesday: 'martedì',
        wednesday: 'mercoledì',
        thursday: 'giovedi',
        friday: 'venerdì',
        saturday: 'sabato',
        sunday: 'domenica',
        mon: 'lun',
        tue: 'mar',
        wed: 'mer',
        thu: 'gio',
        fri: 'ven',
        sat: 'sab',
        sun: 'dom',
        toLunch: 'fino alla pausa pranzo',
        today: 'Oggi',
        lessThenHour: 'meno di un\'ora',
        youCouldLate: 'affrettarsi, chiusura imminente',
        workingTime: 'orario di lavoro',
        showAllOrgInRubric: 'Visualizza tutte le aziende della categoria',
        todayIsRestDay: 'oggi chiuso',
        internet: 'Pagamento on-line',
        noncash: 'Pagamento non in contanti',
        goldcrown: 'Zolotaja Korona',
        dinersclub: 'Diners Club',
        mastercard: 'MasterCard',
        maestrocard: 'MaestroCard',
        visa: 'Visa',
        cash: 'Pagamento in contanti',
        americanexpress: 'American Express',
        hour : 'un\'ora',
        less: 'meno di',
        _in : 'Tra',
        isClosingOnDinner : 'chiude per pausa pranzo'
    },

    en: {
        pluralRules: function (n) { // (Number)
            if (n === 1) { // 1
                return 0;
            } else {
                return 1; //0, 2, 3, 4 ..
            }
        },

        btnBack: 'Back',
        btnFindWay: 'Get here',
        btnEntrance: 'Find entrance',
        linkReviews: ['review', 'reviews'],
        linkPhoto: ['photo', 'photos'],
        linkBooklet: 'About company',
        tommorow: 'tomorrow',
        afterTommorow: 'the day after tomorrow',
        afterWeek: 'in a week',
        nextSun: 'on Sunday',
        nextMon: 'on Monday',
        nextTue: 'on Tuesday',
        nextWed: 'on Wednesday',
        nextThu: 'on Thursday',
        nextFri: 'on Friday',
        nextSat: 'on Saturday',
        willOpen: 'opens ',
        willClose: 'closes',
        isOpen: 'Open',
        openTill: 'Open till ',
        closeIn: 'Closes in ',
        openAt: 'Opens at ',
        openIn: 'Opens in ',
        open: 'Opens ',
        nHours: ['hour', 'hours'],
        nMins: ['minute', 'minutes'],
        lunch: 'lunch break',
        Lunch: 'Lunch break. ',
        workingDays: 'Working days',
        weekdays: 'Weekdays',
        restDay: ['day off','days off'],
        reviewsOnFlamp: 'Reviews on Flamp',
        writeReviewOnFlamp: 'Write a review on Flamp',
        payment: 'payment',
        everyday: 'Daily from',
        worksAroundTheClock: 'Open 24 hours',
        aroundTheClock: '24h',
        knowMore: 'see also',
        toClose: 'until closing',
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday',
        mon: 'Mon',
        tue: 'Tue',
        wed: 'Wed',
        thu: 'Thu',
        fri: 'Fri',
        sat: 'Sat',
        sun: 'Sun',
        toLunch: 'until lunch',
        today: 'Today',
        lessThenHour: 'less then one hour',
        youCouldLate: 'you might be late',
        workingTime: 'working hours',
        showAllOrgInRubric: 'Show all organizations in the category',
        todayIsRestDay: 'closed today',
        internet: 'Online',
        noncash: ' No-cash',
        goldcrown: 'Golden Crown',
        dinersclub: 'Diners Club',
        mastercard: 'Mastercard',
        maestrocard: 'MaestroCard',
        visa: 'Visa',
        cash: 'Cash',
        americanexpress: 'American Express',
        hour : 'hour',
        less: 'less',
        _in : 'In',
        isClosingOnDinner : 'will be closing for lunch'
    },

    cs: {
        pluralRules: function (n) { // (Number)
            return (n === 1) ? 0 : (n >= 2 && n <= 4) ? 1 : 2;
        },

        btnBack: 'Zpět',
        btnFindWay: 'Jet sem',
        btnEntrance: 'Hledat vstup',
        linkReviews: ['recenze', 'recenze', 'recenzí'],
        linkPhoto: ['fotografie', 'fotografie', 'fotografií'],
        linkBooklet: 'Leták',
        tommorow: 'zítra',
        afterTommorow: 'pozítří',
        afterWeek: 'za týden',
        nextSun: 'v neděli',
        nextMon: 'v pondělí',
        nextTue: 'v úterý',
        nextWed: 've středu',
        nextThu: 've čtvrtek',
        nextFri: 'v pátek',
        nextSat: 'v sobotu',
        willOpen: 'otevře se',
        willClose: 'zavře se',
        isOpen: 'Otevřeno',
        openTill: 'Otevřeno do ',
        closeIn: 'Zavře se za ',
        openAt: 'Otevře se v ',
        openIn: 'Otevře se za ',
        open: 'Otevře se ',
        nHours: [ 'hodinu' , 'hodiny' , 'hodin' ],
        nMins: [ 'minutu' , 'minuty' , 'minut' ],
        lunch: 'polední přestávka',
        Lunch: 'Polední přestávka. ',
        workingDays: 'Všední dny',
        weekdays: 'Všední dny',
        restDay: ['zavřeno', 'zavřeno'],
        reviewsOnFlamp: 'Recenze na Flampu',
        writeReviewOnFlamp: 'Napsat recenzi na Flampu',
        payment: 'platba',
        everyday: 'Denně od ',
        worksAroundTheClock: 'Pracuje nonstop',
        aroundTheClock: 'Nonstop',
        knowMore: 'dozvědět se více',
        toClose: 'do uzavření',
        monday: 'pondělí',
        tuesday: 'úterý',
        wednesday: 'středa',
        thursday: 'čtvrtek',
        friday: 'pátek',
        saturday: 'sobota',
        sunday: 'neděle',
        mon: 'po',
        tue: 'út',
        wed: 'st',
        thu: 'čt',
        fri: 'pá',
        sat: 'so',
        sun: 'ne',
        toLunch: 'do polední přestávky',
        today: 'Dnes',
        lessThenHour: 'méně než hodinu',
        youCouldLate: 'nemusíte to stihnout',
        workingTime: 'pracovní doba',
        showAllOrgInRubric: 'Zobrazit všechny organizace v rubrice',
        todayIsRestDay: 'Dnes je zavřeno',
        internet: 'Platba prostřednictvím Internetu',
        noncash: 'Bezhotovostní platba',
        goldcrown: 'Zolotaja Korona',
        dinersclub: 'Diners Club',
        mastercard: 'Mastercard',
        maestrocard: 'MaestroCard',
        visa: 'Visa',
        cash: 'Platba hotově',
        americanexpress: 'American Express',
        hour : 'hodinu',
        less: 'méně',
        _in : 'Za',
        isClosingOnDinner : 'začíná polední přestávka'
    },

    es: {
        pluralRules: function (n) { // (Number)
          return (n === 1) ? 0 : (n >= 2 && n <= 4) ? 1 : 2;
        },

        btnBack: 'Atrás',
        btnFindWay: 'Ir para allá',
        btnEntrance: 'Buscar acceso',
        linkReviews: ['comentario', 'comentarios', 'comentarios'],
        linkPhoto: ['foto', 'fotos', 'fotos'],
        linkBooklet: 'Folleto',
        tommorow: 'mañana',
        afterTommorow: 'pasado mañana',
        afterWeek: 'en una semana más',
        nextSun: 'el domingo',
        nextMon: 'el lunes',
        nextTue: 'el martes',
        nextWed: 'el miércoles',
        nextThu: 'el jueves',
        nextFri: 'el viernes',
        nextSat: 'el sábado',
        willOpen: 'se abrirá',
        willClose: 'se cerrará',
        isOpen: 'Abierto',
        openTill: 'Abierto hasta ',
        closeIn: 'Se cerrará dentro de ',
        openAt: 'Se abrirá el ',
        openIn: 'Se abrirá dentro de ',
        open: 'Se abrirá ',
        nHours: ['hora', 'horas', 'horas'],
        nMins: ['minuto', 'minutos', 'minutos'],
        lunch: 'hora de colación',
        Lunch: 'Hora de colación. ',
        workingDays: 'Días laborables',
        weekdays: 'Días laborables',
        restDay: ['cerrado','cerrado'],
        reviewsOnFlamp: 'Comentarios en Flamp',
        writeReviewOnFlamp: 'Escribir un comentario en Flamp',
        payment: 'pago',
        everyday: 'Cada día desde',
        worksAroundTheClock: 'Abierto las 24 horas',
        aroundTheClock: '24 horas',
        knowMore: 'para saber más',
        toClose: 'hasta el cierre',
        monday: 'lunes',
        tuesday: 'martes',
        wednesday: 'miércoles',
        thursday: 'jueves',
        friday: 'viernes',
        saturday: 'sábado',
        sunday: 'domingo',
        mon: 'lun',
        tue: 'mar',
        wed: 'mié',
        thu: 'jue',
        fri: 'vie',
        sat: 'sáb',
        sun: 'dom',
        toLunch: 'antes de la hora de colación',
        today: 'Hoy',
        lessThenHour: 'menos de una hora',
        youCouldLate: 'puede ser que no alcanzas a llegar',
        workingTime: 'horario de trabajo',
        showAllOrgInRubric: 'Mostrar todas las empresas de la categoría',
        todayIsRestDay: 'Hoy cerrado',
        internet: 'Pago por Internet',
        noncash: 'Pago sin efectivo',
        goldcrown: 'Zolotaya Korona',
        dinersclub: 'Diners Club',
        mastercard: 'Mastercard',
        maestrocard: 'MaestroCard',
        visa: 'Visa',
        cash: 'Pago en efectivo',
        americanexpress: 'American Express',
        hour : 'hora',
        less: 'menos de',
        _in : 'Dentro de',
        isClosingOnDinner : 'se cierra por hora de colación'
    }
};

/* global 300000, 10,true */

DG.Traffic = DG.TileLayer.extend({

    options: {
        period: 0,
        disableLabel: false
    },

    statics: {
        Dictionary: {},
        tileUrl: 'http://traffic{s}.maps.2gis.com/{projectCode}/traffic/{z}/{x}/{y}/speed/{period}/{timestampString}',
        metaUrl: 'http://meta{s}.maps.2gis.com/{projectCode}/meta/{z}/{x}/{y}/graph_speed/{period}/{timestampString}',
        timeUrl: 'http://traffic{s}.maps.2gis.com/{projectCode}/meta/speed/time/',
        updateInterval: 300000,
        layersOptions: {
            errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            subdomains: '012345679',
            maxNativeZoom: 18,
            detectRetina: true,
            minZoom: 10
        }
    },

    initialize: function (options) {
        options = DG.setOptions(this, DG.extend(options || {}, DG.Traffic.layersOptions));
        options.timestampString = options.period ? '' : ('?' +  (new Date()).getTime());
        this._metaLayer = DG.Meta.layer(null, {
            detectRetina: options.detectRetina,
            maxNativeZoom: options.maxNativeZoom,
            dataFilter: DG.bind(this._processData, this),
            minZoom: options.minZoom
        });
        this._isDg = true;
        this._onTimer = DG.bind(this._onTimer, this);
        DG.TileLayer.prototype.initialize.call(this, DG.Traffic.tileUrl, options);
    },

    // #setTime(day [0-6], time[0-23]) ????

    onAdd: function (map) {
        this._updateLayerProject();

        map
            .addLayer(this._metaLayer)
            .on('projectchange projectleave', this._onMapProjectChange, this);

        if (!this.options.disableLabel) {
            this._metaLayer.on(this._layerEventsListeners, this);
            this._labelHelper = DG.label();
        }

        if (DG.Traffic.updateInterval) {
            this._updateTimer = setInterval(this._onTimer, DG.Traffic.updateInterval);
        }

        DG.TileLayer.prototype.onAdd.call(this, map);
    },

    onRemove: function (map) {
        clearInterval(this._updateTimer);

        map
            .removeLayer(this._metaLayer)
            .off('projectchange projectleave', this._onMapProjectChange, this);

        if (!this.options.disableLabel) {
            this._metaLayer.off(this._layerEventsListeners, this);
            this._map.removeLayer(this._labelHelper);
            this._labelHelper = null;
        }

        DG.TileLayer.prototype.onRemove.call(this, map);
    },

    update: function () {
        var self = this;
        this._getTimestampString().then(
            function (response) {
                self.options.timestampString = '?' + response;
            },
            function () {
                self.options.timestampString = '?' + (new Date()).getTime();
            }).then(
            function () {
                self.fire('update', {timestamp: self.options.timestampString});
                self._layerEventsListeners.mouseout.call(self);
                self._metaLayer.getOrigin().setURL(self._prepareMetaURL(), self);
                self.redraw();
            }
        );
    },

    getSubdomain: function () {
        return DG.Traffic.layersOptions.subdomains[
            Math.floor(Math.random() * DG.Traffic.layersOptions.subdomains.length)
        ];
    },

    _getTimestampString: function () {
        return DG.ajax(
            DG.Util.template(
                DG.Traffic.timeUrl,
                DG.extend({
                    s : this.getSubdomain(),
                    projectCode: this._map.projectDetector.getProject().code
                }, this.options || {})),
            {type: 'get'}
        );
    },

    _onTimer: function () {
        if (this.options.period === 0) {
            this.update();
        }
    },

    _processData: function (trafficData, coord) {
        var map = this._map,
            tileOriginPoint = coord.multiplyBy(this._getTileSize()),
            hints = {};

        if (!DG.Util.isArray(trafficData)) {    // TODO remove
            return [];
        }

        trafficData[1].forEach(function (item) {
            this[item.graph_id] = item.speed_text;
        }, hints);

        return trafficData[0].map(function (item) {
            var geoJson = DG.Wkt.toGeoJSON(item.geometry[0].object[0]);

            geoJson.coordinates[0] = geoJson.coordinates[0].map(function (revertedLatlng) {
                return map
                        .project([revertedLatlng[1], revertedLatlng[0]]).round()
                        .subtract(tileOriginPoint);
            }); // TODO check with MultiPoigon and etc.
            return {
                id: item.graph_id,
                speed: hints[item.graph_id],
                geometry: geoJson
            };
        });
    },

    _prepareMetaURL: function () {
        return DG.Util.template(DG.Traffic.metaUrl, DG.extend({
            x: '{x}',
            y: '{y}',
            z: '{z}',
            s: '{s}'
        }, this.options));
    },

    _updateLayerProject: function () {
        var project = this._map.projectDetector.getProject();
        DG.setOptions(this, project && project.traffic ? {
                projectCode: project.code,
                bounds: project.latLngBounds,
                minZoom: Math.max(project.minZoom, DG.Traffic.layersOptions.minZoom),
                maxZoom: project.maxZoom
            } : {
                maxZoom: 0,
                minZoom: 0
            });
        this._metaLayer.getOrigin().setURL(this._prepareMetaURL());
    },

    _onMapProjectChange: function () {
        this._updateLayerProject();
        this.redraw();
    },

    _layerEventsListeners: {
        mouseover: function (e) { // (Object)
            this._setCursor('pointer');
            if (this._labelHelper && e.meta.speed) {
                this._labelHelper
                    .setPosition(e.latlng)
                    .setContent(e.meta.speed + ' ' + this.t('speed_unit_km_h'))
                    .addTo(this._map);
            }
        },
        mouseout: function () {
            this._setCursor('');
            if (this._labelHelper) {
                this._map.removeLayer(this._labelHelper);
            }
        },
        mousemove: function (e) {
            if (this._labelHelper) {
                this._labelHelper.setPosition(e.latlng);
            }
        }
    },

    _setCursor: function (cursor) { // (String)
        this._map.getContainer().style.cursor = cursor;
    }

});

DG.Traffic.include(DG.Locale);

DG.traffic = function (options) { // (Object)
    return new DG.Traffic(options);
};

DG.Traffic.Dictionary.ru = {
    speed_unit_km_h: 'км/ч'
};
DG.Traffic.Dictionary.it = {
    speed_unit_km_h: 'km/h'
};
DG.Traffic.Dictionary.cs = {
    speed_unit_km_h: 'km/h'
};
DG.Traffic.Dictionary.es = {
    speed_unit_km_h: 'km/h'
};
DG.Traffic.Dictionary.en = {
    speed_unit_km_h: 'km/h'
};
/* global 10 */

DG.Control.Traffic = DG.RoundControl.extend({

    options: {
        position: 'topright',
        iconClass: 'traffic'
    },

    statics: {
        Dictionary: {},
        scoreUrl: 'http://traffic{s}.maps.2gis.com/{projectCode}/meta/score/0/',
        trafficMinZoom: 10
    },

    initialize: function (options) {
        this._trafficClass = 'dg-traffic-control';
        this._controlHideClass = 'dg-control-round_is-hidden_true';

        DG.setOptions(this, options);
        DG.extend(this, {
            _active: false,
            _trafficLayer: null
        }).on(this._controlEvents, this);
    },

    _controlEvents: {
        add: function () {
            this._trafficLayer = DG.traffic();
            this._map.on('zoomend projectchange projectleave', this._updateControlVisibility, this);
        },
        click: function () {
            this._active = !this._active;

            if (this._active) {
                this.setState('active');
                this._showTraffic();
            } else {
                this.setState('');
                this._hideTraffic();
            }
        },
        remove: function () {
            this.off(this._controlEvents, this);
            this._map.off('zoomend projectchange projectleave', this._updateControlVisibility, this);
            if (this._active) {
                this._map.removeLayer(this._trafficLayer);
                this._active = false;
            }
            this._trafficLayer = null;
        }
    },

    _showTraffic: function () { // ()
        this._updateTrafficScore();
        this._map.addLayer(this._trafficLayer);
    },

    _hideTraffic: function () { // ()
        this._handleDom('remove');
        this._map.removeLayer(this._trafficLayer);
    },

    _handleDom: function (method, score) {
        var a = this._link;

        a.innerHTML = score || '';
        DG.DomUtil[method + 'Class'](a, this._trafficClass);
        DG.DomUtil[method + 'Class'](a, this._trafficClass + '_color_' + this._scoreRate);
    },

    _getTrafficColor: function (score) { // (Number) -> String
        var result = 'green';

        if (score > 7) {
            result = 'red';
        } else if (score > 4) {
            result = 'yellow';
        }

        return result;
    },

    _updateControlVisibility: function() {
        var project = this._map.projectDetector.getProject(),
            projectHasTraffic = project && project.traffic,
            method = ((this._map.getZoom() < DG.Control.Traffic.trafficMinZoom) ||
            (!projectHasTraffic)) ? 'addClass' : 'removeClass';

        DG.DomUtil[method](this._container, this._controlHideClass);
        if (this._active && projectHasTraffic) {
            this._updateTrafficScore();
        }
    },

    _updateTrafficScore: function() {
        var self = this;

        this._getTrafficScore().then(function (score) {
            score = parseInt(score, 10); // sometimes webapi returns something like '5,+'

            self._scoreRate = self._getTrafficColor(score);
            self._handleDom('add', score);
        });
    },

    _getTrafficScore: function () { // () -> Promise
        var url = DG.Util.template(
            DG.Control.Traffic.scoreUrl,
            {
                s: this._trafficLayer.getSubdomain(),
                projectCode: this._map.projectDetector.getProject().code
            }
        );

        return DG.ajax(url, {type: 'get'});
    },

    _renderTranslation: function () { // ()
        this._link.title = this.t('button_title');
    }
});

DG.control.traffic = function (options) {
    return new DG.Control.Traffic(options);
};

DG.Control.Traffic.Dictionary.ru = {
	button_title: 'Пробки'
};

DG.Control.Traffic.Dictionary.it = {
	button_title: 'Colonna'
};

DG.Control.Traffic.Dictionary.cs = {
	button_title: 'Zácpy'
};

DG.Control.Traffic.Dictionary.es = {
	button_title: 'Taco'
};

DG.Control.Traffic.Dictionary.en = {
	button_title: 'Traffic'
};

DG.Ruler = DG.Layer.extend({

    options: {
        editable: true
    },

    includes: [DG.Locale],

    statics: {
        Dictionary: {}
    },

    initialize: function (latlngs, options) { // (Array, Object)
        DG.Util.setOptions(this, options);

        this._layers = {
            back : null,
            middle : null,
            front : null,
            mouse : null
        };
        this._points = [];

        this._layersContainer = DG.featureGroup();
        Object.keys(this._layers).forEach(function (name) {
            this._layersContainer.addLayer(this._layers[name] = DG.featureGroup());
        }, this);

        this._reset();

        if (DG.Browser.touch) {
            delete this._lineMouseEvents.mouseover;
            delete this._lineMouseEvents.mouseout;
            delete this._lineMouseEvents.mousemove;
        } else {
            delete this._lineMouseEvents.click;
        }

        if (latlngs && latlngs.length) {
            this.setLatLngs(latlngs);
        }
    },

    onAdd: function (map) { // (Map)
        this._map = map.on('langchange', this._updateDistance, this);

        // pane for the running label
        if (!this._map.getPane('rulerLabelPane')) {
            this._map.createPane('rulerLabelPane');
        }

        // pane with transperent vector for events handling (over running label)
        if (!this._map.getPane('rulerEventPane')) {
            this._map.createPane('rulerEventPane');
        }

        this._layersContainer.addTo(this._map);

        if (this._points.length) {
            this._layers.mouse.fire('layeradd');
            this._updateDistance();
        }

        this._layers.mouse.on(this._lineMouseEvents, this);
    },

    onRemove: function (map) { // (Map)
        map
            .off('langchange', this._updateDistance, this)
            .removeLayer(this._layersContainer);

        this._layers.mouse.off(this._lineMouseEvents, this);
        this._reset();
    },

    getTotalDistance: function () { // () -> Number
        return this._calcDistance();
    },

    spliceLatLngs: function (index) { // (Number, Number, args ...) -> Array
        var oldLength = this._points.length,
            mutationStart = index >= 0 ? Math.min(index, oldLength) : oldLength - index,
            removed = Array.prototype.splice.apply(this._points, arguments).map(function (point) {
                this._layers.mouse.removeLayer(point);
                return point.off().getLatLng();
            }, this),
            length = this._points.length;

        if (length) {
            for (var i = mutationStart; i < length; i++) {
                if (!(this._points[i] instanceof DG.Ruler.LayeredMarker)) {
                    this._points[i] = this._createPoint(this._points[i], this.options.iconStyles.large)
                        .on(this._pointEvents, this)
                        .once('add', this._addCloseHandler, this)
                        .addTo(this._layers.mouse, this._layers);
                }
                if (i && !this._points[i - 1]._legs) {
                    this._addLegs(this._points[i - 1]);
                }
                this._points[i].setPointStyle(this.options.iconStyles[i && i < length - 1 ? 'small' : 'large']);
                this._points[i]._pos = i;
            }
            this._removeLegs(this._points[length - 1]);
            if (oldLength > 0 && oldLength < length) {
                this._points[oldLength - 1].collapse();
            }
            if (this._points[mutationStart]) {
                this._updateLegs(this._points[mutationStart]);
            }
            if (mutationStart > 1) {
                this._points[mutationStart - 1].setPointStyle(this.options.iconStyles.small);
            }
            this._updateDistance();
            this._normalizeRulerPoints();
        }
        if (DG.Browser.touch && this._lineMarkerHelper) {
            this._lineMarkerHelper.collapse();
        }
        this._fireChangeEvent();
        return removed;
    },

    addLatLng: function (latlng) { // (LatLng) -> Ruler
        var lastPoint = this._points[this._points.length - 1] || null;
        latlng = DG.latLng(latlng);

        if (lastPoint) {
            latlng = this._normalizeLatLng(latlng, lastPoint.getLatLng());
        }

        this.spliceLatLngs(this._points.length, 0, latlng);
        return this;
    },

    getLatLngs: function () { // () -> Array
        return this._points.map(function (point) {
            return point.getLatLng();
        });
    },

    setLatLngs: function (latlngs) { // (Array) -> Ruler
        var args = latlngs.slice();
        args.unshift(0, this._points.length);
        this.spliceLatLngs.apply(this, args);
        return this;
    },

    _reset: function () { // ()
        DG.extend(this, {
            _lineMarkerHelper: null,
            _morphingNow: false
        });
    },

    _lineMouseEvents: {
        click: function (event) {
            var target = event.layer;
            if (target instanceof DG.Marker && target._pos !== this._points.length - 1) {
                if (this._lineMarkerHelper) {
                    this._lineMarkerHelper.collapse();
                }
                target.setText(this._getFormatedDistance(target));
                this._lineMarkerHelper = target;
            } else if (target instanceof DG.Path && this.options.editable) {
                var latlng = event.latlng,
                    insertPos = target._point._pos + 1;
                this.spliceLatLngs(insertPos, 0, latlng);
            }
        },
        mouseover: function (event) { // (MouseEvent)
            var target = event.layer;

            target._hovered = true;
            if (this._morphingNow) {
                return;
            }
            if (target instanceof DG.Marker && target._pos !== this._points.length - 1) {
                target.setText(this._getFormatedDistance(target));
            } else if (target instanceof DG.Path && !this._lineMarkerHelper) {
                var point = target._point;

                this._lineMarkerHelper = this._addRunningLabel(
                    this._nearestPoint(point._legs.middle, event.latlng),
                    point
                );
            }
        },
        mouseout: function (event) { // (MouseEvent)
            var target = event.layer,
                originalEv = event.originalEvent;

            target._hovered = false;
            if (this._morphingNow || target._pos === this._points.length - 1) {
                return;
            }
            if (target instanceof DG.Marker) {
                // collapse only when we move out from label container (if browser support relatedTarget)
                if (!originalEv.relatedTarget ||
                    (originalEv.relatedTarget !== target.querySelector('container') &&
                    originalEv.relatedTarget.parentNode !== target.querySelector('container'))) {
                    target.collapse();
                }
            } else {
                this._removeRunningLabel();
            }
        },
        mousemove: function (event) { // (MouseEvent)
            if (this._morphingNow || !this._lineMarkerHelper) {
                return;
            }

            var point = event.layer._point,
                latlng = this._nearestPoint(point._legs.middle, event.latlng);

            this._lineMarkerHelper
                    .setLatLng(latlng)
                    .setText(this._getFormatedDistance(point, point.getLatLng().distanceTo(latlng)));
        },
        layeradd: function () { // ()
            Object.keys(this._layers).forEach(function (name) {
                this._layers[name].bringToFront();
            }, this);
        }
    },

    _fireChangeEvent: function () {
        this.fire('changed', {latlngs : this.getLatLngs()});
    },

    _addRunningLabel: function (latlng, previousPoint) { // (LatLng, Ruler.LayeredMarker)
        var point = this._createPoint(latlng).addTo(this._layers.mouse, this._layers);
        this._map.getPane('rulerLabelPane').appendChild(point._icon);
        return point.setText(this._getFormatedDistance(previousPoint, previousPoint.getLatLng().distanceTo(latlng)));
    },

    _removeRunningLabel: function () { // ()
        if (this._lineMarkerHelper) {
            this._layers.mouse.removeLayer(this._lineMarkerHelper);
            this._lineMarkerHelper = null;
        }
    },

    _insertPointInLine: function (event) { // (MouseEvent)
        var latlng = this._lineMarkerHelper.getLatLng(),
            insertPos = event.target._point._pos + 1,
            point;

        if (L.Browser.ie) {
            var path = event.originalEvent.target || event.originalEvent.srcElement,
                parent = path.parentNode;
            parent.appendChild(path); // IE click event leaking problem solution: we reappend mousedown event target element
        }

        L.DomEvent.stopPropagation(event.originalEvent);

        this.spliceLatLngs(insertPos, 0, latlng);
        point = this._points[insertPos];
        point.setText(this._getFormatedDistance(point));

        if (document.createEvent) {
            var e = document.createEvent('MouseEvents');
            e.initMouseEvent('mousedown', false, false, document.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 1, point._icon);
            point._icon.dispatchEvent(e);
        } else {
            point._icon.fireEvent('onMouseDown', DG.extend(document.createEventObject(), {
                button: 1,
                bubbles: false,
                cancelable: false
            }));
        }
        this._removeRunningLabel();

        this._updateLegs(point);
    },

    // Find the point on given polyline which is closest to given latlng
    _nearestPoint: function (polyline, latlng) { // (Polyline, LatLng) -> LatLng
        var self = this;

        // Convert everything to pixel coordinates
        var point = this._project(latlng);
        var linePoints = polyline.getLatLngs().map(function (latlng) {
            return self._project(latlng);
        });

        // First look for closest polyline segment
        var minDistance;
        var closestSegmentIndex;
        for (var i = 0; i < linePoints.length - 1; i++) {
            var distance = DG.LineUtil.pointToSegmentDistance(
                point,
                linePoints[i],
                linePoints[i + 1]
            );

            if (minDistance === undefined || distance < minDistance) {
                minDistance = distance;
                closestSegmentIndex = i;
            }
        }

        // Then look for closest point on that segment
        var closestPoint = DG.LineUtil.closestPointOnSegment(
            point,
            linePoints[closestSegmentIndex],
            linePoints[closestSegmentIndex + 1]
        );

        // Convert back to LatLng
        return this._unproject(closestPoint);
    },

    _addCloseHandler: function (event) { // (Event)
        event.target
                .on('click', this._deletePoint, this)
                .querySelector('remove-link').style.display = 'inline-block';
    },

    _createPoint: function (latlng, style) { // (LatLng, Object) -> Ruler.LayeredMarker
        var pointStyle = style ? style : this.options.iconStyles.large,
            layers = {};
        Object.keys(pointStyle).forEach(function (layer) {
            layers[layer] = DG.circleMarker(latlng, pointStyle[layer]);
        });

        return DG.Ruler.layeredMarker(latlng, {
            layers : layers,
            draggable : this.options.editable
        });
    },

    // Moves curr LatLng to correct world if necessary so that ruler section
    // between curr and base can be plotted correctly. Returns a new LatLng
    // object.
    _normalizeLatLng: function (curr, base) { // (LatLng, LatLng) -> LatLng
        var diff = (curr.lng < base.lng) ? 360 : -360;

        var newLng = curr.lng;
        while (Math.abs(newLng - base.lng) > 180) {
            newLng += diff;
        }

        return DG.latLng(curr.lat, newLng);
    },

    // Rearranges ruler points between worlds based on point param so that all
    // ruler sections can be plotted correctly.
    _normalizeRulerPoints: function (point) { // (Ruler.LayeredMarker)
        point = point || this._points[0];

        var self = this;
        var position = point._pos;
        var changedPoints = [];
        var i, currPoint, prevPoint, latlng, normalized;

        // Check points to the right
        for (i = position + 1; i < this._points.length; i++) {
            currPoint = this._points[i];
            prevPoint = this._points[i - 1];

            latlng = currPoint.getLatLng();
            normalized = this._normalizeLatLng(latlng, prevPoint.getLatLng());

            if (!normalized.equals(latlng)) {
                currPoint.setLatLng(normalized);
                changedPoints.push(i);
            }
        }

        // Check points to the left
        for (i = position - 1; i >= 0; i--) {
            currPoint = this._points[i];
            prevPoint = this._points[i + 1];

            latlng = currPoint.getLatLng();
            normalized = this._normalizeLatLng(latlng, prevPoint.getLatLng());

            if (!normalized.equals(latlng)) {
                currPoint.setLatLng(normalized);
                changedPoints.push(i);
            }
        }

        // Update legs of all points that changed position
        changedPoints.sort().reduce(function (previous, current) {
            var skipPrevious = previous && previous === current - 1;

            self._updateLegs(self._points[current], skipPrevious);

            return current;
        }, null);
    },

    _pointEvents: {
        drag: function (event) { // (Event)
            var point = event.target;

            this._normalizeRulerPoints(point);

            if (!DG.Browser.touch && point !== this._points[this._points.length - 1]) {
                point.setText(this._getFormatedDistance(point));
            }

            this._updateLegs(point);
            this._updateDistance();
        },
        dragend: function (event) { // (Event)
            var point = event.target;
            this._morphingNow = false;
            if (!point._hovered && point !== this._points[this._points.length - 1]) {
                point.collapse();
            }
            this._fireChangeEvent();
        },
        dragstart: function () { // ()
            if (DG.Browser.touch && this._lineMarkerHelper) {
                this._lineMarkerHelper.collapse();
            }
            this._morphingNow = true;
        }
    },

    _deletePoint: function (event) { // (MouseEvent)
        var originalEvent = event.originalEvent,
            target = originalEvent.target  || originalEvent.srcElement;

        if (target.className !== 'dg-ruler__label-remove-link' &&
            target.className !== 'dg-ruler__remove-link-overlay') {
            return;
        }
        DG.DomEvent.stop(event.originalEvent);
        this.spliceLatLngs(event.target._pos, 1);
    },

    _degToRad: function (deg) {
        return (Math.PI / 180) * deg;
    },

    _radToDeg: function (rad) {
        return (180 / Math.PI) * rad;
    },

    // Map-independent project method
    _project: function (latlng) {
        if (this._map) {
            return this._map.project(latlng);
        }

        return DG.CRS.EPSG3857.latLngToPoint(latlng, 1);
    },

    // Map-independent unproject method
    _unproject: function (point) {
        if (this._map) {
            return this._map.unproject(point);
        }

        return DG.CRS.EPSG3857.pointToLatLng(point, 1);
    },

    // Calculates the size of angle point1-point-point2
    _calcAngle: function (point, point1, point2) { // (LatLng, LatLng, LatLng) -> Number
        point1 = this._normalizeLatLng(point1, point);
        point2 = this._normalizeLatLng(point2, point);

        point = this._project(point);
        point1 = this._project(point1);
        point2 = this._project(point2);

        var x1 = point1.x - point.x;
        var x2 = point2.x - point.x;
        var y1 = point1.y - point.y;
        var y2 = point2.y - point.y;

        var dotProduct = x1 * x2 + y1 * y2;
        var mag1 = Math.sqrt(x1 * x1 + y1 * y1);
        var mag2 = Math.sqrt(x2 * x2 + y2 * y2);

        return Math.acos(dotProduct / (mag1 * mag2));
    },

    // Calculates the midpoint on the great circle between two LatLngs
    _calcMidPoint: function (latlng1, latlng2) { // (LatLng, LatLng) -> LatLng
        var lon1 = this._degToRad(latlng1.lng);
        var lat1 = this._degToRad(latlng1.lat);

        var lon2 = this._degToRad(latlng2.lng);
        var lat2 = this._degToRad(latlng2.lat);

        // Based on formulae from
        // http://williams.best.vwh.net/avform.htm#Intermediate
        var d = Math.acos(Math.sin(lat1) * Math.sin(lat2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2));

        // Split the arc in half
        var f = 0.5;

        var A = Math.sin((1 - f) * d) / Math.sin(d);
        var B = Math.sin(f * d) / Math.sin(d);

        var x = A * Math.cos(lat1) * Math.cos(lon1) +
            B * Math.cos(lat2) * Math.cos(lon2);

        var y = A * Math.cos(lat1) * Math.sin(lon1) +
            B * Math.cos(lat2) * Math.sin(lon2);

        var z = A * Math.sin(lat1) + B * Math.sin(lat2);

        var lat = Math.atan2(z, Math.sqrt(x * x + y * y));
        var lon = Math.atan2(y, x);

        return DG.latLng(this._radToDeg(lat), this._radToDeg(lon));
    },

    // Adaptive sampling algorithm based on
    // http://ariel.chronotext.org/dd/defigueiredo93adaptive.pdf
    _adaptiveSample: function (left, right, depth, middle) { // (LatLng, LatLng, Number[, LatLng]) -> LatLng[]
        if (depth > 9) {
            // Max recursion depth reached
            return [];
        }

        middle = middle || this._calcMidPoint(left, right);

        var leftMiddle = this._calcMidPoint(left, middle);
        var rightMiddle = this._calcMidPoint(middle, right);

        var angle1 = this._calcAngle(leftMiddle, middle, left);
        var angle2 = this._calcAngle(middle, left, right);
        var angle3 = this._calcAngle(rightMiddle, middle, right);

        // left --- leftMiddle --- middle --- rightMiddle --- right
        //            angle1       angle2       angle3

        var minAngle = 3.1;
        if (angle1 > minAngle && angle2 > minAngle && angle3 > minAngle) {
            // This section is straight enough, no intermediate points needed.
            return [];
        } else {
            // Angles are too small. Recursively sample halves of this section.
            var result = [];
            result = result.concat(this._adaptiveSample(left, middle, depth + 1, leftMiddle));
            result.push(middle);
            result = result.concat(this._adaptiveSample(middle, right, depth + 1, rightMiddle));

            return result;
        }
    },

    // Calculates the great circle arc between two LatLngs.
    _calcGreatCircle: function (latlng1, latlng2) { // (LatLng, LatLng) -> LatLng[]
        latlng2 = this._normalizeLatLng(latlng2, latlng1);

        // Special case: points are close to each other (within 1 degree)
        if (latlng1.equals(latlng2, 1)) {
            return [latlng1, latlng2];
        }

        // Special case: the great circle crosses a pole
        if (Math.abs(latlng2.lng - latlng1.lng) == 180) {
            // North or south pole?
            var latitude = (latlng1.lat + latlng2.lat > 0) ? 90 : -90;

            return [
                latlng1,
                DG.latLng(latitude, latlng1.lng),
                DG.latLng(latitude, latlng2.lng),
                latlng2
            ];
        }

        var result = [];

        result.push(latlng1);
        result = result.concat(this._adaptiveSample(latlng1, latlng2, 0));
        result.push(latlng2);

        // Make sure the arc doesn't jump between worlds
        for (var i = 1; i < result.length; i++) {
            result[i] = this._normalizeLatLng(result[i], result[i - 1]);
        }

        return result;
    },

    _addLegs: function (point) {
        var pathStyles = this.options.pathStyles;

        var greatCirclePoints = this._calcGreatCircle(
            point.getLatLng(),
            this._points[point._pos + 1].getLatLng()
        );

        point._legs = {};
        Object.keys(pathStyles).forEach(function (layer) {
            point._legs[layer] = DG.polyline(greatCirclePoints, pathStyles[layer]).addTo(this._layers[layer]);
        }, this);

        point._legs.mouse._point = point.once('remove', this._clearRemovingPointLegs, this);

        if (this.options.editable && !DG.Browser.touch) {
            point._legs.mouse.on('mousedown', this._insertPointInLine, this);
        }

        if (this._map) {
            this._layers.mouse.addLayer(point._legs.mouse);
        }
    },

    _clearRemovingPointLegs: function (event) { // (Event)
        this._removeLegs(event.target);
    },

    _removeLegs: function (point) { // (Ruler.LayeredMarker)
        if (point._legs) {
            Object.keys(point._legs).forEach(function (layer) {
                this._layers[layer].removeLayer(point._legs[layer]);
            }, this);
            point._legs = null;
        }
    },

    _updateLegs: function (point, skipPrevious) { // (Ruler.LayeredMarker, Boolean)
        var latlng = point.getLatLng(),
            previousPoint = this._points[point._pos - 1],
            nextPoint = this._points[point._pos + 1],
            self = this,
            newPoints;

        if (previousPoint && !skipPrevious) {
            newPoints = self._calcGreatCircle(previousPoint.getLatLng(), latlng);

            Object.keys(previousPoint._legs).forEach(function (layer) {
                previousPoint._legs[layer].setLatLngs(newPoints);
            });
        }

        if (nextPoint) {
            newPoints = self._calcGreatCircle(latlng, nextPoint.getLatLng());

            Object.keys(point._legs).forEach(function (layer) {
                point._legs[layer].setLatLngs(newPoints);
            });
        }
    },

    _calcDistance: function (finishPoint, tail) { // (Ruler.LayeredMarker, Number) -> Number
        var distance = tail ? tail : 0,
            calcTo = finishPoint ? finishPoint._pos : this._points.length - 1;

        for (var i = 0; i < calcTo; i++) {
            distance += this._points[i].getLatLng().distanceTo(this._points[i + 1].getLatLng());
        }

        return distance;
    },

    _getFormatedDistance: function () { // () -> String
        var distance = this._calcDistance.apply(this, arguments),
            units = 'm';

        if (distance > 1000) {
            distance /= 1000;
            units = 'km';
            if (distance > 1000) {
                distance = distance.toFixed();
                distance = distance.slice(0, -3) + ' ' + distance.slice(-3);
            } else {
                distance = distance.toFixed(2).split('.').join(this.t('delimiter'));
            }
        } else {
            distance = Math.round(distance);
        }

        return [distance || 0, ' ', this.t(units)].join('');
    },

    _updateDistance: function () { // ()
        if (this._map && this._points.length) {
            this._points[this._points.length - 1].setText(this._getFormatedDistance());
        }
    }
});

DG.ruler = function (latlngs, options) { // (Array, Object)
    return new DG.Ruler(latlngs, options);
};

DG.Ruler.LayeredMarker = DG.Marker.extend({

    /*global {"RulerLayeredMarker":"(function(){dust.register(\"RulerLayeredMarker\",body_0);function body_0(chk,ctx){return chk.write(\"<img class=\\\"dg-ruler__label-spacer\\\" src=\\\"\").reference(ctx.get([\"blankgif\"], false),ctx,\"h\").write(\"\\\" width=\\\"26\\\" height=\\\"26\\\" /><div class=\\\"dg-ruler__label-container\\\"><div class=\\\"dg-ruler__point\\\"></div><span class=\\\"dg-ruler__label-distance\\\">0 км</span><span class=\\\"dg-ruler__label-remove-link\\\"></span><div class=\\\"dg-ruler__remove-link-overlay\\\"></div></div>\");}return body_0;})();"}:false */

    options: {
        draggable: false,
        keyboard: false,
        riseOnHover: true,
        iconHTML: DG.dust({"RulerLayeredMarker":"(function(){dust.register(\"RulerLayeredMarker\",body_0);function body_0(chk,ctx){return chk.write(\"<img class=\\\"dg-ruler__label-spacer\\\" src=\\\"\").reference(ctx.get([\"blankgif\"], false),ctx,\"h\").write(\"\\\" width=\\\"26\\\" height=\\\"26\\\" /><div class=\\\"dg-ruler__label-container\\\"><div class=\\\"dg-ruler__point\\\"></div><span class=\\\"dg-ruler__label-distance\\\">0 км</span><span class=\\\"dg-ruler__label-remove-link\\\"></span><div class=\\\"dg-ruler__remove-link-overlay\\\"></div></div>\");}return body_0;})();"})('RulerLayeredMarker', {
            blankgif : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        })
    },

    statics: {
        domClass : 'dg-ruler__label'
    },

    addTo : function (map, layers) {
        Object.keys(this._layers).forEach(function (name) {
            layers[name].addLayer(this._layers[name]);
        }, this);

        this._viewport = layers;
        return DG.Marker.prototype.addTo.call(this.on('move', this._onMove), map);
    },

    onRemove : function (map) {
        Object.keys(this._layers).forEach(function (name) {
            this._viewport[name].removeLayer(this._layers[name]);
        }, this);
        this.off('move', this._onMove);
        this._viewport = null;
        this._style = null;
        return DG.Marker.prototype.onRemove.call(this, map);
    },

    setText : function (text) {
        if (this._iconCollapsed) {
            this.expand();
        }
        this._iconNodes.label.innerHTML = text;
        return this;
    },

    setPointStyle : function (style) {
        if (this._style !== style) {
            Object.keys(this._style = style).forEach(function (name) {
                this._layers[name].setStyle(style[name]);
            }, this);
        }
        return this;
    },

    expand : function () {
        this._iconCollapsed = false;
        this._iconNodes.container.style.display = 'block';
        this._iconNodes.spacer.style.display = 'none';
        return this;
    },

    collapse : function () {
        this._iconCollapsed = true;
        this._iconNodes.container.style.display = 'none';
        this._iconNodes.spacer.style.display = 'block';
        return this;
    },

    querySelector : function (selector) {
        return this._icon.querySelector('.' + DG.Ruler.LayeredMarker.domClass + '-' + selector);
    },

    _onMove : function (event) {
        var latlng = event.latlng;
        Object.keys(this._layers).forEach(function (name) {
            this._layers[name].setLatLng(latlng);
        }, this);
    },

    _initIcon : function () {
        DG.Marker.prototype._initIcon.call(this);
        this._iconCollapsed = true;
        this._icon.style.width = '';
        this._iconNodes = {
            label : this.querySelector('distance'),
            spacer : this.querySelector('spacer'),
            container : this.querySelector('container')
        };
    },

    _afterInit : function () {
        this._layers = this.options.layers || null;
        this.options.icon = DG.divIcon({
            className: DG.Ruler.LayeredMarker.domClass,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            html: this.options.iconHTML
        });
    }

});

DG.Ruler.LayeredMarker.addInitHook('_afterInit');

DG.Ruler.layeredMarker = function (latlng, options) {
    return new DG.Ruler.LayeredMarker(latlng, options);
};

var rulerRenderer = DG.svg({pane: 'rulerLabelPane'});

DG.Ruler.mergeOptions({
    pathStyles: {
        back: {
            color: '#fff',
            opacity: 1,
            weight: 12,
            pointerEvents: 'none',
            noClip: true,
            renderer: rulerRenderer,
            smoothFactor: 0
        },
        middle: {
            color: '#0da5d5',
            opacity: 1,
            weight: 4,
            pointerEvents: 'none',
            noClip: true,
            renderer: rulerRenderer,
            smoothFactor: 0
        },
        mouse: {
            color: '#fff',
            opacity: DG.Browser.vml ? 0.1 : 0,
            weight: DG.Browser.touch ? 40 : 20,
            pointerEvents: 'painted',
            noClip: true,
            renderer: DG.svg({pane: 'rulerEventPane'}),
            smoothFactor: 0
        }
    },
    iconStyles: {
        large: {
            back: {
                color: '#fff',
                opacity: 1,
                fillColor: '#fff',
                fillOpacity: 1,
                weight: 1,
                radius: 13,
                renderer: rulerRenderer
            },
            middle: {
                color: '#0da5d5',
                opacity: 1,
                fillColor: '#0da5d5',
                fillOpacity: 1,
                weight: 1,
                radius: 9,
                renderer: rulerRenderer
            },
            front: {
                color: '#fff',
                opacity: 1,
                fillColor: '#0da5d5',
                fillOpacity: 1,
                weight: 4,
                radius: 5,
                renderer: rulerRenderer
            }
        },
        small: {
            back: {
                color: '#fff',
                opacity: 1,
                fillColor: '#fff',
                fillOpacity: 1,
                weight: 1,
                radius: 9,
                renderer: rulerRenderer
            },
            middle: {
                color: '#0da5d5',
                opacity: 1,
                fillColor: '#0da5d5',
                fillOpacity: 1,
                weight: 1,
                radius: 5,
                renderer: rulerRenderer
            },
            front: {
                color: '#fff',
                opacity: 1,
                fillColor: '#0da5d5',
                fillOpacity: 1,
                weight: 4,
                radius: 2,
                renderer: rulerRenderer
            }
        }
    }
});

DG.Ruler.Dictionary.ru = {
	km : 'км',
	m : 'м',
	delimiter : ','
};

DG.Ruler.Dictionary.it = {
	km : 'km',
	m : 'm',
	delimiter : ','
};
DG.Ruler.Dictionary.cs = {
	km: 'km',
	m: 'm',
	delimiter: ','
};
DG.Ruler.Dictionary.es = {
	km : 'km',
	m : 'm',
	delimiter : ','
};
DG.Ruler.Dictionary.en = {
	km : 'km',
	m : 'm',
	delimiter : '.'
};

DG.Control.Ruler = DG.RoundControl.extend({

    options: {
        position: 'topright',
        iconClass: 'ruler'
    },

    statics: {
        Dictionary: {}
    },

    initialize: function (options) {
        DG.setOptions(this, options);
        DG.extend(this, {
            _active: false,
            _drawingHelper: null,
            _geoclickerNeedRestore: false
        }).on(this._controlEvents, this);
    },

    _controlEvents: {
        add: function () {
            this._drawingHelper = DG.ruler([]);
        },
        click: function () {
            this._active = !this._active;

            if (this._active) {
                this.setState('active');
                this._startDrawing();
            } else {
                this.setState('');
                this._finishDrawing();
            }
        },
        remove: function () {
            this.off(this._controlEvents, this);
            if (this._active) {
                this._map.removeLayer(this._drawingHelper);
                this._active = false;
            }
            this._drawingHelper = null;
        }
    },

    _startDrawing: function () { // ()
        this._map
            .addLayer(this._drawingHelper)
            .on('click', this._handleMapClick, this);

        this._map.fire('rulerstart');
    },

    _finishDrawing: function () { // ()
        this._map
            .off('click', this._handleMapClick, this)
            .removeLayer(this._drawingHelper);

        this._drawingHelper.setLatLngs([]);

        this._map.fire('rulerend');
    },

    _handleMapClick: function (event) { // (MouseEvents)
        this._drawingHelper.addLatLng(event.latlng);
    },

    _renderTranslation: function () { // ()
        this._link.title = this.t('button_title');
    }
});

DG.control.ruler = function (options) {
    return new DG.Control.Ruler(options);
};

DG.Control.Ruler.Dictionary.ru = {
	button_title: 'Линейка'
};
DG.Control.Ruler.Dictionary.it = {
	button_title : 'Righello'
};
DG.Control.Ruler.Dictionary.cs = {
	button_title: 'Pravítko'
};
DG.Control.Ruler.Dictionary.es = {
	button_title : 'Regla'
};

DG.Control.Ruler.Dictionary.en = {
	button_title : 'Ruler'
};DG.fallbackProjectsList = JSON.parse('[{"id":"99","name":"Dubai","type":"region","country_code":"ae","code":"dubai","domain":"ae","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"flamp":false},"time_zone":{"offset":240,"name":"Asia/Dubai"},"bounds":"POLYGON((54.869563 25.350048,55.674294 25.359495,55.680597 24.772487,54.879687 24.763287,54.869563 25.350048))"},{"id":"104","name":"Lefkosia","type":"region","country_code":"cy","code":"nicosia","domain":"com.cy","zoom_level":{"min":11,"max":19},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":false},"time_zone":{"offset":180,"name":"Asia/Nicosia"},"bounds":"POLYGON((33.269298 35.198771,33.444017 35.198256,33.443116 35.031957,33.268751 35.032469,33.269298 35.198771))"},{"id":"93","name":"Lemesos","type":"region","country_code":"cy","code":"limassol","domain":"com.cy","zoom_level":{"min":11,"max":19},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":false},"time_zone":{"offset":180,"name":"Asia/Nicosia"},"bounds":"POLYGON((32.818314 34.770361,33.190735 34.770347,33.190216 34.543829,32.818807 34.543842,32.818314 34.770361))"},{"id":"92","name":"Praha","type":"region","country_code":"cz","code":"praha","domain":"cz","zoom_level":{"min":10,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"flamp":false},"time_zone":{"offset":120,"name":"Europe/Prague"},"bounds":"POLYGON((14.215528 50.17879,14.713797 50.181086,14.715245 49.937173,14.219495 49.934897,14.215528 50.17879))"},{"id":"101","name":"Santiago","type":"region","country_code":"cl","code":"santiago","domain":"cl","zoom_level":{"min":9,"max":19},"flags":{"public_transport":true,"metro":true,"road_network":true,"flamp":false},"time_zone":{"offset":-240,"name":"America/Santiago"},"bounds":"POLYGON((-70.849333 -33.293334,-70.477276 -33.298315,-70.483526 -33.665691,-70.857156 -33.660641,-70.849333 -33.293334))"},{"id":"66","name":"Venezia e Padova","type":"region","country_code":"it","code":"padova","domain":"it","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":false,"flamp":false},"time_zone":{"offset":120,"name":"Europe/Rome"},"bounds":"POLYGON((11.381405 45.733677,12.61199 45.701369,12.572035 45.071338,11.355023 45.102947,11.381405 45.733677))"},{"id":"69","name":"Абакан","type":"region","country_code":"ru","code":"abakan","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":420,"name":"Asia/Krasnoyarsk"},"bounds":"POLYGON((91.144335 53.893079,91.817626 53.901599,91.826689 53.577496,91.158554 53.569076,91.144335 53.893079))"},{"id":"67","name":"Алматы","type":"region","country_code":"kz","code":"almaty","domain":"kz","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"flamp":false},"time_zone":{"offset":360,"name":"Asia/Qyzylorda"},"bounds":"POLYGON((76.725996 43.469106,77.1084 43.462692,77.096182 43.108051,76.715991 43.114387,76.725996 43.469106))"},{"id":"108","name":"Альметьевск","type":"region","country_code":"ru","code":"almetevsk","domain":"ru","zoom_level":{"min":9,"max":17},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((52.206024 54.949956,52.478673 54.946945,52.473189 54.796869,52.20155 54.799862,52.206024 54.949956))"},{"id":"106","name":"Армавир","type":"region","country_code":"ru","code":"armawir","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((40.876282 45.249443,41.322578 45.241236,41.301688 44.721791,40.8594 44.729852,40.876282 45.249443))"},{"id":"49","name":"Архангельск","type":"region","country_code":"ru","code":"arkhangelsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((39.467082 64.829966,41.321175 64.81257,41.276671 64.284305,39.458118 64.301294,39.467082 64.829966))"},{"id":"8","name":"Астрахань","type":"region","country_code":"ru","code":"astrakhan","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((47.863046 46.503348,48.172299 46.511418,48.185812 46.249257,47.878031 46.241259,47.863046 46.503348))"},{"id":"4","name":"Барнаул","type":"region","country_code":"ru","code":"barnaul","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":360,"name":"Asia/Omsk"},"bounds":"POLYGON((83.463814 53.486694,84.087934 53.472187,84.065362 53.158598,83.445792 53.172941,83.463814 53.486694))"},{"id":"46","name":"Белгород","type":"region","country_code":"ru","code":"belgorod","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((36.419278 50.695,36.719872 50.701271,36.729779 50.495879,36.430487 50.489654,36.419278 50.695))"},{"id":"20","name":"Бийск","type":"region","country_code":"ru","code":"biysk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":360,"name":"Asia/Omsk"},"bounds":"POLYGON((84.568894 52.63167,85.467428 52.646705,85.492485 51.91455,84.608614 51.899905,84.568894 52.63167))"},{"id":"52","name":"Благовещенск","type":"region","country_code":"ru","code":"blagoveshensk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":540,"name":"Asia/Yakutsk"},"bounds":"POLYGON((127.345035 50.596534,127.754667 50.601634,127.764413 50.228495,127.357983 50.223462,127.345035 50.596534))"},{"id":"51","name":"Братск","type":"region","country_code":"ru","code":"bratsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":480,"name":"Asia/Irkutsk"},"bounds":"POLYGON((101.08963 56.502619,102.059777 56.482497,102.016051 55.929923,101.059738 55.949632,101.08963 56.502619))"},{"id":"62","name":"Брянск","type":"region","country_code":"ru","code":"bryansk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((34.122949 53.431556,34.604425 53.426058,34.593689 53.138522,34.115433 53.143963,34.122949 53.431556))"},{"id":"77","name":"Великий Новгород","type":"region","country_code":"ru","code":"v_novgorod","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((31.131394 58.678746,31.505415 58.683631,31.514694 58.465262,31.142992 58.460419,31.131394 58.678746))"},{"id":"25","name":"Владивосток","type":"region","country_code":"ru","code":"vladivostok","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":600,"name":"Asia/Vladivostok"},"bounds":"POLYGON((131.592018 43.61615,132.343685 43.596619,132.300602 42.803446,131.558591 42.822446,131.592018 43.61615))"},{"id":"59","name":"Владимир","type":"region","country_code":"ru","code":"vladimir","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((40.178443 56.46782,40.695168 56.461839,40.676114 56.02824,40.165193 56.034124,40.178443 56.46782))"},{"id":"33","name":"Волгоград","type":"region","country_code":"ru","code":"volgograd","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((43.970586 48.922097,44.93003 48.92667,44.930865 48.318601,43.982875 48.314124,43.970586 48.922097))"},{"id":"78","name":"Вологда","type":"region","country_code":"ru","code":"vologda","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((39.611585 59.337288,40.077939 59.334266,40.072156 59.150523,39.608303 59.153523,39.611585 59.337288))"},{"id":"31","name":"Воронеж","type":"region","country_code":"ru","code":"voronezh","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((38.991159 51.910995,39.613084 51.909398,39.607251 51.475591,38.991243 51.477162,38.991159 51.910995))"},{"id":"27","name":"Горно-Алтайск","type":"region","country_code":"ru","code":"gornoaltaysk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":360,"name":"Asia/Omsk"},"bounds":"POLYGON((85.48461 52.148049,86.447524 52.15649,86.458369 51.25739,85.514346 51.249215,85.48461 52.148049))"},{"id":"105","name":"Днепропетровск","type":"region","country_code":"ua","code":"dnepropetrovsk","domain":"ua","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"flamp":false},"time_zone":{"offset":180,"name":"Europe/Kiev"},"bounds":"POLYGON((34.749305 48.687967,35.296754 48.67835,35.281569 48.341385,34.737734 48.350889,34.749305 48.687967))"},{"id":"79","name":"Донецк","type":"region","country_code":"ua","code":"donetsk","domain":"ua","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":false},"time_zone":{"offset":180,"name":"Europe/Kiev"},"bounds":"POLYGON((37.510511 48.182783,38.240528 48.189925,38.246188 47.802815,37.521609 47.795769,37.510511 48.182783))"},{"id":"9","name":"Екатеринбург","type":"region","country_code":"ru","code":"ekaterinburg","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((59.714357 57.010251,60.919831 57.036097,60.943224 56.611802,59.751258 56.586369,59.714357 57.010251))"},{"id":"65","name":"Иваново","type":"region","country_code":"ru","code":"ivanovo","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((40.806876 57.089556,41.189405 57.083456,41.17815 56.891313,40.797585 56.897369,40.806876 57.089556))"},{"id":"41","name":"Ижевск","type":"region","country_code":"ru","code":"izhevsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":240,"name":"Europe/Samara"},"bounds":"POLYGON((52.95169 57.057889,53.495625 57.04823,53.470393 56.667543,52.931947 56.677063,52.95169 57.057889))"},{"id":"11","name":"Иркутск","type":"region","country_code":"ru","code":"irkutsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":480,"name":"Asia/Irkutsk"},"bounds":"POLYGON((103.618853 52.641505,104.97019 52.649551,104.970807 51.718225,103.647397 51.710443,103.618853 52.641505))"},{"id":"70","name":"Йошкар-Ола","type":"region","country_code":"ru","code":"yoshkarola","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((47.588902 56.761482,48.153297 56.748478,48.133249 56.507529,47.572432 56.520416,47.588902 56.761482))"},{"id":"21","name":"Казань","type":"region","country_code":"ru","code":"kazan","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((48.29118 55.977651,49.519957 55.998532,49.535477 55.587187,48.319555 55.566624,48.29118 55.977651))"},{"id":"40","name":"Калининград","type":"region","country_code":"ru","code":"kaliningrad","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":120,"name":"Europe/Kaliningrad"},"bounds":"POLYGON((19.839082 55.05047,20.659199 55.055528,20.663516 54.5391,19.853784 54.534137,19.839082 55.05047))"},{"id":"61","name":"Калуга","type":"region","country_code":"ru","code":"kaluga","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((35.894812 54.75546,36.455305 54.768523,36.482233 54.33388,35.92765 54.321024,35.894812 54.75546))"},{"id":"109","name":"Каменск-Уральский","type":"region","country_code":"ru","code":"k_uralskiy","domain":"ru","zoom_level":{"min":9,"max":17},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((61.715751 56.571122,62.254705 56.57552,62.260467 56.279794,61.725677 56.275445,61.715751 56.571122))"},{"id":"84","name":"Караганда","type":"region","country_code":"kz","code":"karaganda","domain":"kz","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":false},"time_zone":{"offset":360,"name":"Asia/Qyzylorda"},"bounds":"POLYGON((72.860052 50.123995,73.394974 50.132623,73.41063 49.658415,72.880917 49.64993,72.860052 50.123995))"},{"id":"5","name":"Кемерово","type":"region","country_code":"ru","code":"kemerovo","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":420,"name":"Asia/Krasnoyarsk"},"bounds":"POLYGON((85.945012 55.531762,86.258641 55.534061,86.263664 55.26479,85.952159 55.262514,85.945012 55.531762))"},{"id":"58","name":"Киров","type":"region","country_code":"ru","code":"kirov","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((49.036766 58.786454,49.936128 58.797004,49.947791 58.410879,49.058278 58.400486,49.036766 58.786454))"},{"id":"94","name":"Комсомольск-на-Амуре","type":"region","country_code":"ru","code":"komsomolsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":600,"name":"Asia/Vladivostok"},"bounds":"POLYGON((136.792391 50.721413,137.258493 50.713313,137.233696 50.189815,136.772704 50.197767,136.792391 50.721413))"},{"id":"34","name":"Кострома","type":"region","country_code":"ru","code":"kostroma","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((40.733014 57.924383,41.151865 57.917978,41.137488 57.675732000000004,40.721431 57.682077,40.733014 57.924383))"},{"id":"23","name":"Краснодар","type":"region","country_code":"ru","code":"krasnodar","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((38.650083 45.265382,39.378568 45.26529,39.376448 44.943556,38.652043 44.943646,38.650083 45.265382))"},{"id":"7","name":"Красноярск","type":"region","country_code":"ru","code":"krasnoyarsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":420,"name":"Asia/Krasnoyarsk"},"bounds":"POLYGON((92.126846 56.306635,93.59929 56.308263,93.591657 55.813004,92.137966 55.811406,92.126846 56.306635))"},{"id":"10","name":"Курган","type":"region","country_code":"ru","code":"kurgan","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((65.163162 55.530273,65.482856 55.524208,65.473103 55.368657,65.154662 55.374687,65.163162 55.530273))"},{"id":"73","name":"Курск","type":"region","country_code":"ru","code":"kursk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((35.889369 51.829944,36.419837 51.842787,36.435346 51.569517,35.908055 51.556799,35.889369 51.829944))"},{"id":"86","name":"Ленинск-Кузнецкий","type":"region","country_code":"ru","code":"lenkuz","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":420,"name":"Asia/Novokuznetsk"},"bounds":"POLYGON((85.750103 54.768861,86.495701 54.774252,86.502903 54.184679,85.767947 54.179404,85.750103 54.768861))"},{"id":"56","name":"Липецк","type":"region","country_code":"ru","code":"lipetsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((39.376422 52.719879,39.82336 52.717618,39.819113 52.490547,39.37448 52.49279,39.376422 52.719879))"},{"id":"26","name":"Магнитогорск","type":"region","country_code":"ru","code":"magnitogorsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((58.547823 53.927025,59.504226 53.910884,59.464288 53.229865,58.523119 53.245612,58.547823 53.927025))"},{"id":"87","name":"Миасс","type":"region","country_code":"ru","code":"miass","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":false,"flamp":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((59.545734 55.280218,60.258398 55.263265,60.228026 54.888193,59.521985 54.904912,59.545734 55.280218))"},{"id":"32","name":"Москва","type":"region","country_code":"ru","code":"moscow","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((36.758963 56.091685,38.205281 56.109465,38.225024 55.121151,36.814587 55.104013,36.758963 56.091685))"},{"id":"96","name":"Мурманск","type":"region","country_code":"ru","code":"murmansk","domain":"ru","zoom_level":{"min":9,"max":17},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((32.701158 69.064619,33.225325 69.064731,33.222253 68.761176,32.705233 68.761065,32.701158 69.064619))"},{"id":"29","name":"Набережные Челны","type":"region","country_code":"ru","code":"nabchelny","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((51.717261 55.865183,52.62818 55.856503,52.614937 55.536675,51.711425 55.545253,51.717261 55.865183))"},{"id":"82","name":"Находка","type":"region","country_code":"ru","code":"nahodka","domain":"ru","zoom_level":{"min":10,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":600,"name":"Asia/Vladivostok"},"bounds":"POLYGON((132.750811 42.90212,133.241339 42.91071,133.248191 42.668281,132.759571 42.659764,132.750811 42.90212))"},{"id":"12","name":"Нижневартовск","type":"region","country_code":"ru","code":"nizhnevartovsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((75.931826 61.190935,77.028583 61.178948,77.007766 60.851181,75.922257 60.863009,75.931826 61.190935))"},{"id":"19","name":"Нижний Новгород","type":"region","country_code":"ru","code":"n_novgorod","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((43.297073 56.468016,44.247071 56.477411,44.254811 56.081492,43.31457 56.072236,43.297073 56.468016))"},{"id":"45","name":"Нижний Тагил","type":"region","country_code":"ru","code":"ntagil","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((59.788601 58.091707,60.347887 58.078228,60.317394 57.749299,59.763185 57.762607,59.788601 58.091707))"},{"id":"6","name":"Новокузнецк","type":"region","country_code":"ru","code":"novokuznetsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":420,"name":"Asia/Novokuznetsk"},"bounds":"POLYGON((86.510624 54.121371,87.463656 54.121473,87.456823 53.497654,86.517836 53.497554,86.510624 54.121371))"},{"id":"74","name":"Новороссийск","type":"region","country_code":"ru","code":"novorossiysk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((36.936306 45.204638,38.668167 45.222804,38.673277 44.323572,36.968059 44.305963,36.936306 45.204638))"},{"id":"1","name":"Новосибирск","type":"region","country_code":"ru","code":"novosibirsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":360,"name":"Asia/Novosibirsk"},"bounds":"POLYGON((82.532331 55.249038,83.396534 55.235123,83.356355 54.553032,82.506623 54.566601,82.532331 55.249038))"},{"id":"76","name":"Норильск","type":"region","country_code":"ru","code":"norilsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":420,"name":"Asia/Krasnoyarsk"},"bounds":"POLYGON((85.986318 69.559455,88.551918 69.555507,88.529535 69.242435,86.000942 69.246318,85.986318 69.559455))"},{"id":"103","name":"Ноябрьск","type":"region","country_code":"ru","code":"noyabrsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((74.30478 63.879187,76.263372 63.875343,76.226155 63.018251,74.325265 63.021954,74.30478 63.879187))"},{"id":"14","name":"Одесса","type":"region","country_code":"ua","code":"odessa","domain":"ua","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":false},"time_zone":{"offset":180,"name":"Europe/Kiev"},"bounds":"POLYGON((30.512168 46.64901,30.896094 46.656718,30.911286 46.261025,30.530126 46.253422,30.512168 46.64901))"},{"id":"2","name":"Омск","type":"region","country_code":"ru","code":"omsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":360,"name":"Asia/Omsk"},"bounds":"POLYGON((72.883518 55.40568,73.752471 55.417631,73.771665 54.796804,72.916062 54.785124,72.883518 55.40568))"},{"id":"48","name":"Оренбург","type":"region","country_code":"ru","code":"orenburg","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((54.920411 51.927322,55.487422 51.935975,55.496231 51.672052,54.932517 51.663479,54.920411 51.927322))"},{"id":"71","name":"Орёл","type":"region","country_code":"ru","code":"orel","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((35.870923 53.103739,36.315298 53.092181,36.295963 52.838995,35.85417 52.850448,35.870923 53.103739))"},{"id":"42","name":"Пенза","type":"region","country_code":"ru","code":"penza","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((44.795477 53.349082,45.358809 53.348717,45.356452 53.065566,44.796821 53.065926,44.795477 53.349082))"},{"id":"16","name":"Пермь","type":"region","country_code":"ru","code":"perm","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((55.610475 58.236816,56.656815 58.243911,56.66204 57.69294,55.631622 57.685995,55.610475 58.236816))"},{"id":"80","name":"Петрозаводск","type":"region","country_code":"ru","code":"petrozavodsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((34.102723 61.959477,34.70885 61.953295,34.694352 61.691472,34.093364 61.697587,34.102723 61.959477))"},{"id":"95","name":"Петропавловск-Камчатский","type":"region","country_code":"ru","code":"p_kamchatskiy","domain":"ru","zoom_level":{"min":9,"max":17},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":720,"name":"Asia/Kamchatka"},"bounds":"POLYGON((158.195687 53.346954,159.025519 53.349662,159.02523 52.858368,158.204799 52.855708,158.195687 53.346954))"},{"id":"90","name":"Псков","type":"region","country_code":"ru","code":"pskov","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((28.168619 57.889106,28.491531 57.885724,28.484999 57.727138,28.1635 57.7305,28.168619 57.889106))"},{"id":"89","name":"Пятигорск (КМВ)","type":"region","country_code":"ru","code":"minvody","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((42.596866 44.289522,43.518712 44.305202,43.530679 43.823418,42.616267 43.807998,42.596866 44.289522))"},{"id":"24","name":"Ростов-на-Дону","type":"region","country_code":"ru","code":"rostov","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((39.358722 47.368152,39.924838 47.364983,39.919435 47.053314,39.356627 47.05645,39.358722 47.368152))"},{"id":"44","name":"Рязань","type":"region","country_code":"ru","code":"ryazan","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((39.40589 54.882191,39.992107 54.878818,39.982606 54.487343,39.402002 54.490668,39.40589 54.882191))"},{"id":"18","name":"Самара","type":"region","country_code":"ru","code":"samara","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":240,"name":"Europe/Samara"},"bounds":"POLYGON((49.777726 53.708125,50.516957 53.713386,50.524471 53.044185,49.796735 53.03905,49.777726 53.708125))"},{"id":"38","name":"Санкт-Петербург","type":"region","country_code":"ru","code":"spb","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":true,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((29.410888 60.259339,30.98445 60.292561,31.027971 59.567535,29.488251 59.535262,29.410888 60.259339))"},{"id":"85","name":"Саранск","type":"region","country_code":"ru","code":"saransk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((44.867017 54.301903,45.51172 54.300891,45.507836 53.984632,44.868026 53.985633,44.867017 54.301903))"},{"id":"43","name":"Саратов","type":"region","country_code":"ru","code":"saratov","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((45.7361 51.699809,46.314773 51.694758,46.304971 51.353163,45.730611 51.358153,45.7361 51.699809))"},{"id":"63","name":"Смоленск","type":"region","country_code":"ru","code":"smolensk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((31.755002 54.885154,32.265103 54.889311,32.268673 54.692002,31.761048 54.687875,31.755002 54.885154))"},{"id":"30","name":"Сочи","type":"region","country_code":"ru","code":"sochi","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((38.93648 44.354812,40.488511 44.34513,40.464281 43.36325,38.937514 43.372607,38.93648 44.354812))"},{"id":"57","name":"Ставрополь","type":"region","country_code":"ru","code":"stavropol","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((41.658117 45.252393,42.307255 45.269558,42.324115 44.909882,41.679025 44.89293,41.658117 45.252393))"},{"id":"60","name":"Старый Оскол","type":"region","country_code":"ru","code":"staroskol","domain":"ru","zoom_level":{"min":10,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((37.744862 51.375661,37.979312 51.377938,37.982166 51.249129,37.748371 51.246862,37.744862 51.375661))"},{"id":"54","name":"Стерлитамак","type":"region","country_code":"ru","code":"sterlitamak","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((55.805672 53.734238,56.123975 53.736987,56.13283 53.305583,55.817744 53.302876,55.805672 53.734238))"},{"id":"39","name":"Сургут","type":"region","country_code":"ru","code":"surgut","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((72.38176 61.388553,73.781358 61.408288,73.797164 60.996565,72.41568 60.977161,72.38176 61.388553))"},{"id":"72","name":"Сыктывкар","type":"region","country_code":"ru","code":"syktyvkar","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((50.431525 61.921812,51.27508 61.92271,51.271963 61.571227,50.437968 61.570342,50.431525 61.921812))"},{"id":"81","name":"Тамбов","type":"region","country_code":"ru","code":"tambov","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((41.282289 52.826563,41.60158 52.819991,41.58624 52.561316,41.268828 52.567827,41.282289 52.826563))"},{"id":"47","name":"Тверь","type":"region","country_code":"ru","code":"tver","domain":"ru","zoom_level":{"min":9,"max":17},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((35.531082 56.998794,36.290293 57.017546,36.3143 56.68411,35.561787 56.665594,35.531082 56.998794))"},{"id":"97","name":"Тобольск","type":"region","country_code":"ru","code":"tobolsk","domain":"ru","zoom_level":{"min":9,"max":17},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((68.027461 58.334051,68.627747 58.337205,68.630591 58.064257,68.03489 58.061137,68.027461 58.334051))"},{"id":"22","name":"Тольятти","type":"region","country_code":"ru","code":"togliatti","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true},"time_zone":{"offset":240,"name":"Europe/Samara"},"bounds":"POLYGON((48.961827 53.69702,49.777726 53.708125,49.796735 53.03905,48.993508 53.028211,48.961827 53.69702))"},{"id":"3","name":"Томск","type":"region","country_code":"ru","code":"tomsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":360,"name":"Asia/Omsk"},"bounds":"POLYGON((84.768656 56.588195,85.235419 56.595694,85.246532 56.355457,84.782704 56.348026,84.768656 56.588195))"},{"id":"36","name":"Тула","type":"region","country_code":"ru","code":"tula","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((37.414045 54.309532,38.415847 54.318543,38.421585 53.908416,37.429616 53.899539,37.414045 54.309532))"},{"id":"13","name":"Тюмень","type":"region","country_code":"ru","code":"tyumen","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((65.263355 57.26989,66.690851 57.236046,66.609235 56.397678,65.213221 56.430463,65.263355 57.26989))"},{"id":"37","name":"Улан-Удэ","type":"region","country_code":"ru","code":"ulanude","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":480,"name":"Asia/Irkutsk"},"bounds":"POLYGON((107.376889 52.056483,107.990789 52.042492,107.96757 51.691351,107.358424 51.705168,107.376889 52.056483))"},{"id":"55","name":"Ульяновск","type":"region","country_code":"ru","code":"ulyanovsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((48.031111 54.455092,48.755444 54.470724,48.774425 54.120417,48.056197 54.104983,48.031111 54.455092))"},{"id":"83","name":"Уссурийск","type":"region","country_code":"ru","code":"ussuriysk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":600,"name":"Asia/Vladivostok"},"bounds":"POLYGON((131.749241 43.961672,132.129905 43.971877,132.142052 43.718194,131.762993 43.708079,131.749241 43.961672))"},{"id":"91","name":"Усть-Каменогорск","type":"region","country_code":"kz","code":"ustkam","domain":"kz","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":false},"time_zone":{"offset":360,"name":"Asia/Qyzylorda"},"bounds":"POLYGON((82.450724 50.059192,82.805718 50.054212,82.798391 49.857959,82.444837 49.862905,82.450724 50.059192))"},{"id":"17","name":"Уфа","type":"region","country_code":"ru","code":"ufa","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((55.715089999999996 54.952485,56.304346 54.957284,56.312416 54.48324,55.729992 54.478524,55.715089999999996 54.952485))"},{"id":"35","name":"Хабаровск","type":"region","country_code":"ru","code":"khabarovsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":600,"name":"Asia/Vladivostok"},"bounds":"POLYGON((134.873582 48.607104,135.259036 48.606882,135.257422 48.288578,134.87437 48.288797,134.873582 48.607104))"},{"id":"110","name":"Харьков","type":"region","country_code":"ua","code":"kharkov","domain":"ua","zoom_level":{"min":9,"max":17},"flags":{"public_transport":true,"metro":true,"road_network":true,"flamp":false},"time_zone":{"offset":180,"name":"Europe/Kiev"},"bounds":"POLYGON((36.031103 50.115121,36.467033 50.125456,36.481687 49.845767,36.048271 49.835534,36.031103 50.115121))"},{"id":"53","name":"Чебоксары","type":"region","country_code":"ru","code":"cheboksary","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((47.00778 56.342026,47.60576 56.33089,47.58216 55.980845,46.989586 55.991836,47.00778 56.342026))"},{"id":"15","name":"Челябинск","type":"region","country_code":"ru","code":"chelyabinsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"traffic":true,"flamp":true,"has_net_booklet":true},"time_zone":{"offset":300,"name":"Asia/Yekaterinburg"},"bounds":"POLYGON((61.185486 55.312905,61.734408 55.319826,61.74458 54.997301,61.200066 54.990462,61.185486 55.312905))"},{"id":"64","name":"Чита","type":"region","country_code":"ru","code":"chita","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":480,"name":"Asia/Chita"},"bounds":"POLYGON((113.113845 52.186114,113.639184 52.175527,113.624543 51.926502,113.102112 51.936996,113.113845 52.186114))"},{"id":"88","name":"Южно-Сахалинск","type":"region","country_code":"ru","code":"yuzhnosakhalinsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":600,"name":"Asia/Vladivostok"},"bounds":"POLYGON((142.47294 47.515634,142.971758 47.50814,142.937954 46.583209,142.44768 46.590465,142.47294 47.515634))"},{"id":"50","name":"Якутск","type":"region","country_code":"ru","code":"yakutsk","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":540,"name":"Asia/Yakutsk"},"bounds":"POLYGON((129.532475 62.187831,129.992303 62.185302,129.979868 61.800501,129.525802 61.80299,129.532475 62.187831))"},{"id":"28","name":"Ярославль","type":"region","country_code":"ru","code":"yaroslavl","domain":"ru","zoom_level":{"min":9,"max":18},"flags":{"public_transport":true,"metro":false,"road_network":true,"flamp":true},"time_zone":{"offset":180,"name":"Europe/Moscow"},"bounds":"POLYGON((39.722892 57.776199,40.012883 57.774213,40.005807 57.519309,39.717841 57.521275,39.722892 57.776199))"}]')}(this, document));
