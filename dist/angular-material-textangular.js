/**
 * Rangy, a cross-browser JavaScript range and selection library
 * https://github.com/timdown/rangy
 *
 * Copyright 2015, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3.0
 * Build date: 10 May 2015
 */

(function(factory, root) {
    if (typeof define == "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else if (typeof module != "undefined" && typeof exports == "object") {
        // Node/CommonJS style
        module.exports = factory();
    } else {
        // No AMD or CommonJS support so we place Rangy in (probably) the global variable
        root.rangy = factory();
    }
})(function() {

    var OBJECT = "object", FUNCTION = "function", UNDEFINED = "undefined";

    // Minimal set of properties required for DOM Level 2 Range compliance. Comparison constants such as START_TO_START
    // are omitted because ranges in KHTML do not have them but otherwise work perfectly well. See issue 113.
    var domRangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
        "commonAncestorContainer"];

    // Minimal set of methods required for DOM Level 2 Range compliance
    var domRangeMethods = ["setStart", "setStartBefore", "setStartAfter", "setEnd", "setEndBefore",
        "setEndAfter", "collapse", "selectNode", "selectNodeContents", "compareBoundaryPoints", "deleteContents",
        "extractContents", "cloneContents", "insertNode", "surroundContents", "cloneRange", "toString", "detach"];

    var textRangeProperties = ["boundingHeight", "boundingLeft", "boundingTop", "boundingWidth", "htmlText", "text"];

    // Subset of TextRange's full set of methods that we're interested in
    var textRangeMethods = ["collapse", "compareEndPoints", "duplicate", "moveToElementText", "parentElement", "select",
        "setEndPoint", "getBoundingClientRect"];

    /*----------------------------------------------------------------------------------------------------------------*/

    // Trio of functions taken from Peter Michaux's article:
    // http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
    function isHostMethod(o, p) {
        var t = typeof o[p];
        return t == FUNCTION || (!!(t == OBJECT && o[p])) || t == "unknown";
    }

    function isHostObject(o, p) {
        return !!(typeof o[p] == OBJECT && o[p]);
    }

    function isHostProperty(o, p) {
        return typeof o[p] != UNDEFINED;
    }

    // Creates a convenience function to save verbose repeated calls to tests functions
    function createMultiplePropertyTest(testFunc) {
        return function(o, props) {
            var i = props.length;
            while (i--) {
                if (!testFunc(o, props[i])) {
                    return false;
                }
            }
            return true;
        };
    }

    // Next trio of functions are a convenience to save verbose repeated calls to previous two functions
    var areHostMethods = createMultiplePropertyTest(isHostMethod);
    var areHostObjects = createMultiplePropertyTest(isHostObject);
    var areHostProperties = createMultiplePropertyTest(isHostProperty);

    function isTextRange(range) {
        return range && areHostMethods(range, textRangeMethods) && areHostProperties(range, textRangeProperties);
    }

    function getBody(doc) {
        return isHostObject(doc, "body") ? doc.body : doc.getElementsByTagName("body")[0];
    }

    var forEach = [].forEach ?
        function(arr, func) {
            arr.forEach(func);
        } :
        function(arr, func) {
            for (var i = 0, len = arr.length; i < len; ++i) {
                func(arr[i], i);
            }
        };

    var modules = {};

    var isBrowser = (typeof window != UNDEFINED && typeof document != UNDEFINED);

    var util = {
        isHostMethod: isHostMethod,
        isHostObject: isHostObject,
        isHostProperty: isHostProperty,
        areHostMethods: areHostMethods,
        areHostObjects: areHostObjects,
        areHostProperties: areHostProperties,
        isTextRange: isTextRange,
        getBody: getBody,
        forEach: forEach
    };

    var api = {
        version: "1.3.0",
        initialized: false,
        isBrowser: isBrowser,
        supported: true,
        util: util,
        features: {},
        modules: modules,
        config: {
            alertOnFail: false,
            alertOnWarn: false,
            preferTextRange: false,
            autoInitialize: (typeof rangyAutoInitialize == UNDEFINED) ? true : rangyAutoInitialize
        }
    };

    function consoleLog(msg) {
        if (typeof console != UNDEFINED && isHostMethod(console, "log")) {
            console.log(msg);
        }
    }

    function alertOrLog(msg, shouldAlert) {
        if (isBrowser && shouldAlert) {
            alert(msg);
        } else  {
            consoleLog(msg);
        }
    }

    function fail(reason) {
        api.initialized = true;
        api.supported = false;
        alertOrLog("Rangy is not supported in this environment. Reason: " + reason, api.config.alertOnFail);
    }

    api.fail = fail;

    function warn(msg) {
        alertOrLog("Rangy warning: " + msg, api.config.alertOnWarn);
    }

    api.warn = warn;

    // Add utility extend() method
    var extend;
    if ({}.hasOwnProperty) {
        util.extend = extend = function(obj, props, deep) {
            var o, p;
            for (var i in props) {
                if (props.hasOwnProperty(i)) {
                    o = obj[i];
                    p = props[i];
                    if (deep && o !== null && typeof o == "object" && p !== null && typeof p == "object") {
                        extend(o, p, true);
                    }
                    obj[i] = p;
                }
            }
            // Special case for toString, which does not show up in for...in loops in IE <= 8
            if (props.hasOwnProperty("toString")) {
                obj.toString = props.toString;
            }
            return obj;
        };

        util.createOptions = function(optionsParam, defaults) {
            var options = {};
            extend(options, defaults);
            if (optionsParam) {
                extend(options, optionsParam);
            }
            return options;
        };
    } else {
        fail("hasOwnProperty not supported");
    }

    // Test whether we're in a browser and bail out if not
    if (!isBrowser) {
        fail("Rangy can only run in a browser");
    }

    // Test whether Array.prototype.slice can be relied on for NodeLists and use an alternative toArray() if not
    (function() {
        var toArray;

        if (isBrowser) {
            var el = document.createElement("div");
            el.appendChild(document.createElement("span"));
            var slice = [].slice;
            try {
                if (slice.call(el.childNodes, 0)[0].nodeType == 1) {
                    toArray = function(arrayLike) {
                        return slice.call(arrayLike, 0);
                    };
                }
            } catch (e) {}
        }

        if (!toArray) {
            toArray = function(arrayLike) {
                var arr = [];
                for (var i = 0, len = arrayLike.length; i < len; ++i) {
                    arr[i] = arrayLike[i];
                }
                return arr;
            };
        }

        util.toArray = toArray;
    })();

    // Very simple event handler wrapper function that doesn't attempt to solve issues such as "this" handling or
    // normalization of event properties
    var addListener;
    if (isBrowser) {
        if (isHostMethod(document, "addEventListener")) {
            addListener = function(obj, eventType, listener) {
                obj.addEventListener(eventType, listener, false);
            };
        } else if (isHostMethod(document, "attachEvent")) {
            addListener = function(obj, eventType, listener) {
                obj.attachEvent("on" + eventType, listener);
            };
        } else {
            fail("Document does not have required addEventListener or attachEvent method");
        }

        util.addListener = addListener;
    }

    var initListeners = [];

    function getErrorDesc(ex) {
        return ex.message || ex.description || String(ex);
    }

    // Initialization
    function init() {
        if (!isBrowser || api.initialized) {
            return;
        }
        var testRange;
        var implementsDomRange = false, implementsTextRange = false;

        // First, perform basic feature tests

        if (isHostMethod(document, "createRange")) {
            testRange = document.createRange();
            if (areHostMethods(testRange, domRangeMethods) && areHostProperties(testRange, domRangeProperties)) {
                implementsDomRange = true;
            }
        }

        var body = getBody(document);
        if (!body || body.nodeName.toLowerCase() != "body") {
            fail("No body element found");
            return;
        }

        if (body && isHostMethod(body, "createTextRange")) {
            testRange = body.createTextRange();
            if (isTextRange(testRange)) {
                implementsTextRange = true;
            }
        }

        if (!implementsDomRange && !implementsTextRange) {
            fail("Neither Range nor TextRange are available");
            return;
        }

        api.initialized = true;
        api.features = {
            implementsDomRange: implementsDomRange,
            implementsTextRange: implementsTextRange
        };

        // Initialize modules
        var module, errorMessage;
        for (var moduleName in modules) {
            if ( (module = modules[moduleName]) instanceof Module ) {
                module.init(module, api);
            }
        }

        // Call init listeners
        for (var i = 0, len = initListeners.length; i < len; ++i) {
            try {
                initListeners[i](api);
            } catch (ex) {
                errorMessage = "Rangy init listener threw an exception. Continuing. Detail: " + getErrorDesc(ex);
                consoleLog(errorMessage);
            }
        }
    }

    function deprecationNotice(deprecated, replacement, module) {
        if (module) {
            deprecated += " in module " + module.name;
        }
        api.warn("DEPRECATED: " + deprecated + " is deprecated. Please use " +
        replacement + " instead.");
    }

    function createAliasForDeprecatedMethod(owner, deprecated, replacement, module) {
        owner[deprecated] = function() {
            deprecationNotice(deprecated, replacement, module);
            return owner[replacement].apply(owner, util.toArray(arguments));
        };
    }

    util.deprecationNotice = deprecationNotice;
    util.createAliasForDeprecatedMethod = createAliasForDeprecatedMethod;

    // Allow external scripts to initialize this library in case it's loaded after the document has loaded
    api.init = init;

    // Execute listener immediately if already initialized
    api.addInitListener = function(listener) {
        if (api.initialized) {
            listener(api);
        } else {
            initListeners.push(listener);
        }
    };

    var shimListeners = [];

    api.addShimListener = function(listener) {
        shimListeners.push(listener);
    };

    function shim(win) {
        win = win || window;
        init();

        // Notify listeners
        for (var i = 0, len = shimListeners.length; i < len; ++i) {
            shimListeners[i](win);
        }
    }

    if (isBrowser) {
        api.shim = api.createMissingNativeApi = shim;
        createAliasForDeprecatedMethod(api, "createMissingNativeApi", "shim");
    }

    function Module(name, dependencies, initializer) {
        this.name = name;
        this.dependencies = dependencies;
        this.initialized = false;
        this.supported = false;
        this.initializer = initializer;
    }

    Module.prototype = {
        init: function() {
            var requiredModuleNames = this.dependencies || [];
            for (var i = 0, len = requiredModuleNames.length, requiredModule, moduleName; i < len; ++i) {
                moduleName = requiredModuleNames[i];

                requiredModule = modules[moduleName];
                if (!requiredModule || !(requiredModule instanceof Module)) {
                    throw new Error("required module '" + moduleName + "' not found");
                }

                requiredModule.init();

                if (!requiredModule.supported) {
                    throw new Error("required module '" + moduleName + "' not supported");
                }
            }

            // Now run initializer
            this.initializer(this);
        },

        fail: function(reason) {
            this.initialized = true;
            this.supported = false;
            throw new Error(reason);
        },

        warn: function(msg) {
            api.warn("Module " + this.name + ": " + msg);
        },

        deprecationNotice: function(deprecated, replacement) {
            api.warn("DEPRECATED: " + deprecated + " in module " + this.name + " is deprecated. Please use " +
                replacement + " instead");
        },

        createError: function(msg) {
            return new Error("Error in Rangy " + this.name + " module: " + msg);
        }
    };

    function createModule(name, dependencies, initFunc) {
        var newModule = new Module(name, dependencies, function(module) {
            if (!module.initialized) {
                module.initialized = true;
                try {
                    initFunc(api, module);
                    module.supported = true;
                } catch (ex) {
                    var errorMessage = "Module '" + name + "' failed to load: " + getErrorDesc(ex);
                    consoleLog(errorMessage);
                    if (ex.stack) {
                        consoleLog(ex.stack);
                    }
                }
            }
        });
        modules[name] = newModule;
        return newModule;
    }

    api.createModule = function(name) {
        // Allow 2 or 3 arguments (second argument is an optional array of dependencies)
        var initFunc, dependencies;
        if (arguments.length == 2) {
            initFunc = arguments[1];
            dependencies = [];
        } else {
            initFunc = arguments[2];
            dependencies = arguments[1];
        }

        var module = createModule(name, dependencies, initFunc);

        // Initialize the module immediately if the core is already initialized
        if (api.initialized && api.supported) {
            module.init();
        }
    };

    api.createCoreModule = function(name, dependencies, initFunc) {
        createModule(name, dependencies, initFunc);
    };

    /*----------------------------------------------------------------------------------------------------------------*/

    // Ensure rangy.rangePrototype and rangy.selectionPrototype are available immediately

    function RangePrototype() {}
    api.RangePrototype = RangePrototype;
    api.rangePrototype = new RangePrototype();

    function SelectionPrototype() {}
    api.selectionPrototype = new SelectionPrototype();

    /*----------------------------------------------------------------------------------------------------------------*/

    // DOM utility methods used by Rangy
    api.createCoreModule("DomUtil", [], function(api, module) {
        var UNDEF = "undefined";
        var util = api.util;
        var getBody = util.getBody;

        // Perform feature tests
        if (!util.areHostMethods(document, ["createDocumentFragment", "createElement", "createTextNode"])) {
            module.fail("document missing a Node creation method");
        }

        if (!util.isHostMethod(document, "getElementsByTagName")) {
            module.fail("document missing getElementsByTagName method");
        }

        var el = document.createElement("div");
        if (!util.areHostMethods(el, ["insertBefore", "appendChild", "cloneNode"] ||
                !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]))) {
            module.fail("Incomplete Element implementation");
        }

        // innerHTML is required for Range's createContextualFragment method
        if (!util.isHostProperty(el, "innerHTML")) {
            module.fail("Element is missing innerHTML property");
        }

        var textNode = document.createTextNode("test");
        if (!util.areHostMethods(textNode, ["splitText", "deleteData", "insertData", "appendData", "cloneNode"] ||
                !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]) ||
                !util.areHostProperties(textNode, ["data"]))) {
            module.fail("Incomplete Text Node implementation");
        }

        /*----------------------------------------------------------------------------------------------------------------*/

        // Removed use of indexOf because of a bizarre bug in Opera that is thrown in one of the Acid3 tests. I haven't been
        // able to replicate it outside of the test. The bug is that indexOf returns -1 when called on an Array that
        // contains just the document as a single element and the value searched for is the document.
        var arrayContains = /*Array.prototype.indexOf ?
            function(arr, val) {
                return arr.indexOf(val) > -1;
            }:*/

            function(arr, val) {
                var i = arr.length;
                while (i--) {
                    if (arr[i] === val) {
                        return true;
                    }
                }
                return false;
            };

        // Opera 11 puts HTML elements in the null namespace, it seems, and IE 7 has undefined namespaceURI
        function isHtmlNamespace(node) {
            var ns;
            return typeof node.namespaceURI == UNDEF || ((ns = node.namespaceURI) === null || ns == "http://www.w3.org/1999/xhtml");
        }

        function parentElement(node) {
            var parent = node.parentNode;
            return (parent.nodeType == 1) ? parent : null;
        }

        function getNodeIndex(node) {
            var i = 0;
            while( (node = node.previousSibling) ) {
                ++i;
            }
            return i;
        }

        function getNodeLength(node) {
            switch (node.nodeType) {
                case 7:
                case 10:
                    return 0;
                case 3:
                case 8:
                    return node.length;
                default:
                    return node.childNodes.length;
            }
        }

        function getCommonAncestor(node1, node2) {
            var ancestors = [], n;
            for (n = node1; n; n = n.parentNode) {
                ancestors.push(n);
            }

            for (n = node2; n; n = n.parentNode) {
                if (arrayContains(ancestors, n)) {
                    return n;
                }
            }

            return null;
        }

        function isAncestorOf(ancestor, descendant, selfIsAncestor) {
            var n = selfIsAncestor ? descendant : descendant.parentNode;
            while (n) {
                if (n === ancestor) {
                    return true;
                } else {
                    n = n.parentNode;
                }
            }
            return false;
        }

        function isOrIsAncestorOf(ancestor, descendant) {
            return isAncestorOf(ancestor, descendant, true);
        }

        function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
            var p, n = selfIsAncestor ? node : node.parentNode;
            while (n) {
                p = n.parentNode;
                if (p === ancestor) {
                    return n;
                }
                n = p;
            }
            return null;
        }

        function isCharacterDataNode(node) {
            var t = node.nodeType;
            return t == 3 || t == 4 || t == 8 ; // Text, CDataSection or Comment
        }

        function isTextOrCommentNode(node) {
            if (!node) {
                return false;
            }
            var t = node.nodeType;
            return t == 3 || t == 8 ; // Text or Comment
        }

        function insertAfter(node, precedingNode) {
            var nextNode = precedingNode.nextSibling, parent = precedingNode.parentNode;
            if (nextNode) {
                parent.insertBefore(node, nextNode);
            } else {
                parent.appendChild(node);
            }
            return node;
        }

        // Note that we cannot use splitText() because it is bugridden in IE 9.
        function splitDataNode(node, index, positionsToPreserve) {
            var newNode = node.cloneNode(false);
            newNode.deleteData(0, index);
            node.deleteData(index, node.length - index);
            insertAfter(newNode, node);

            // Preserve positions
            if (positionsToPreserve) {
                for (var i = 0, position; position = positionsToPreserve[i++]; ) {
                    // Handle case where position was inside the portion of node after the split point
                    if (position.node == node && position.offset > index) {
                        position.node = newNode;
                        position.offset -= index;
                    }
                    // Handle the case where the position is a node offset within node's parent
                    else if (position.node == node.parentNode && position.offset > getNodeIndex(node)) {
                        ++position.offset;
                    }
                }
            }
            return newNode;
        }

        function getDocument(node) {
            if (node.nodeType == 9) {
                return node;
            } else if (typeof node.ownerDocument != UNDEF) {
                return node.ownerDocument;
            } else if (typeof node.document != UNDEF) {
                return node.document;
            } else if (node.parentNode) {
                return getDocument(node.parentNode);
            } else {
                throw module.createError("getDocument: no document found for node");
            }
        }

        function getWindow(node) {
            var doc = getDocument(node);
            if (typeof doc.defaultView != UNDEF) {
                return doc.defaultView;
            } else if (typeof doc.parentWindow != UNDEF) {
                return doc.parentWindow;
            } else {
                throw module.createError("Cannot get a window object for node");
            }
        }

        function getIframeDocument(iframeEl) {
            if (typeof iframeEl.contentDocument != UNDEF) {
                return iframeEl.contentDocument;
            } else if (typeof iframeEl.contentWindow != UNDEF) {
                return iframeEl.contentWindow.document;
            } else {
                throw module.createError("getIframeDocument: No Document object found for iframe element");
            }
        }

        function getIframeWindow(iframeEl) {
            if (typeof iframeEl.contentWindow != UNDEF) {
                return iframeEl.contentWindow;
            } else if (typeof iframeEl.contentDocument != UNDEF) {
                return iframeEl.contentDocument.defaultView;
            } else {
                throw module.createError("getIframeWindow: No Window object found for iframe element");
            }
        }

        // This looks bad. Is it worth it?
        function isWindow(obj) {
            return obj && util.isHostMethod(obj, "setTimeout") && util.isHostObject(obj, "document");
        }

        function getContentDocument(obj, module, methodName) {
            var doc;

            if (!obj) {
                doc = document;
            }

            // Test if a DOM node has been passed and obtain a document object for it if so
            else if (util.isHostProperty(obj, "nodeType")) {
                doc = (obj.nodeType == 1 && obj.tagName.toLowerCase() == "iframe") ?
                    getIframeDocument(obj) : getDocument(obj);
            }

            // Test if the doc parameter appears to be a Window object
            else if (isWindow(obj)) {
                doc = obj.document;
            }

            if (!doc) {
                throw module.createError(methodName + "(): Parameter must be a Window object or DOM node");
            }

            return doc;
        }

        function getRootContainer(node) {
            var parent;
            while ( (parent = node.parentNode) ) {
                node = parent;
            }
            return node;
        }

        function comparePoints(nodeA, offsetA, nodeB, offsetB) {
            // See http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Comparing
            var nodeC, root, childA, childB, n;
            if (nodeA == nodeB) {
                // Case 1: nodes are the same
                return offsetA === offsetB ? 0 : (offsetA < offsetB) ? -1 : 1;
            } else if ( (nodeC = getClosestAncestorIn(nodeB, nodeA, true)) ) {
                // Case 2: node C (container B or an ancestor) is a child node of A
                return offsetA <= getNodeIndex(nodeC) ? -1 : 1;
            } else if ( (nodeC = getClosestAncestorIn(nodeA, nodeB, true)) ) {
                // Case 3: node C (container A or an ancestor) is a child node of B
                return getNodeIndex(nodeC) < offsetB  ? -1 : 1;
            } else {
                root = getCommonAncestor(nodeA, nodeB);
                if (!root) {
                    throw new Error("comparePoints error: nodes have no common ancestor");
                }

                // Case 4: containers are siblings or descendants of siblings
                childA = (nodeA === root) ? root : getClosestAncestorIn(nodeA, root, true);
                childB = (nodeB === root) ? root : getClosestAncestorIn(nodeB, root, true);

                if (childA === childB) {
                    // This shouldn't be possible
                    throw module.createError("comparePoints got to case 4 and childA and childB are the same!");
                } else {
                    n = root.firstChild;
                    while (n) {
                        if (n === childA) {
                            return -1;
                        } else if (n === childB) {
                            return 1;
                        }
                        n = n.nextSibling;
                    }
                }
            }
        }

        /*----------------------------------------------------------------------------------------------------------------*/

        // Test for IE's crash (IE 6/7) or exception (IE >= 8) when a reference to garbage-collected text node is queried
        var crashyTextNodes = false;

        function isBrokenNode(node) {
            var n;
            try {
                n = node.parentNode;
                return false;
            } catch (e) {
                return true;
            }
        }

        (function() {
            var el = document.createElement("b");
            el.innerHTML = "1";
            var textNode = el.firstChild;
            el.innerHTML = "<br />";
            crashyTextNodes = isBrokenNode(textNode);

            api.features.crashyTextNodes = crashyTextNodes;
        })();

        /*----------------------------------------------------------------------------------------------------------------*/

        function inspectNode(node) {
            if (!node) {
                return "[No node]";
            }
            if (crashyTextNodes && isBrokenNode(node)) {
                return "[Broken node]";
            }
            if (isCharacterDataNode(node)) {
                return '"' + node.data + '"';
            }
            if (node.nodeType == 1) {
                var idAttr = node.id ? ' id="' + node.id + '"' : "";
                return "<" + node.nodeName + idAttr + ">[index:" + getNodeIndex(node) + ",length:" + node.childNodes.length + "][" + (node.innerHTML || "[innerHTML not supported]").slice(0, 25) + "]";
            }
            return node.nodeName;
        }

        function fragmentFromNodeChildren(node) {
            var fragment = getDocument(node).createDocumentFragment(), child;
            while ( (child = node.firstChild) ) {
                fragment.appendChild(child);
            }
            return fragment;
        }

        var getComputedStyleProperty;
        if (typeof window.getComputedStyle != UNDEF) {
            getComputedStyleProperty = function(el, propName) {
                return getWindow(el).getComputedStyle(el, null)[propName];
            };
        } else if (typeof document.documentElement.currentStyle != UNDEF) {
            getComputedStyleProperty = function(el, propName) {
                return el.currentStyle ? el.currentStyle[propName] : "";
            };
        } else {
            module.fail("No means of obtaining computed style properties found");
        }

        function createTestElement(doc, html, contentEditable) {
            var body = getBody(doc);
            var el = doc.createElement("div");
            el.contentEditable = "" + !!contentEditable;
            if (html) {
                el.innerHTML = html;
            }

            // Insert the test element at the start of the body to prevent scrolling to the bottom in iOS (issue #292)
            var bodyFirstChild = body.firstChild;
            if (bodyFirstChild) {
                body.insertBefore(el, bodyFirstChild);
            } else {
                body.appendChild(el);
            }

            return el;
        }

        function removeNode(node) {
            return node.parentNode.removeChild(node);
        }

        function NodeIterator(root) {
            this.root = root;
            this._next = root;
        }

        NodeIterator.prototype = {
            _current: null,

            hasNext: function() {
                return !!this._next;
            },

            next: function() {
                var n = this._current = this._next;
                var child, next;
                if (this._current) {
                    child = n.firstChild;
                    if (child) {
                        this._next = child;
                    } else {
                        next = null;
                        while ((n !== this.root) && !(next = n.nextSibling)) {
                            n = n.parentNode;
                        }
                        this._next = next;
                    }
                }
                return this._current;
            },

            detach: function() {
                this._current = this._next = this.root = null;
            }
        };

        function createIterator(root) {
            return new NodeIterator(root);
        }

        function DomPosition(node, offset) {
            this.node = node;
            this.offset = offset;
        }

        DomPosition.prototype = {
            equals: function(pos) {
                return !!pos && this.node === pos.node && this.offset == pos.offset;
            },

            inspect: function() {
                return "[DomPosition(" + inspectNode(this.node) + ":" + this.offset + ")]";
            },

            toString: function() {
                return this.inspect();
            }
        };

        function DOMException(codeName) {
            this.code = this[codeName];
            this.codeName = codeName;
            this.message = "DOMException: " + this.codeName;
        }

        DOMException.prototype = {
            INDEX_SIZE_ERR: 1,
            HIERARCHY_REQUEST_ERR: 3,
            WRONG_DOCUMENT_ERR: 4,
            NO_MODIFICATION_ALLOWED_ERR: 7,
            NOT_FOUND_ERR: 8,
            NOT_SUPPORTED_ERR: 9,
            INVALID_STATE_ERR: 11,
            INVALID_NODE_TYPE_ERR: 24
        };

        DOMException.prototype.toString = function() {
            return this.message;
        };

        api.dom = {
            arrayContains: arrayContains,
            isHtmlNamespace: isHtmlNamespace,
            parentElement: parentElement,
            getNodeIndex: getNodeIndex,
            getNodeLength: getNodeLength,
            getCommonAncestor: getCommonAncestor,
            isAncestorOf: isAncestorOf,
            isOrIsAncestorOf: isOrIsAncestorOf,
            getClosestAncestorIn: getClosestAncestorIn,
            isCharacterDataNode: isCharacterDataNode,
            isTextOrCommentNode: isTextOrCommentNode,
            insertAfter: insertAfter,
            splitDataNode: splitDataNode,
            getDocument: getDocument,
            getWindow: getWindow,
            getIframeWindow: getIframeWindow,
            getIframeDocument: getIframeDocument,
            getBody: getBody,
            isWindow: isWindow,
            getContentDocument: getContentDocument,
            getRootContainer: getRootContainer,
            comparePoints: comparePoints,
            isBrokenNode: isBrokenNode,
            inspectNode: inspectNode,
            getComputedStyleProperty: getComputedStyleProperty,
            createTestElement: createTestElement,
            removeNode: removeNode,
            fragmentFromNodeChildren: fragmentFromNodeChildren,
            createIterator: createIterator,
            DomPosition: DomPosition
        };

        api.DOMException = DOMException;
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    // Pure JavaScript implementation of DOM Range
    api.createCoreModule("DomRange", ["DomUtil"], function(api, module) {
        var dom = api.dom;
        var util = api.util;
        var DomPosition = dom.DomPosition;
        var DOMException = api.DOMException;

        var isCharacterDataNode = dom.isCharacterDataNode;
        var getNodeIndex = dom.getNodeIndex;
        var isOrIsAncestorOf = dom.isOrIsAncestorOf;
        var getDocument = dom.getDocument;
        var comparePoints = dom.comparePoints;
        var splitDataNode = dom.splitDataNode;
        var getClosestAncestorIn = dom.getClosestAncestorIn;
        var getNodeLength = dom.getNodeLength;
        var arrayContains = dom.arrayContains;
        var getRootContainer = dom.getRootContainer;
        var crashyTextNodes = api.features.crashyTextNodes;

        var removeNode = dom.removeNode;

        /*----------------------------------------------------------------------------------------------------------------*/

        // Utility functions

        function isNonTextPartiallySelected(node, range) {
            return (node.nodeType != 3) &&
                   (isOrIsAncestorOf(node, range.startContainer) || isOrIsAncestorOf(node, range.endContainer));
        }

        function getRangeDocument(range) {
            return range.document || getDocument(range.startContainer);
        }

        function getRangeRoot(range) {
            return getRootContainer(range.startContainer);
        }

        function getBoundaryBeforeNode(node) {
            return new DomPosition(node.parentNode, getNodeIndex(node));
        }

        function getBoundaryAfterNode(node) {
            return new DomPosition(node.parentNode, getNodeIndex(node) + 1);
        }

        function insertNodeAtPosition(node, n, o) {
            var firstNodeInserted = node.nodeType == 11 ? node.firstChild : node;
            if (isCharacterDataNode(n)) {
                if (o == n.length) {
                    dom.insertAfter(node, n);
                } else {
                    n.parentNode.insertBefore(node, o == 0 ? n : splitDataNode(n, o));
                }
            } else if (o >= n.childNodes.length) {
                n.appendChild(node);
            } else {
                n.insertBefore(node, n.childNodes[o]);
            }
            return firstNodeInserted;
        }

        function rangesIntersect(rangeA, rangeB, touchingIsIntersecting) {
            assertRangeValid(rangeA);
            assertRangeValid(rangeB);

            if (getRangeDocument(rangeB) != getRangeDocument(rangeA)) {
                throw new DOMException("WRONG_DOCUMENT_ERR");
            }

            var startComparison = comparePoints(rangeA.startContainer, rangeA.startOffset, rangeB.endContainer, rangeB.endOffset),
                endComparison = comparePoints(rangeA.endContainer, rangeA.endOffset, rangeB.startContainer, rangeB.startOffset);

            return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
        }

        function cloneSubtree(iterator) {
            var partiallySelected;
            for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {
                partiallySelected = iterator.isPartiallySelectedSubtree();
                node = node.cloneNode(!partiallySelected);
                if (partiallySelected) {
                    subIterator = iterator.getSubtreeIterator();
                    node.appendChild(cloneSubtree(subIterator));
                    subIterator.detach();
                }

                if (node.nodeType == 10) { // DocumentType
                    throw new DOMException("HIERARCHY_REQUEST_ERR");
                }
                frag.appendChild(node);
            }
            return frag;
        }

        function iterateSubtree(rangeIterator, func, iteratorState) {
            var it, n;
            iteratorState = iteratorState || { stop: false };
            for (var node, subRangeIterator; node = rangeIterator.next(); ) {
                if (rangeIterator.isPartiallySelectedSubtree()) {
                    if (func(node) === false) {
                        iteratorState.stop = true;
                        return;
                    } else {
                        // The node is partially selected by the Range, so we can use a new RangeIterator on the portion of
                        // the node selected by the Range.
                        subRangeIterator = rangeIterator.getSubtreeIterator();
                        iterateSubtree(subRangeIterator, func, iteratorState);
                        subRangeIterator.detach();
                        if (iteratorState.stop) {
                            return;
                        }
                    }
                } else {
                    // The whole node is selected, so we can use efficient DOM iteration to iterate over the node and its
                    // descendants
                    it = dom.createIterator(node);
                    while ( (n = it.next()) ) {
                        if (func(n) === false) {
                            iteratorState.stop = true;
                            return;
                        }
                    }
                }
            }
        }

        function deleteSubtree(iterator) {
            var subIterator;
            while (iterator.next()) {
                if (iterator.isPartiallySelectedSubtree()) {
                    subIterator = iterator.getSubtreeIterator();
                    deleteSubtree(subIterator);
                    subIterator.detach();
                } else {
                    iterator.remove();
                }
            }
        }

        function extractSubtree(iterator) {
            for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator; node = iterator.next(); ) {

                if (iterator.isPartiallySelectedSubtree()) {
                    node = node.cloneNode(false);
                    subIterator = iterator.getSubtreeIterator();
                    node.appendChild(extractSubtree(subIterator));
                    subIterator.detach();
                } else {
                    iterator.remove();
                }
                if (node.nodeType == 10) { // DocumentType
                    throw new DOMException("HIERARCHY_REQUEST_ERR");
                }
                frag.appendChild(node);
            }
            return frag;
        }

        function getNodesInRange(range, nodeTypes, filter) {
            var filterNodeTypes = !!(nodeTypes && nodeTypes.length), regex;
            var filterExists = !!filter;
            if (filterNodeTypes) {
                regex = new RegExp("^(" + nodeTypes.join("|") + ")$");
            }

            var nodes = [];
            iterateSubtree(new RangeIterator(range, false), function(node) {
                if (filterNodeTypes && !regex.test(node.nodeType)) {
                    return;
                }
                if (filterExists && !filter(node)) {
                    return;
                }
                // Don't include a boundary container if it is a character data node and the range does not contain any
                // of its character data. See issue 190.
                var sc = range.startContainer;
                if (node == sc && isCharacterDataNode(sc) && range.startOffset == sc.length) {
                    return;
                }

                var ec = range.endContainer;
                if (node == ec && isCharacterDataNode(ec) && range.endOffset == 0) {
                    return;
                }

                nodes.push(node);
            });
            return nodes;
        }

        function inspect(range) {
            var name = (typeof range.getName == "undefined") ? "Range" : range.getName();
            return "[" + name + "(" + dom.inspectNode(range.startContainer) + ":" + range.startOffset + ", " +
                    dom.inspectNode(range.endContainer) + ":" + range.endOffset + ")]";
        }

        /*----------------------------------------------------------------------------------------------------------------*/

        // RangeIterator code partially borrows from IERange by Tim Ryan (http://github.com/timcameronryan/IERange)

        function RangeIterator(range, clonePartiallySelectedTextNodes) {
            this.range = range;
            this.clonePartiallySelectedTextNodes = clonePartiallySelectedTextNodes;


            if (!range.collapsed) {
                this.sc = range.startContainer;
                this.so = range.startOffset;
                this.ec = range.endContainer;
                this.eo = range.endOffset;
                var root = range.commonAncestorContainer;

                if (this.sc === this.ec && isCharacterDataNode(this.sc)) {
                    this.isSingleCharacterDataNode = true;
                    this._first = this._last = this._next = this.sc;
                } else {
                    this._first = this._next = (this.sc === root && !isCharacterDataNode(this.sc)) ?
                        this.sc.childNodes[this.so] : getClosestAncestorIn(this.sc, root, true);
                    this._last = (this.ec === root && !isCharacterDataNode(this.ec)) ?
                        this.ec.childNodes[this.eo - 1] : getClosestAncestorIn(this.ec, root, true);
                }
            }
        }

        RangeIterator.prototype = {
            _current: null,
            _next: null,
            _first: null,
            _last: null,
            isSingleCharacterDataNode: false,

            reset: function() {
                this._current = null;
                this._next = this._first;
            },

            hasNext: function() {
                return !!this._next;
            },

            next: function() {
                // Move to next node
                var current = this._current = this._next;
                if (current) {
                    this._next = (current !== this._last) ? current.nextSibling : null;

                    // Check for partially selected text nodes
                    if (isCharacterDataNode(current) && this.clonePartiallySelectedTextNodes) {
                        if (current === this.ec) {
                            (current = current.cloneNode(true)).deleteData(this.eo, current.length - this.eo);
                        }
                        if (this._current === this.sc) {
                            (current = current.cloneNode(true)).deleteData(0, this.so);
                        }
                    }
                }

                return current;
            },

            remove: function() {
                var current = this._current, start, end;

                if (isCharacterDataNode(current) && (current === this.sc || current === this.ec)) {
                    start = (current === this.sc) ? this.so : 0;
                    end = (current === this.ec) ? this.eo : current.length;
                    if (start != end) {
                        current.deleteData(start, end - start);
                    }
                } else {
                    if (current.parentNode) {
                        removeNode(current);
                    } else {
                    }
                }
            },

            // Checks if the current node is partially selected
            isPartiallySelectedSubtree: function() {
                var current = this._current;
                return isNonTextPartiallySelected(current, this.range);
            },

            getSubtreeIterator: function() {
                var subRange;
                if (this.isSingleCharacterDataNode) {
                    subRange = this.range.cloneRange();
                    subRange.collapse(false);
                } else {
                    subRange = new Range(getRangeDocument(this.range));
                    var current = this._current;
                    var startContainer = current, startOffset = 0, endContainer = current, endOffset = getNodeLength(current);

                    if (isOrIsAncestorOf(current, this.sc)) {
                        startContainer = this.sc;
                        startOffset = this.so;
                    }
                    if (isOrIsAncestorOf(current, this.ec)) {
                        endContainer = this.ec;
                        endOffset = this.eo;
                    }

                    updateBoundaries(subRange, startContainer, startOffset, endContainer, endOffset);
                }
                return new RangeIterator(subRange, this.clonePartiallySelectedTextNodes);
            },

            detach: function() {
                this.range = this._current = this._next = this._first = this._last = this.sc = this.so = this.ec = this.eo = null;
            }
        };

        /*----------------------------------------------------------------------------------------------------------------*/

        var beforeAfterNodeTypes = [1, 3, 4, 5, 7, 8, 10];
        var rootContainerNodeTypes = [2, 9, 11];
        var readonlyNodeTypes = [5, 6, 10, 12];
        var insertableNodeTypes = [1, 3, 4, 5, 7, 8, 10, 11];
        var surroundNodeTypes = [1, 3, 4, 5, 7, 8];

        function createAncestorFinder(nodeTypes) {
            return function(node, selfIsAncestor) {
                var t, n = selfIsAncestor ? node : node.parentNode;
                while (n) {
                    t = n.nodeType;
                    if (arrayContains(nodeTypes, t)) {
                        return n;
                    }
                    n = n.parentNode;
                }
                return null;
            };
        }

        var getDocumentOrFragmentContainer = createAncestorFinder( [9, 11] );
        var getReadonlyAncestor = createAncestorFinder(readonlyNodeTypes);
        var getDocTypeNotationEntityAncestor = createAncestorFinder( [6, 10, 12] );

        function assertNoDocTypeNotationEntityAncestor(node, allowSelf) {
            if (getDocTypeNotationEntityAncestor(node, allowSelf)) {
                throw new DOMException("INVALID_NODE_TYPE_ERR");
            }
        }

        function assertValidNodeType(node, invalidTypes) {
            if (!arrayContains(invalidTypes, node.nodeType)) {
                throw new DOMException("INVALID_NODE_TYPE_ERR");
            }
        }

        function assertValidOffset(node, offset) {
            if (offset < 0 || offset > (isCharacterDataNode(node) ? node.length : node.childNodes.length)) {
                throw new DOMException("INDEX_SIZE_ERR");
            }
        }

        function assertSameDocumentOrFragment(node1, node2) {
            if (getDocumentOrFragmentContainer(node1, true) !== getDocumentOrFragmentContainer(node2, true)) {
                throw new DOMException("WRONG_DOCUMENT_ERR");
            }
        }

        function assertNodeNotReadOnly(node) {
            if (getReadonlyAncestor(node, true)) {
                throw new DOMException("NO_MODIFICATION_ALLOWED_ERR");
            }
        }

        function assertNode(node, codeName) {
            if (!node) {
                throw new DOMException(codeName);
            }
        }

        function isValidOffset(node, offset) {
            return offset <= (isCharacterDataNode(node) ? node.length : node.childNodes.length);
        }

        function isRangeValid(range) {
            return (!!range.startContainer && !!range.endContainer &&
                    !(crashyTextNodes && (dom.isBrokenNode(range.startContainer) || dom.isBrokenNode(range.endContainer))) &&
                    getRootContainer(range.startContainer) == getRootContainer(range.endContainer) &&
                    isValidOffset(range.startContainer, range.startOffset) &&
                    isValidOffset(range.endContainer, range.endOffset));
        }

        function assertRangeValid(range) {
            if (!isRangeValid(range)) {
                throw new Error("Range error: Range is not valid. This usually happens after DOM mutation. Range: (" + range.inspect() + ")");
            }
        }

        /*----------------------------------------------------------------------------------------------------------------*/

        // Test the browser's innerHTML support to decide how to implement createContextualFragment
        var styleEl = document.createElement("style");
        var htmlParsingConforms = false;
        try {
            styleEl.innerHTML = "<b>x</b>";
            htmlParsingConforms = (styleEl.firstChild.nodeType == 3); // Opera incorrectly creates an element node
        } catch (e) {
            // IE 6 and 7 throw
        }

        api.features.htmlParsingConforms = htmlParsingConforms;

        var createContextualFragment = htmlParsingConforms ?

            // Implementation as per HTML parsing spec, trusting in the browser's implementation of innerHTML. See
            // discussion and base code for this implementation at issue 67.
            // Spec: http://html5.org/specs/dom-parsing.html#extensions-to-the-range-interface
            // Thanks to Aleks Williams.
            function(fragmentStr) {
                // "Let node the context object's start's node."
                var node = this.startContainer;
                var doc = getDocument(node);

                // "If the context object's start's node is null, raise an INVALID_STATE_ERR
                // exception and abort these steps."
                if (!node) {
                    throw new DOMException("INVALID_STATE_ERR");
                }

                // "Let element be as follows, depending on node's interface:"
                // Document, Document Fragment: null
                var el = null;

                // "Element: node"
                if (node.nodeType == 1) {
                    el = node;

                // "Text, Comment: node's parentElement"
                } else if (isCharacterDataNode(node)) {
                    el = dom.parentElement(node);
                }

                // "If either element is null or element's ownerDocument is an HTML document
                // and element's local name is "html" and element's namespace is the HTML
                // namespace"
                if (el === null || (
                    el.nodeName == "HTML" &&
                    dom.isHtmlNamespace(getDocument(el).documentElement) &&
                    dom.isHtmlNamespace(el)
                )) {

                // "let element be a new Element with "body" as its local name and the HTML
                // namespace as its namespace.""
                    el = doc.createElement("body");
                } else {
                    el = el.cloneNode(false);
                }

                // "If the node's document is an HTML document: Invoke the HTML fragment parsing algorithm."
                // "If the node's document is an XML document: Invoke the XML fragment parsing algorithm."
                // "In either case, the algorithm must be invoked with fragment as the input
                // and element as the context element."
                el.innerHTML = fragmentStr;

                // "If this raises an exception, then abort these steps. Otherwise, let new
                // children be the nodes returned."

                // "Let fragment be a new DocumentFragment."
                // "Append all new children to fragment."
                // "Return fragment."
                return dom.fragmentFromNodeChildren(el);
            } :

            // In this case, innerHTML cannot be trusted, so fall back to a simpler, non-conformant implementation that
            // previous versions of Rangy used (with the exception of using a body element rather than a div)
            function(fragmentStr) {
                var doc = getRangeDocument(this);
                var el = doc.createElement("body");
                el.innerHTML = fragmentStr;

                return dom.fragmentFromNodeChildren(el);
            };

        function splitRangeBoundaries(range, positionsToPreserve) {
            assertRangeValid(range);

            var sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset;
            var startEndSame = (sc === ec);

            if (isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
                splitDataNode(ec, eo, positionsToPreserve);
            }

            if (isCharacterDataNode(sc) && so > 0 && so < sc.length) {
                sc = splitDataNode(sc, so, positionsToPreserve);
                if (startEndSame) {
                    eo -= so;
                    ec = sc;
                } else if (ec == sc.parentNode && eo >= getNodeIndex(sc)) {
                    eo++;
                }
                so = 0;
            }
            range.setStartAndEnd(sc, so, ec, eo);
        }

        function rangeToHtml(range) {
            assertRangeValid(range);
            var container = range.commonAncestorContainer.parentNode.cloneNode(false);
            container.appendChild( range.cloneContents() );
            return container.innerHTML;
        }

        /*----------------------------------------------------------------------------------------------------------------*/

        var rangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed",
            "commonAncestorContainer"];

        var s2s = 0, s2e = 1, e2e = 2, e2s = 3;
        var n_b = 0, n_a = 1, n_b_a = 2, n_i = 3;

        util.extend(api.rangePrototype, {
            compareBoundaryPoints: function(how, range) {
                assertRangeValid(this);
                assertSameDocumentOrFragment(this.startContainer, range.startContainer);

                var nodeA, offsetA, nodeB, offsetB;
                var prefixA = (how == e2s || how == s2s) ? "start" : "end";
                var prefixB = (how == s2e || how == s2s) ? "start" : "end";
                nodeA = this[prefixA + "Container"];
                offsetA = this[prefixA + "Offset"];
                nodeB = range[prefixB + "Container"];
                offsetB = range[prefixB + "Offset"];
                return comparePoints(nodeA, offsetA, nodeB, offsetB);
            },

            insertNode: function(node) {
                assertRangeValid(this);
                assertValidNodeType(node, insertableNodeTypes);
                assertNodeNotReadOnly(this.startContainer);

                if (isOrIsAncestorOf(node, this.startContainer)) {
                    throw new DOMException("HIERARCHY_REQUEST_ERR");
                }

                // No check for whether the container of the start of the Range is of a type that does not allow
                // children of the type of node: the browser's DOM implementation should do this for us when we attempt
                // to add the node

                var firstNodeInserted = insertNodeAtPosition(node, this.startContainer, this.startOffset);
                this.setStartBefore(firstNodeInserted);
            },

            cloneContents: function() {
                assertRangeValid(this);

                var clone, frag;
                if (this.collapsed) {
                    return getRangeDocument(this).createDocumentFragment();
                } else {
                    if (this.startContainer === this.endContainer && isCharacterDataNode(this.startContainer)) {
                        clone = this.startContainer.cloneNode(true);
                        clone.data = clone.data.slice(this.startOffset, this.endOffset);
                        frag = getRangeDocument(this).createDocumentFragment();
                        frag.appendChild(clone);
                        return frag;
                    } else {
                        var iterator = new RangeIterator(this, true);
                        clone = cloneSubtree(iterator);
                        iterator.detach();
                    }
                    return clone;
                }
            },

            canSurroundContents: function() {
                assertRangeValid(this);
                assertNodeNotReadOnly(this.startContainer);
                assertNodeNotReadOnly(this.endContainer);

                // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
                // no non-text nodes.
                var iterator = new RangeIterator(this, true);
                var boundariesInvalid = (iterator._first && (isNonTextPartiallySelected(iterator._first, this)) ||
                        (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
                iterator.detach();
                return !boundariesInvalid;
            },

            surroundContents: function(node) {
                assertValidNodeType(node, surroundNodeTypes);

                if (!this.canSurroundContents()) {
                    throw new DOMException("INVALID_STATE_ERR");
                }

                // Extract the contents
                var content = this.extractContents();

                // Clear the children of the node
                if (node.hasChildNodes()) {
                    while (node.lastChild) {
                        node.removeChild(node.lastChild);
                    }
                }

                // Insert the new node and add the extracted contents
                insertNodeAtPosition(node, this.startContainer, this.startOffset);
                node.appendChild(content);

                this.selectNode(node);
            },

            cloneRange: function() {
                assertRangeValid(this);
                var range = new Range(getRangeDocument(this));
                var i = rangeProperties.length, prop;
                while (i--) {
                    prop = rangeProperties[i];
                    range[prop] = this[prop];
                }
                return range;
            },

            toString: function() {
                assertRangeValid(this);
                var sc = this.startContainer;
                if (sc === this.endContainer && isCharacterDataNode(sc)) {
                    return (sc.nodeType == 3 || sc.nodeType == 4) ? sc.data.slice(this.startOffset, this.endOffset) : "";
                } else {
                    var textParts = [], iterator = new RangeIterator(this, true);
                    iterateSubtree(iterator, function(node) {
                        // Accept only text or CDATA nodes, not comments
                        if (node.nodeType == 3 || node.nodeType == 4) {
                            textParts.push(node.data);
                        }
                    });
                    iterator.detach();
                    return textParts.join("");
                }
            },

            // The methods below are all non-standard. The following batch were introduced by Mozilla but have since
            // been removed from Mozilla.

            compareNode: function(node) {
                assertRangeValid(this);

                var parent = node.parentNode;
                var nodeIndex = getNodeIndex(node);

                if (!parent) {
                    throw new DOMException("NOT_FOUND_ERR");
                }

                var startComparison = this.comparePoint(parent, nodeIndex),
                    endComparison = this.comparePoint(parent, nodeIndex + 1);

                if (startComparison < 0) { // Node starts before
                    return (endComparison > 0) ? n_b_a : n_b;
                } else {
                    return (endComparison > 0) ? n_a : n_i;
                }
            },

            comparePoint: function(node, offset) {
                assertRangeValid(this);
                assertNode(node, "HIERARCHY_REQUEST_ERR");
                assertSameDocumentOrFragment(node, this.startContainer);

                if (comparePoints(node, offset, this.startContainer, this.startOffset) < 0) {
                    return -1;
                } else if (comparePoints(node, offset, this.endContainer, this.endOffset) > 0) {
                    return 1;
                }
                return 0;
            },

            createContextualFragment: createContextualFragment,

            toHtml: function() {
                return rangeToHtml(this);
            },

            // touchingIsIntersecting determines whether this method considers a node that borders a range intersects
            // with it (as in WebKit) or not (as in Gecko pre-1.9, and the default)
            intersectsNode: function(node, touchingIsIntersecting) {
                assertRangeValid(this);
                if (getRootContainer(node) != getRangeRoot(this)) {
                    return false;
                }

                var parent = node.parentNode, offset = getNodeIndex(node);
                if (!parent) {
                    return true;
                }

                var startComparison = comparePoints(parent, offset, this.endContainer, this.endOffset),
                    endComparison = comparePoints(parent, offset + 1, this.startContainer, this.startOffset);

                return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
            },

            isPointInRange: function(node, offset) {
                assertRangeValid(this);
                assertNode(node, "HIERARCHY_REQUEST_ERR");
                assertSameDocumentOrFragment(node, this.startContainer);

                return (comparePoints(node, offset, this.startContainer, this.startOffset) >= 0) &&
                       (comparePoints(node, offset, this.endContainer, this.endOffset) <= 0);
            },

            // The methods below are non-standard and invented by me.

            // Sharing a boundary start-to-end or end-to-start does not count as intersection.
            intersectsRange: function(range) {
                return rangesIntersect(this, range, false);
            },

            // Sharing a boundary start-to-end or end-to-start does count as intersection.
            intersectsOrTouchesRange: function(range) {
                return rangesIntersect(this, range, true);
            },

            intersection: function(range) {
                if (this.intersectsRange(range)) {
                    var startComparison = comparePoints(this.startContainer, this.startOffset, range.startContainer, range.startOffset),
                        endComparison = comparePoints(this.endContainer, this.endOffset, range.endContainer, range.endOffset);

                    var intersectionRange = this.cloneRange();
                    if (startComparison == -1) {
                        intersectionRange.setStart(range.startContainer, range.startOffset);
                    }
                    if (endComparison == 1) {
                        intersectionRange.setEnd(range.endContainer, range.endOffset);
                    }
                    return intersectionRange;
                }
                return null;
            },

            union: function(range) {
                if (this.intersectsOrTouchesRange(range)) {
                    var unionRange = this.cloneRange();
                    if (comparePoints(range.startContainer, range.startOffset, this.startContainer, this.startOffset) == -1) {
                        unionRange.setStart(range.startContainer, range.startOffset);
                    }
                    if (comparePoints(range.endContainer, range.endOffset, this.endContainer, this.endOffset) == 1) {
                        unionRange.setEnd(range.endContainer, range.endOffset);
                    }
                    return unionRange;
                } else {
                    throw new DOMException("Ranges do not intersect");
                }
            },

            containsNode: function(node, allowPartial) {
                if (allowPartial) {
                    return this.intersectsNode(node, false);
                } else {
                    return this.compareNode(node) == n_i;
                }
            },

            containsNodeContents: function(node) {
                return this.comparePoint(node, 0) >= 0 && this.comparePoint(node, getNodeLength(node)) <= 0;
            },

            containsRange: function(range) {
                var intersection = this.intersection(range);
                return intersection !== null && range.equals(intersection);
            },

            containsNodeText: function(node) {
                var nodeRange = this.cloneRange();
                nodeRange.selectNode(node);
                var textNodes = nodeRange.getNodes([3]);
                if (textNodes.length > 0) {
                    nodeRange.setStart(textNodes[0], 0);
                    var lastTextNode = textNodes.pop();
                    nodeRange.setEnd(lastTextNode, lastTextNode.length);
                    return this.containsRange(nodeRange);
                } else {
                    return this.containsNodeContents(node);
                }
            },

            getNodes: function(nodeTypes, filter) {
                assertRangeValid(this);
                return getNodesInRange(this, nodeTypes, filter);
            },

            getDocument: function() {
                return getRangeDocument(this);
            },

            collapseBefore: function(node) {
                this.setEndBefore(node);
                this.collapse(false);
            },

            collapseAfter: function(node) {
                this.setStartAfter(node);
                this.collapse(true);
            },

            getBookmark: function(containerNode) {
                var doc = getRangeDocument(this);
                var preSelectionRange = api.createRange(doc);
                containerNode = containerNode || dom.getBody(doc);
                preSelectionRange.selectNodeContents(containerNode);
                var range = this.intersection(preSelectionRange);
                var start = 0, end = 0;
                if (range) {
                    preSelectionRange.setEnd(range.startContainer, range.startOffset);
                    start = preSelectionRange.toString().length;
                    end = start + range.toString().length;
                }

                return {
                    start: start,
                    end: end,
                    containerNode: containerNode
                };
            },

            moveToBookmark: function(bookmark) {
                var containerNode = bookmark.containerNode;
                var charIndex = 0;
                this.setStart(containerNode, 0);
                this.collapse(true);
                var nodeStack = [containerNode], node, foundStart = false, stop = false;
                var nextCharIndex, i, childNodes;

                while (!stop && (node = nodeStack.pop())) {
                    if (node.nodeType == 3) {
                        nextCharIndex = charIndex + node.length;
                        if (!foundStart && bookmark.start >= charIndex && bookmark.start <= nextCharIndex) {
                            this.setStart(node, bookmark.start - charIndex);
                            foundStart = true;
                        }
                        if (foundStart && bookmark.end >= charIndex && bookmark.end <= nextCharIndex) {
                            this.setEnd(node, bookmark.end - charIndex);
                            stop = true;
                        }
                        charIndex = nextCharIndex;
                    } else {
                        childNodes = node.childNodes;
                        i = childNodes.length;
                        while (i--) {
                            nodeStack.push(childNodes[i]);
                        }
                    }
                }
            },

            getName: function() {
                return "DomRange";
            },

            equals: function(range) {
                return Range.rangesEqual(this, range);
            },

            isValid: function() {
                return isRangeValid(this);
            },

            inspect: function() {
                return inspect(this);
            },

            detach: function() {
                // In DOM4, detach() is now a no-op.
            }
        });

        function copyComparisonConstantsToObject(obj) {
            obj.START_TO_START = s2s;
            obj.START_TO_END = s2e;
            obj.END_TO_END = e2e;
            obj.END_TO_START = e2s;

            obj.NODE_BEFORE = n_b;
            obj.NODE_AFTER = n_a;
            obj.NODE_BEFORE_AND_AFTER = n_b_a;
            obj.NODE_INSIDE = n_i;
        }

        function copyComparisonConstants(constructor) {
            copyComparisonConstantsToObject(constructor);
            copyComparisonConstantsToObject(constructor.prototype);
        }

        function createRangeContentRemover(remover, boundaryUpdater) {
            return function() {
                assertRangeValid(this);

                var sc = this.startContainer, so = this.startOffset, root = this.commonAncestorContainer;

                var iterator = new RangeIterator(this, true);

                // Work out where to position the range after content removal
                var node, boundary;
                if (sc !== root) {
                    node = getClosestAncestorIn(sc, root, true);
                    boundary = getBoundaryAfterNode(node);
                    sc = boundary.node;
                    so = boundary.offset;
                }

                // Check none of the range is read-only
                iterateSubtree(iterator, assertNodeNotReadOnly);

                iterator.reset();

                // Remove the content
                var returnValue = remover(iterator);
                iterator.detach();

                // Move to the new position
                boundaryUpdater(this, sc, so, sc, so);

                return returnValue;
            };
        }

        function createPrototypeRange(constructor, boundaryUpdater) {
            function createBeforeAfterNodeSetter(isBefore, isStart) {
                return function(node) {
                    assertValidNodeType(node, beforeAfterNodeTypes);
                    assertValidNodeType(getRootContainer(node), rootContainerNodeTypes);

                    var boundary = (isBefore ? getBoundaryBeforeNode : getBoundaryAfterNode)(node);
                    (isStart ? setRangeStart : setRangeEnd)(this, boundary.node, boundary.offset);
                };
            }

            function setRangeStart(range, node, offset) {
                var ec = range.endContainer, eo = range.endOffset;
                if (node !== range.startContainer || offset !== range.startOffset) {
                    // Check the root containers of the range and the new boundary, and also check whether the new boundary
                    // is after the current end. In either case, collapse the range to the new position
                    if (getRootContainer(node) != getRootContainer(ec) || comparePoints(node, offset, ec, eo) == 1) {
                        ec = node;
                        eo = offset;
                    }
                    boundaryUpdater(range, node, offset, ec, eo);
                }
            }

            function setRangeEnd(range, node, offset) {
                var sc = range.startContainer, so = range.startOffset;
                if (node !== range.endContainer || offset !== range.endOffset) {
                    // Check the root containers of the range and the new boundary, and also check whether the new boundary
                    // is after the current end. In either case, collapse the range to the new position
                    if (getRootContainer(node) != getRootContainer(sc) || comparePoints(node, offset, sc, so) == -1) {
                        sc = node;
                        so = offset;
                    }
                    boundaryUpdater(range, sc, so, node, offset);
                }
            }

            // Set up inheritance
            var F = function() {};
            F.prototype = api.rangePrototype;
            constructor.prototype = new F();

            util.extend(constructor.prototype, {
                setStart: function(node, offset) {
                    assertNoDocTypeNotationEntityAncestor(node, true);
                    assertValidOffset(node, offset);

                    setRangeStart(this, node, offset);
                },

                setEnd: function(node, offset) {
                    assertNoDocTypeNotationEntityAncestor(node, true);
                    assertValidOffset(node, offset);

                    setRangeEnd(this, node, offset);
                },

                /**
                 * Convenience method to set a range's start and end boundaries. Overloaded as follows:
                 * - Two parameters (node, offset) creates a collapsed range at that position
                 * - Three parameters (node, startOffset, endOffset) creates a range contained with node starting at
                 *   startOffset and ending at endOffset
                 * - Four parameters (startNode, startOffset, endNode, endOffset) creates a range starting at startOffset in
                 *   startNode and ending at endOffset in endNode
                 */
                setStartAndEnd: function() {
                    var args = arguments;
                    var sc = args[0], so = args[1], ec = sc, eo = so;

                    switch (args.length) {
                        case 3:
                            eo = args[2];
                            break;
                        case 4:
                            ec = args[2];
                            eo = args[3];
                            break;
                    }

                    boundaryUpdater(this, sc, so, ec, eo);
                },

                setBoundary: function(node, offset, isStart) {
                    this["set" + (isStart ? "Start" : "End")](node, offset);
                },

                setStartBefore: createBeforeAfterNodeSetter(true, true),
                setStartAfter: createBeforeAfterNodeSetter(false, true),
                setEndBefore: createBeforeAfterNodeSetter(true, false),
                setEndAfter: createBeforeAfterNodeSetter(false, false),

                collapse: function(isStart) {
                    assertRangeValid(this);
                    if (isStart) {
                        boundaryUpdater(this, this.startContainer, this.startOffset, this.startContainer, this.startOffset);
                    } else {
                        boundaryUpdater(this, this.endContainer, this.endOffset, this.endContainer, this.endOffset);
                    }
                },

                selectNodeContents: function(node) {
                    assertNoDocTypeNotationEntityAncestor(node, true);

                    boundaryUpdater(this, node, 0, node, getNodeLength(node));
                },

                selectNode: function(node) {
                    assertNoDocTypeNotationEntityAncestor(node, false);
                    assertValidNodeType(node, beforeAfterNodeTypes);

                    var start = getBoundaryBeforeNode(node), end = getBoundaryAfterNode(node);
                    boundaryUpdater(this, start.node, start.offset, end.node, end.offset);
                },

                extractContents: createRangeContentRemover(extractSubtree, boundaryUpdater),

                deleteContents: createRangeContentRemover(deleteSubtree, boundaryUpdater),

                canSurroundContents: function() {
                    assertRangeValid(this);
                    assertNodeNotReadOnly(this.startContainer);
                    assertNodeNotReadOnly(this.endContainer);

                    // Check if the contents can be surrounded. Specifically, this means whether the range partially selects
                    // no non-text nodes.
                    var iterator = new RangeIterator(this, true);
                    var boundariesInvalid = (iterator._first && isNonTextPartiallySelected(iterator._first, this) ||
                            (iterator._last && isNonTextPartiallySelected(iterator._last, this)));
                    iterator.detach();
                    return !boundariesInvalid;
                },

                splitBoundaries: function() {
                    splitRangeBoundaries(this);
                },

                splitBoundariesPreservingPositions: function(positionsToPreserve) {
                    splitRangeBoundaries(this, positionsToPreserve);
                },

                normalizeBoundaries: function() {
                    assertRangeValid(this);

                    var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;

                    var mergeForward = function(node) {
                        var sibling = node.nextSibling;
                        if (sibling && sibling.nodeType == node.nodeType) {
                            ec = node;
                            eo = node.length;
                            node.appendData(sibling.data);
                            removeNode(sibling);
                        }
                    };

                    var mergeBackward = function(node) {
                        var sibling = node.previousSibling;
                        if (sibling && sibling.nodeType == node.nodeType) {
                            sc = node;
                            var nodeLength = node.length;
                            so = sibling.length;
                            node.insertData(0, sibling.data);
                            removeNode(sibling);
                            if (sc == ec) {
                                eo += so;
                                ec = sc;
                            } else if (ec == node.parentNode) {
                                var nodeIndex = getNodeIndex(node);
                                if (eo == nodeIndex) {
                                    ec = node;
                                    eo = nodeLength;
                                } else if (eo > nodeIndex) {
                                    eo--;
                                }
                            }
                        }
                    };

                    var normalizeStart = true;
                    var sibling;

                    if (isCharacterDataNode(ec)) {
                        if (eo == ec.length) {
                            mergeForward(ec);
                        } else if (eo == 0) {
                            sibling = ec.previousSibling;
                            if (sibling && sibling.nodeType == ec.nodeType) {
                                eo = sibling.length;
                                if (sc == ec) {
                                    normalizeStart = false;
                                }
                                sibling.appendData(ec.data);
                                removeNode(ec);
                                ec = sibling;
                            }
                        }
                    } else {
                        if (eo > 0) {
                            var endNode = ec.childNodes[eo - 1];
                            if (endNode && isCharacterDataNode(endNode)) {
                                mergeForward(endNode);
                            }
                        }
                        normalizeStart = !this.collapsed;
                    }

                    if (normalizeStart) {
                        if (isCharacterDataNode(sc)) {
                            if (so == 0) {
                                mergeBackward(sc);
                            } else if (so == sc.length) {
                                sibling = sc.nextSibling;
                                if (sibling && sibling.nodeType == sc.nodeType) {
                                    if (ec == sibling) {
                                        ec = sc;
                                        eo += sc.length;
                                    }
                                    sc.appendData(sibling.data);
                                    removeNode(sibling);
                                }
                            }
                        } else {
                            if (so < sc.childNodes.length) {
                                var startNode = sc.childNodes[so];
                                if (startNode && isCharacterDataNode(startNode)) {
                                    mergeBackward(startNode);
                                }
                            }
                        }
                    } else {
                        sc = ec;
                        so = eo;
                    }

                    boundaryUpdater(this, sc, so, ec, eo);
                },

                collapseToPoint: function(node, offset) {
                    assertNoDocTypeNotationEntityAncestor(node, true);
                    assertValidOffset(node, offset);
                    this.setStartAndEnd(node, offset);
                }
            });

            copyComparisonConstants(constructor);
        }

        /*----------------------------------------------------------------------------------------------------------------*/

        // Updates commonAncestorContainer and collapsed after boundary change
        function updateCollapsedAndCommonAncestor(range) {
            range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
            range.commonAncestorContainer = range.collapsed ?
                range.startContainer : dom.getCommonAncestor(range.startContainer, range.endContainer);
        }

        function updateBoundaries(range, startContainer, startOffset, endContainer, endOffset) {
            range.startContainer = startContainer;
            range.startOffset = startOffset;
            range.endContainer = endContainer;
            range.endOffset = endOffset;
            range.document = dom.getDocument(startContainer);

            updateCollapsedAndCommonAncestor(range);
        }

        function Range(doc) {
            this.startContainer = doc;
            this.startOffset = 0;
            this.endContainer = doc;
            this.endOffset = 0;
            this.document = doc;
            updateCollapsedAndCommonAncestor(this);
        }

        createPrototypeRange(Range, updateBoundaries);

        util.extend(Range, {
            rangeProperties: rangeProperties,
            RangeIterator: RangeIterator,
            copyComparisonConstants: copyComparisonConstants,
            createPrototypeRange: createPrototypeRange,
            inspect: inspect,
            toHtml: rangeToHtml,
            getRangeDocument: getRangeDocument,
            rangesEqual: function(r1, r2) {
                return r1.startContainer === r2.startContainer &&
                    r1.startOffset === r2.startOffset &&
                    r1.endContainer === r2.endContainer &&
                    r1.endOffset === r2.endOffset;
            }
        });

        api.DomRange = Range;
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    // Wrappers for the browser's native DOM Range and/or TextRange implementation
    api.createCoreModule("WrappedRange", ["DomRange"], function(api, module) {
        var WrappedRange, WrappedTextRange;
        var dom = api.dom;
        var util = api.util;
        var DomPosition = dom.DomPosition;
        var DomRange = api.DomRange;
        var getBody = dom.getBody;
        var getContentDocument = dom.getContentDocument;
        var isCharacterDataNode = dom.isCharacterDataNode;


        /*----------------------------------------------------------------------------------------------------------------*/

        if (api.features.implementsDomRange) {
            // This is a wrapper around the browser's native DOM Range. It has two aims:
            // - Provide workarounds for specific browser bugs
            // - provide convenient extensions, which are inherited from Rangy's DomRange

            (function() {
                var rangeProto;
                var rangeProperties = DomRange.rangeProperties;

                function updateRangeProperties(range) {
                    var i = rangeProperties.length, prop;
                    while (i--) {
                        prop = rangeProperties[i];
                        range[prop] = range.nativeRange[prop];
                    }
                    // Fix for broken collapsed property in IE 9.
                    range.collapsed = (range.startContainer === range.endContainer && range.startOffset === range.endOffset);
                }

                function updateNativeRange(range, startContainer, startOffset, endContainer, endOffset) {
                    var startMoved = (range.startContainer !== startContainer || range.startOffset != startOffset);
                    var endMoved = (range.endContainer !== endContainer || range.endOffset != endOffset);
                    var nativeRangeDifferent = !range.equals(range.nativeRange);

                    // Always set both boundaries for the benefit of IE9 (see issue 35)
                    if (startMoved || endMoved || nativeRangeDifferent) {
                        range.setEnd(endContainer, endOffset);
                        range.setStart(startContainer, startOffset);
                    }
                }

                var createBeforeAfterNodeSetter;

                WrappedRange = function(range) {
                    if (!range) {
                        throw module.createError("WrappedRange: Range must be specified");
                    }
                    this.nativeRange = range;
                    updateRangeProperties(this);
                };

                DomRange.createPrototypeRange(WrappedRange, updateNativeRange);

                rangeProto = WrappedRange.prototype;

                rangeProto.selectNode = function(node) {
                    this.nativeRange.selectNode(node);
                    updateRangeProperties(this);
                };

                rangeProto.cloneContents = function() {
                    return this.nativeRange.cloneContents();
                };

                // Due to a long-standing Firefox bug that I have not been able to find a reliable way to detect,
                // insertNode() is never delegated to the native range.

                rangeProto.surroundContents = function(node) {
                    this.nativeRange.surroundContents(node);
                    updateRangeProperties(this);
                };

                rangeProto.collapse = function(isStart) {
                    this.nativeRange.collapse(isStart);
                    updateRangeProperties(this);
                };

                rangeProto.cloneRange = function() {
                    return new WrappedRange(this.nativeRange.cloneRange());
                };

                rangeProto.refresh = function() {
                    updateRangeProperties(this);
                };

                rangeProto.toString = function() {
                    return this.nativeRange.toString();
                };

                // Create test range and node for feature detection

                var testTextNode = document.createTextNode("test");
                getBody(document).appendChild(testTextNode);
                var range = document.createRange();

                /*--------------------------------------------------------------------------------------------------------*/

                // Test for Firefox 2 bug that prevents moving the start of a Range to a point after its current end and
                // correct for it

                range.setStart(testTextNode, 0);
                range.setEnd(testTextNode, 0);

                try {
                    range.setStart(testTextNode, 1);

                    rangeProto.setStart = function(node, offset) {
                        this.nativeRange.setStart(node, offset);
                        updateRangeProperties(this);
                    };

                    rangeProto.setEnd = function(node, offset) {
                        this.nativeRange.setEnd(node, offset);
                        updateRangeProperties(this);
                    };

                    createBeforeAfterNodeSetter = function(name) {
                        return function(node) {
                            this.nativeRange[name](node);
                            updateRangeProperties(this);
                        };
                    };

                } catch(ex) {

                    rangeProto.setStart = function(node, offset) {
                        try {
                            this.nativeRange.setStart(node, offset);
                        } catch (ex) {
                            this.nativeRange.setEnd(node, offset);
                            this.nativeRange.setStart(node, offset);
                        }
                        updateRangeProperties(this);
                    };

                    rangeProto.setEnd = function(node, offset) {
                        try {
                            this.nativeRange.setEnd(node, offset);
                        } catch (ex) {
                            this.nativeRange.setStart(node, offset);
                            this.nativeRange.setEnd(node, offset);
                        }
                        updateRangeProperties(this);
                    };

                    createBeforeAfterNodeSetter = function(name, oppositeName) {
                        return function(node) {
                            try {
                                this.nativeRange[name](node);
                            } catch (ex) {
                                this.nativeRange[oppositeName](node);
                                this.nativeRange[name](node);
                            }
                            updateRangeProperties(this);
                        };
                    };
                }

                rangeProto.setStartBefore = createBeforeAfterNodeSetter("setStartBefore", "setEndBefore");
                rangeProto.setStartAfter = createBeforeAfterNodeSetter("setStartAfter", "setEndAfter");
                rangeProto.setEndBefore = createBeforeAfterNodeSetter("setEndBefore", "setStartBefore");
                rangeProto.setEndAfter = createBeforeAfterNodeSetter("setEndAfter", "setStartAfter");

                /*--------------------------------------------------------------------------------------------------------*/

                // Always use DOM4-compliant selectNodeContents implementation: it's simpler and less code than testing
                // whether the native implementation can be trusted
                rangeProto.selectNodeContents = function(node) {
                    this.setStartAndEnd(node, 0, dom.getNodeLength(node));
                };

                /*--------------------------------------------------------------------------------------------------------*/

                // Test for and correct WebKit bug that has the behaviour of compareBoundaryPoints round the wrong way for
                // constants START_TO_END and END_TO_START: https://bugs.webkit.org/show_bug.cgi?id=20738

                range.selectNodeContents(testTextNode);
                range.setEnd(testTextNode, 3);

                var range2 = document.createRange();
                range2.selectNodeContents(testTextNode);
                range2.setEnd(testTextNode, 4);
                range2.setStart(testTextNode, 2);

                if (range.compareBoundaryPoints(range.START_TO_END, range2) == -1 &&
                        range.compareBoundaryPoints(range.END_TO_START, range2) == 1) {
                    // This is the wrong way round, so correct for it

                    rangeProto.compareBoundaryPoints = function(type, range) {
                        range = range.nativeRange || range;
                        if (type == range.START_TO_END) {
                            type = range.END_TO_START;
                        } else if (type == range.END_TO_START) {
                            type = range.START_TO_END;
                        }
                        return this.nativeRange.compareBoundaryPoints(type, range);
                    };
                } else {
                    rangeProto.compareBoundaryPoints = function(type, range) {
                        return this.nativeRange.compareBoundaryPoints(type, range.nativeRange || range);
                    };
                }

                /*--------------------------------------------------------------------------------------------------------*/

                // Test for IE deleteContents() and extractContents() bug and correct it. See issue 107.

                var el = document.createElement("div");
                el.innerHTML = "123";
                var textNode = el.firstChild;
                var body = getBody(document);
                body.appendChild(el);

                range.setStart(textNode, 1);
                range.setEnd(textNode, 2);
                range.deleteContents();

                if (textNode.data == "13") {
                    // Behaviour is correct per DOM4 Range so wrap the browser's implementation of deleteContents() and
                    // extractContents()
                    rangeProto.deleteContents = function() {
                        this.nativeRange.deleteContents();
                        updateRangeProperties(this);
                    };

                    rangeProto.extractContents = function() {
                        var frag = this.nativeRange.extractContents();
                        updateRangeProperties(this);
                        return frag;
                    };
                } else {
                }

                body.removeChild(el);
                body = null;

                /*--------------------------------------------------------------------------------------------------------*/

                // Test for existence of createContextualFragment and delegate to it if it exists
                if (util.isHostMethod(range, "createContextualFragment")) {
                    rangeProto.createContextualFragment = function(fragmentStr) {
                        return this.nativeRange.createContextualFragment(fragmentStr);
                    };
                }

                /*--------------------------------------------------------------------------------------------------------*/

                // Clean up
                getBody(document).removeChild(testTextNode);

                rangeProto.getName = function() {
                    return "WrappedRange";
                };

                api.WrappedRange = WrappedRange;

                api.createNativeRange = function(doc) {
                    doc = getContentDocument(doc, module, "createNativeRange");
                    return doc.createRange();
                };
            })();
        }

        if (api.features.implementsTextRange) {
            /*
            This is a workaround for a bug where IE returns the wrong container element from the TextRange's parentElement()
            method. For example, in the following (where pipes denote the selection boundaries):

            <ul id="ul"><li id="a">| a </li><li id="b"> b |</li></ul>

            var range = document.selection.createRange();
            alert(range.parentElement().id); // Should alert "ul" but alerts "b"

            This method returns the common ancestor node of the following:
            - the parentElement() of the textRange
            - the parentElement() of the textRange after calling collapse(true)
            - the parentElement() of the textRange after calling collapse(false)
            */
            var getTextRangeContainerElement = function(textRange) {
                var parentEl = textRange.parentElement();
                var range = textRange.duplicate();
                range.collapse(true);
                var startEl = range.parentElement();
                range = textRange.duplicate();
                range.collapse(false);
                var endEl = range.parentElement();
                var startEndContainer = (startEl == endEl) ? startEl : dom.getCommonAncestor(startEl, endEl);

                return startEndContainer == parentEl ? startEndContainer : dom.getCommonAncestor(parentEl, startEndContainer);
            };

            var textRangeIsCollapsed = function(textRange) {
                return textRange.compareEndPoints("StartToEnd", textRange) == 0;
            };

            // Gets the boundary of a TextRange expressed as a node and an offset within that node. This function started
            // out as an improved version of code found in Tim Cameron Ryan's IERange (http://code.google.com/p/ierange/)
            // but has grown, fixing problems with line breaks in preformatted text, adding workaround for IE TextRange
            // bugs, handling for inputs and images, plus optimizations.
            var getTextRangeBoundaryPosition = function(textRange, wholeRangeContainerElement, isStart, isCollapsed, startInfo) {
                var workingRange = textRange.duplicate();
                workingRange.collapse(isStart);
                var containerElement = workingRange.parentElement();

                // Sometimes collapsing a TextRange that's at the start of a text node can move it into the previous node, so
                // check for that
                if (!dom.isOrIsAncestorOf(wholeRangeContainerElement, containerElement)) {
                    containerElement = wholeRangeContainerElement;
                }


                // Deal with nodes that cannot "contain rich HTML markup". In practice, this means form inputs, images and
                // similar. See http://msdn.microsoft.com/en-us/library/aa703950%28VS.85%29.aspx
                if (!containerElement.canHaveHTML) {
                    var pos = new DomPosition(containerElement.parentNode, dom.getNodeIndex(containerElement));
                    return {
                        boundaryPosition: pos,
                        nodeInfo: {
                            nodeIndex: pos.offset,
                            containerElement: pos.node
                        }
                    };
                }

                var workingNode = dom.getDocument(containerElement).createElement("span");

                // Workaround for HTML5 Shiv's insane violation of document.createElement(). See Rangy issue 104 and HTML5
                // Shiv issue 64: https://github.com/aFarkas/html5shiv/issues/64
                if (workingNode.parentNode) {
                    dom.removeNode(workingNode);
                }

                var comparison, workingComparisonType = isStart ? "StartToStart" : "StartToEnd";
                var previousNode, nextNode, boundaryPosition, boundaryNode;
                var start = (startInfo && startInfo.containerElement == containerElement) ? startInfo.nodeIndex : 0;
                var childNodeCount = containerElement.childNodes.length;
                var end = childNodeCount;

                // Check end first. Code within the loop assumes that the endth child node of the container is definitely
                // after the range boundary.
                var nodeIndex = end;

                while (true) {
                    if (nodeIndex == childNodeCount) {
                        containerElement.appendChild(workingNode);
                    } else {
                        containerElement.insertBefore(workingNode, containerElement.childNodes[nodeIndex]);
                    }
                    workingRange.moveToElementText(workingNode);
                    comparison = workingRange.compareEndPoints(workingComparisonType, textRange);
                    if (comparison == 0 || start == end) {
                        break;
                    } else if (comparison == -1) {
                        if (end == start + 1) {
                            // We know the endth child node is after the range boundary, so we must be done.
                            break;
                        } else {
                            start = nodeIndex;
                        }
                    } else {
                        end = (end == start + 1) ? start : nodeIndex;
                    }
                    nodeIndex = Math.floor((start + end) / 2);
                    containerElement.removeChild(workingNode);
                }


                // We've now reached or gone past the boundary of the text range we're interested in
                // so have identified the node we want
                boundaryNode = workingNode.nextSibling;

                if (comparison == -1 && boundaryNode && isCharacterDataNode(boundaryNode)) {
                    // This is a character data node (text, comment, cdata). The working range is collapsed at the start of
                    // the node containing the text range's boundary, so we move the end of the working range to the
                    // boundary point and measure the length of its text to get the boundary's offset within the node.
                    workingRange.setEndPoint(isStart ? "EndToStart" : "EndToEnd", textRange);

                    var offset;

                    if (/[\r\n]/.test(boundaryNode.data)) {
                        /*
                        For the particular case of a boundary within a text node containing rendered line breaks (within a
                        <pre> element, for example), we need a slightly complicated approach to get the boundary's offset in
                        IE. The facts:

                        - Each line break is represented as \r in the text node's data/nodeValue properties
                        - Each line break is represented as \r\n in the TextRange's 'text' property
                        - The 'text' property of the TextRange does not contain trailing line breaks

                        To get round the problem presented by the final fact above, we can use the fact that TextRange's
                        moveStart() and moveEnd() methods return the actual number of characters moved, which is not
                        necessarily the same as the number of characters it was instructed to move. The simplest approach is
                        to use this to store the characters moved when moving both the start and end of the range to the
                        start of the document body and subtracting the start offset from the end offset (the
                        "move-negative-gazillion" method). However, this is extremely slow when the document is large and
                        the range is near the end of it. Clearly doing the mirror image (i.e. moving the range boundaries to
                        the end of the document) has the same problem.

                        Another approach that works is to use moveStart() to move the start boundary of the range up to the
                        end boundary one character at a time and incrementing a counter with the value returned by the
                        moveStart() call. However, the check for whether the start boundary has reached the end boundary is
                        expensive, so this method is slow (although unlike "move-negative-gazillion" is largely unaffected
                        by the location of the range within the document).

                        The approach used below is a hybrid of the two methods above. It uses the fact that a string
                        containing the TextRange's 'text' property with each \r\n converted to a single \r character cannot
                        be longer than the text of the TextRange, so the start of the range is moved that length initially
                        and then a character at a time to make up for any trailing line breaks not contained in the 'text'
                        property. This has good performance in most situations compared to the previous two methods.
                        */
                        var tempRange = workingRange.duplicate();
                        var rangeLength = tempRange.text.replace(/\r\n/g, "\r").length;

                        offset = tempRange.moveStart("character", rangeLength);
                        while ( (comparison = tempRange.compareEndPoints("StartToEnd", tempRange)) == -1) {
                            offset++;
                            tempRange.moveStart("character", 1);
                        }
                    } else {
                        offset = workingRange.text.length;
                    }
                    boundaryPosition = new DomPosition(boundaryNode, offset);
                } else {

                    // If the boundary immediately follows a character data node and this is the end boundary, we should favour
                    // a position within that, and likewise for a start boundary preceding a character data node
                    previousNode = (isCollapsed || !isStart) && workingNode.previousSibling;
                    nextNode = (isCollapsed || isStart) && workingNode.nextSibling;
                    if (nextNode && isCharacterDataNode(nextNode)) {
                        boundaryPosition = new DomPosition(nextNode, 0);
                    } else if (previousNode && isCharacterDataNode(previousNode)) {
                        boundaryPosition = new DomPosition(previousNode, previousNode.data.length);
                    } else {
                        boundaryPosition = new DomPosition(containerElement, dom.getNodeIndex(workingNode));
                    }
                }

                // Clean up
                dom.removeNode(workingNode);

                return {
                    boundaryPosition: boundaryPosition,
                    nodeInfo: {
                        nodeIndex: nodeIndex,
                        containerElement: containerElement
                    }
                };
            };

            // Returns a TextRange representing the boundary of a TextRange expressed as a node and an offset within that
            // node. This function started out as an optimized version of code found in Tim Cameron Ryan's IERange
            // (http://code.google.com/p/ierange/)
            var createBoundaryTextRange = function(boundaryPosition, isStart) {
                var boundaryNode, boundaryParent, boundaryOffset = boundaryPosition.offset;
                var doc = dom.getDocument(boundaryPosition.node);
                var workingNode, childNodes, workingRange = getBody(doc).createTextRange();
                var nodeIsDataNode = isCharacterDataNode(boundaryPosition.node);

                if (nodeIsDataNode) {
                    boundaryNode = boundaryPosition.node;
                    boundaryParent = boundaryNode.parentNode;
                } else {
                    childNodes = boundaryPosition.node.childNodes;
                    boundaryNode = (boundaryOffset < childNodes.length) ? childNodes[boundaryOffset] : null;
                    boundaryParent = boundaryPosition.node;
                }

                // Position the range immediately before the node containing the boundary
                workingNode = doc.createElement("span");

                // Making the working element non-empty element persuades IE to consider the TextRange boundary to be within
                // the element rather than immediately before or after it
                workingNode.innerHTML = "&#feff;";

                // insertBefore is supposed to work like appendChild if the second parameter is null. However, a bug report
                // for IERange suggests that it can crash the browser: http://code.google.com/p/ierange/issues/detail?id=12
                if (boundaryNode) {
                    boundaryParent.insertBefore(workingNode, boundaryNode);
                } else {
                    boundaryParent.appendChild(workingNode);
                }

                workingRange.moveToElementText(workingNode);
                workingRange.collapse(!isStart);

                // Clean up
                boundaryParent.removeChild(workingNode);

                // Move the working range to the text offset, if required
                if (nodeIsDataNode) {
                    workingRange[isStart ? "moveStart" : "moveEnd"]("character", boundaryOffset);
                }

                return workingRange;
            };

            /*------------------------------------------------------------------------------------------------------------*/

            // This is a wrapper around a TextRange, providing full DOM Range functionality using rangy's DomRange as a
            // prototype

            WrappedTextRange = function(textRange) {
                this.textRange = textRange;
                this.refresh();
            };

            WrappedTextRange.prototype = new DomRange(document);

            WrappedTextRange.prototype.refresh = function() {
                var start, end, startBoundary;

                // TextRange's parentElement() method cannot be trusted. getTextRangeContainerElement() works around that.
                var rangeContainerElement = getTextRangeContainerElement(this.textRange);

                if (textRangeIsCollapsed(this.textRange)) {
                    end = start = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true,
                        true).boundaryPosition;
                } else {
                    startBoundary = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, false);
                    start = startBoundary.boundaryPosition;

                    // An optimization used here is that if the start and end boundaries have the same parent element, the
                    // search scope for the end boundary can be limited to exclude the portion of the element that precedes
                    // the start boundary
                    end = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, false, false,
                        startBoundary.nodeInfo).boundaryPosition;
                }

                this.setStart(start.node, start.offset);
                this.setEnd(end.node, end.offset);
            };

            WrappedTextRange.prototype.getName = function() {
                return "WrappedTextRange";
            };

            DomRange.copyComparisonConstants(WrappedTextRange);

            var rangeToTextRange = function(range) {
                if (range.collapsed) {
                    return createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
                } else {
                    var startRange = createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
                    var endRange = createBoundaryTextRange(new DomPosition(range.endContainer, range.endOffset), false);
                    var textRange = getBody( DomRange.getRangeDocument(range) ).createTextRange();
                    textRange.setEndPoint("StartToStart", startRange);
                    textRange.setEndPoint("EndToEnd", endRange);
                    return textRange;
                }
            };

            WrappedTextRange.rangeToTextRange = rangeToTextRange;

            WrappedTextRange.prototype.toTextRange = function() {
                return rangeToTextRange(this);
            };

            api.WrappedTextRange = WrappedTextRange;

            // IE 9 and above have both implementations and Rangy makes both available. The next few lines sets which
            // implementation to use by default.
            if (!api.features.implementsDomRange || api.config.preferTextRange) {
                // Add WrappedTextRange as the Range property of the global object to allow expression like Range.END_TO_END to work
                var globalObj = (function(f) { return f("return this;")(); })(Function);
                if (typeof globalObj.Range == "undefined") {
                    globalObj.Range = WrappedTextRange;
                }

                api.createNativeRange = function(doc) {
                    doc = getContentDocument(doc, module, "createNativeRange");
                    return getBody(doc).createTextRange();
                };

                api.WrappedRange = WrappedTextRange;
            }
        }

        api.createRange = function(doc) {
            doc = getContentDocument(doc, module, "createRange");
            return new api.WrappedRange(api.createNativeRange(doc));
        };

        api.createRangyRange = function(doc) {
            doc = getContentDocument(doc, module, "createRangyRange");
            return new DomRange(doc);
        };

        util.createAliasForDeprecatedMethod(api, "createIframeRange", "createRange");
        util.createAliasForDeprecatedMethod(api, "createIframeRangyRange", "createRangyRange");

        api.addShimListener(function(win) {
            var doc = win.document;
            if (typeof doc.createRange == "undefined") {
                doc.createRange = function() {
                    return api.createRange(doc);
                };
            }
            doc = win = null;
        });
    });

    /*----------------------------------------------------------------------------------------------------------------*/

    // This module creates a selection object wrapper that conforms as closely as possible to the Selection specification
    // in the HTML Editing spec (http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#selections)
    api.createCoreModule("WrappedSelection", ["DomRange", "WrappedRange"], function(api, module) {
        api.config.checkSelectionRanges = true;

        var BOOLEAN = "boolean";
        var NUMBER = "number";
        var dom = api.dom;
        var util = api.util;
        var isHostMethod = util.isHostMethod;
        var DomRange = api.DomRange;
        var WrappedRange = api.WrappedRange;
        var DOMException = api.DOMException;
        var DomPosition = dom.DomPosition;
        var getNativeSelection;
        var selectionIsCollapsed;
        var features = api.features;
        var CONTROL = "Control";
        var getDocument = dom.getDocument;
        var getBody = dom.getBody;
        var rangesEqual = DomRange.rangesEqual;


        // Utility function to support direction parameters in the API that may be a string ("backward", "backwards",
        // "forward" or "forwards") or a Boolean (true for backwards).
        function isDirectionBackward(dir) {
            return (typeof dir == "string") ? /^backward(s)?$/i.test(dir) : !!dir;
        }

        function getWindow(win, methodName) {
            if (!win) {
                return window;
            } else if (dom.isWindow(win)) {
                return win;
            } else if (win instanceof WrappedSelection) {
                return win.win;
            } else {
                var doc = dom.getContentDocument(win, module, methodName);
                return dom.getWindow(doc);
            }
        }

        function getWinSelection(winParam) {
            return getWindow(winParam, "getWinSelection").getSelection();
        }

        function getDocSelection(winParam) {
            return getWindow(winParam, "getDocSelection").document.selection;
        }

        function winSelectionIsBackward(sel) {
            var backward = false;
            if (sel.anchorNode) {
                backward = (dom.comparePoints(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset) == 1);
            }
            return backward;
        }

        // Test for the Range/TextRange and Selection features required
        // Test for ability to retrieve selection
        var implementsWinGetSelection = isHostMethod(window, "getSelection"),
            implementsDocSelection = util.isHostObject(document, "selection");

        features.implementsWinGetSelection = implementsWinGetSelection;
        features.implementsDocSelection = implementsDocSelection;

        var useDocumentSelection = implementsDocSelection && (!implementsWinGetSelection || api.config.preferTextRange);

        if (useDocumentSelection) {
            getNativeSelection = getDocSelection;
            api.isSelectionValid = function(winParam) {
                var doc = getWindow(winParam, "isSelectionValid").document, nativeSel = doc.selection;

                // Check whether the selection TextRange is actually contained within the correct document
                return (nativeSel.type != "None" || getDocument(nativeSel.createRange().parentElement()) == doc);
            };
        } else if (implementsWinGetSelection) {
            getNativeSelection = getWinSelection;
            api.isSelectionValid = function() {
                return true;
            };
        } else {
            module.fail("Neither document.selection or window.getSelection() detected.");
            return false;
        }

        api.getNativeSelection = getNativeSelection;

        var testSelection = getNativeSelection();

        // In Firefox, the selection is null in an iframe with display: none. See issue #138.
        if (!testSelection) {
            module.fail("Native selection was null (possibly issue 138?)");
            return false;
        }

        var testRange = api.createNativeRange(document);
        var body = getBody(document);

        // Obtaining a range from a selection
        var selectionHasAnchorAndFocus = util.areHostProperties(testSelection,
            ["anchorNode", "focusNode", "anchorOffset", "focusOffset"]);

        features.selectionHasAnchorAndFocus = selectionHasAnchorAndFocus;

        // Test for existence of native selection extend() method
        var selectionHasExtend = isHostMethod(testSelection, "extend");
        features.selectionHasExtend = selectionHasExtend;

        // Test if rangeCount exists
        var selectionHasRangeCount = (typeof testSelection.rangeCount == NUMBER);
        features.selectionHasRangeCount = selectionHasRangeCount;

        var selectionSupportsMultipleRanges = false;
        var collapsedNonEditableSelectionsSupported = true;

        var addRangeBackwardToNative = selectionHasExtend ?
            function(nativeSelection, range) {
                var doc = DomRange.getRangeDocument(range);
                var endRange = api.createRange(doc);
                endRange.collapseToPoint(range.endContainer, range.endOffset);
                nativeSelection.addRange(getNativeRange(endRange));
                nativeSelection.extend(range.startContainer, range.startOffset);
            } : null;

        if (util.areHostMethods(testSelection, ["addRange", "getRangeAt", "removeAllRanges"]) &&
                typeof testSelection.rangeCount == NUMBER && features.implementsDomRange) {

            (function() {
                // Previously an iframe was used but this caused problems in some circumstances in IE, so tests are
                // performed on the current document's selection. See issue 109.

                // Note also that if a selection previously existed, it is wiped and later restored by these tests. This
                // will result in the selection direction begin reversed if the original selection was backwards and the
                // browser does not support setting backwards selections (Internet Explorer, I'm looking at you).
                var sel = window.getSelection();
                if (sel) {
                    // Store the current selection
                    var originalSelectionRangeCount = sel.rangeCount;
                    var selectionHasMultipleRanges = (originalSelectionRangeCount > 1);
                    var originalSelectionRanges = [];
                    var originalSelectionBackward = winSelectionIsBackward(sel);
                    for (var i = 0; i < originalSelectionRangeCount; ++i) {
                        originalSelectionRanges[i] = sel.getRangeAt(i);
                    }

                    // Create some test elements
                    var testEl = dom.createTestElement(document, "", false);
                    var textNode = testEl.appendChild( document.createTextNode("\u00a0\u00a0\u00a0") );

                    // Test whether the native selection will allow a collapsed selection within a non-editable element
                    var r1 = document.createRange();

                    r1.setStart(textNode, 1);
                    r1.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(r1);
                    collapsedNonEditableSelectionsSupported = (sel.rangeCount == 1);
                    sel.removeAllRanges();

                    // Test whether the native selection is capable of supporting multiple ranges.
                    if (!selectionHasMultipleRanges) {
                        // Doing the original feature test here in Chrome 36 (and presumably later versions) prints a
                        // console error of "Discontiguous selection is not supported." that cannot be suppressed. There's
                        // nothing we can do about this while retaining the feature test so we have to resort to a browser
                        // sniff. I'm not happy about it. See
                        // https://code.google.com/p/chromium/issues/detail?id=399791
                        var chromeMatch = window.navigator.appVersion.match(/Chrome\/(.*?) /);
                        if (chromeMatch && parseInt(chromeMatch[1]) >= 36) {
                            selectionSupportsMultipleRanges = false;
                        } else {
                            var r2 = r1.cloneRange();
                            r1.setStart(textNode, 0);
                            r2.setEnd(textNode, 3);
                            r2.setStart(textNode, 2);
                            sel.addRange(r1);
                            sel.addRange(r2);
                            selectionSupportsMultipleRanges = (sel.rangeCount == 2);
                        }
                    }

                    // Clean up
                    dom.removeNode(testEl);
                    sel.removeAllRanges();

                    for (i = 0; i < originalSelectionRangeCount; ++i) {
                        if (i == 0 && originalSelectionBackward) {
                            if (addRangeBackwardToNative) {
                                addRangeBackwardToNative(sel, originalSelectionRanges[i]);
                            } else {
                                api.warn("Rangy initialization: original selection was backwards but selection has been restored forwards because the browser does not support Selection.extend");
                                sel.addRange(originalSelectionRanges[i]);
                            }
                        } else {
                            sel.addRange(originalSelectionRanges[i]);
                        }
                    }
                }
            })();
        }

        features.selectionSupportsMultipleRanges = selectionSupportsMultipleRanges;
        features.collapsedNonEditableSelectionsSupported = collapsedNonEditableSelectionsSupported;

        // ControlRanges
        var implementsControlRange = false, testControlRange;

        if (body && isHostMethod(body, "createControlRange")) {
            testControlRange = body.createControlRange();
            if (util.areHostProperties(testControlRange, ["item", "add"])) {
                implementsControlRange = true;
            }
        }
        features.implementsControlRange = implementsControlRange;

        // Selection collapsedness
        if (selectionHasAnchorAndFocus) {
            selectionIsCollapsed = function(sel) {
                return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
            };
        } else {
            selectionIsCollapsed = function(sel) {
                return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
            };
        }

        function updateAnchorAndFocusFromRange(sel, range, backward) {
            var anchorPrefix = backward ? "end" : "start", focusPrefix = backward ? "start" : "end";
            sel.anchorNode = range[anchorPrefix + "Container"];
            sel.anchorOffset = range[anchorPrefix + "Offset"];
            sel.focusNode = range[focusPrefix + "Container"];
            sel.focusOffset = range[focusPrefix + "Offset"];
        }

        function updateAnchorAndFocusFromNativeSelection(sel) {
            var nativeSel = sel.nativeSelection;
            sel.anchorNode = nativeSel.anchorNode;
            sel.anchorOffset = nativeSel.anchorOffset;
            sel.focusNode = nativeSel.focusNode;
            sel.focusOffset = nativeSel.focusOffset;
        }

        function updateEmptySelection(sel) {
            sel.anchorNode = sel.focusNode = null;
            sel.anchorOffset = sel.focusOffset = 0;
            sel.rangeCount = 0;
            sel.isCollapsed = true;
            sel._ranges.length = 0;
        }

        function getNativeRange(range) {
            var nativeRange;
            if (range instanceof DomRange) {
                nativeRange = api.createNativeRange(range.getDocument());
                nativeRange.setEnd(range.endContainer, range.endOffset);
                nativeRange.setStart(range.startContainer, range.startOffset);
            } else if (range instanceof WrappedRange) {
                nativeRange = range.nativeRange;
            } else if (features.implementsDomRange && (range instanceof dom.getWindow(range.startContainer).Range)) {
                nativeRange = range;
            }
            return nativeRange;
        }

        function rangeContainsSingleElement(rangeNodes) {
            if (!rangeNodes.length || rangeNodes[0].nodeType != 1) {
                return false;
            }
            for (var i = 1, len = rangeNodes.length; i < len; ++i) {
                if (!dom.isAncestorOf(rangeNodes[0], rangeNodes[i])) {
                    return false;
                }
            }
            return true;
        }

        function getSingleElementFromRange(range) {
            var nodes = range.getNodes();
            if (!rangeContainsSingleElement(nodes)) {
                throw module.createError("getSingleElementFromRange: range " + range.inspect() + " did not consist of a single element");
            }
            return nodes[0];
        }

        // Simple, quick test which only needs to distinguish between a TextRange and a ControlRange
        function isTextRange(range) {
            return !!range && typeof range.text != "undefined";
        }

        function updateFromTextRange(sel, range) {
            // Create a Range from the selected TextRange
            var wrappedRange = new WrappedRange(range);
            sel._ranges = [wrappedRange];

            updateAnchorAndFocusFromRange(sel, wrappedRange, false);
            sel.rangeCount = 1;
            sel.isCollapsed = wrappedRange.collapsed;
        }

        function updateControlSelection(sel) {
            // Update the wrapped selection based on what's now in the native selection
            sel._ranges.length = 0;
            if (sel.docSelection.type == "None") {
                updateEmptySelection(sel);
            } else {
                var controlRange = sel.docSelection.createRange();
                if (isTextRange(controlRange)) {
                    // This case (where the selection type is "Control" and calling createRange() on the selection returns
                    // a TextRange) can happen in IE 9. It happens, for example, when all elements in the selected
                    // ControlRange have been removed from the ControlRange and removed from the document.
                    updateFromTextRange(sel, controlRange);
                } else {
                    sel.rangeCount = controlRange.length;
                    var range, doc = getDocument(controlRange.item(0));
                    for (var i = 0; i < sel.rangeCount; ++i) {
                        range = api.createRange(doc);
                        range.selectNode(controlRange.item(i));
                        sel._ranges.push(range);
                    }
                    sel.isCollapsed = sel.rangeCount == 1 && sel._ranges[0].collapsed;
                    updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
                }
            }
        }

        function addRangeToControlSelection(sel, range) {
            var controlRange = sel.docSelection.createRange();
            var rangeElement = getSingleElementFromRange(range);

            // Create a new ControlRange containing all the elements in the selected ControlRange plus the element
            // contained by the supplied range
            var doc = getDocument(controlRange.item(0));
            var newControlRange = getBody(doc).createControlRange();
            for (var i = 0, len = controlRange.length; i < len; ++i) {
                newControlRange.add(controlRange.item(i));
            }
            try {
                newControlRange.add(rangeElement);
            } catch (ex) {
                throw module.createError("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)");
            }
            newControlRange.select();

            // Update the wrapped selection based on what's now in the native selection
            updateControlSelection(sel);
        }

        var getSelectionRangeAt;

        if (isHostMethod(testSelection, "getRangeAt")) {
            // try/catch is present because getRangeAt() must have thrown an error in some browser and some situation.
            // Unfortunately, I didn't write a comment about the specifics and am now scared to take it out. Let that be a
            // lesson to us all, especially me.
            getSelectionRangeAt = function(sel, index) {
                try {
                    return sel.getRangeAt(index);
                } catch (ex) {
                    return null;
                }
            };
        } else if (selectionHasAnchorAndFocus) {
            getSelectionRangeAt = function(sel) {
                var doc = getDocument(sel.anchorNode);
                var range = api.createRange(doc);
                range.setStartAndEnd(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);

                // Handle the case when the selection was selected backwards (from the end to the start in the
                // document)
                if (range.collapsed !== this.isCollapsed) {
                    range.setStartAndEnd(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset);
                }

                return range;
            };
        }

        function WrappedSelection(selection, docSelection, win) {
            this.nativeSelection = selection;
            this.docSelection = docSelection;
            this._ranges = [];
            this.win = win;
            this.refresh();
        }

        WrappedSelection.prototype = api.selectionPrototype;

        function deleteProperties(sel) {
            sel.win = sel.anchorNode = sel.focusNode = sel._ranges = null;
            sel.rangeCount = sel.anchorOffset = sel.focusOffset = 0;
            sel.detached = true;
        }

        var cachedRangySelections = [];

        function actOnCachedSelection(win, action) {
            var i = cachedRangySelections.length, cached, sel;
            while (i--) {
                cached = cachedRangySelections[i];
                sel = cached.selection;
                if (action == "deleteAll") {
                    deleteProperties(sel);
                } else if (cached.win == win) {
                    if (action == "delete") {
                        cachedRangySelections.splice(i, 1);
                        return true;
                    } else {
                        return sel;
                    }
                }
            }
            if (action == "deleteAll") {
                cachedRangySelections.length = 0;
            }
            return null;
        }

        var getSelection = function(win) {
            // Check if the parameter is a Rangy Selection object
            if (win && win instanceof WrappedSelection) {
                win.refresh();
                return win;
            }

            win = getWindow(win, "getNativeSelection");

            var sel = actOnCachedSelection(win);
            var nativeSel = getNativeSelection(win), docSel = implementsDocSelection ? getDocSelection(win) : null;
            if (sel) {
                sel.nativeSelection = nativeSel;
                sel.docSelection = docSel;
                sel.refresh();
            } else {
                sel = new WrappedSelection(nativeSel, docSel, win);
                cachedRangySelections.push( { win: win, selection: sel } );
            }
            return sel;
        };

        api.getSelection = getSelection;

        util.createAliasForDeprecatedMethod(api, "getIframeSelection", "getSelection");

        var selProto = WrappedSelection.prototype;

        function createControlSelection(sel, ranges) {
            // Ensure that the selection becomes of type "Control"
            var doc = getDocument(ranges[0].startContainer);
            var controlRange = getBody(doc).createControlRange();
            for (var i = 0, el, len = ranges.length; i < len; ++i) {
                el = getSingleElementFromRange(ranges[i]);
                try {
                    controlRange.add(el);
                } catch (ex) {
                    throw module.createError("setRanges(): Element within one of the specified Ranges could not be added to control selection (does it have layout?)");
                }
            }
            controlRange.select();

            // Update the wrapped selection based on what's now in the native selection
            updateControlSelection(sel);
        }

        // Selecting a range
        if (!useDocumentSelection && selectionHasAnchorAndFocus && util.areHostMethods(testSelection, ["removeAllRanges", "addRange"])) {
            selProto.removeAllRanges = function() {
                this.nativeSelection.removeAllRanges();
                updateEmptySelection(this);
            };

            var addRangeBackward = function(sel, range) {
                addRangeBackwardToNative(sel.nativeSelection, range);
                sel.refresh();
            };

            if (selectionHasRangeCount) {
                selProto.addRange = function(range, direction) {
                    if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
                        addRangeToControlSelection(this, range);
                    } else {
                        if (isDirectionBackward(direction) && selectionHasExtend) {
                            addRangeBackward(this, range);
                        } else {
                            var previousRangeCount;
                            if (selectionSupportsMultipleRanges) {
                                previousRangeCount = this.rangeCount;
                            } else {
                                this.removeAllRanges();
                                previousRangeCount = 0;
                            }
                            // Clone the native range so that changing the selected range does not affect the selection.
                            // This is contrary to the spec but is the only way to achieve consistency between browsers. See
                            // issue 80.
                            var clonedNativeRange = getNativeRange(range).cloneRange();
                            try {
                                this.nativeSelection.addRange(clonedNativeRange);
                            } catch (ex) {
                            }

                            // Check whether adding the range was successful
                            this.rangeCount = this.nativeSelection.rangeCount;

                            if (this.rangeCount == previousRangeCount + 1) {
                                // The range was added successfully

                                // Check whether the range that we added to the selection is reflected in the last range extracted from
                                // the selection
                                if (api.config.checkSelectionRanges) {
                                    var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1);
                                    if (nativeRange && !rangesEqual(nativeRange, range)) {
                                        // Happens in WebKit with, for example, a selection placed at the start of a text node
                                        range = new WrappedRange(nativeRange);
                                    }
                                }
                                this._ranges[this.rangeCount - 1] = range;
                                updateAnchorAndFocusFromRange(this, range, selectionIsBackward(this.nativeSelection));
                                this.isCollapsed = selectionIsCollapsed(this);
                            } else {
                                // The range was not added successfully. The simplest thing is to refresh
                                this.refresh();
                            }
                        }
                    }
                };
            } else {
                selProto.addRange = function(range, direction) {
                    if (isDirectionBackward(direction) && selectionHasExtend) {
                        addRangeBackward(this, range);
                    } else {
                        this.nativeSelection.addRange(getNativeRange(range));
                        this.refresh();
                    }
                };
            }

            selProto.setRanges = function(ranges) {
                if (implementsControlRange && implementsDocSelection && ranges.length > 1) {
                    createControlSelection(this, ranges);
                } else {
                    this.removeAllRanges();
                    for (var i = 0, len = ranges.length; i < len; ++i) {
                        this.addRange(ranges[i]);
                    }
                }
            };
        } else if (isHostMethod(testSelection, "empty") && isHostMethod(testRange, "select") &&
                   implementsControlRange && useDocumentSelection) {

            selProto.removeAllRanges = function() {
                // Added try/catch as fix for issue #21
                try {
                    this.docSelection.empty();

                    // Check for empty() not working (issue #24)
                    if (this.docSelection.type != "None") {
                        // Work around failure to empty a control selection by instead selecting a TextRange and then
                        // calling empty()
                        var doc;
                        if (this.anchorNode) {
                            doc = getDocument(this.anchorNode);
                        } else if (this.docSelection.type == CONTROL) {
                            var controlRange = this.docSelection.createRange();
                            if (controlRange.length) {
                                doc = getDocument( controlRange.item(0) );
                            }
                        }
                        if (doc) {
                            var textRange = getBody(doc).createTextRange();
                            textRange.select();
                            this.docSelection.empty();
                        }
                    }
                } catch(ex) {}
                updateEmptySelection(this);
            };

            selProto.addRange = function(range) {
                if (this.docSelection.type == CONTROL) {
                    addRangeToControlSelection(this, range);
                } else {
                    api.WrappedTextRange.rangeToTextRange(range).select();
                    this._ranges[0] = range;
                    this.rangeCount = 1;
                    this.isCollapsed = this._ranges[0].collapsed;
                    updateAnchorAndFocusFromRange(this, range, false);
                }
            };

            selProto.setRanges = function(ranges) {
                this.removeAllRanges();
                var rangeCount = ranges.length;
                if (rangeCount > 1) {
                    createControlSelection(this, ranges);
                } else if (rangeCount) {
                    this.addRange(ranges[0]);
                }
            };
        } else {
            module.fail("No means of selecting a Range or TextRange was found");
            return false;
        }

        selProto.getRangeAt = function(index) {
            if (index < 0 || index >= this.rangeCount) {
                throw new DOMException("INDEX_SIZE_ERR");
            } else {
                // Clone the range to preserve selection-range independence. See issue 80.
                return this._ranges[index].cloneRange();
            }
        };

        var refreshSelection;

        if (useDocumentSelection) {
            refreshSelection = function(sel) {
                var range;
                if (api.isSelectionValid(sel.win)) {
                    range = sel.docSelection.createRange();
                } else {
                    range = getBody(sel.win.document).createTextRange();
                    range.collapse(true);
                }

                if (sel.docSelection.type == CONTROL) {
                    updateControlSelection(sel);
                } else if (isTextRange(range)) {
                    updateFromTextRange(sel, range);
                } else {
                    updateEmptySelection(sel);
                }
            };
        } else if (isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == NUMBER) {
            refreshSelection = function(sel) {
                if (implementsControlRange && implementsDocSelection && sel.docSelection.type == CONTROL) {
                    updateControlSelection(sel);
                } else {
                    sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
                    if (sel.rangeCount) {
                        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                            sel._ranges[i] = new api.WrappedRange(sel.nativeSelection.getRangeAt(i));
                        }
                        updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackward(sel.nativeSelection));
                        sel.isCollapsed = selectionIsCollapsed(sel);
                    } else {
                        updateEmptySelection(sel);
                    }
                }
            };
        } else if (selectionHasAnchorAndFocus && typeof testSelection.isCollapsed == BOOLEAN && typeof testRange.collapsed == BOOLEAN && features.implementsDomRange) {
            refreshSelection = function(sel) {
                var range, nativeSel = sel.nativeSelection;
                if (nativeSel.anchorNode) {
                    range = getSelectionRangeAt(nativeSel, 0);
                    sel._ranges = [range];
                    sel.rangeCount = 1;
                    updateAnchorAndFocusFromNativeSelection(sel);
                    sel.isCollapsed = selectionIsCollapsed(sel);
                } else {
                    updateEmptySelection(sel);
                }
            };
        } else {
            module.fail("No means of obtaining a Range or TextRange from the user's selection was found");
            return false;
        }

        selProto.refresh = function(checkForChanges) {
            var oldRanges = checkForChanges ? this._ranges.slice(0) : null;
            var oldAnchorNode = this.anchorNode, oldAnchorOffset = this.anchorOffset;

            refreshSelection(this);
            if (checkForChanges) {
                // Check the range count first
                var i = oldRanges.length;
                if (i != this._ranges.length) {
                    return true;
                }

                // Now check the direction. Checking the anchor position is the same is enough since we're checking all the
                // ranges after this
                if (this.anchorNode != oldAnchorNode || this.anchorOffset != oldAnchorOffset) {
                    return true;
                }

                // Finally, compare each range in turn
                while (i--) {
                    if (!rangesEqual(oldRanges[i], this._ranges[i])) {
                        return true;
                    }
                }
                return false;
            }
        };

        // Removal of a single range
        var removeRangeManually = function(sel, range) {
            var ranges = sel.getAllRanges();
            sel.removeAllRanges();
            for (var i = 0, len = ranges.length; i < len; ++i) {
                if (!rangesEqual(range, ranges[i])) {
                    sel.addRange(ranges[i]);
                }
            }
            if (!sel.rangeCount) {
                updateEmptySelection(sel);
            }
        };

        if (implementsControlRange && implementsDocSelection) {
            selProto.removeRange = function(range) {
                if (this.docSelection.type == CONTROL) {
                    var controlRange = this.docSelection.createRange();
                    var rangeElement = getSingleElementFromRange(range);

                    // Create a new ControlRange containing all the elements in the selected ControlRange minus the
                    // element contained by the supplied range
                    var doc = getDocument(controlRange.item(0));
                    var newControlRange = getBody(doc).createControlRange();
                    var el, removed = false;
                    for (var i = 0, len = controlRange.length; i < len; ++i) {
                        el = controlRange.item(i);
                        if (el !== rangeElement || removed) {
                            newControlRange.add(controlRange.item(i));
                        } else {
                            removed = true;
                        }
                    }
                    newControlRange.select();

                    // Update the wrapped selection based on what's now in the native selection
                    updateControlSelection(this);
                } else {
                    removeRangeManually(this, range);
                }
            };
        } else {
            selProto.removeRange = function(range) {
                removeRangeManually(this, range);
            };
        }

        // Detecting if a selection is backward
        var selectionIsBackward;
        if (!useDocumentSelection && selectionHasAnchorAndFocus && features.implementsDomRange) {
            selectionIsBackward = winSelectionIsBackward;

            selProto.isBackward = function() {
                return selectionIsBackward(this);
            };
        } else {
            selectionIsBackward = selProto.isBackward = function() {
                return false;
            };
        }

        // Create an alias for backwards compatibility. From 1.3, everything is "backward" rather than "backwards"
        selProto.isBackwards = selProto.isBackward;

        // Selection stringifier
        // This is conformant to the old HTML5 selections draft spec but differs from WebKit and Mozilla's implementation.
        // The current spec does not yet define this method.
        selProto.toString = function() {
            var rangeTexts = [];
            for (var i = 0, len = this.rangeCount; i < len; ++i) {
                rangeTexts[i] = "" + this._ranges[i];
            }
            return rangeTexts.join("");
        };

        function assertNodeInSameDocument(sel, node) {
            if (sel.win.document != getDocument(node)) {
                throw new DOMException("WRONG_DOCUMENT_ERR");
            }
        }

        // No current browser conforms fully to the spec for this method, so Rangy's own method is always used
        selProto.collapse = function(node, offset) {
            assertNodeInSameDocument(this, node);
            var range = api.createRange(node);
            range.collapseToPoint(node, offset);
            this.setSingleRange(range);
            this.isCollapsed = true;
        };

        selProto.collapseToStart = function() {
            if (this.rangeCount) {
                var range = this._ranges[0];
                this.collapse(range.startContainer, range.startOffset);
            } else {
                throw new DOMException("INVALID_STATE_ERR");
            }
        };

        selProto.collapseToEnd = function() {
            if (this.rangeCount) {
                var range = this._ranges[this.rangeCount - 1];
                this.collapse(range.endContainer, range.endOffset);
            } else {
                throw new DOMException("INVALID_STATE_ERR");
            }
        };

        // The spec is very specific on how selectAllChildren should be implemented and not all browsers implement it as
        // specified so the native implementation is never used by Rangy.
        selProto.selectAllChildren = function(node) {
            assertNodeInSameDocument(this, node);
            var range = api.createRange(node);
            range.selectNodeContents(node);
            this.setSingleRange(range);
        };

        selProto.deleteFromDocument = function() {
            // Sepcial behaviour required for IE's control selections
            if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
                var controlRange = this.docSelection.createRange();
                var element;
                while (controlRange.length) {
                    element = controlRange.item(0);
                    controlRange.remove(element);
                    dom.removeNode(element);
                }
                this.refresh();
            } else if (this.rangeCount) {
                var ranges = this.getAllRanges();
                if (ranges.length) {
                    this.removeAllRanges();
                    for (var i = 0, len = ranges.length; i < len; ++i) {
                        ranges[i].deleteContents();
                    }
                    // The spec says nothing about what the selection should contain after calling deleteContents on each
                    // range. Firefox moves the selection to where the final selected range was, so we emulate that
                    this.addRange(ranges[len - 1]);
                }
            }
        };

        // The following are non-standard extensions
        selProto.eachRange = function(func, returnValue) {
            for (var i = 0, len = this._ranges.length; i < len; ++i) {
                if ( func( this.getRangeAt(i) ) ) {
                    return returnValue;
                }
            }
        };

        selProto.getAllRanges = function() {
            var ranges = [];
            this.eachRange(function(range) {
                ranges.push(range);
            });
            return ranges;
        };

        selProto.setSingleRange = function(range, direction) {
            this.removeAllRanges();
            this.addRange(range, direction);
        };

        selProto.callMethodOnEachRange = function(methodName, params) {
            var results = [];
            this.eachRange( function(range) {
                results.push( range[methodName].apply(range, params || []) );
            } );
            return results;
        };

        function createStartOrEndSetter(isStart) {
            return function(node, offset) {
                var range;
                if (this.rangeCount) {
                    range = this.getRangeAt(0);
                    range["set" + (isStart ? "Start" : "End")](node, offset);
                } else {
                    range = api.createRange(this.win.document);
                    range.setStartAndEnd(node, offset);
                }
                this.setSingleRange(range, this.isBackward());
            };
        }

        selProto.setStart = createStartOrEndSetter(true);
        selProto.setEnd = createStartOrEndSetter(false);

        // Add select() method to Range prototype. Any existing selection will be removed.
        api.rangePrototype.select = function(direction) {
            getSelection( this.getDocument() ).setSingleRange(this, direction);
        };

        selProto.changeEachRange = function(func) {
            var ranges = [];
            var backward = this.isBackward();

            this.eachRange(function(range) {
                func(range);
                ranges.push(range);
            });

            this.removeAllRanges();
            if (backward && ranges.length == 1) {
                this.addRange(ranges[0], "backward");
            } else {
                this.setRanges(ranges);
            }
        };

        selProto.containsNode = function(node, allowPartial) {
            return this.eachRange( function(range) {
                return range.containsNode(node, allowPartial);
            }, true ) || false;
        };

        selProto.getBookmark = function(containerNode) {
            return {
                backward: this.isBackward(),
                rangeBookmarks: this.callMethodOnEachRange("getBookmark", [containerNode])
            };
        };

        selProto.moveToBookmark = function(bookmark) {
            var selRanges = [];
            for (var i = 0, rangeBookmark, range; rangeBookmark = bookmark.rangeBookmarks[i++]; ) {
                range = api.createRange(this.win);
                range.moveToBookmark(rangeBookmark);
                selRanges.push(range);
            }
            if (bookmark.backward) {
                this.setSingleRange(selRanges[0], "backward");
            } else {
                this.setRanges(selRanges);
            }
        };

        selProto.saveRanges = function() {
            return {
                backward: this.isBackward(),
                ranges: this.callMethodOnEachRange("cloneRange")
            };
        };

        selProto.restoreRanges = function(selRanges) {
            this.removeAllRanges();
            for (var i = 0, range; range = selRanges.ranges[i]; ++i) {
                this.addRange(range, (selRanges.backward && i == 0));
            }
        };

        selProto.toHtml = function() {
            var rangeHtmls = [];
            this.eachRange(function(range) {
                rangeHtmls.push( DomRange.toHtml(range) );
            });
            return rangeHtmls.join("");
        };

        if (features.implementsTextRange) {
            selProto.getNativeTextRange = function() {
                var sel, textRange;
                if ( (sel = this.docSelection) ) {
                    var range = sel.createRange();
                    if (isTextRange(range)) {
                        return range;
                    } else {
                        throw module.createError("getNativeTextRange: selection is a control selection");
                    }
                } else if (this.rangeCount > 0) {
                    return api.WrappedTextRange.rangeToTextRange( this.getRangeAt(0) );
                } else {
                    throw module.createError("getNativeTextRange: selection contains no range");
                }
            };
        }

        function inspect(sel) {
            var rangeInspects = [];
            var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
            var focus = new DomPosition(sel.focusNode, sel.focusOffset);
            var name = (typeof sel.getName == "function") ? sel.getName() : "Selection";

            if (typeof sel.rangeCount != "undefined") {
                for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                    rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
                }
            }
            return "[" + name + "(Ranges: " + rangeInspects.join(", ") +
                    ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";
        }

        selProto.getName = function() {
            return "WrappedSelection";
        };

        selProto.inspect = function() {
            return inspect(this);
        };

        selProto.detach = function() {
            actOnCachedSelection(this.win, "delete");
            deleteProperties(this);
        };

        WrappedSelection.detachAll = function() {
            actOnCachedSelection(null, "deleteAll");
        };

        WrappedSelection.inspect = inspect;
        WrappedSelection.isDirectionBackward = isDirectionBackward;

        api.Selection = WrappedSelection;

        api.selectionPrototype = selProto;

        api.addShimListener(function(win) {
            if (typeof win.getSelection == "undefined") {
                win.getSelection = function() {
                    return getSelection(win);
                };
            }
            win = null;
        });
    });
    

    /*----------------------------------------------------------------------------------------------------------------*/

    // Wait for document to load before initializing
    var docReady = false;

    var loadHandler = function(e) {
        if (!docReady) {
            docReady = true;
            if (!api.initialized && api.config.autoInitialize) {
                init();
            }
        }
    };

    if (isBrowser) {
        // Test whether the document has already been loaded and initialize immediately if so
        if (document.readyState == "complete") {
            loadHandler();
        } else {
            if (isHostMethod(document, "addEventListener")) {
                document.addEventListener("DOMContentLoaded", loadHandler, false);
            }

            // Add a fallback in case the DOMContentLoaded event isn't supported
            addListener(window, "load", loadHandler);
        }
    }

    return api;
}, this);
/**
 * Selection save and restore module for Rangy.
 * Saves and restores user selections using marker invisible elements in the DOM.
 *
 * Part of Rangy, a cross-browser JavaScript range and selection library
 * https://github.com/timdown/rangy
 *
 * Depends on Rangy core.
 *
 * Copyright 2015, Tim Down
 * Licensed under the MIT license.
 * Version: 1.3.0
 * Build date: 10 May 2015
 */
(function(factory, root) {
    if (typeof define == "function" && define.amd) {
        // AMD. Register as an anonymous module with a dependency on Rangy.
        define(["./rangy-core"], factory);
    } else if (typeof module != "undefined" && typeof exports == "object") {
        // Node/CommonJS style
        module.exports = factory( require("rangy") );
    } else {
        // No AMD or CommonJS support so we use the rangy property of root (probably the global variable)
        factory(root.rangy);
    }
})(function(rangy) {
    rangy.createModule("SaveRestore", ["WrappedRange"], function(api, module) {
        var dom = api.dom;
        var removeNode = dom.removeNode;
        var isDirectionBackward = api.Selection.isDirectionBackward;
        var markerTextChar = "\ufeff";

        function gEBI(id, doc) {
            return (doc || document).getElementById(id);
        }

        function insertRangeBoundaryMarker(range, atStart) {
            var markerId = "selectionBoundary_" + (+new Date()) + "_" + ("" + Math.random()).slice(2);
            var markerEl;
            var doc = dom.getDocument(range.startContainer);

            // Clone the Range and collapse to the appropriate boundary point
            var boundaryRange = range.cloneRange();
            boundaryRange.collapse(atStart);

            // Create the marker element containing a single invisible character using DOM methods and insert it
            markerEl = doc.createElement("span");
            markerEl.id = markerId;
            markerEl.style.lineHeight = "0";
            markerEl.style.display = "none";
            markerEl.className = "rangySelectionBoundary";
            markerEl.appendChild(doc.createTextNode(markerTextChar));

            boundaryRange.insertNode(markerEl);
            return markerEl;
        }

        function setRangeBoundary(doc, range, markerId, atStart) {
            var markerEl = gEBI(markerId, doc);
            if (markerEl) {
                range[atStart ? "setStartBefore" : "setEndBefore"](markerEl);
                removeNode(markerEl);
            } else {
                module.warn("Marker element has been removed. Cannot restore selection.");
            }
        }

        function compareRanges(r1, r2) {
            return r2.compareBoundaryPoints(r1.START_TO_START, r1);
        }

        function saveRange(range, direction) {
            var startEl, endEl, doc = api.DomRange.getRangeDocument(range), text = range.toString();
            var backward = isDirectionBackward(direction);

            if (range.collapsed) {
                endEl = insertRangeBoundaryMarker(range, false);
                return {
                    document: doc,
                    markerId: endEl.id,
                    collapsed: true
                };
            } else {
                endEl = insertRangeBoundaryMarker(range, false);
                startEl = insertRangeBoundaryMarker(range, true);

                return {
                    document: doc,
                    startMarkerId: startEl.id,
                    endMarkerId: endEl.id,
                    collapsed: false,
                    backward: backward,
                    toString: function() {
                        return "original text: '" + text + "', new text: '" + range.toString() + "'";
                    }
                };
            }
        }

        function restoreRange(rangeInfo, normalize) {
            var doc = rangeInfo.document;
            if (typeof normalize == "undefined") {
                normalize = true;
            }
            var range = api.createRange(doc);
            if (rangeInfo.collapsed) {
                var markerEl = gEBI(rangeInfo.markerId, doc);
                if (markerEl) {
                    markerEl.style.display = "inline";
                    var previousNode = markerEl.previousSibling;

                    // Workaround for issue 17
                    if (previousNode && previousNode.nodeType == 3) {
                        removeNode(markerEl);
                        range.collapseToPoint(previousNode, previousNode.length);
                    } else {
                        range.collapseBefore(markerEl);
                        removeNode(markerEl);
                    }
                } else {
                    module.warn("Marker element has been removed. Cannot restore selection.");
                }
            } else {
                setRangeBoundary(doc, range, rangeInfo.startMarkerId, true);
                setRangeBoundary(doc, range, rangeInfo.endMarkerId, false);
            }

            if (normalize) {
                range.normalizeBoundaries();
            }

            return range;
        }

        function saveRanges(ranges, direction) {
            var rangeInfos = [], range, doc;
            var backward = isDirectionBackward(direction);

            // Order the ranges by position within the DOM, latest first, cloning the array to leave the original untouched
            ranges = ranges.slice(0);
            ranges.sort(compareRanges);

            for (var i = 0, len = ranges.length; i < len; ++i) {
                rangeInfos[i] = saveRange(ranges[i], backward);
            }

            // Now that all the markers are in place and DOM manipulation over, adjust each range's boundaries to lie
            // between its markers
            for (i = len - 1; i >= 0; --i) {
                range = ranges[i];
                doc = api.DomRange.getRangeDocument(range);
                if (range.collapsed) {
                    range.collapseAfter(gEBI(rangeInfos[i].markerId, doc));
                } else {
                    range.setEndBefore(gEBI(rangeInfos[i].endMarkerId, doc));
                    range.setStartAfter(gEBI(rangeInfos[i].startMarkerId, doc));
                }
            }

            return rangeInfos;
        }

        function saveSelection(win) {
            if (!api.isSelectionValid(win)) {
                module.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");
                return null;
            }
            var sel = api.getSelection(win);
            var ranges = sel.getAllRanges();
            var backward = (ranges.length == 1 && sel.isBackward());

            var rangeInfos = saveRanges(ranges, backward);

            // Ensure current selection is unaffected
            if (backward) {
                sel.setSingleRange(ranges[0], backward);
            } else {
                sel.setRanges(ranges);
            }

            return {
                win: win,
                rangeInfos: rangeInfos,
                restored: false
            };
        }

        function restoreRanges(rangeInfos) {
            var ranges = [];

            // Ranges are in reverse order of appearance in the DOM. We want to restore earliest first to avoid
            // normalization affecting previously restored ranges.
            var rangeCount = rangeInfos.length;

            for (var i = rangeCount - 1; i >= 0; i--) {
                ranges[i] = restoreRange(rangeInfos[i], true);
            }

            return ranges;
        }

        function restoreSelection(savedSelection, preserveDirection) {
            if (!savedSelection.restored) {
                var rangeInfos = savedSelection.rangeInfos;
                var sel = api.getSelection(savedSelection.win);
                var ranges = restoreRanges(rangeInfos), rangeCount = rangeInfos.length;

                if (rangeCount == 1 && preserveDirection && api.features.selectionHasExtend && rangeInfos[0].backward) {
                    sel.removeAllRanges();
                    sel.addRange(ranges[0], true);
                } else {
                    sel.setRanges(ranges);
                }

                savedSelection.restored = true;
            }
        }

        function removeMarkerElement(doc, markerId) {
            var markerEl = gEBI(markerId, doc);
            if (markerEl) {
                removeNode(markerEl);
            }
        }

        function removeMarkers(savedSelection) {
            var rangeInfos = savedSelection.rangeInfos;
            for (var i = 0, len = rangeInfos.length, rangeInfo; i < len; ++i) {
                rangeInfo = rangeInfos[i];
                if (rangeInfo.collapsed) {
                    removeMarkerElement(savedSelection.doc, rangeInfo.markerId);
                } else {
                    removeMarkerElement(savedSelection.doc, rangeInfo.startMarkerId);
                    removeMarkerElement(savedSelection.doc, rangeInfo.endMarkerId);
                }
            }
        }

        api.util.extend(api, {
            saveRange: saveRange,
            restoreRange: restoreRange,
            saveRanges: saveRanges,
            restoreRanges: restoreRanges,
            saveSelection: saveSelection,
            restoreSelection: restoreSelection,
            removeMarkerElement: removeMarkerElement,
            removeMarkers: removeMarkers
        });
    });
    
    return rangy;
}, this);
/**
 * @license AngularJS v1.3.10
 * (c) 2010-2014 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {'use strict';

var $sanitizeMinErr = angular.$$minErr('$sanitize');

/**
 * @ngdoc module
 * @name ngSanitize
 * @description
 *
 * # ngSanitize
 *
 * The `ngSanitize` module provides functionality to sanitize HTML.
 *
 *
 * <div doc-module-components="ngSanitize"></div>
 *
 * See {@link ngSanitize.$sanitize `$sanitize`} for usage.
 */

/*
 * HTML Parser By Misko Hevery (misko@hevery.com)
 * based on:  HTML Parser By John Resig (ejohn.org)
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * htmlParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 */


/**
 * @ngdoc service
 * @name $sanitize
 * @kind function
 *
 * @description
 *   The input is sanitized by parsing the HTML into tokens. All safe tokens (from a whitelist) are
 *   then serialized back to properly escaped html string. This means that no unsafe input can make
 *   it into the returned string, however, since our parser is more strict than a typical browser
 *   parser, it's possible that some obscure input, which would be recognized as valid HTML by a
 *   browser, won't make it through the sanitizer. The input may also contain SVG markup.
 *   The whitelist is configured using the functions `aHrefSanitizationWhitelist` and
 *   `imgSrcSanitizationWhitelist` of {@link ng.$compileProvider `$compileProvider`}.
 *
 * @param {string} html HTML input.
 * @returns {string} Sanitized HTML.
 *
 * @example
   <example module="sanitizeExample" deps="angular-sanitize.js">
   <file name="index.html">
     <script>
         angular.module('sanitizeExample', ['ngSanitize'])
           .controller('ExampleController', ['$scope', '$sce', function($scope, $sce) {
             $scope.snippet =
               '<p style="color:blue">an html\n' +
               '<em onmouseover="this.textContent=\'PWN3D!\'">click here</em>\n' +
               'snippet</p>';
             $scope.deliberatelyTrustDangerousSnippet = function() {
               return $sce.trustAsHtml($scope.snippet);
             };
           }]);
     </script>
     <div ng-controller="ExampleController">
        Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
       <table>
         <tr>
           <td>Directive</td>
           <td>How</td>
           <td>Source</td>
           <td>Rendered</td>
         </tr>
         <tr id="bind-html-with-sanitize">
           <td>ng-bind-html</td>
           <td>Automatically uses $sanitize</td>
           <td><pre>&lt;div ng-bind-html="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
           <td><div ng-bind-html="snippet"></div></td>
         </tr>
         <tr id="bind-html-with-trust">
           <td>ng-bind-html</td>
           <td>Bypass $sanitize by explicitly trusting the dangerous value</td>
           <td>
           <pre>&lt;div ng-bind-html="deliberatelyTrustDangerousSnippet()"&gt;
&lt;/div&gt;</pre>
           </td>
           <td><div ng-bind-html="deliberatelyTrustDangerousSnippet()"></div></td>
         </tr>
         <tr id="bind-default">
           <td>ng-bind</td>
           <td>Automatically escapes</td>
           <td><pre>&lt;div ng-bind="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
           <td><div ng-bind="snippet"></div></td>
         </tr>
       </table>
       </div>
   </file>
   <file name="protractor.js" type="protractor">
     it('should sanitize the html snippet by default', function() {
       expect(element(by.css('#bind-html-with-sanitize div')).getInnerHtml()).
         toBe('<p>an html\n<em>click here</em>\nsnippet</p>');
     });

     it('should inline raw snippet if bound to a trusted value', function() {
       expect(element(by.css('#bind-html-with-trust div')).getInnerHtml()).
         toBe("<p style=\"color:blue\">an html\n" +
              "<em onmouseover=\"this.textContent='PWN3D!'\">click here</em>\n" +
              "snippet</p>");
     });

     it('should escape snippet without any filter', function() {
       expect(element(by.css('#bind-default div')).getInnerHtml()).
         toBe("&lt;p style=\"color:blue\"&gt;an html\n" +
              "&lt;em onmouseover=\"this.textContent='PWN3D!'\"&gt;click here&lt;/em&gt;\n" +
              "snippet&lt;/p&gt;");
     });

     it('should update', function() {
       element(by.model('snippet')).clear();
       element(by.model('snippet')).sendKeys('new <b onclick="alert(1)">text</b>');
       expect(element(by.css('#bind-html-with-sanitize div')).getInnerHtml()).
         toBe('new <b>text</b>');
       expect(element(by.css('#bind-html-with-trust div')).getInnerHtml()).toBe(
         'new <b onclick="alert(1)">text</b>');
       expect(element(by.css('#bind-default div')).getInnerHtml()).toBe(
         "new &lt;b onclick=\"alert(1)\"&gt;text&lt;/b&gt;");
     });
   </file>
   </example>
 */
function $SanitizeProvider() {
  this.$get = ['$$sanitizeUri', function($$sanitizeUri) {
    return function(html) {
      if (typeof arguments[1] != 'undefined') {
        arguments[1].version = 'taSanitize';
      }
      var buf = [];
      htmlParser(html, htmlSanitizeWriter(buf, function(uri, isImage) {
        return !/^unsafe/.test($$sanitizeUri(uri, isImage));
      }));
      return buf.join('');
    };
  }];
}

function sanitizeText(chars) {
  var buf = [];
  var writer = htmlSanitizeWriter(buf, angular.noop);
  writer.chars(chars);
  return buf.join('');
}


// Regular Expressions for parsing tags and attributes
var START_TAG_REGEXP =
       /^<((?:[a-zA-Z])[\w:-]*)((?:\s+[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)\s*(>?)/,
  END_TAG_REGEXP = /^<\/\s*([\w:-]+)[^>]*>/,
  ATTR_REGEXP = /([\w:-]+)(?:\s*=\s*(?:(?:"((?:[^"])*)")|(?:'((?:[^'])*)')|([^>\s]+)))?/g,
  BEGIN_TAG_REGEXP = /^</,
  BEGING_END_TAGE_REGEXP = /^<\//,
  COMMENT_REGEXP = /<!--(.*?)-->/g,
  SINGLE_COMMENT_REGEXP = /(^<!--.*?-->)/,
  DOCTYPE_REGEXP = /<!DOCTYPE([^>]*?)>/i,
  CDATA_REGEXP = /<!\[CDATA\[(.*?)]]>/g,
  SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
  // Match everything outside of normal chars and " (quote character)
  NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g,
  WHITE_SPACE_REGEXP = /^(\s+)/;


// Good source of info about elements and attributes
// http://dev.w3.org/html5/spec/Overview.html#semantics
// http://simon.html5.org/html-elements

// Safe Void Elements - HTML5
// http://dev.w3.org/html5/spec/Overview.html#void-elements
var voidElements = makeMap("area,br,col,hr,img,wbr,input");

// Elements that you can, intentionally, leave open (and which close themselves)
// http://dev.w3.org/html5/spec/Overview.html#optional-tags
var optionalEndTagBlockElements = makeMap("colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr"),
    optionalEndTagInlineElements = makeMap("rp,rt"),
    optionalEndTagElements = angular.extend({},
                                            optionalEndTagInlineElements,
                                            optionalEndTagBlockElements);

// Safe Block Elements - HTML5
var blockElements = angular.extend({}, optionalEndTagBlockElements, makeMap("address,article," +
        "aside,blockquote,caption,center,del,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5," +
        "h6,header,hgroup,hr,ins,map,menu,nav,ol,pre,script,section,table,ul"));

// Inline Elements - HTML5
var inlineElements = angular.extend({}, optionalEndTagInlineElements, makeMap("a,abbr,acronym,b," +
        "bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,q,ruby,rp,rt,s," +
        "samp,small,span,strike,strong,sub,sup,time,tt,u,var"));

// SVG Elements
// https://wiki.whatwg.org/wiki/Sanitization_rules#svg_Elements
var svgElements = makeMap("animate,animateColor,animateMotion,animateTransform,circle,defs," +
        "desc,ellipse,font-face,font-face-name,font-face-src,g,glyph,hkern,image,linearGradient," +
        "line,marker,metadata,missing-glyph,mpath,path,polygon,polyline,radialGradient,rect,set," +
        "stop,svg,switch,text,title,tspan,use");

// Special Elements (can contain anything)
var specialElements = makeMap("script,style");

var validElements = angular.extend({},
                                   voidElements,
                                   blockElements,
                                   inlineElements,
                                   optionalEndTagElements,
                                   svgElements);

//Attributes that have href and hence need to be sanitized
var uriAttrs = makeMap("background,cite,href,longdesc,src,usemap,xlink:href");

var htmlAttrs = makeMap('abbr,align,alt,axis,bgcolor,border,cellpadding,cellspacing,class,clear,'+
    'color,cols,colspan,compact,coords,dir,face,headers,height,hreflang,hspace,'+
    'id,ismap,lang,language,nohref,nowrap,rel,rev,rows,rowspan,rules,'+
    'scope,scrolling,shape,size,span,start,summary,target,title,type,'+
    'valign,value,vspace,width');

// SVG attributes (without "id" and "name" attributes)
// https://wiki.whatwg.org/wiki/Sanitization_rules#svg_Attributes
var svgAttrs = makeMap('accent-height,accumulate,additive,alphabetic,arabic-form,ascent,' +
    'attributeName,attributeType,baseProfile,bbox,begin,by,calcMode,cap-height,class,color,' +
    'color-rendering,content,cx,cy,d,dx,dy,descent,display,dur,end,fill,fill-rule,font-family,' +
    'font-size,font-stretch,font-style,font-variant,font-weight,from,fx,fy,g1,g2,glyph-name,' +
    'gradientUnits,hanging,height,horiz-adv-x,horiz-origin-x,ideographic,k,keyPoints,' +
    'keySplines,keyTimes,lang,marker-end,marker-mid,marker-start,markerHeight,markerUnits,' +
    'markerWidth,mathematical,max,min,offset,opacity,orient,origin,overline-position,' +
    'overline-thickness,panose-1,path,pathLength,points,preserveAspectRatio,r,refX,refY,' +
    'repeatCount,repeatDur,requiredExtensions,requiredFeatures,restart,rotate,rx,ry,slope,stemh,' +
    'stemv,stop-color,stop-opacity,strikethrough-position,strikethrough-thickness,stroke,' +
    'stroke-dasharray,stroke-dashoffset,stroke-linecap,stroke-linejoin,stroke-miterlimit,' +
    'stroke-opacity,stroke-width,systemLanguage,target,text-anchor,to,transform,type,u1,u2,' +
    'underline-position,underline-thickness,unicode,unicode-range,units-per-em,values,version,' +
    'viewBox,visibility,width,widths,x,x-height,x1,x2,xlink:actuate,xlink:arcrole,xlink:role,' +
    'xlink:show,xlink:title,xlink:type,xml:base,xml:lang,xml:space,xmlns,xmlns:xlink,y,y1,y2,' +
    'zoomAndPan');

var validAttrs = angular.extend({},
                                uriAttrs,
                                svgAttrs,
                                htmlAttrs);

function makeMap(str) {
  var obj = {}, items = str.split(','), i;
  for (i = 0; i < items.length; i++) obj[items[i]] = true;
  return obj;
}


/**
 * @example
 * htmlParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * @param {string} html string
 * @param {object} handler
 */
function htmlParser(html, handler) {
  if (typeof html !== 'string') {
    if (html === null || typeof html === 'undefined') {
      html = '';
    } else {
      html = '' + html;
    }
  }
  var index, chars, match, stack = [], last = html, text;
  stack.last = function() { return stack[ stack.length - 1 ]; };

  while (html) {
    text = '';
    chars = true;

    // Make sure we're not in a script or style element
    if (!stack.last() || !specialElements[ stack.last() ]) {

      // White space
      if (WHITE_SPACE_REGEXP.test(html)) {
        match = html.match(WHITE_SPACE_REGEXP);

        if (match) {
          var mat = match[0];
          if (handler.whitespace) handler.whitespace(match[0]);
          html = html.replace(match[0], '');
          chars = false;
        }
      //Comment
      } else if (SINGLE_COMMENT_REGEXP.test(html)) {
        match = html.match(SINGLE_COMMENT_REGEXP);

        if (match) {
          if (handler.comment) handler.comment(match[1]);
          html = html.replace(match[0], '');
          chars = false;
        }
      // DOCTYPE
      } else if (DOCTYPE_REGEXP.test(html)) {
        match = html.match(DOCTYPE_REGEXP);

        if (match) {
          html = html.replace(match[0], '');
          chars = false;
        }
      // end tag
      } else if (BEGING_END_TAGE_REGEXP.test(html)) {
        match = html.match(END_TAG_REGEXP);

        if (match) {
          html = html.substring(match[0].length);
          match[0].replace(END_TAG_REGEXP, parseEndTag);
          chars = false;
        }

      // start tag
      } else if (BEGIN_TAG_REGEXP.test(html)) {
        match = html.match(START_TAG_REGEXP);

        if (match) {
          // We only have a valid start-tag if there is a '>'.
          if (match[4]) {
            html = html.substring(match[0].length);
            match[0].replace(START_TAG_REGEXP, parseStartTag);
          }
          chars = false;
        } else {
          // no ending tag found --- this piece should be encoded as an entity.
          text += '<';
          html = html.substring(1);
        }
      }

      if (chars) {
        index = html.indexOf("<");

        text += index < 0 ? html : html.substring(0, index);
        html = index < 0 ? "" : html.substring(index);

        if (handler.chars) handler.chars(decodeEntities(text));
      }

    } else {
      html = html.replace(new RegExp("([^]*)<\\s*\\/\\s*" + stack.last() + "[^>]*>", 'i'),
        function(all, text) {
          text = text.replace(COMMENT_REGEXP, "$1").replace(CDATA_REGEXP, "$1");

          if (handler.chars) handler.chars(decodeEntities(text));

          return "";
      });

      parseEndTag("", stack.last());
    }

    if (html == last) {
      throw $sanitizeMinErr('badparse', "The sanitizer was unable to parse the following block " +
                                        "of html: {0}", html);
    }
    last = html;
  }

  // Clean up any remaining tags
  parseEndTag();

  function parseStartTag(tag, tagName, rest, unary) {
    tagName = angular.lowercase(tagName);
    if (blockElements[ tagName ]) {
      while (stack.last() && inlineElements[ stack.last() ]) {
        parseEndTag("", stack.last());
      }
    }

    if (optionalEndTagElements[ tagName ] && stack.last() == tagName) {
      parseEndTag("", tagName);
    }

    unary = voidElements[ tagName ] || !!unary;

    if (!unary)
      stack.push(tagName);

    var attrs = {};

    rest.replace(ATTR_REGEXP,
      function(match, name, doubleQuotedValue, singleQuotedValue, unquotedValue) {
        var value = doubleQuotedValue
          || singleQuotedValue
          || unquotedValue
          || '';

        attrs[name] = decodeEntities(value);
    });
    if (handler.start) handler.start(tagName, attrs, unary);
  }

  function parseEndTag(tag, tagName) {
    var pos = 0, i;
    tagName = angular.lowercase(tagName);
    if (tagName)
      // Find the closest opened tag of the same type
      for (pos = stack.length - 1; pos >= 0; pos--)
        if (stack[ pos ] == tagName)
          break;

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (i = stack.length - 1; i >= pos; i--)
        if (handler.end) handler.end(stack[ i ]);

      // Remove the open elements from the stack
      stack.length = pos;
    }
  }
}

var hiddenPre=document.createElement("pre");
var spaceRe = /^(\s*)([\s\S]*?)(\s*)$/;
/**
 * decodes all entities into regular string
 * @param value
 * @returns {string} A string with decoded entities.
 */
function decodeEntities(value) {
  if (!value) { return ''; }

  // Note: IE8 does not preserve spaces at the start/end of innerHTML
  // so we must capture them and reattach them afterward
  var parts = spaceRe.exec(value);
  var spaceBefore = parts[1];
  var spaceAfter = parts[3];
  var content = parts[2];
  if (content) {
    hiddenPre.innerHTML=content.replace(/</g,"&lt;");
    // innerText depends on styling as it doesn't display hidden elements.
    // Therefore, it's better to use textContent not to cause unnecessary
    // reflows. However, IE<9 don't support textContent so the innerText
    // fallback is necessary.
    content = 'textContent' in hiddenPre ?
      hiddenPre.textContent : hiddenPre.innerText;
  }
  return spaceBefore + content + spaceAfter;
}

/**
 * Escapes all potentially dangerous characters, so that the
 * resulting string can be safely inserted into attribute or
 * element text.
 * @param value
 * @returns {string} escaped text
 */
function encodeEntities(value) {
  return value.
    replace(/&/g, '&amp;').
    replace(SURROGATE_PAIR_REGEXP, function(value) {
      var hi = value.charCodeAt(0);
      var low = value.charCodeAt(1);
      return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';';
    }).
    replace(NON_ALPHANUMERIC_REGEXP, function(value) {
      // unsafe chars are: \u0000-\u001f \u007f-\u009f \u00ad \u0600-\u0604 \u070f \u17b4 \u17b5 \u200c-\u200f \u2028-\u202f \u2060-\u206f \ufeff \ufff0-\uffff from jslint.com/lint.html
      // decimal values are: 0-31, 127-159, 173, 1536-1540, 1807, 6068, 6069, 8204-8207, 8232-8239, 8288-8303, 65279, 65520-65535
      var c = value.charCodeAt(0);
      // if unsafe character encode
      if(c <= 159 ||
        c == 173 ||
        (c >= 1536 && c <= 1540) ||
        c == 1807 ||
        c == 6068 ||
        c == 6069 ||
        (c >= 8204 && c <= 8207) ||
        (c >= 8232 && c <= 8239) ||
        (c >= 8288 && c <= 8303) ||
        c == 65279 ||
        (c >= 65520 && c <= 65535)) return '&#' + c + ';';
      return value; // avoids multilingual issues
    }).
    replace(/</g, '&lt;').
    replace(/>/g, '&gt;');
}

var trim = (function() {
  // native trim is way faster: http://jsperf.com/angular-trim-test
  // but IE doesn't have it... :-(
  // TODO: we should move this into IE/ES5 polyfill
  if (!String.prototype.trim) {
    return function(value) {
      return angular.isString(value) ? value.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : value;
    };
  }
  return function(value) {
    return angular.isString(value) ? value.trim() : value;
  };
})();

// Custom logic for accepting certain style options only - textAngular
// Currently allows only the color, background-color, text-align, float, width and height attributes
// all other attributes should be easily done through classes.
function validStyles(styleAttr){
	var result = '';
	var styleArray = styleAttr.split(';');
	angular.forEach(styleArray, function(value){
		var v = value.split(':');
		if(v.length == 2){
			var key = trim(angular.lowercase(v[0]));
			var value = trim(angular.lowercase(v[1]));
			if(
				(key === 'color' || key === 'background-color') && (
					value.match(/^rgb\([0-9%,\. ]*\)$/i)
					|| value.match(/^rgba\([0-9%,\. ]*\)$/i)
					|| value.match(/^hsl\([0-9%,\. ]*\)$/i)
					|| value.match(/^hsla\([0-9%,\. ]*\)$/i)
					|| value.match(/^#[0-9a-f]{3,6}$/i)
					|| value.match(/^[a-z]*$/i)
				)
			||
				key === 'text-align' && (
					value === 'left'
					|| value === 'right'
					|| value === 'center'
					|| value === 'justify'
				)
			||
                key === 'text-decoration' && (
                    value === 'underline'
                    || value === 'line-through'
                )
            || key === 'font-weight' && (
                    value === 'bold'
                )
            ||
				key === 'float' && (
					value === 'left'
					|| value === 'right'
					|| value === 'none'
				)
			||
				(key === 'width' || key === 'height') && (
					value.match(/[0-9\.]*(px|em|rem|%)/)
				)
			|| // Reference #520
				(key === 'direction' && value.match(/^ltr|rtl|initial|inherit$/))
			) result += key + ': ' + value + ';';
		}
	});
	return result;
}

// this function is used to manually allow specific attributes on specific tags with certain prerequisites
function validCustomTag(tag, attrs, lkey, value){
	// catch the div placeholder for the iframe replacement
    if (tag === 'img' && attrs['ta-insert-video']){
        if(lkey === 'ta-insert-video' || lkey === 'allowfullscreen' || lkey === 'frameborder' || (lkey === 'contenteditable' && value === 'false')) return true;
    }
    return false;
}

/**
 * create an HTML/XML writer which writes to buffer
 * @param {Array} buf use buf.jain('') to get out sanitized html string
 * @returns {object} in the form of {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * }
 */
function htmlSanitizeWriter(buf, uriValidator) {
  var ignore = false;
  var out = angular.bind(buf, buf.push);
  return {
    start: function(tag, attrs, unary) {
      tag = angular.lowercase(tag);
      if (!ignore && specialElements[tag]) {
        ignore = tag;
      }
      if (!ignore && validElements[tag] === true) {
        out('<');
        out(tag);
        angular.forEach(attrs, function(value, key) {
          var lkey=angular.lowercase(key);
          var isImage=(tag === 'img' && lkey === 'src') || (lkey === 'background');
          if ((lkey === 'style' && (value = validStyles(value)) !== '') || validCustomTag(tag, attrs, lkey, value) || validAttrs[lkey] === true &&
            (uriAttrs[lkey] !== true || uriValidator(value, isImage))) {
            out(' ');
            out(key);
            out('="');
            out(encodeEntities(value));
            out('"');
          }
        });
        out(unary ? '/>' : '>');
      }
    },
    comment: function (com) {
      out(com);
    },
    whitespace: function (ws) {
      out(encodeEntities(ws));
    },
    end: function(tag) {
        tag = angular.lowercase(tag);
        if (!ignore && validElements[tag] === true) {
          out('</');
          out(tag);
          out('>');
        }
        if (tag == ignore) {
          ignore = false;
        }
      },
    chars: function(chars) {
        if (!ignore) {
          out(encodeEntities(chars));
        }
      }
  };
}


// define ngSanitize module and register $sanitize service
angular.module('ngSanitize', []).provider('$sanitize', $SanitizeProvider);

/* global sanitizeText: false */

/**
 * @ngdoc filter
 * @name linky
 * @kind function
 *
 * @description
 * Finds links in text input and turns them into html links. Supports http/https/ftp/mailto and
 * plain email address links.
 *
 * Requires the {@link ngSanitize `ngSanitize`} module to be installed.
 *
 * @param {string} text Input text.
 * @param {string} target Window (_blank|_self|_parent|_top) or named frame to open links in.
 * @returns {string} Html-linkified text.
 *
 * @usage
   <span ng-bind-html="linky_expression | linky"></span>
 *
 * @example
   <example module="linkyExample" deps="angular-sanitize.js">
     <file name="index.html">
       <script>
         angular.module('linkyExample', ['ngSanitize'])
           .controller('ExampleController', ['$scope', function($scope) {
             $scope.snippet =
               'Pretty text with some links:\n'+
               'http://angularjs.org/,\n'+
               'mailto:us@somewhere.org,\n'+
               'another@somewhere.org,\n'+
               'and one more: ftp://127.0.0.1/.';
             $scope.snippetWithTarget = 'http://angularjs.org/';
           }]);
       </script>
       <div ng-controller="ExampleController">
       Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
       <table>
         <tr>
           <td>Filter</td>
           <td>Source</td>
           <td>Rendered</td>
         </tr>
         <tr id="linky-filter">
           <td>linky filter</td>
           <td>
             <pre>&lt;div ng-bind-html="snippet | linky"&gt;<br>&lt;/div&gt;</pre>
           </td>
           <td>
             <div ng-bind-html="snippet | linky"></div>
           </td>
         </tr>
         <tr id="linky-target">
          <td>linky target</td>
          <td>
            <pre>&lt;div ng-bind-html="snippetWithTarget | linky:'_blank'"&gt;<br>&lt;/div&gt;</pre>
          </td>
          <td>
            <div ng-bind-html="snippetWithTarget | linky:'_blank'"></div>
          </td>
         </tr>
         <tr id="escaped-html">
           <td>no filter</td>
           <td><pre>&lt;div ng-bind="snippet"&gt;<br>&lt;/div&gt;</pre></td>
           <td><div ng-bind="snippet"></div></td>
         </tr>
       </table>
     </file>
     <file name="protractor.js" type="protractor">
       it('should linkify the snippet with urls', function() {
         expect(element(by.id('linky-filter')).element(by.binding('snippet | linky')).getText()).
             toBe('Pretty text with some links: http://angularjs.org/, us@somewhere.org, ' +
                  'another@somewhere.org, and one more: ftp://127.0.0.1/.');
         expect(element.all(by.css('#linky-filter a')).count()).toEqual(4);
       });

       it('should not linkify snippet without the linky filter', function() {
         expect(element(by.id('escaped-html')).element(by.binding('snippet')).getText()).
             toBe('Pretty text with some links: http://angularjs.org/, mailto:us@somewhere.org, ' +
                  'another@somewhere.org, and one more: ftp://127.0.0.1/.');
         expect(element.all(by.css('#escaped-html a')).count()).toEqual(0);
       });

       it('should update', function() {
         element(by.model('snippet')).clear();
         element(by.model('snippet')).sendKeys('new http://link.');
         expect(element(by.id('linky-filter')).element(by.binding('snippet | linky')).getText()).
             toBe('new http://link.');
         expect(element.all(by.css('#linky-filter a')).count()).toEqual(1);
         expect(element(by.id('escaped-html')).element(by.binding('snippet')).getText())
             .toBe('new http://link.');
       });

       it('should work with the target property', function() {
        expect(element(by.id('linky-target')).
            element(by.binding("snippetWithTarget | linky:'_blank'")).getText()).
            toBe('http://angularjs.org/');
        expect(element(by.css('#linky-target a')).getAttribute('target')).toEqual('_blank');
       });
     </file>
   </example>
 */
angular.module('ngSanitize').filter('linky', ['$sanitize', function($sanitize) {
  var LINKY_URL_REGEXP =
        /((ftp|https?):\/\/|(www\.)|(mailto:)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"”’]/,
      MAILTO_REGEXP = /^mailto:/;

  return function(text, target) {
    if (!text) return text;
    var match;
    var raw = text;
    var html = [];
    var url;
    var i;
    while ((match = raw.match(LINKY_URL_REGEXP))) {
      // We can not end in these as they are sometimes found at the end of the sentence
      url = match[0];
      // if we did not match ftp/http/www/mailto then assume mailto
      if (!match[2] && !match[4]) {
        url = (match[3] ? 'http://' : 'mailto:') + url;
      }
      i = match.index;
      addText(raw.substr(0, i));
      addLink(url, match[0].replace(MAILTO_REGEXP, ''));
      raw = raw.substring(i + match[0].length);
    }
    addText(raw);
    return $sanitize(html.join(''));

    function addText(text) {
      if (!text) {
        return;
      }
      html.push(sanitizeText(text));
    }

    function addLink(url, text) {
      html.push('<a ');
      if (angular.isDefined(target)) {
        html.push('target="',
                  target,
                  '" ');
      }
      html.push('href="',
                url.replace(/"/g, '&quot;'),
                '">');
      addText(text);
      html.push('</a>');
    }
  };
}]);


})(window, window.angular);


// IE version detection - http://stackoverflow.com/questions/4169160/javascript-ie-detection-why-not-use-simple-conditional-comments
// We need this as IE sometimes plays funny tricks with the contenteditable.
// ----------------------------------------------------------
// If you're not in IE (or IE version is less than 5) then:
// ie === undefined
// If you're in IE (>=5) then you can determine which version:
// ie === 7; // IE7
// Thus, to detect IE:
// if (ie) {}
// And to detect the version:
// ie === 6 // IE6
// ie > 7 // IE8, IE9, IE10 ...
// ie < 9 // Anything less than IE9
// ----------------------------------------------------------
/* istanbul ignore next: untestable browser check */
var _browserDetect = {
	ie: (function(){
		var undef,
			v = 3,
			div = document.createElement('div'),
			all = div.getElementsByTagName('i');

		while (
			div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
			all[0]
		);

		return v > 4 ? v : undef;
	}()),
	webkit: /AppleWebKit\/([\d.]+)/i.test(navigator.userAgent)
};

// fix a webkit bug, see: https://gist.github.com/shimondoodkin/1081133
// this is set true when a blur occurs as the blur of the ta-bind triggers before the click
var globalContentEditableBlur = false;
/* istanbul ignore next: Browser Un-Focus fix for webkit */
if(_browserDetect.webkit) {
	document.addEventListener("mousedown", function(_event){
		var e = _event || window.event;
		var curelement = e.target;
		if(globalContentEditableBlur && curelement !== null){
			var isEditable = false;
			var tempEl = curelement;
			while(tempEl !== null && tempEl.tagName.toLowerCase() !== 'html' && !isEditable){
				isEditable = tempEl.contentEditable === 'true';
				tempEl = tempEl.parentNode;
			}
			if(!isEditable){
				document.getElementById('textAngular-editableFix-010203040506070809').setSelectionRange(0, 0); // set caret focus to an element that handles caret focus correctly.
				curelement.focus(); // focus the wanted element.
				if (curelement.select) {
					curelement.select(); // use select to place cursor for input elements.
				}
			}
		}
		globalContentEditableBlur = false;
	}, false); // add global click handler
	angular.element(document).ready(function () {
		angular.element(document.body).append(angular.element('<input id="textAngular-editableFix-010203040506070809" class="ta-hidden-input" aria-hidden="true" unselectable="on" tabIndex="-1">'));
	});
}

// Gloabl to textAngular REGEXP vars for block and list elements.

var BLOCKELEMENTS = /^(address|article|aside|audio|blockquote|canvas|dd|div|dl|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|header|hgroup|hr|noscript|ol|output|p|pre|section|table|tfoot|ul|video)$/i;
var LISTELEMENTS = /^(ul|li|ol)$/i;
var VALIDELEMENTS = /^(address|article|aside|audio|blockquote|canvas|dd|div|dl|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|header|hgroup|hr|noscript|ol|output|p|pre|section|table|tfoot|ul|video|li)$/i;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim#Compatibility
/* istanbul ignore next: trim shim for older browsers */
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

/*
	Custom stylesheet for the placeholders rules.
	Credit to: http://davidwalsh.name/add-rules-stylesheets
*/
var sheet, addCSSRule, removeCSSRule, _addCSSRule, _removeCSSRule, _getRuleIndex;
/* istanbul ignore else: IE <8 test*/
if(_browserDetect.ie > 8 || _browserDetect.ie === undefined){
	var _sheets = document.styleSheets;
	/* istanbul ignore next: preference for stylesheet loaded externally */
	for(var i = 0; i < _sheets.length; i++){
		if(_sheets[i].media.length === 0 || _sheets[i].media.mediaText.match(/(all|screen)/ig)){
			if(_sheets[i].href){
				if(_sheets[i].href.match(/textangular\.(min\.|)css/ig)){
					sheet = _sheets[i];
					break;
				}
			}
		}
	}
	/* istanbul ignore next: preference for stylesheet loaded externally */
	if(!sheet){
		// this sheet is used for the placeholders later on.
		sheet = (function() {
			// Create the <style> tag
			var style = document.createElement("style");
			/* istanbul ignore else : WebKit hack :( */
			if(_browserDetect.webkit) style.appendChild(document.createTextNode(""));

			// Add the <style> element to the page, add as first so the styles can be overridden by custom stylesheets
			document.getElementsByTagName('head')[0].appendChild(style);

			return style.sheet;
		})();
	}

	// use as: addCSSRule("header", "float: left");
	addCSSRule = function(selector, rules) {
		return _addCSSRule(sheet, selector, rules);
	};
	_addCSSRule = function(_sheet, selector, rules){
		var insertIndex;
		var insertedRule;
		// This order is important as IE 11 has both cssRules and rules but they have different lengths - cssRules is correct, rules gives an error in IE 11
		/* istanbul ignore next: browser catches */
		if(_sheet.cssRules) insertIndex = Math.max(_sheet.cssRules.length - 1, 0);
		else if(_sheet.rules) insertIndex = Math.max(_sheet.rules.length - 1, 0);

		/* istanbul ignore else: untestable IE option */
		if(_sheet.insertRule) {
			_sheet.insertRule(selector + "{" + rules + "}", insertIndex);
		}
		else {
			_sheet.addRule(selector, rules, insertIndex);
		}
		/* istanbul ignore next: browser catches */
		if(sheet.rules) insertedRule = sheet.rules[insertIndex];
		else if(sheet.cssRules) insertedRule = sheet.cssRules[insertIndex];
		// return the inserted stylesheet rule
		return insertedRule;
	};

	_getRuleIndex = function(rule, rules) {
		var i, ruleIndex;
		for (i=0; i < rules.length; i++) {
			/* istanbul ignore else: check for correct rule */
			if (rules[i].cssText === rule.cssText) {
				ruleIndex = i;
				break;
			}
		}
		return ruleIndex;
	};

	removeCSSRule = function(rule){
		_removeCSSRule(sheet, rule);
	};
	/* istanbul ignore next: tests are browser specific */
	_removeCSSRule = function(sheet, rule){
		var rules = sheet.cssRules || sheet.rules;
		if(!rules || rules.length === 0) return;
		var ruleIndex = _getRuleIndex(rule, rules);
		if(sheet.removeRule){
			sheet.removeRule(ruleIndex);
		}else{
			sheet.deleteRule(ruleIndex);
		}
	};
}

angular.module('textAngular.factories', [])
.factory('taBrowserTag', [function(){
	return function(tag){
		/* istanbul ignore next: ie specific test */
		if(!tag) return (_browserDetect.ie <= 8)? 'P' : 'p';
		else if(tag === '') return (_browserDetect.ie === undefined)? 'div' : (_browserDetect.ie <= 8)? 'P' : 'p';
		else return (_browserDetect.ie <= 8)? tag.toUpperCase() : tag;
	};
}]).factory('taApplyCustomRenderers', ['taCustomRenderers', 'taDOM', function(taCustomRenderers, taDOM){
	return function(val){
		var element = angular.element('<div></div>');
		element[0].innerHTML = val;

		angular.forEach(taCustomRenderers, function(renderer){
			var elements = [];
			// get elements based on what is defined. If both defined do secondary filter in the forEach after using selector string
			if(renderer.selector && renderer.selector !== '')
				elements = element.find(renderer.selector);
			/* istanbul ignore else: shouldn't fire, if it does we're ignoring everything */
			else if(renderer.customAttribute && renderer.customAttribute !== '')
				elements = taDOM.getByAttribute(element, renderer.customAttribute);
			// process elements if any found
			angular.forEach(elements, function(_element){
				_element = angular.element(_element);
				if(renderer.selector && renderer.selector !== '' && renderer.customAttribute && renderer.customAttribute !== ''){
					if(_element.attr(renderer.customAttribute) !== undefined) renderer.renderLogic(_element);
				} else renderer.renderLogic(_element);
			});
		});

		return element[0].innerHTML;
	};
}]).factory('taFixChrome', function(){
	// get whaterever rubbish is inserted in chrome
	// should be passed an html string, returns an html string
	var taFixChrome = function(html){
		if(!html || !angular.isString(html) || html.length <= 0) return html;
		// grab all elements with a style attibute
		var spanMatch = /<([^>\/]+?)style=("([^"]+)"|'([^']+)')([^>]*)>/ig;
		var match, styleVal, newTag, finalHtml = '', lastIndex = 0;
		while(match = spanMatch.exec(html)){
			// one of the quoted values ' or "
			/* istanbul ignore next: quotations match */
			styleVal = match[3] || match[4];
			// test for chrome inserted junk
			if(styleVal && styleVal.match(/line-height: 1.[0-9]{3,12};|color: inherit; line-height: 1.1;/i)){
				// replace original tag with new tag
				styleVal = styleVal.replace(/( |)font-family: inherit;|( |)line-height: 1.[0-9]{3,12};|( |)color: inherit;/ig, '');
				newTag = '<' + match[1].trim();
				if(styleVal.trim().length > 0) newTag += ' style=' + match[2].substring(0,1) + styleVal + match[2].substring(0,1);
				newTag += match[5].trim() + ">";
				finalHtml += html.substring(lastIndex, match.index) + newTag;
				lastIndex = match.index + match[0].length;
			}
		}
		finalHtml += html.substring(lastIndex);
		// only replace when something has changed, else we get focus problems on inserting lists
		if(lastIndex > 0){
			// replace all empty strings
			return finalHtml.replace(/<span\s?>(.*?)<\/span>(<br(\/|)>|)/ig, '$1');
		} else return html;
	};
	return taFixChrome;
}).factory('taSanitize', ['$sanitize', function taSanitizeFactory($sanitize){

	var convert_infos = [
		{
			property: 'font-weight',
			values: [ 'bold' ],
			tag: 'b'
		},
		{
			property: 'font-style',
			values: [ 'italic' ],
			tag: 'i'
		}
	];
	
	var styleMatch = [];
	for(var i = 0; i < convert_infos.length; i++){
		var _partialStyle = '(' + convert_infos[i].property + ':\\s*(';
		for(var j = 0; j < convert_infos[i].values.length; j++){
			/* istanbul ignore next: not needed to be tested yet */
			if(j > 0) _partialStyle += '|';
			_partialStyle += convert_infos[i].values[j];
		}
		_partialStyle += ');)';
		styleMatch.push(_partialStyle);
	}
	var styleRegexString = '(' + styleMatch.join('|') + ')';
	
	function wrapNested(html, wrapTag) {
		var depth = 0;
		var lastIndex = 0;
		var match;
		var tagRegex = /<[^>]*>/ig;
		while(match = tagRegex.exec(html)){
			lastIndex = match.index;
			if(match[0].substr(1, 1) === '/'){
				if(depth === 0) break;
				else depth--;
			}else depth++;
		}
		return wrapTag +
			html.substring(0, lastIndex) +
			// get the start tags reversed - this is safe as we construct the strings with no content except the tags
			angular.element(wrapTag)[0].outerHTML.substring(wrapTag.length) +
			html.substring(lastIndex);
	}
	
	function transformLegacyStyles(html){
		if(!html || !angular.isString(html) || html.length <= 0) return html;
		var i;
		var styleElementMatch = /<([^>\/]+?)style=("([^"]+)"|'([^']+)')([^>]*)>/ig;
		var match, subMatch, styleVal, newTag, lastNewTag = '', newHtml, finalHtml = '', lastIndex = 0;
		while(match = styleElementMatch.exec(html)){
			// one of the quoted values ' or "
			/* istanbul ignore next: quotations match */
			styleVal = match[3] || match[4];
			var styleRegex = new RegExp(styleRegexString, 'i');
			// test for style values to change
			if(angular.isString(styleVal) && styleRegex.test(styleVal)){
				// remove build tag list
				newTag = '';
				// init regex here for exec
				var styleRegexExec = new RegExp(styleRegexString, 'ig');
				// find relevand tags and build a string of them
				while(subMatch = styleRegexExec.exec(styleVal)){
					for(i = 0; i < convert_infos.length; i++){
						if(!!subMatch[(i*2) + 2]){
							newTag += '<' + convert_infos[i].tag + '>';
						}
					}
				}
				// recursively find more legacy styles in html before this tag and after the previous match (if any)
				newHtml = transformLegacyStyles(html.substring(lastIndex, match.index));
				// build up html
				if(lastNewTag.length > 0){
					finalHtml += wrapNested(newHtml, lastNewTag);
				}else finalHtml += newHtml;
				// grab the style val without the transformed values
				styleVal = styleVal.replace(new RegExp(styleRegexString, 'ig'), '');
				// build the html tag
				finalHtml += '<' + match[1].trim();
				if(styleVal.length > 0) finalHtml += ' style="' + styleVal + '"';
				finalHtml += match[5] + '>';
				// update the start index to after this tag
				lastIndex = match.index + match[0].length;
				lastNewTag = newTag;
			}
		}
		if(lastNewTag.length > 0){
			finalHtml += wrapNested(html.substring(lastIndex), lastNewTag);
		}
		else finalHtml += html.substring(lastIndex);
		return finalHtml;
	}
	
	function transformLegacyAttributes(html){
		if(!html || !angular.isString(html) || html.length <= 0) return html;
		// replace all align='...' tags with text-align attributes
		var attrElementMatch = /<([^>\/]+?)align=("([^"]+)"|'([^']+)')([^>]*)>/ig;
		var match, finalHtml = '', lastIndex = 0;
		// match all attr tags
		while(match = attrElementMatch.exec(html)){
			// add all html before this tag
			finalHtml += html.substring(lastIndex, match.index);
			// record last index after this tag
			lastIndex = match.index + match[0].length;
			// construct tag without the align attribute
			var newTag = '<' + match[1] + match[5];
			// add the style attribute
			if(/style=("([^"]+)"|'([^']+)')/ig.test(newTag)){
				/* istanbul ignore next: quotations match */
				newTag = newTag.replace(/style=("([^"]+)"|'([^']+)')/i, 'style="$2$3 text-align:' + (match[3] || match[4]) + ';"');
			}else{
				/* istanbul ignore next: quotations match */
				newTag += ' style="text-align:' + (match[3] || match[4]) + ';"';
			}
			newTag += '>';
			// add to html
			finalHtml += newTag;
		}
		// return with remaining html
		return finalHtml + html.substring(lastIndex);
	}
	
	return function taSanitize(unsafe, oldsafe, ignore){
		// unsafe html should NEVER built into a DOM object via angular.element. This allows XSS to be inserted and run.
		if ( !ignore ) {
			try {
				unsafe = transformLegacyStyles(unsafe);
			} catch (e) {
			}
		}

		// unsafe and oldsafe should be valid HTML strings
		// any exceptions (lets say, color for example) should be made here but with great care
		// setup unsafe element for modification
		unsafe = transformLegacyAttributes(unsafe);
		
		var safe;
		try {
			safe = $sanitize(unsafe);
			// do this afterwards, then the $sanitizer should still throw for bad markup
			if(ignore) safe = unsafe;
		} catch (e){
			safe = oldsafe || '';
		}
		
		// Do processing for <pre> tags, removing tabs and return carriages outside of them
		
		var _preTags = safe.match(/(<pre[^>]*>.*?<\/pre[^>]*>)/ig);
		var processedSafe = safe.replace(/(&#(9|10);)*/ig, '');
		var re = /<pre[^>]*>.*?<\/pre[^>]*>/ig;
		var index = 0;
		var lastIndex = 0;
		var origTag;
		safe = '';
		while((origTag = re.exec(processedSafe)) !== null && index < _preTags.length){
			safe += processedSafe.substring(lastIndex, origTag.index) + _preTags[index];
			lastIndex = origTag.index + origTag[0].length;
			index++;
		}
		return safe + processedSafe.substring(lastIndex);
	};
}]).factory('taToolExecuteAction', ['$q', '$log', function($q, $log){
	// this must be called on a toolScope or instance
	return function(editor){
		if(editor !== undefined) this.$editor = function(){ return editor; };
		var deferred = $q.defer(),
			promise = deferred.promise,
			_editor = this.$editor();
		// pass into the action the deferred function and also the function to reload the current selection if rangy available
		var result;
		try{
			result = this.action(deferred, _editor.startAction());
			// We set the .finally callback here to make sure it doesn't get executed before any other .then callback.
			promise['finally'](function(){
				_editor.endAction.call(_editor);
			});
		}catch(exc){
			$log.error(exc);
		}
		if(result || result === undefined){
			// if true or undefined is returned then the action has finished. Otherwise the deferred action will be resolved manually.
			deferred.resolve();
		}
	};
}]);
angular.module('textAngular.DOM', ['textAngular.factories'])
.factory('taExecCommand', ['taSelection', 'taBrowserTag', '$document', function(taSelection, taBrowserTag, $document){
	var listToDefault = function(listElement, defaultWrap){
		var $target, i;
		// if all selected then we should remove the list
		// grab all li elements and convert to taDefaultWrap tags
		var children = listElement.find('li');
		for(i = children.length - 1; i >= 0; i--){
			$target = angular.element('<' + defaultWrap + '>' + children[i].innerHTML + '</' + defaultWrap + '>');
			listElement.after($target);
		}
		listElement.remove();
		taSelection.setSelectionToElementEnd($target[0]);
	};
	var selectLi = function(liElement){
		if(/(<br(|\/)>)$/i.test(liElement.innerHTML.trim())) taSelection.setSelectionBeforeElement(angular.element(liElement).find("br")[0]);
		else taSelection.setSelectionToElementEnd(liElement);
	};
	var listToList = function(listElement, newListTag){
		var $target = angular.element('<' + newListTag + '>' + listElement[0].innerHTML + '</' + newListTag + '>');
		listElement.after($target);
		listElement.remove();
		selectLi($target.find('li')[0]);
	};
	var childElementsToList = function(elements, listElement, newListTag){
		var html = '';
		for(var i = 0; i < elements.length; i++){
			html += '<' + taBrowserTag('li') + '>' + elements[i].innerHTML + '</' + taBrowserTag('li') + '>';
		}
		var $target = angular.element('<' + newListTag + '>' + html + '</' + newListTag + '>');
		listElement.after($target);
		listElement.remove();
		selectLi($target.find('li')[0]);
	};
	return function(taDefaultWrap, topNode){
		taDefaultWrap = taBrowserTag(taDefaultWrap);
		return function(command, showUI, options, defaultTagAttributes){
			var i, $target, html, _nodes, next, optionsTagName, selectedElement;
			var defaultWrapper = angular.element('<' + taDefaultWrap + '>');
			try{
				selectedElement = taSelection.getSelectionElement();
			}catch(e){}
			var $selected = angular.element(selectedElement);
			if(selectedElement !== undefined){
				var tagName = selectedElement.tagName.toLowerCase();
				if(command.toLowerCase() === 'insertorderedlist' || command.toLowerCase() === 'insertunorderedlist'){
					var selfTag = taBrowserTag((command.toLowerCase() === 'insertorderedlist')? 'ol' : 'ul');
					if(tagName === selfTag){
						// if all selected then we should remove the list
						// grab all li elements and convert to taDefaultWrap tags
						return listToDefault($selected, taDefaultWrap);
					}else if(tagName === 'li' && $selected.parent()[0].tagName.toLowerCase() === selfTag && $selected.parent().children().length === 1){
						// catch for the previous statement if only one li exists
						return listToDefault($selected.parent(), taDefaultWrap);
					}else if(tagName === 'li' && $selected.parent()[0].tagName.toLowerCase() !== selfTag && $selected.parent().children().length === 1){
						// catch for the previous statement if only one li exists
						return listToList($selected.parent(), selfTag);
					}else if(tagName.match(BLOCKELEMENTS) && !$selected.hasClass('ta-bind')){
						// if it's one of those block elements we have to change the contents
						// if it's a ol/ul we are changing from one to the other
						if(tagName === 'ol' || tagName === 'ul'){
							return listToList($selected, selfTag);
						}else{
							var childBlockElements = false;
							angular.forEach($selected.children(), function(elem){
								if(elem.tagName.match(BLOCKELEMENTS)) {
									childBlockElements = true;
								}
							});
							if(childBlockElements){
								return childElementsToList($selected.children(), $selected, selfTag);
							}else{
								return childElementsToList([angular.element('<div>' + selectedElement.innerHTML + '</div>')[0]], $selected, selfTag);
							}
						}
					}else if(tagName.match(BLOCKELEMENTS)){
						// if we get here then all the contents of the ta-bind are selected
						_nodes = taSelection.getOnlySelectedElements();
						if(_nodes.length === 0){
							// here is if there is only text in ta-bind ie <div ta-bind>test content</div>
							$target = angular.element('<' + selfTag + '><li>' + selectedElement.innerHTML + '</li></' + selfTag + '>');
							$selected.html('');
							$selected.append($target);
						}else if(_nodes.length === 1 && (_nodes[0].tagName.toLowerCase() === 'ol' || _nodes[0].tagName.toLowerCase() === 'ul')){
							if(_nodes[0].tagName.toLowerCase() === selfTag){
								// remove
								return listToDefault(angular.element(_nodes[0]), taDefaultWrap);
							}else{
								return listToList(angular.element(_nodes[0]), selfTag);
							}
						}else{
							html = '';
							var $nodes = [];
							for(i = 0; i < _nodes.length; i++){
								/* istanbul ignore else: catch for real-world can't make it occur in testing */
								if(_nodes[i].nodeType !== 3){
									var $n = angular.element(_nodes[i]);
									/* istanbul ignore if: browser check only, phantomjs doesn't return children nodes but chrome at least does */
									if(_nodes[i].tagName.toLowerCase() === 'li') continue;
									else if(_nodes[i].tagName.toLowerCase() === 'ol' || _nodes[i].tagName.toLowerCase() === 'ul'){
										html += $n[0].innerHTML; // if it's a list, add all it's children
									}else if(_nodes[i].tagName.toLowerCase() === 'span' && (_nodes[i].childNodes[0].tagName.toLowerCase() === 'ol' || _nodes[i].childNodes[0].tagName.toLowerCase() === 'ul')){
										html += $n[0].childNodes[0].innerHTML; // if it's a list, add all it's children
									}else{
										html += '<' + taBrowserTag('li') + '>' + $n[0].innerHTML + '</' + taBrowserTag('li') + '>';
									}
									$nodes.unshift($n);
								}
							}
							$target = angular.element('<' + selfTag + '>' + html + '</' + selfTag + '>');
							$nodes.pop().replaceWith($target);
							angular.forEach($nodes, function($node){ $node.remove(); });
						}
						taSelection.setSelectionToElementEnd($target[0]);
						return;
					}
				}else if(command.toLowerCase() === 'formatblock'){
					optionsTagName = options.toLowerCase().replace(/[<>]/ig, '');
					if(optionsTagName.trim() === 'default') {
						optionsTagName = taDefaultWrap;
						options = '<' + taDefaultWrap + '>';
					}
					if(tagName === 'li') $target = $selected.parent();
					else $target = $selected;
					// find the first blockElement
					while(!$target[0].tagName || !$target[0].tagName.match(BLOCKELEMENTS) && !$target.parent().attr('contenteditable')){
						$target = $target.parent();
						/* istanbul ignore next */
						tagName = ($target[0].tagName || '').toLowerCase();
					}
					if(tagName === optionsTagName){
						// $target is wrap element
						_nodes = $target.children();
						var hasBlock = false;
						for(i = 0; i < _nodes.length; i++){
							hasBlock = hasBlock || _nodes[i].tagName.match(BLOCKELEMENTS);
						}
						if(hasBlock){
							$target.after(_nodes);
							next = $target.next();
							$target.remove();
							$target = next;
						}else{
							defaultWrapper.append($target[0].childNodes);
							$target.after(defaultWrapper);
							$target.remove();
							$target = defaultWrapper;
						}
					}else if($target.parent()[0].tagName.toLowerCase() === optionsTagName && !$target.parent().hasClass('ta-bind')){
						//unwrap logic for parent
						var blockElement = $target.parent();
						var contents = blockElement.contents();
						for(i = 0; i < contents.length; i ++){
							/* istanbul ignore next: can't test - some wierd thing with how phantomjs works */
							if(blockElement.parent().hasClass('ta-bind') && contents[i].nodeType === 3){
								defaultWrapper = angular.element('<' + taDefaultWrap + '>');
								defaultWrapper[0].innerHTML = contents[i].outerHTML;
								contents[i] = defaultWrapper[0];
							}
							blockElement.parent()[0].insertBefore(contents[i], blockElement[0]);
						}
						blockElement.remove();
					}else if(tagName.match(LISTELEMENTS)){
						// wrapping a list element
						$target.wrap(options);
					}else{
						// default wrap behaviour
						_nodes = taSelection.getOnlySelectedElements();
						if(_nodes.length === 0) _nodes = [$target[0]];
						// find the parent block element if any of the nodes are inline or text
						for(i = 0; i < _nodes.length; i++){
							if(_nodes[i].nodeType === 3 || !_nodes[i].tagName.match(BLOCKELEMENTS)){
								while(_nodes[i].nodeType === 3 || !_nodes[i].tagName || !_nodes[i].tagName.match(BLOCKELEMENTS)){
									_nodes[i] = _nodes[i].parentNode;
								}
							}
						}
						if(angular.element(_nodes[0]).hasClass('ta-bind')){
							$target = angular.element(options);
							$target[0].innerHTML = _nodes[0].innerHTML;
							_nodes[0].innerHTML = $target[0].outerHTML;
						}else if(optionsTagName === 'blockquote'){
							// blockquotes wrap other block elements
							html = '';
							for(i = 0; i < _nodes.length; i++){
								html += _nodes[i].outerHTML;
							}
							$target = angular.element(options);
							$target[0].innerHTML = html;
							_nodes[0].parentNode.insertBefore($target[0],_nodes[0]);
							for(i = _nodes.length - 1; i >= 0; i--){
								/* istanbul ignore else:  */
								if(_nodes[i].parentNode) _nodes[i].parentNode.removeChild(_nodes[i]);
							}
						}
						else {
							// regular block elements replace other block elements
							for(i = 0; i < _nodes.length; i++){
								$target = angular.element(options);
								$target[0].innerHTML = _nodes[i].innerHTML;
								_nodes[i].parentNode.insertBefore($target[0],_nodes[i]);
								_nodes[i].parentNode.removeChild(_nodes[i]);
							}
						}
					}
					taSelection.setSelectionToElementEnd($target[0]);
					return;
				}else if(command.toLowerCase() === 'createlink'){
					var tagBegin = '<a href="' + options + '" target="' +
							(defaultTagAttributes.a.target ? defaultTagAttributes.a.target : '') +
							'">',
						tagEnd = '</a>',
						_selection = taSelection.getSelection();
					if(_selection.collapsed){
						// insert text at selection, then select then just let normal exec-command run
						taSelection.insertHtml(tagBegin + options + tagEnd, topNode);
					}else if(rangy.getSelection().getRangeAt(0).canSurroundContents()){
						var node = angular.element(tagBegin + tagEnd)[0];
						rangy.getSelection().getRangeAt(0).surroundContents(node);
					}
					return;
				}else if(command.toLowerCase() === 'inserthtml'){
					taSelection.insertHtml(options, topNode);
					return;
				}
			}
			try{
				$document[0].execCommand(command, showUI, options);
			}catch(e){}
		};
	};
}]).service('taSelection', ['$document', 'taDOM',
/* istanbul ignore next: all browser specifics and PhantomJS dosen't seem to support half of it */
function($document, taDOM){
	// need to dereference the document else the calls don't work correctly
	var _document = $document[0];
	var brException = function (element, offset) {
		/* check if selection is a BR element at the beginning of a container. If so, get
		* the parentNode instead.
		* offset should be zero in this case. Otherwise, return the original
		* element.
		*/
		if (element.tagName && element.tagName.match(/^br$/i) && offset === 0 && !element.previousSibling) {
            return {
                element: element.parentNode,
                offset: 0
            };
		} else {
			return {
				element: element,
				offset: offset
			};
		}
	};
	var api = {
		getSelection: function(){
			var range = rangy.getSelection().getRangeAt(0);
			var container = range.commonAncestorContainer;
			var selection = {
				start: brException(range.startContainer, range.startOffset),
				end: brException(range.endContainer, range.endOffset),
				collapsed: range.collapsed
			};
			// Check if the container is a text node and return its parent if so
			container = container.nodeType === 3 ? container.parentNode : container;
			if (container.parentNode === selection.start.element ||
				container.parentNode === selection.end.element) {
				selection.container = container.parentNode;
			} else {
				selection.container = container;
			}
			return selection;
		},
		getOnlySelectedElements: function(){
			var range = rangy.getSelection().getRangeAt(0);
			var container = range.commonAncestorContainer;
			// Check if the container is a text node and return its parent if so
			container = container.nodeType === 3 ? container.parentNode : container;
			return range.getNodes([1], function(node){
				return node.parentNode === container;
			});
		},
		// Some basic selection functions
		getSelectionElement: function () {
			return api.getSelection().container;
		},
		setSelection: function(el, start, end){
			var range = rangy.createRange();
			
			range.setStart(el, start);
			range.setEnd(el, end);
			
			rangy.getSelection().setSingleRange(range);
		},
		setSelectionBeforeElement: function (el){
			var range = rangy.createRange();
			
			range.selectNode(el);
			range.collapse(true);
			
			rangy.getSelection().setSingleRange(range);
		},
		setSelectionAfterElement: function (el){
			var range = rangy.createRange();
			
			range.selectNode(el);
			range.collapse(false);
			
			rangy.getSelection().setSingleRange(range);
		},
		setSelectionToElementStart: function (el){
			var range = rangy.createRange();
			
			range.selectNodeContents(el);
			range.collapse(true);
			
			rangy.getSelection().setSingleRange(range);
		},
		setSelectionToElementEnd: function (el){
			var range = rangy.createRange();
			
			range.selectNodeContents(el);
			range.collapse(false);
			if(el.childNodes && el.childNodes[el.childNodes.length - 1] && el.childNodes[el.childNodes.length - 1].nodeName === 'br'){
				range.startOffset = range.endOffset = range.startOffset - 1;
			}
			rangy.getSelection().setSingleRange(range);
		},
		// from http://stackoverflow.com/questions/6690752/insert-html-at-caret-in-a-contenteditable-div
		// topNode is the contenteditable normally, all manipulation MUST be inside this.
		insertHtml: function(html, topNode){
			var parent, secondParent, _childI, nodes, i, lastNode, _tempFrag;
			var element = angular.element("<div>" + html + "</div>");
			var range = rangy.getSelection().getRangeAt(0);
			var frag = _document.createDocumentFragment();
			var children = element[0].childNodes;
			var isInline = true;
			
			if(children.length > 0){
				// NOTE!! We need to do the following:
				// check for blockelements - if they exist then we have to split the current element in half (and all others up to the closest block element) and insert all children in-between.
				// If there are no block elements, or there is a mixture we need to create textNodes for the non wrapped text (we don't want them spans messing up the picture).
				nodes = [];
				for(_childI = 0; _childI < children.length; _childI++){
					if(!(
						(children[_childI].nodeName.toLowerCase() === 'p' && children[_childI].innerHTML.trim() === '') || // empty p element
						(children[_childI].nodeType === 3 && children[_childI].nodeValue.trim() === '') // empty text node
					)){
						isInline = isInline && !BLOCKELEMENTS.test(children[_childI].nodeName);
						nodes.push(children[_childI]);
					}
				}
				for(var _n = 0; _n < nodes.length; _n++) lastNode = frag.appendChild(nodes[_n]);
				if(!isInline && range.collapsed && /^(|<br(|\/)>)$/i.test(range.startContainer.innerHTML)) range.selectNode(range.startContainer);
			}else{
				isInline = true;
				// paste text of some sort
				lastNode = frag = _document.createTextNode(html);
			}
			
			// Other Edge case - selected data spans multiple blocks.
			if(isInline){
				range.deleteContents();
			}else{ // not inline insert
				if(range.collapsed && range.startContainer !== topNode){
					if(range.startContainer.innerHTML && range.startContainer.innerHTML.match(/^<[^>]*>$/i)){
						// this log is to catch when innerHTML is something like `<img ...>`
						parent = range.startContainer;
						if(range.startOffset === 1){
							// before single tag
							range.setStartAfter(parent);
							range.setEndAfter(parent);
						}else{
							// after single tag
							range.setStartBefore(parent);
							range.setEndBefore(parent);
						}
					}else{
						// split element into 2 and insert block element in middle
						if(range.startContainer.nodeType === 3 && range.startContainer.parentNode !== topNode){ // if text node
							parent = range.startContainer.parentNode;
							secondParent = parent.cloneNode();
							// split the nodes into two lists - before and after, splitting the node with the selection into 2 text nodes.
							taDOM.splitNodes(parent.childNodes, parent, secondParent, range.startContainer, range.startOffset);
							
							// Escape out of the inline tags like b
							while(!VALIDELEMENTS.test(parent.nodeName)){
								angular.element(parent).after(secondParent);
								parent = parent.parentNode;
								var _lastSecondParent = secondParent;
								secondParent = parent.cloneNode();
								// split the nodes into two lists - before and after, splitting the node with the selection into 2 text nodes.
								taDOM.splitNodes(parent.childNodes, parent, secondParent, _lastSecondParent);
							}
						}else{
							parent = range.startContainer;
							secondParent = parent.cloneNode();
							taDOM.splitNodes(parent.childNodes, parent, secondParent, undefined, undefined, range.startOffset);
						}
						
						angular.element(parent).after(secondParent);
						// put cursor to end of inserted content
						range.setStartAfter(parent);
						range.setEndAfter(parent);
						
						if(/^(|<br(|\/)>)$/i.test(parent.innerHTML.trim())){
							range.setStartBefore(parent);
							range.setEndBefore(parent);
							angular.element(parent).remove();
						}
						if(/^(|<br(|\/)>)$/i.test(secondParent.innerHTML.trim())) angular.element(secondParent).remove();
						if(parent.nodeName.toLowerCase() === 'li'){
							_tempFrag = _document.createDocumentFragment();
							for(i = 0; i < frag.childNodes.length; i++){
								element = angular.element('<li>');
								taDOM.transferChildNodes(frag.childNodes[i], element[0]);
								taDOM.transferNodeAttributes(frag.childNodes[i], element[0]);
								_tempFrag.appendChild(element[0]);
							}
							frag = _tempFrag;
							if(lastNode){
								lastNode = frag.childNodes[frag.childNodes.length - 1];
								lastNode = lastNode.childNodes[lastNode.childNodes.length - 1];
							}
						}
					}
				}else{
					range.deleteContents();
				}
			}
			
			range.insertNode(frag);
			if(lastNode){
				api.setSelectionToElementEnd(lastNode);
			}
		}
	};
	return api;
}]).service('taDOM', function(){
	var taDOM = {
		// recursive function that returns an array of angular.elements that have the passed attribute set on them
		getByAttribute: function(element, attribute){
			var resultingElements = [];
			var childNodes = element.children();
			if(childNodes.length){
				angular.forEach(childNodes, function(child){
					resultingElements = resultingElements.concat(taDOM.getByAttribute(angular.element(child), attribute));
				});
			}
			if(element.attr(attribute) !== undefined) resultingElements.push(element);
			return resultingElements;
		},
		
		transferChildNodes: function(source, target){
			// clear out target
			target.innerHTML = '';
			while(source.childNodes.length > 0) target.appendChild(source.childNodes[0]);
			return target;
		},
		
		splitNodes: function(nodes, target1, target2, splitNode, subSplitIndex, splitIndex){
			if(!splitNode && isNaN(splitIndex)) throw new Error('taDOM.splitNodes requires a splitNode or splitIndex');
			var startNodes = document.createDocumentFragment();
			var endNodes = document.createDocumentFragment();
			var index = 0;
			
			while(nodes.length > 0 && (isNaN(splitIndex) || splitIndex !== index) && nodes[0] !== splitNode){
				startNodes.appendChild(nodes[0]); // this removes from the nodes array (if proper childNodes object.
				index++;
			}
			
			if(!isNaN(subSplitIndex) && subSplitIndex >= 0 && nodes[0]){
				startNodes.appendChild(document.createTextNode(nodes[0].nodeValue.substring(0, subSplitIndex)));
				nodes[0].nodeValue = nodes[0].nodeValue.substring(subSplitIndex);
			}
			while(nodes.length > 0) endNodes.appendChild(nodes[0]);
			
			taDOM.transferChildNodes(startNodes, target1);
			taDOM.transferChildNodes(endNodes, target2);
		},
		
		transferNodeAttributes: function(source, target){
			for(var i = 0; i < source.attributes.length; i++) target.setAttribute(source.attributes[i].name, source.attributes[i].value);
			return target;
		}
	};
	return taDOM;
});
angular.module('textAngular.validators', [])
.directive('taMaxText', function(){
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, elem, attrs, ctrl){
			var max = parseInt(scope.$eval(attrs.taMaxText));
			if (isNaN(max)){
				throw('Max text must be an integer');
			}
			attrs.$observe('taMaxText', function(value){
				max = parseInt(value);
				if (isNaN(max)){
					throw('Max text must be an integer');
				}
				if (ctrl.$dirty){
					ctrl.$validate();
				}
			});
			ctrl.$validators.taMaxText = function(viewValue){
				var source = angular.element('<div/>');
				source.html(viewValue);
				return source.text().length <= max;
			};
		}
	};
}).directive('taMinText', function(){
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, elem, attrs, ctrl){
			var min = parseInt(scope.$eval(attrs.taMinText));
			if (isNaN(min)){
				throw('Min text must be an integer');
			}
			attrs.$observe('taMinText', function(value){
				min = parseInt(value);
				if (isNaN(min)){
					throw('Min text must be an integer');
				}
				if (ctrl.$dirty){
					ctrl.$validate();
				}
			});
			ctrl.$validators.taMinText = function(viewValue){
				var source = angular.element('<div/>');
				source.html(viewValue);
				return !source.text().length || source.text().length >= min;
			};
		}
	};
});
angular.module('textAngular.taBind', ['textAngular.factories', 'textAngular.DOM'])
.service('_taBlankTest', [function(){
	var INLINETAGS_NONBLANK = /<(a|abbr|acronym|bdi|bdo|big|cite|code|del|dfn|img|ins|kbd|label|map|mark|q|ruby|rp|rt|s|samp|time|tt|var)[^>]*(>|$)/i;
	return function(_defaultTest){
		return function(_blankVal){
			if(!_blankVal) return true;
			// find first non-tag match - ie start of string or after tag that is not whitespace
			var _firstMatch = /(^[^<]|>)[^<]/i.exec(_blankVal);
			var _firstTagIndex;
			if(!_firstMatch){
				// find the end of the first tag removing all the
				// Don't do a global replace as that would be waaayy too long, just replace the first 4 occurences should be enough
				_blankVal = _blankVal.toString().replace(/="[^"]*"/i, '').replace(/="[^"]*"/i, '').replace(/="[^"]*"/i, '').replace(/="[^"]*"/i, '');
				_firstTagIndex = _blankVal.indexOf('>');
			}else{
				_firstTagIndex = _firstMatch.index;
			}
			_blankVal = _blankVal.trim().substring(_firstTagIndex, _firstTagIndex + 100);
			// check for no tags entry
			if(/^[^<>]+$/i.test(_blankVal)) return false;
			// this regex is to match any number of whitespace only between two tags
			if (_blankVal.length === 0 || _blankVal === _defaultTest || /^>(\s|&nbsp;)*<\/[^>]+>$/ig.test(_blankVal)) return true;
			// this regex tests if there is a tag followed by some optional whitespace and some text after that
			else if (/>\s*[^\s<]/i.test(_blankVal) || INLINETAGS_NONBLANK.test(_blankVal)) return false;
			else return true;
		};
	};
}])
.directive('taButton', [function(){
	return {
		link: function(scope, element, attrs){
			element.attr('unselectable', 'on');
			element.on('mousedown', function(e, eventData){
				/* istanbul ignore else: this is for catching the jqLite testing*/
				if(eventData) angular.extend(e, eventData);
				// this prevents focusout from firing on the editor when clicking toolbar buttons
				e.preventDefault();
				return false;
			});
		}
	};
}])
.directive('taBind', [
		'taSanitize', '$timeout', '$document', 'taFixChrome', 'taBrowserTag',
		'taSelection', 'taSelectableElements', 'taApplyCustomRenderers', 'taOptions',
		'_taBlankTest', '$parse', 'taDOM', 'textAngularManager',
		function(
			taSanitize, $timeout, $document, taFixChrome, taBrowserTag,
			taSelection, taSelectableElements, taApplyCustomRenderers, taOptions,
			_taBlankTest, $parse, taDOM, textAngularManager){
	// Uses for this are textarea or input with ng-model and ta-bind='text'
	// OR any non-form element with contenteditable="contenteditable" ta-bind="html|text" ng-model
	return {
		priority: 2, // So we override validators correctly
		require: ['ngModel','?ngModelOptions'],
		link: function(scope, element, attrs, controller){
			var ngModel = controller[0];
			var ngModelOptions = controller[1] || {};
			// the option to use taBind on an input or textarea is required as it will sanitize all input into it correctly.
			var _isContentEditable = element.attr('contenteditable') !== undefined && element.attr('contenteditable');
			var _isInputFriendly = _isContentEditable || element[0].tagName.toLowerCase() === 'textarea' || element[0].tagName.toLowerCase() === 'input';
			var _isReadonly = false;
			var _focussed = false;
			var _skipRender = false;
			var _disableSanitizer = attrs.taUnsafeSanitizer || taOptions.disableSanitizer;
			var _lastKey;
			// see http://www.javascripter.net/faq/keycodes.htm for good information
			// NOTE Mute On|Off 173 (Opera MSIE Safari Chrome) 181 (Firefox)
			// BLOCKED_KEYS are special keys...
			// Tab, pause/break, CapsLock, Esc, Page Up, End, Home,
			// Left arrow, Up arrow, Right arrow, Down arrow, Insert, Delete,
			// f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12
			// NumLock, ScrollLock
			var BLOCKED_KEYS = /^(9|19|20|27|33|34|35|36|37|38|39|40|45|112|113|114|115|116|117|118|119|120|121|122|123|144|145)$/i;
			// UNDO_TRIGGER_KEYS - spaces, enter, delete, backspace, all punctuation
			// Backspace, Enter, Space, Delete, (; :) (Firefox), (= +) (Firefox),
			// Numpad +, Numpad -, (; :), (= +),
			// (, <), (- _), (. >), (/ ?), (` ~), ([ {), (\ |), (] }), (' ")
			// NOTE - Firefox: 173 = (- _) -- adding this to UNDO_TRIGGER_KEYS
			var UNDO_TRIGGER_KEYS = /^(8|13|32|46|59|61|107|109|173|186|187|188|189|190|191|192|219|220|221|222)$/i;
			var _pasteHandler;

			// defaults to the paragraph element, but we need the line-break or it doesn't allow you to type into the empty element
			// non IE is '<p><br/></p>', ie is '<p></p>' as for once IE gets it correct...
			var _defaultVal, _defaultTest;

			var _CTRL_KEY = 0x0001;
			var _META_KEY = 0x0002;
			var _ALT_KEY = 0x0004;
			var _SHIFT_KEY = 0x0008;
			// map events to special keys...
			// mappings is an array of maps from events to specialKeys as declared in textAngularSetup
			var _keyMappings = [
				//		ctrl/command + z
				{
					specialKey: 'UndoKey',
					forbiddenModifiers: _ALT_KEY + _SHIFT_KEY,
					mustHaveModifiers: [_META_KEY + _CTRL_KEY],
					keyCode: 90
				},
				//		ctrl/command + shift + z
				{
					specialKey: 'RedoKey',
					forbiddenModifiers: _ALT_KEY,
					mustHaveModifiers: [_META_KEY + _CTRL_KEY, _SHIFT_KEY],
					keyCode: 90
				},
				//		ctrl/command + y
				{
					specialKey: 'RedoKey',
					forbiddenModifiers: _ALT_KEY + _SHIFT_KEY,
					mustHaveModifiers: [_META_KEY + _CTRL_KEY],
					keyCode: 89
				},
				//		TabKey
				{
					specialKey: 'TabKey',
					forbiddenModifiers: _META_KEY + _SHIFT_KEY + _ALT_KEY + _CTRL_KEY,
					mustHaveModifiers: [],
					keyCode: 9
				},
				//		shift + TabKey
				{
					specialKey: 'ShiftTabKey',
					forbiddenModifiers: _META_KEY + _ALT_KEY + _CTRL_KEY,
					mustHaveModifiers: [_SHIFT_KEY],
					keyCode: 9
				}
			];
			function _mapKeys(event) {
				var specialKey;
				_keyMappings.forEach(function (map){
					if (map.keyCode === event.keyCode) {
						var netModifiers = (event.metaKey ? _META_KEY: 0) +
							(event.ctrlKey ? _CTRL_KEY: 0) +
							(event.shiftKey ? _SHIFT_KEY: 0) +
							(event.altKey ? _ALT_KEY: 0);
						if (map.forbiddenModifiers & netModifiers) return;
						if (map.mustHaveModifiers.every(function (modifier) { return netModifiers & modifier; })){
							specialKey = map.specialKey;
						}
					}
				});
				return specialKey;
			}

			// set the default to be a paragraph value
			if(attrs.taDefaultWrap === undefined) attrs.taDefaultWrap = 'p';
			/* istanbul ignore next: ie specific test */
			if(attrs.taDefaultWrap === ''){
				_defaultVal = '';
				_defaultTest = (_browserDetect.ie === undefined)? '<div><br></div>' : (_browserDetect.ie >= 11)? '<p><br></p>' : (_browserDetect.ie <= 8)? '<P>&nbsp;</P>' : '<p>&nbsp;</p>';
			}else{
				_defaultVal = (_browserDetect.ie === undefined || _browserDetect.ie >= 11)?
					'<' + attrs.taDefaultWrap + '><br></' + attrs.taDefaultWrap + '>' :
					(_browserDetect.ie <= 8)?
						'<' + attrs.taDefaultWrap.toUpperCase() + '></' + attrs.taDefaultWrap.toUpperCase() + '>' :
						'<' + attrs.taDefaultWrap + '></' + attrs.taDefaultWrap + '>';
				_defaultTest = (_browserDetect.ie === undefined || _browserDetect.ie >= 11)?
					'<' + attrs.taDefaultWrap + '><br></' + attrs.taDefaultWrap + '>' :
					(_browserDetect.ie <= 8)?
						'<' + attrs.taDefaultWrap.toUpperCase() + '>&nbsp;</' + attrs.taDefaultWrap.toUpperCase() + '>' :
						'<' + attrs.taDefaultWrap + '>&nbsp;</' + attrs.taDefaultWrap + '>';
			}

			/* istanbul ignore else */
			if(!ngModelOptions.$options) ngModelOptions.$options = {}; // ng-model-options support

			var _blankTest = _taBlankTest(_defaultTest);

			var _ensureContentWrapped = function(value) {
				if (_blankTest(value)) return value;
				var domTest = angular.element("<div>" + value + "</div>");
				//console.log('domTest.children().length():', domTest.children().length);
				if (domTest.children().length === 0) {
					value = "<" + attrs.taDefaultWrap + ">" + value + "</" + attrs.taDefaultWrap + ">";
				} else {
					var _children = domTest[0].childNodes;
					var i;
					var _foundBlockElement = false;
					for (i = 0; i < _children.length; i++) {
						if (_foundBlockElement = _children[i].nodeName.toLowerCase().match(BLOCKELEMENTS)) break;
					}
					if (!_foundBlockElement) {
						value = "<" + attrs.taDefaultWrap + ">" + value + "</" + attrs.taDefaultWrap + ">";
					}
					else{
						value = "";
						for(i = 0; i < _children.length; i++){
							var node = _children[i];
							var nodeName = node.nodeName.toLowerCase();
							//console.log(nodeName);
							if(nodeName === '#comment') {
								value += '<!--' + node.nodeValue + '-->';
							} else if(nodeName === '#text') {
								// determine if this is all whitespace, if so, we will leave it as it is.
								// otherwise, we will wrap it as it is
								var text = node.textContent;
								if (!text.trim()) {
									// just whitespace
									value += text;
								} else {
									// not pure white space so wrap in <p>...</p> or whatever attrs.taDefaultWrap is set to.
									value += "<" + attrs.taDefaultWrap + ">" + text + "</" + attrs.taDefaultWrap + ">";
								}
							} else if(!nodeName.match(BLOCKELEMENTS)){
								/* istanbul ignore  next: Doesn't seem to trigger on tests */
								var _subVal = (node.outerHTML || node.nodeValue);
								/* istanbul ignore else: Doesn't seem to trigger on tests, is tested though */
								if(_subVal.trim() !== '')
									value += "<" + attrs.taDefaultWrap + ">" + _subVal + "</" + attrs.taDefaultWrap + ">";
								else value += _subVal;
							} else {
								value += node.outerHTML;
							}
						}
					}
				}
				//console.log(value);
				return value;
			};

			if(attrs.taPaste) _pasteHandler = $parse(attrs.taPaste);

			element.addClass('ta-bind');

			var _undoKeyupTimeout;

			scope['$undoManager' + (attrs.id || '')] = ngModel.$undoManager = {
				_stack: [],
				_index: 0,
				_max: 1000,
				push: function(value){
					if((typeof value === "undefined" || value === null) ||
						((typeof this.current() !== "undefined" && this.current() !== null) && value === this.current())) return value;
					if(this._index < this._stack.length - 1){
						this._stack = this._stack.slice(0,this._index+1);
					}
					this._stack.push(value);
					if(_undoKeyupTimeout) $timeout.cancel(_undoKeyupTimeout);
					if(this._stack.length > this._max) this._stack.shift();
					this._index = this._stack.length - 1;
					return value;
				},
				undo: function(){
					return this.setToIndex(this._index-1);
				},
				redo: function(){
					return this.setToIndex(this._index+1);
				},
				setToIndex: function(index){
					if(index < 0 || index > this._stack.length - 1){
						return undefined;
					}
					this._index = index;
					return this.current();
				},
				current: function(){
					return this._stack[this._index];
				}
			};

			var _redoUndoTimeout;
			var _undo = scope['$undoTaBind' + (attrs.id || '')] = function(){
				/* istanbul ignore else: can't really test it due to all changes being ignored as well in readonly */
				if(!_isReadonly && _isContentEditable){
					var content = ngModel.$undoManager.undo();
					if(typeof content !== "undefined" && content !== null){
						_setInnerHTML(content);
						_setViewValue(content, false);
						if(_redoUndoTimeout) $timeout.cancel(_redoUndoTimeout);
						_redoUndoTimeout = $timeout(function(){
							element[0].focus();
							taSelection.setSelectionToElementEnd(element[0]);
						}, 1);
					}
				}
			};

			var _redo = scope['$redoTaBind' + (attrs.id || '')] = function(){
				/* istanbul ignore else: can't really test it due to all changes being ignored as well in readonly */
				if(!_isReadonly && _isContentEditable){
					var content = ngModel.$undoManager.redo();
					if(typeof content !== "undefined" && content !== null){
						_setInnerHTML(content);
						_setViewValue(content, false);
						/* istanbul ignore next */
						if(_redoUndoTimeout) $timeout.cancel(_redoUndoTimeout);
						_redoUndoTimeout = $timeout(function(){
							element[0].focus();
							taSelection.setSelectionToElementEnd(element[0]);
						}, 1);
					}
				}
			};

			// in here we are undoing the converts used elsewhere to prevent the < > and & being displayed when they shouldn't in the code.
			var _compileHtml = function(){
				if(_isContentEditable) return element[0].innerHTML;
				if(_isInputFriendly) return element.val();
				throw ('textAngular Error: attempting to update non-editable taBind');
			};

			var _setViewValue = function(_val, triggerUndo, skipRender){
				_skipRender = skipRender || false;
				if(typeof triggerUndo === "undefined" || triggerUndo === null) triggerUndo = true && _isContentEditable; // if not contentEditable then the native undo/redo is fine
				if(typeof _val === "undefined" || _val === null) _val = _compileHtml();
				if(_blankTest(_val)){
					// this avoids us from tripping the ng-pristine flag if we click in and out with out typing
					if(ngModel.$viewValue !== '') ngModel.$setViewValue('');
					if(triggerUndo && ngModel.$undoManager.current() !== '') ngModel.$undoManager.push('');
				}else{
					_reApplyOnSelectorHandlers();
					if(ngModel.$viewValue !== _val){
						ngModel.$setViewValue(_val);
						if(triggerUndo) ngModel.$undoManager.push(_val);
					}
				}
				ngModel.$render();
			};

			//used for updating when inserting wrapped elements
			scope['updateTaBind' + (attrs.id || '')] = function(){
				if(!_isReadonly) _setViewValue(undefined, undefined, true);
			};

			// catch DOM XSS via taSanitize
			// Sanitizing both ways is identical
			var _sanitize = function(unsafe){
				return (ngModel.$oldViewValue = taSanitize(taFixChrome(unsafe), ngModel.$oldViewValue, _disableSanitizer));
			};

			// trigger the validation calls
			if(element.attr('required')) ngModel.$validators.required = function(modelValue, viewValue) {
				return !_blankTest(modelValue || viewValue);
			};
			// parsers trigger from the above keyup function or any other time that the viewValue is updated and parses it for storage in the ngModel
			ngModel.$parsers.push(_sanitize);
			ngModel.$parsers.unshift(_ensureContentWrapped);
			// because textAngular is bi-directional (which is awesome) we need to also sanitize values going in from the server
			ngModel.$formatters.push(_sanitize);
			ngModel.$formatters.unshift(_ensureContentWrapped);
			ngModel.$formatters.unshift(function(value){
				return ngModel.$undoManager.push(value || '');
			});

			//this code is used to update the models when data is entered/deleted
			if(_isInputFriendly){
				scope.events = {};
				if(!_isContentEditable){
					// if a textarea or input just add in change and blur handlers, everything else is done by angulars input directive
					element.on('change blur', scope.events.change = scope.events.blur = function(){
						if(!_isReadonly) ngModel.$setViewValue(_compileHtml());
					});

					element.on('keydown', scope.events.keydown = function(event, eventData){
						/* istanbul ignore else: this is for catching the jqLite testing*/
						if(eventData) angular.extend(event, eventData);
						// Reference to http://stackoverflow.com/questions/6140632/how-to-handle-tab-in-textarea
						/* istanbul ignore else: otherwise normal functionality */
						if(event.keyCode === 9){ // tab was pressed
							// get caret position/selection
							var start = this.selectionStart;
							var end = this.selectionEnd;

							var value = element.val();
							if(event.shiftKey){
								// find \t
								var _linebreak = value.lastIndexOf('\n', start), _tab = value.lastIndexOf('\t', start);
								if(_tab !== -1 && _tab >= _linebreak){
									// set textarea value to: text before caret + tab + text after caret
									element.val(value.substring(0, _tab) + value.substring(_tab + 1));

									// put caret at right position again (add one for the tab)
									this.selectionStart = this.selectionEnd = start - 1;
								}
							}else{
								// set textarea value to: text before caret + tab + text after caret
								element.val(value.substring(0, start) + "\t" + value.substring(end));

								// put caret at right position again (add one for the tab)
								this.selectionStart = this.selectionEnd = start + 1;
							}
							// prevent the focus lose
							event.preventDefault();
						}
					});

					var _repeat = function(string, n){
						var result = '';
						for(var _n = 0; _n < n; _n++) result += string;
						return result;
					};

					// add a forEach function that will work on a NodeList, etc..
					var forEach = function (array, callback, scope) {
						for (var i= 0; i<array.length; i++) {
							callback.call(scope, i, array[i]);
						}
					};

					// handle <ul> or <ol> nodes
					var recursiveListFormat = function(listNode, tablevel){
						var _html = '';
						var _subnodes = listNode.childNodes;
						tablevel++;
						// tab out and add the <ul> or <ol> html piece
						_html += _repeat('\t', tablevel-1) + listNode.outerHTML.substring(0, 4);
						forEach(_subnodes, function (index, node) {
							/* istanbul ignore next: browser catch */
							var nodeName = node.nodeName.toLowerCase();
							if (nodeName === '#comment') {
								_html += '<!--' + node.nodeValue + '-->';
								return;
							}
							if (nodeName === '#text') {
								_html += node.textContent;
								return;
							}
							/* istanbul ignore next: not tested, and this was original code -- so not wanting to possibly cause an issue, leaving it... */
							if(!node.outerHTML) {
								// no html to add
								return;
							}
							if(nodeName === 'ul' || nodeName === 'ol') {
								_html += '\n' + recursiveListFormat(node, tablevel);
							}
							else {
								// no reformatting within this subnode, so just do the tabing...
								_html += '\n' + _repeat('\t', tablevel) + node.outerHTML;
							}
						});
						// now add on the </ol> or </ul> piece
						_html += '\n' + _repeat('\t', tablevel-1) + listNode.outerHTML.substring(listNode.outerHTML.lastIndexOf('<'));
						return _html;
					};
					// handle formating of something like:
					// <ol><!--First comment-->
					//  <li>Test Line 1<!--comment test list 1--></li>
					//    <ul><!--comment ul-->
					//      <li>Nested Line 1</li>
					//        <!--comment between nested lines--><li>Nested Line 2</li>
					//    </ul>
					//  <li>Test Line 3</li>
					// </ol>
					ngModel.$formatters.unshift(function(htmlValue){
						// tabulate the HTML so it looks nicer
						//
						// first get a list of the nodes...
						// we do this by using the element parser...
						//
						// doing this -- which is simpiler -- breaks our tests...
						//var _nodes=angular.element(htmlValue);
						var _nodes = angular.element('<div>' + htmlValue + '</div>')[0].childNodes;
						if(_nodes.length > 0){
							// do the reformatting of the layout...
							htmlValue = '';
							forEach(_nodes, function (index, node) {
								var nodeName = node.nodeName.toLowerCase();
								if (nodeName === '#comment') {
									htmlValue += '<!--' + node.nodeValue + '-->';
									return;
								}
								if (nodeName === '#text') {
									htmlValue += node.textContent;
									return;
								}
								/* istanbul ignore next: not tested, and this was original code -- so not wanting to possibly cause an issue, leaving it... */
								if(!node.outerHTML)
								{
									// nothing to format!
									return;
								}
								if(htmlValue.length > 0) {
									// we aready have some content, so drop to a new line
									htmlValue += '\n';
								}
								if(nodeName === 'ul' || nodeName === 'ol') {
									// okay a set of list stuff we want to reformat in a nested way
									htmlValue += '' + recursiveListFormat(node, 0);
								}
								else {
									// just use the original without any additional formating
									htmlValue += '' + node.outerHTML;
								}
							});
						}
						return htmlValue;
					});
				}else{
					// all the code specific to contenteditable divs
					var _processingPaste = false;
					/* istanbul ignore next: phantom js cannot test this for some reason */
					var processpaste = function(text) {
                        var _isOneNote = text.match(/content=["']*OneNote.File/i);
						/* istanbul ignore else: don't care if nothing pasted */
                        //console.log(text);
						if(text && text.trim().length){
							// test paste from word/microsoft product
							if(text.match(/class=["']*Mso(Normal|List)/i) || text.match(/content=["']*Word.Document/i) || text.match(/content=["']*OneNote.File/i)){
								var textFragment = text.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i);
								if(!textFragment) textFragment = text;
								else textFragment = textFragment[1];
								textFragment = textFragment.replace(/<o:p>[\s\S]*?<\/o:p>/ig, '').replace(/class=(["']|)MsoNormal(["']|)/ig, '');
								var dom = angular.element("<div>" + textFragment + "</div>");
								var targetDom = angular.element("<div></div>");
								var _list = {
									element: null,
									lastIndent: [],
									lastLi: null,
									isUl: false
								};
								_list.lastIndent.peek = function(){
									var n = this.length;
									if (n>0) return this[n-1];
								};
								var _resetList = function(isUl){
									_list.isUl = isUl;
									_list.element = angular.element(isUl ? "<ul>" : "<ol>");
									_list.lastIndent = [];
									_list.lastIndent.peek = function(){
										var n = this.length;
										if (n>0) return this[n-1];
									};
									_list.lastLevelMatch = null;
								};
								for(var i = 0; i <= dom[0].childNodes.length; i++){
									if(!dom[0].childNodes[i] || dom[0].childNodes[i].nodeName === "#text"){
										continue;
									} else {
										var tagName = dom[0].childNodes[i].tagName.toLowerCase();
										if(tagName !== "p" && tagName !== "h1" && tagName !== "h2" && tagName !== "h3" && tagName !== "h4" && tagName !== "h5" && tagName !== "h6"){
											continue;
										}
									}
									var el = angular.element(dom[0].childNodes[i]);
									var _listMatch = (el.attr('class') || '').match(/MsoList(Bullet|Number|Paragraph)(CxSp(First|Middle|Last)|)/i);

									if(_listMatch){
										if(el[0].childNodes.length < 2 || el[0].childNodes[1].childNodes.length < 1){
											continue;
										}
										var isUl = _listMatch[1].toLowerCase() === "bullet" || (_listMatch[1].toLowerCase() !== "number" && !(/^[^0-9a-z<]*[0-9a-z]+[^0-9a-z<>]</i.test(el[0].childNodes[1].innerHTML) || /^[^0-9a-z<]*[0-9a-z]+[^0-9a-z<>]</i.test(el[0].childNodes[1].childNodes[0].innerHTML)));
										var _indentMatch = (el.attr('style') || '').match(/margin-left:([\-\.0-9]*)/i);
										var indent = parseFloat((_indentMatch)?_indentMatch[1]:0);
										var _levelMatch = (el.attr('style') || '').match(/mso-list:l([0-9]+) level([0-9]+) lfo[0-9+]($|;)/i);
										// prefers the mso-list syntax

										if(_levelMatch && _levelMatch[2]) indent = parseInt(_levelMatch[2]);

										if ((_levelMatch && (!_list.lastLevelMatch || _levelMatch[1] !== _list.lastLevelMatch[1])) || !_listMatch[3] || _listMatch[3].toLowerCase() === "first" || (_list.lastIndent.peek() === null) || (_list.isUl !== isUl && _list.lastIndent.peek() === indent)) {
											_resetList(isUl);
											targetDom.append(_list.element);
										} else if (_list.lastIndent.peek() != null && _list.lastIndent.peek() < indent){
											_list.element = angular.element(isUl ? "<ul>" : "<ol>");
											_list.lastLi.append(_list.element);
										} else if (_list.lastIndent.peek() != null && _list.lastIndent.peek() > indent){
											while(_list.lastIndent.peek() != null && _list.lastIndent.peek() > indent){
												if(_list.element.parent()[0].tagName.toLowerCase() === 'li'){
													_list.element = _list.element.parent();
													continue;
												}else if(/[uo]l/i.test(_list.element.parent()[0].tagName.toLowerCase())){
													_list.element = _list.element.parent();
												}else{ // else it's it should be a sibling
													break;
												}
												_list.lastIndent.pop();
											}
											_list.isUl = _list.element[0].tagName.toLowerCase() === "ul";
											if (isUl !== _list.isUl) {
												_resetList(isUl);
												targetDom.append(_list.element);
											}
										}

										_list.lastLevelMatch = _levelMatch;
										if(indent !== _list.lastIndent.peek()) _list.lastIndent.push(indent);
										_list.lastLi = angular.element("<li>");
										_list.element.append(_list.lastLi);
										_list.lastLi.html(el.html().replace(/<!(--|)\[if !supportLists\](--|)>[\s\S]*?<!(--|)\[endif\](--|)>/ig, ''));
										el.remove();
									}else{
										_resetList(false);
										targetDom.append(el);
									}
								}
								var _unwrapElement = function(node){
									node = angular.element(node);
									for(var _n = node[0].childNodes.length - 1; _n >= 0; _n--) node.after(node[0].childNodes[_n]);
									node.remove();
								};

								angular.forEach(targetDom.find('span'), function(node){
									node.removeAttribute('lang');
									if(node.attributes.length <= 0) _unwrapElement(node);
								});
								angular.forEach(targetDom.find('font'), _unwrapElement);

                                text = targetDom.html();
                                if(_isOneNote){
                                    text = targetDom.html() || dom.html();
                                }
							}else{
								// remove unnecessary chrome insert
								text = text.replace(/<(|\/)meta[^>]*?>/ig, '');
								if(text.match(/<[^>]*?(ta-bind)[^>]*?>/)){
									// entire text-angular or ta-bind has been pasted, REMOVE AT ONCE!!
									if(text.match(/<[^>]*?(text-angular)[^>]*?>/)){
										var _el = angular.element("<div>" + text + "</div>");
										_el.find('textarea').remove();
										var binds = taDOM.getByAttribute(_el, 'ta-bind');
										for(var _b = 0; _b < binds.length; _b++){
											var _target = binds[_b][0].parentNode.parentNode;
											for(var _c = 0; _c < binds[_b][0].childNodes.length; _c++){
												_target.parentNode.insertBefore(binds[_b][0].childNodes[_c], _target);
											}
											_target.parentNode.removeChild(_target);
										}
										text = _el.html().replace('<br class="Apple-interchange-newline">', '');
									}
								}else if(text.match(/^<span/)){
									// in case of pasting only a span - chrome paste, remove them. THis is just some wierd formatting
									// if we remove the '<span class="Apple-converted-space"> </span>' here we destroy the spacing
									// on paste from even ourselves!
									if (!text.match(/<span class=(\"Apple-converted-space\"|\'Apple-converted-space\')>.<\/span>/ig)) {
										text = text.replace(/<(|\/)span[^>]*?>/ig, '');
									}
								}
								// Webkit on Apple tags
								text = text.replace(/<br class="Apple-interchange-newline"[^>]*?>/ig, '').replace(/<span class="Apple-converted-space">( |&nbsp;)<\/span>/ig, '&nbsp;');
							}

							if (/<li(\s.*)?>/i.test(text) && /(<ul(\s.*)?>|<ol(\s.*)?>).*<li(\s.*)?>/i.test(text) === false) {
								// insert missing parent of li element
								text = text.replace(/<li(\s.*)?>.*<\/li(\s.*)?>/i, '<ul>$&</ul>');
							}

							// parse whitespace from plaintext input, starting with preceding spaces that get stripped on paste
							text = text.replace(/^[ |\u00A0]+/gm, function (match) {
								var result = '';
								for (var i = 0; i < match.length; i++) {
									result += '&nbsp;';
								}
								return result;
							}).replace(/\n|\r\n|\r/g, '<br />').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

							if(_pasteHandler) text = _pasteHandler(scope, {$html: text}) || text;

							text = taSanitize(text, '', _disableSanitizer);

							taSelection.insertHtml(text, element[0]);
							$timeout(function(){
								ngModel.$setViewValue(_compileHtml());
								_processingPaste = false;
								element.removeClass('processing-paste');
							}, 0);
						}else{
							_processingPaste = false;
							element.removeClass('processing-paste');
						}
					};

					element.on('paste', scope.events.paste = function(e, eventData){
						/* istanbul ignore else: this is for catching the jqLite testing*/
						if(eventData) angular.extend(e, eventData);
						if(_isReadonly || _processingPaste){
							e.stopPropagation();
							e.preventDefault();
							return false;
						}

						// Code adapted from http://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser/6804718#6804718
						_processingPaste = true;
						element.addClass('processing-paste');
						var pastedContent;
						var clipboardData = (e.originalEvent || e).clipboardData;
						if (clipboardData && clipboardData.getData && clipboardData.types.length > 0) {// Webkit - get data from clipboard, put into editdiv, cleanup, then cancel event
							var _types = "";
							for(var _t = 0; _t < clipboardData.types.length; _t++){
								_types += " " + clipboardData.types[_t];
							}
							/* istanbul ignore next: browser tests */
							if (/text\/html/i.test(_types)) {
								pastedContent = clipboardData.getData('text/html');
							} else if (/text\/plain/i.test(_types)) {
								pastedContent = clipboardData.getData('text/plain');
							}

							processpaste(pastedContent);
							e.stopPropagation();
							e.preventDefault();
							return false;
						} else {// Everything else - empty editdiv and allow browser to paste content into it, then cleanup
							var _savedSelection = rangy.saveSelection(),
								_tempDiv = angular.element('<div class="ta-hidden-input" contenteditable="true"></div>');
							$document.find('body').append(_tempDiv);
							_tempDiv[0].focus();
							$timeout(function(){
								// restore selection
								rangy.restoreSelection(_savedSelection);
								processpaste(_tempDiv[0].innerHTML);
								element[0].focus();
								_tempDiv.remove();
							}, 0);
						}
					});
					element.on('cut', scope.events.cut = function(e){
						// timeout to next is needed as otherwise the paste/cut event has not finished actually changing the display
						if(!_isReadonly) $timeout(function(){
							ngModel.$setViewValue(_compileHtml());
						}, 0);
						else e.preventDefault();
					});

					element.on('keydown', scope.events.keydown = function(event, eventData){
						/* istanbul ignore else: this is for catching the jqLite testing*/
						if(eventData) angular.extend(event, eventData);
						event.specialKey = _mapKeys(event);
						var userSpecialKey;
						/* istanbul ignore next: difficult to test */
						taOptions.keyMappings.forEach(function (mapping) {
							if (event.specialKey === mapping.commandKeyCode) {
								// taOptions has remapped this binding... so
								// we disable our own
								event.specialKey = undefined;
							}
							if (mapping.testForKey(event)) {
								userSpecialKey = mapping.commandKeyCode;
							}
							if ((mapping.commandKeyCode === 'UndoKey') || (mapping.commandKeyCode === 'RedoKey')) {
								// this is necessary to fully stop the propagation.
								if (!mapping.enablePropagation) {
									event.preventDefault();
								}
							}
						});
						/* istanbul ignore next: difficult to test */
						if (typeof userSpecialKey !== 'undefined') {
							event.specialKey = userSpecialKey;
						}
						/* istanbul ignore next: difficult to test as can't seem to select */
						if ((typeof event.specialKey !== 'undefined') && (
								event.specialKey !== 'UndoKey' || event.specialKey !== 'RedoKey'
							)) {
							event.preventDefault();
							textAngularManager.sendKeyCommand(scope, event);
						}
						/* istanbul ignore else: readonly check */
						if(!_isReadonly){
							if (event.specialKey==='UndoKey') {
								_undo();
								event.preventDefault();
							}
							if (event.specialKey==='RedoKey') {
								_redo();
								event.preventDefault();
							}
							/* istanbul ignore next: difficult to test as can't seem to select */
							if(event.keyCode === 13 && !event.shiftKey){
								var contains = function(a, obj) {
									for (var i = 0; i < a.length; i++) {
										if (a[i] === obj) {
											return true;
										}
									}
									return false;
								};
								var $selection;
								var selection = taSelection.getSelectionElement();
								if(!selection.tagName.match(VALIDELEMENTS)) return;
								var _new = angular.element(_defaultVal);
								// if we are in the last element of a blockquote, or ul or ol and the element is blank
								// we need to pull the element outside of the said type
								var moveOutsideElements = ['blockquote', 'ul', 'ol'];
								if (contains(moveOutsideElements, selection.parentNode.tagName.toLowerCase())) {
									if (/^<br(|\/)>$/i.test(selection.innerHTML.trim()) && !selection.nextSibling) {
										// if last element is blank, pull element outside.
										$selection = angular.element(selection);
										var _parent = $selection.parent();
										_parent.after(_new);
										$selection.remove();
										if (_parent.children().length === 0) _parent.remove();
										taSelection.setSelectionToElementStart(_new[0]);
										event.preventDefault();
									}
									if (/^<[^>]+><br(|\/)><\/[^>]+>$/i.test(selection.innerHTML.trim())) {
										$selection = angular.element(selection);
										$selection.after(_new);
										$selection.remove();
										taSelection.setSelectionToElementStart(_new[0]);
										event.preventDefault();
									}
								}
							}
						}
					});
					var _keyupTimeout;
					element.on('keyup', scope.events.keyup = function(event, eventData){
						/* istanbul ignore else: this is for catching the jqLite testing*/
						if(eventData) angular.extend(event, eventData);
						/* istanbul ignore next: FF specific bug fix */
						if (event.keyCode === 9) {
							var _selection = taSelection.getSelection();
							if(_selection.start.element === element[0] && element.children().length) taSelection.setSelectionToElementStart(element.children()[0]);
							return;
						}
						if(_undoKeyupTimeout) $timeout.cancel(_undoKeyupTimeout);
						if(!_isReadonly && !BLOCKED_KEYS.test(event.keyCode)){
							// if enter - insert new taDefaultWrap, if shift+enter insert <br/>
							if(_defaultVal !== '' && event.keyCode === 13){
								if(!event.shiftKey){
									// new paragraph, br should be caught correctly
									var selection = taSelection.getSelectionElement();
									while(!selection.tagName.match(VALIDELEMENTS) && selection !== element[0]){
										selection = selection.parentNode;
									}

									if(selection.tagName.toLowerCase() !== attrs.taDefaultWrap && selection.tagName.toLowerCase() !== 'li' && (selection.innerHTML.trim() === '' || selection.innerHTML.trim() === '<br>')){
										var _new = angular.element(_defaultVal);
										angular.element(selection).replaceWith(_new);
										taSelection.setSelectionToElementStart(_new[0]);
									}
								}
							}
							var val = _compileHtml();
							if(_defaultVal !== '' && val.trim() === ''){
								_setInnerHTML(_defaultVal);
								taSelection.setSelectionToElementStart(element.children()[0]);
							}else if(val.substring(0, 1) !== '<' && attrs.taDefaultWrap !== ''){
								/* we no longer do this, since there can be comments here and white space
								var _savedSelection = rangy.saveSelection();
								val = _compileHtml();
								val = "<" + attrs.taDefaultWrap + ">" + val + "</" + attrs.taDefaultWrap + ">";
								_setInnerHTML(val);
								rangy.restoreSelection(_savedSelection);
								*/
							}
							var triggerUndo = _lastKey !== event.keyCode && UNDO_TRIGGER_KEYS.test(event.keyCode);
							if(_keyupTimeout) $timeout.cancel(_keyupTimeout);
							_keyupTimeout = $timeout(function() {
								_setViewValue(val, triggerUndo, true);
							}, ngModelOptions.$options.debounce || 400);
							if(!triggerUndo) _undoKeyupTimeout = $timeout(function(){ ngModel.$undoManager.push(val); }, 250);
							_lastKey = event.keyCode;
						}
					});

					element.on('blur', scope.events.blur = function(){
						_focussed = false;
						/* istanbul ignore else: if readonly don't update model */
						if(!_isReadonly){
							_setViewValue(undefined, undefined, true);
						}else{
							_skipRender = true; // don't redo the whole thing, just check the placeholder logic
							ngModel.$render();
						}
					});

					// Placeholders not supported on ie 8 and below
					if(attrs.placeholder && (_browserDetect.ie > 8 || _browserDetect.ie === undefined)){
						var rule;
						if(attrs.id) rule = addCSSRule('#' + attrs.id + '.placeholder-text:before', 'content: "' + attrs.placeholder + '"');
						else throw('textAngular Error: An unique ID is required for placeholders to work');

						scope.$on('$destroy', function(){
							removeCSSRule(rule);
						});
					}

					element.on('focus', scope.events.focus = function(){
						_focussed = true;
						element.removeClass('placeholder-text');
						_reApplyOnSelectorHandlers();
					});

					element.on('mouseup', scope.events.mouseup = function(){
						var _selection = taSelection.getSelection();
						if(_selection.start.element === element[0] && element.children().length) taSelection.setSelectionToElementStart(element.children()[0]);
					});

					// prevent propagation on mousedown in editor, see #206
					element.on('mousedown', scope.events.mousedown = function(event, eventData){
						/* istanbul ignore else: this is for catching the jqLite testing*/
						if(eventData) angular.extend(event, eventData);
						event.stopPropagation();
					});
				}
			}

			var selectorClickHandler = function(event){
				// emit the element-select event, pass the element
				scope.$emit('ta-element-select', this);
				event.preventDefault();
				return false;
			};
			var fileDropHandler = function(event, eventData){
				/* istanbul ignore else: this is for catching the jqLite testing*/
				if(eventData) angular.extend(event, eventData);
				// emit the drop event, pass the element, preventing should be done elsewhere
				if(!dropFired && !_isReadonly){
					dropFired = true;
					var dataTransfer;
					if(event.originalEvent) dataTransfer = event.originalEvent.dataTransfer;
					else dataTransfer = event.dataTransfer;
					scope.$emit('ta-drop-event', this, event, dataTransfer);
					$timeout(function(){
						dropFired = false;
						_setViewValue(undefined, undefined, true);
					}, 100);
				}
			};

			//used for updating when inserting wrapped elements
			var _reApplyOnSelectorHandlers = scope['reApplyOnSelectorHandlers' + (attrs.id || '')] = function(){
				/* istanbul ignore else */
				if(!_isReadonly) angular.forEach(taSelectableElements, function(selector){
						// check we don't apply the handler twice
						element.find(selector)
							.off('click', selectorClickHandler)
							.on('click', selectorClickHandler);
					});
			};

			var _setInnerHTML = function(newval){
				element[0].innerHTML = newval;
			};
			var _renderTimeout;
			var _renderInProgress = false;
			// changes to the model variable from outside the html/text inputs
			ngModel.$render = function(){
				/* istanbul ignore if: Catches rogue renders, hard to replicate in tests */
				if(_renderInProgress) return;
				else _renderInProgress = true;
				// catch model being null or undefined
				var val = ngModel.$viewValue || '';
				// if the editor isn't focused it needs to be updated, otherwise it's receiving user input
				if(!_skipRender){
					/* istanbul ignore else: in other cases we don't care */
					if(_isContentEditable && _focussed){
						// update while focussed
						element.removeClass('placeholder-text');
						if(_renderTimeout) $timeout.cancel(_renderTimeout);
						_renderTimeout = $timeout(function(){
							/* istanbul ignore if: Can't be bothered testing this... */
							if(!_focussed){
								element[0].focus();
								taSelection.setSelectionToElementEnd(element.children()[element.children().length - 1]);
							}
							_renderTimeout = undefined;
						}, 1);
					}
					if(_isContentEditable){
						// WYSIWYG Mode
						if(attrs.placeholder){
							if(val === ''){
								// blank
								_setInnerHTML(_defaultVal);
							}else{
								// not-blank
								_setInnerHTML(val);
							}
						}else{
							_setInnerHTML((val === '') ? _defaultVal : val);
						}
						// if in WYSIWYG and readOnly we kill the use of links by clicking
						if(!_isReadonly){
							_reApplyOnSelectorHandlers();
							element.on('drop', fileDropHandler);
						}else{
							element.off('drop', fileDropHandler);
						}
					}else if(element[0].tagName.toLowerCase() !== 'textarea' && element[0].tagName.toLowerCase() !== 'input'){
						// make sure the end user can SEE the html code as a display. This is a read-only display element
						_setInnerHTML(taApplyCustomRenderers(val));
					}else{
						// only for input and textarea inputs
						element.val(val);
					}
				}
				if(_isContentEditable && attrs.placeholder){
					if(val === ''){
						if(_focussed) element.removeClass('placeholder-text');
						else element.addClass('placeholder-text');
					}else{
						element.removeClass('placeholder-text');
					}
				}
				_renderInProgress = _skipRender = false;
			};

			if(attrs.taReadonly){
				//set initial value
				_isReadonly = scope.$eval(attrs.taReadonly);
				if(_isReadonly){
					element.addClass('ta-readonly');
					// we changed to readOnly mode (taReadonly='true')
					if(element[0].tagName.toLowerCase() === 'textarea' || element[0].tagName.toLowerCase() === 'input'){
						element.attr('disabled', 'disabled');
					}
					if(element.attr('contenteditable') !== undefined && element.attr('contenteditable')){
						element.removeAttr('contenteditable');
					}
				}else{
					element.removeClass('ta-readonly');
					// we changed to NOT readOnly mode (taReadonly='false')
					if(element[0].tagName.toLowerCase() === 'textarea' || element[0].tagName.toLowerCase() === 'input'){
						element.removeAttr('disabled');
					}else if(_isContentEditable){
						element.attr('contenteditable', 'true');
					}
				}
				// taReadonly only has an effect if the taBind element is an input or textarea or has contenteditable='true' on it.
				// Otherwise it is readonly by default
				scope.$watch(attrs.taReadonly, function(newVal, oldVal){
					if(oldVal === newVal) return;
					if(newVal){
						element.addClass('ta-readonly');
						// we changed to readOnly mode (taReadonly='true')
						if(element[0].tagName.toLowerCase() === 'textarea' || element[0].tagName.toLowerCase() === 'input'){
							element.attr('disabled', 'disabled');
						}
						if(element.attr('contenteditable') !== undefined && element.attr('contenteditable')){
							element.removeAttr('contenteditable');
						}
						// turn ON selector click handlers
						angular.forEach(taSelectableElements, function(selector){
							element.find(selector).on('click', selectorClickHandler);
						});
						element.off('drop', fileDropHandler);
					}else{
						element.removeClass('ta-readonly');
						// we changed to NOT readOnly mode (taReadonly='false')
						if(element[0].tagName.toLowerCase() === 'textarea' || element[0].tagName.toLowerCase() === 'input'){
							element.removeAttr('disabled');
						}else if(_isContentEditable){
							element.attr('contenteditable', 'true');
						}
						// remove the selector click handlers
						angular.forEach(taSelectableElements, function(selector){
							element.find(selector).off('click', selectorClickHandler);
						});
						element.on('drop', fileDropHandler);
					}
					_isReadonly = newVal;
				});
			}

			// Initialise the selectableElements
			// if in WYSIWYG and readOnly we kill the use of links by clicking
			if(_isContentEditable && !_isReadonly){
				angular.forEach(taSelectableElements, function(selector){
					element.find(selector).on('click', selectorClickHandler);
				});
				element.on('drop', fileDropHandler);
				element.on('blur', function(){
					/* istanbul ignore next: webkit fix */
					if(_browserDetect.webkit) { // detect webkit
						globalContentEditableBlur = true;
					}
				});
			}
		}
	};
}]);


// tests against the current jqLite/jquery implementation if this can be an element
function validElementString(string){
	try{
		return angular.element(string).length !== 0;
	}catch(any){
		return false;
	}
}
// setup the global contstant functions for setting up the toolbar

// all tool definitions
var taTools = {}; 
/*
	A tool definition is an object with the following key/value parameters:
		action: [function(deferred, restoreSelection)]
				a function that is executed on clicking on the button - this will allways be executed using ng-click and will
				overwrite any ng-click value in the display attribute.
				The function is passed a deferred object ($q.defer()), if this is wanted to be used `return false;` from the action and
				manually call `deferred.resolve();` elsewhere to notify the editor that the action has finished.
				restoreSelection is only defined if the rangy library is included and it can be called as `restoreSelection()` to restore the users
				selection in the WYSIWYG editor.
		display: [string]?
				Optional, an HTML element to be displayed as the button. The `scope` of the button is the tool definition object with some additional functions
				If set this will cause buttontext and iconclass to be ignored
		class: [string]?
				Optional, if set will override the taOptions.classes.toolbarButton class.
		buttontext: [string]?
				if this is defined it will replace the contents of the element contained in the `display` element
		iconclass: [string]?
				if this is defined an icon (<i>) will be appended to the `display` element with this string as it's class
		tooltiptext: [string]?
				Optional, a plain text description of the action, used for the title attribute of the action button in the toolbar by default.
		activestate: [function(commonElement)]?
				this function is called on every caret movement, if it returns true then the class taOptions.classes.toolbarButtonActive
				will be applied to the `display` element, else the class will be removed
		disabled: [function()]?
				if this function returns true then the tool will have the class taOptions.classes.disabled applied to it, else it will be removed
	Other functions available on the scope are:
		name: [string]
				the name of the tool, this is the first parameter passed into taRegisterTool
		isDisabled: [function()]
				returns true if the tool is disabled, false if it isn't
		displayActiveToolClass: [function(boolean)]
				returns true if the tool is 'active' in the currently focussed toolbar
		onElementSelect: [Object]
				This object contains the following key/value pairs and is used to trigger the ta-element-select event
				element: [String]
					an element name, will only trigger the onElementSelect action if the tagName of the element matches this string
				filter: [function(element)]?
					an optional filter that returns a boolean, if true it will trigger the onElementSelect.
				action: [function(event, element, editorScope)]
					the action that should be executed if the onElementSelect function runs
*/
// name and toolDefinition to add into the tools available to be added on the toolbar
function registerTextAngularTool(name, toolDefinition){
	if(!name || name === '' || taTools.hasOwnProperty(name)) throw('textAngular Error: A unique name is required for a Tool Definition');
	if(
		(toolDefinition.display && (toolDefinition.display === '' || !validElementString(toolDefinition.display))) ||
		(!toolDefinition.display && !toolDefinition.buttontext && !toolDefinition.iconclass)
	)
		throw('textAngular Error: Tool Definition for "' + name + '" does not have a valid display/iconclass/buttontext value');
	taTools[name] = toolDefinition;
}

angular.module('textAngularSetup', [])
.constant('taRegisterTool', registerTextAngularTool)
.value('taTools', taTools)
// Here we set up the global display defaults, to set your own use a angular $provider#decorator.
.value('taOptions',  {
	//////////////////////////////////////////////////////////////////////////////////////
    // forceTextAngularSanitize
    // set false to allow the textAngular-sanitize provider to be replaced
    // with angular-sanitize or a custom provider.
	forceTextAngularSanitize: true,
	///////////////////////////////////////////////////////////////////////////////////////
	// keyMappings
	// allow customizable keyMappings for specialized key boards or languages
	//
	// keyMappings provides key mappings that are attached to a given commandKeyCode.
	// To modify a specific keyboard binding, simply provide function which returns true
	// for the event you wish to map to.
	// Or to disable a specific keyboard binding, provide a function which returns false.
	// Note: 'RedoKey' and 'UndoKey' are internally bound to the redo and undo functionality.
	// At present, the following commandKeyCodes are in use:
	// 98, 'TabKey', 'ShiftTabKey', 105, 117, 'UndoKey', 'RedoKey'
	//
	// To map to an new commandKeyCode, add a new key mapping such as:
	// {commandKeyCode: 'CustomKey', testForKey: function (event) {
	//  if (event.keyCode=57 && event.ctrlKey && !event.shiftKey && !event.altKey) return true;
	// } }
	// to the keyMappings. This example maps ctrl+9 to 'CustomKey'
	// Then where taRegisterTool(...) is called, add a commandKeyCode: 'CustomKey' and your
	// tool will be bound to ctrl+9.
	//
	// To disble one of the already bound commandKeyCodes such as 'RedoKey' or 'UndoKey' add:
	// {commandKeyCode: 'RedoKey', testForKey: function (event) { return false; } },
	// {commandKeyCode: 'UndoKey', testForKey: function (event) { return false; } },
	// to disable them.
	//
	keyMappings : [],
	toolbar: [
		['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'quote'],
		['bold', 'italics', 'underline', 'strikeThrough', 'ul', 'ol', 'redo', 'undo', 'clear'],
		['justifyLeft','justifyCenter','justifyRight','justifyFull','indent','outdent'],
		['html', 'insertImage', 'insertLink', 'insertVideo', 'wordcount', 'charcount']
	],
	classes: {
		focussed: "focussed",
		toolbar: "btn-toolbar",
		toolbarGroup: "btn-group",
		toolbarButton: "md-fab md-mini",
		toolbarButtonActive: "active",
		disabled: "disabled",
		textEditor: 'form-control',
		htmlEditor: 'form-control'
	},
	defaultTagAttributes : {
		a: {target:""}
	},
	setup: {
		// wysiwyg mode
		textEditorSetup: function($element){ /* Do some processing here */ },
		// raw html
		htmlEditorSetup: function($element){ /* Do some processing here */ }
	},
	defaultFileDropHandler:
		/* istanbul ignore next: untestable image processing */
		function(file, insertAction){
			var reader = new FileReader();
			if(file.type.substring(0, 5) === 'image'){
				reader.onload = function() {
					if(reader.result !== '') insertAction('insertImage', reader.result, true);
				};

				reader.readAsDataURL(file);
				// NOTE: For async procedures return a promise and resolve it when the editor should update the model.
				return true;
			}
			return false;
		}
})

// This is the element selector string that is used to catch click events within a taBind, prevents the default and $emits a 'ta-element-select' event
// these are individually used in an angular.element().find() call. What can go here depends on whether you have full jQuery loaded or just jQLite with angularjs.
// div is only used as div.ta-insert-video caught in filter.
.value('taSelectableElements', ['a','img'])

// This is an array of objects with the following options:
//				selector: <string> a jqLite or jQuery selector string
//				customAttribute: <string> an attribute to search for
//				renderLogic: <function(element)>
// Both or one of selector and customAttribute must be defined.
.value('taCustomRenderers', [
	{
		// Parse back out: '<div class="ta-insert-video" ta-insert-video src="' + urlLink + '" allowfullscreen="true" width="300" frameborder="0" height="250"></div>'
		// To correct video element. For now only support youtube
		selector: 'img',
		customAttribute: 'ta-insert-video',
		renderLogic: function(element){
			var iframe = angular.element('<iframe></iframe>');
			var attributes = element.prop("attributes");
			// loop through element attributes and apply them on iframe
			angular.forEach(attributes, function(attr) {
				iframe.attr(attr.name, attr.value);
			});
			iframe.attr('src', iframe.attr('ta-insert-video'));
			element.replaceWith(iframe);
		}
	}
])

.value('taTranslations', {
	// moved to sub-elements
	//toggleHTML: "Toggle HTML",
	//insertImage: "Please enter a image URL to insert",
	//insertLink: "Please enter a URL to insert",
	//insertVideo: "Please enter a youtube URL to embed",
	html: {
		tooltip: 'Toggle html / Rich Text'
	},
	// tooltip for heading - might be worth splitting
	heading: {
		tooltip: 'Heading '
	},
	p: {
		tooltip: 'Paragraph'
	},
	pre: {
		tooltip: 'Preformatted text'
	},
	ul: {
		tooltip: 'Unordered List'
	},
	ol: {
		tooltip: 'Ordered List'
	},
	quote: {
		tooltip: 'Quote/unquote selection or paragraph'
	},
	undo: {
		tooltip: 'Undo'
	},
	redo: {
		tooltip: 'Redo'
	},
	bold: {
		tooltip: 'Bold'
	},
	italic: {
		tooltip: 'Italic'
	},
	underline: {
		tooltip: 'Underline'
	},
	strikeThrough:{
		tooltip: 'Strikethrough'
	},
	justifyLeft: {
		tooltip: 'Align text left'
	},
	justifyRight: {
		tooltip: 'Align text right'
	},
	justifyFull: {
		tooltip: 'Justify text'
	},
	justifyCenter: {
		tooltip: 'Center'
	},
	indent: {
		tooltip: 'Increase indent'
	},
	outdent: {
		tooltip: 'Decrease indent'
	},
	clear: {
		tooltip: 'Clear formatting'
	},
	insertImage: {
		dialogPrompt: 'Please enter an image URL to insert',
		tooltip: 'Insert image',
		hotkey: 'the - possibly language dependent hotkey ... for some future implementation'
	},
	insertVideo: {
		tooltip: 'Insert video',
		dialogPrompt: 'Please enter a youtube URL to embed'
	},
	insertLink: {
		tooltip: 'Insert / edit link',
		dialogPrompt: "Please enter a URL to insert"
	},
	editLink: {
		reLinkButton: {
			tooltip: "Relink"
		},
		unLinkButton: {
			tooltip: "Unlink"
		},
		targetToggle: {
			buttontext: "Open in New Window"
		}
	},
	wordcount: {
		tooltip: 'Display words Count'
	},
		charcount: {
		tooltip: 'Display characters Count'
	}
})
.factory('taToolFunctions', ['$window','taTranslations', function($window, taTranslations) {
	return {
		imgOnSelectAction: function(event, $element, editorScope){
			// setup the editor toolbar
			// Credit to the work at http://hackerwins.github.io/summernote/ for this editbar logic/display
			var finishEdit = function(){
				editorScope.updateTaBindtaTextElement();
				editorScope.hidePopover();
			};
			event.preventDefault();
			editorScope.displayElements.popover.css('width', '375px');
			var container = editorScope.displayElements.popoverContainer;
			container.empty();
			var buttonGroup = angular.element('<div class="btn-group" style="padding-right: 6px;">');
			var fullButton = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1">100% </button>');
			fullButton.on('click', function(event){
				event.preventDefault();
				$element.css({
					'width': '100%',
					'height': ''
				});
				finishEdit();
			});
			var halfButton = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1">50% </button>');
			halfButton.on('click', function(event){
				event.preventDefault();
				$element.css({
					'width': '50%',
					'height': ''
				});
				finishEdit();
			});
			var quartButton = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1">25% </button>');
			quartButton.on('click', function(event){
				event.preventDefault();
				$element.css({
					'width': '25%',
					'height': ''
				});
				finishEdit();
			});
			var resetButton = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1">Reset</button>');
			resetButton.on('click', function(event){
				event.preventDefault();
				$element.css({
					width: '',
					height: ''
				});
				finishEdit();
			});
			buttonGroup.append(fullButton);
			buttonGroup.append(halfButton);
			buttonGroup.append(quartButton);
			buttonGroup.append(resetButton);
			container.append(buttonGroup);

			buttonGroup = angular.element('<div class="btn-group" style="padding-right: 6px;">');
			var floatLeft = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1"><i class="fa fa-align-left"></i></button>');
			floatLeft.on('click', function(event){
				event.preventDefault();
				// webkit
				$element.css('float', 'left');
				// firefox
				$element.css('cssFloat', 'left');
				// IE < 8
				$element.css('styleFloat', 'left');
				finishEdit();
			});
			var floatRight = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1"><i class="fa fa-align-right"></i></button>');
			floatRight.on('click', function(event){
				event.preventDefault();
				// webkit
				$element.css('float', 'right');
				// firefox
				$element.css('cssFloat', 'right');
				// IE < 8
				$element.css('styleFloat', 'right');
				finishEdit();
			});
			var floatNone = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1"><i class="fa fa-align-justify"></i></button>');
			floatNone.on('click', function(event){
				event.preventDefault();
				// webkit
				$element.css('float', '');
				// firefox
				$element.css('cssFloat', '');
				// IE < 8
				$element.css('styleFloat', '');
				finishEdit();
			});
			buttonGroup.append(floatLeft);
			buttonGroup.append(floatNone);
			buttonGroup.append(floatRight);
			container.append(buttonGroup);

			buttonGroup = angular.element('<div class="btn-group">');
			var remove = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" unselectable="on" tabindex="-1"><i class="fa fa-trash-o"></i></button>');
			remove.on('click', function(event){
				event.preventDefault();
				$element.remove();
				finishEdit();
			});
			buttonGroup.append(remove);
			container.append(buttonGroup);

			editorScope.showPopover($element);
			editorScope.showResizeOverlay($element);
		},
		aOnSelectAction: function(event, $element, editorScope){
			// setup the editor toolbar
			// Credit to the work at http://hackerwins.github.io/summernote/ for this editbar logic
			event.preventDefault();
			editorScope.displayElements.popover.css('width', '436px');
			var container = editorScope.displayElements.popoverContainer;
			container.empty();
			container.css('line-height', '28px');
			var link = angular.element('<a href="' + $element.attr('href') + '" target="_blank">' + $element.attr('href') + '</a>');
			link.css({
				'display': 'inline-block',
				'max-width': '200px',
				'overflow': 'hidden',
				'text-overflow': 'ellipsis',
				'white-space': 'nowrap',
				'vertical-align': 'middle'
			});
			container.append(link);
			var buttonGroup = angular.element('<div class="btn-group pull-right">');
			var reLinkButton = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" tabindex="-1" unselectable="on" title="' + taTranslations.editLink.reLinkButton.tooltip + '"><i class="fa fa-edit icon-edit"></i></button>');
			reLinkButton.on('click', function(event){
				event.preventDefault();
				var urlLink = $window.prompt(taTranslations.insertLink.dialogPrompt, $element.attr('href'));
				if(urlLink && urlLink !== '' && urlLink !== 'http://'){
					$element.attr('href', urlLink);
					editorScope.updateTaBindtaTextElement();
				}
				editorScope.hidePopover();
			});
			buttonGroup.append(reLinkButton);
			var unLinkButton = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" tabindex="-1" unselectable="on" title="' + taTranslations.editLink.unLinkButton.tooltip + '"><i class="fa fa-unlink icon-unlink"></i></button>');
			// directly before this click event is fired a digest is fired off whereby the reference to $element is orphaned off
			unLinkButton.on('click', function(event){
				event.preventDefault();
				$element.replaceWith($element.contents());
				editorScope.updateTaBindtaTextElement();
				editorScope.hidePopover();
			});
			buttonGroup.append(unLinkButton);
			var targetToggle = angular.element('<button type="button" class="btn btn-default btn-sm btn-small" tabindex="-1" unselectable="on">' + taTranslations.editLink.targetToggle.buttontext + '</button>');
			if($element.attr('target') === '_blank'){
				targetToggle.addClass('active');
			}
			targetToggle.on('click', function(event){
				event.preventDefault();
				$element.attr('target', ($element.attr('target') === '_blank') ? '' : '_blank');
				targetToggle.toggleClass('active');
				editorScope.updateTaBindtaTextElement();
			});
			buttonGroup.append(targetToggle);
			container.append(buttonGroup);
			editorScope.showPopover($element);
		},
		extractYoutubeVideoId: function(url) {
			var re = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
			var match = url.match(re);
			return (match && match[1]) || null;
		}
	};
}])
.run(['taRegisterTool', '$window', 'taTranslations', 'taSelection', 'taToolFunctions', '$sanitize', 'taOptions', function(taRegisterTool, $window, taTranslations, taSelection, taToolFunctions, $sanitize, taOptions){
	// test for the version of $sanitize that is in use
	// You can disable this check by setting taOptions.textAngularSanitize == false
	var gv = {}; $sanitize('', gv);
	/* istanbul ignore next, throws error */
	if ((taOptions.forceTextAngularSanitize===true) && (gv.version !== 'taSanitize')) {
		throw angular.$$minErr('textAngular')("textAngularSetup", "The textAngular-sanitize provider has been replaced by another -- have you included angular-sanitize by mistake?");
	}
	taRegisterTool("html", {
		iconclass: 'fa fa-code',
		tooltiptext: taTranslations.html.tooltip,
		action: function(){
			this.$editor().switchView();
		},
		activeState: function(){
			return this.$editor().showHtml;
		}
	});
	// add the Header tools
	// convenience functions so that the loop works correctly
	var _retActiveStateFunction = function(q){
		return function(){ return this.$editor().queryFormatBlockState(q); };
	};
	var headerAction = function(){
		return this.$editor().wrapSelection("formatBlock", "<" + this.name.toUpperCase() +">");
	};
	angular.forEach(['h1','h2','h3','h4','h5','h6'], function(h){
		taRegisterTool(h.toLowerCase(), {
			buttontext: h.toUpperCase(),
			tooltiptext: taTranslations.heading.tooltip + h.charAt(1),
			action: headerAction,
			activeState: _retActiveStateFunction(h.toLowerCase())
		});
	});
	taRegisterTool('p', {
		buttontext: 'P',
		tooltiptext: taTranslations.p.tooltip,
		action: function(){
			return this.$editor().wrapSelection("formatBlock", "<P>");
		},
		activeState: function(){ return this.$editor().queryFormatBlockState('p'); }
	});
	// key: pre -> taTranslations[key].tooltip, taTranslations[key].buttontext
	taRegisterTool('pre', {
		buttontext: 'pre',
		tooltiptext: taTranslations.pre.tooltip,
		action: function(){
			return this.$editor().wrapSelection("formatBlock", "<PRE>");
		},
		activeState: function(){ return this.$editor().queryFormatBlockState('pre'); }
	});
	taRegisterTool('ul', {
		iconclass: 'fa fa-list-ul',
		tooltiptext: taTranslations.ul.tooltip,
		action: function(){
			return this.$editor().wrapSelection("insertUnorderedList", null);
		},
		activeState: function(){ return this.$editor().queryCommandState('insertUnorderedList'); }
	});
	taRegisterTool('ol', {
		iconclass: 'fa fa-list-ol',
		tooltiptext: taTranslations.ol.tooltip,
		action: function(){
			return this.$editor().wrapSelection("insertOrderedList", null);
		},
		activeState: function(){ return this.$editor().queryCommandState('insertOrderedList'); }
	});
	taRegisterTool('quote', {
		iconclass: 'fa fa-quote-right',
		tooltiptext: taTranslations.quote.tooltip,
		action: function(){
			return this.$editor().wrapSelection("formatBlock", "<BLOCKQUOTE>");
		},
		activeState: function(){ return this.$editor().queryFormatBlockState('blockquote'); }
	});
	taRegisterTool('undo', {
		iconclass: 'fa fa-undo',
		tooltiptext: taTranslations.undo.tooltip,
		action: function(){
			return this.$editor().wrapSelection("undo", null);
		}
	});
	taRegisterTool('redo', {
		iconclass: 'fa fa-repeat',
		tooltiptext: taTranslations.redo.tooltip,
		action: function(){
			return this.$editor().wrapSelection("redo", null);
		}
	});
	taRegisterTool('bold', {
		iconclass: 'fa fa-bold',
		tooltiptext: taTranslations.bold.tooltip,
		action: function(){
			return this.$editor().wrapSelection("bold", null);
		},
		activeState: function(){
			return this.$editor().queryCommandState('bold');
		},
		commandKeyCode: 98
	});
	taRegisterTool('justifyLeft', {
		iconclass: 'fa fa-align-left',
		tooltiptext: taTranslations.justifyLeft.tooltip,
		action: function(){
			return this.$editor().wrapSelection("justifyLeft", null);
		},
		activeState: function(commonElement){
			/* istanbul ignore next: */
			if (commonElement && commonElement.nodeName === '#document') return false;
			var result = false;
			if (commonElement)
				result =
					commonElement.css('text-align') === 'left' ||
					commonElement.attr('align') === 'left' ||
					(
						commonElement.css('text-align') !== 'right' &&
						commonElement.css('text-align') !== 'center' &&
						commonElement.css('text-align') !== 'justify' && !this.$editor().queryCommandState('justifyRight') && !this.$editor().queryCommandState('justifyCenter')
					) && !this.$editor().queryCommandState('justifyFull');
			result = result || this.$editor().queryCommandState('justifyLeft');
			return result;
		}
	});
	taRegisterTool('justifyRight', {
		iconclass: 'fa fa-align-right',
		tooltiptext: taTranslations.justifyRight.tooltip,
		action: function(){
			return this.$editor().wrapSelection("justifyRight", null);
		},
		activeState: function(commonElement){
			/* istanbul ignore next: */
			if (commonElement && commonElement.nodeName === '#document') return false;
			var result = false;
			if(commonElement) result = commonElement.css('text-align') === 'right';
			result = result || this.$editor().queryCommandState('justifyRight');
			return result;
		}
	});
	taRegisterTool('justifyFull', {
		iconclass: 'fa fa-align-justify',
		tooltiptext: taTranslations.justifyFull.tooltip,
		action: function(){
			return this.$editor().wrapSelection("justifyFull", null);
		},
		activeState: function(commonElement){
			var result = false;
			if(commonElement) result = commonElement.css('text-align') === 'justify';
			result = result || this.$editor().queryCommandState('justifyFull');
			return result;
		}
	});
	taRegisterTool('justifyCenter', {
		iconclass: 'fa fa-align-center',
		tooltiptext: taTranslations.justifyCenter.tooltip,
		action: function(){
			return this.$editor().wrapSelection("justifyCenter", null);
		},
		activeState: function(commonElement){
			/* istanbul ignore next: */
			if (commonElement && commonElement.nodeName === '#document') return false;
			var result = false;
			if(commonElement) result = commonElement.css('text-align') === 'center';
			result = result || this.$editor().queryCommandState('justifyCenter');
			return result;
		}
	});
	taRegisterTool('indent', {
		iconclass: 'fa fa-indent',
		tooltiptext: taTranslations.indent.tooltip,
		action: function(){
			return this.$editor().wrapSelection("indent", null);
		},
		activeState: function(){
			return this.$editor().queryFormatBlockState('blockquote');
		},
		commandKeyCode: 'TabKey'
	});
	taRegisterTool('outdent', {
		iconclass: 'fa fa-outdent',
		tooltiptext: taTranslations.outdent.tooltip,
		action: function(){
			return this.$editor().wrapSelection("outdent", null);
		},
		activeState: function(){
			return false;
		},
		commandKeyCode: 'ShiftTabKey'
	});
	taRegisterTool('italics', {
		iconclass: 'fa fa-italic',
		tooltiptext: taTranslations.italic.tooltip,
		action: function(){
			return this.$editor().wrapSelection("italic", null);
		},
		activeState: function(){
			return this.$editor().queryCommandState('italic');
		},
		commandKeyCode: 105
	});
	taRegisterTool('underline', {
		iconclass: 'fa fa-underline',
		tooltiptext: taTranslations.underline.tooltip,
		action: function(){
			return this.$editor().wrapSelection("underline", null);
		},
		activeState: function(){
			return this.$editor().queryCommandState('underline');
		},
		commandKeyCode: 117
	});
	taRegisterTool('strikeThrough', {
		iconclass: 'fa fa-strikethrough',
		tooltiptext: taTranslations.strikeThrough.tooltip,
		action: function(){
			return this.$editor().wrapSelection("strikeThrough", null);
		},
		activeState: function(){
			return document.queryCommandState('strikeThrough');
		}
	});
	taRegisterTool('clear', {
		iconclass: 'fa fa-ban',
		tooltiptext: taTranslations.clear.tooltip,
		action: function(deferred, restoreSelection){
			var i;
			this.$editor().wrapSelection("removeFormat", null);
			var possibleNodes = angular.element(taSelection.getSelectionElement());
			// remove lists
			var removeListElements = function(list){
				list = angular.element(list);
				var prevElement = list;
				angular.forEach(list.children(), function(liElem){
					var newElem = angular.element('<p></p>');
					newElem.html(angular.element(liElem).html());
					prevElement.after(newElem);
					prevElement = newElem;
				});
				list.remove();
			};
			angular.forEach(possibleNodes.find("ul"), removeListElements);
			angular.forEach(possibleNodes.find("ol"), removeListElements);
			if(possibleNodes[0].tagName.toLowerCase() === 'li'){
				var _list = possibleNodes[0].parentNode.childNodes;
				var _preLis = [], _postLis = [], _found = false;
				for(i = 0; i < _list.length; i++){
					if(_list[i] === possibleNodes[0]){
						_found = true;
					}else if(!_found) _preLis.push(_list[i]);
					else _postLis.push(_list[i]);
				}
				var _parent = angular.element(possibleNodes[0].parentNode);
				var newElem = angular.element('<p></p>');
				newElem.html(angular.element(possibleNodes[0]).html());
				if(_preLis.length === 0 || _postLis.length === 0){
					if(_postLis.length === 0) _parent.after(newElem);
					else _parent[0].parentNode.insertBefore(newElem[0], _parent[0]);

					if(_preLis.length === 0 && _postLis.length === 0) _parent.remove();
					else angular.element(possibleNodes[0]).remove();
				}else{
					var _firstList = angular.element('<'+_parent[0].tagName+'></'+_parent[0].tagName+'>');
					var _secondList = angular.element('<'+_parent[0].tagName+'></'+_parent[0].tagName+'>');
					for(i = 0; i < _preLis.length; i++) _firstList.append(angular.element(_preLis[i]));
					for(i = 0; i < _postLis.length; i++) _secondList.append(angular.element(_postLis[i]));
					_parent.after(_secondList);
					_parent.after(newElem);
					_parent.after(_firstList);
					_parent.remove();
				}
				taSelection.setSelectionToElementEnd(newElem[0]);
			}
			// clear out all class attributes. These do not seem to be cleared via removeFormat
			var $editor = this.$editor();
			var recursiveRemoveClass = function(node){
				node = angular.element(node);
				if(node[0] !== $editor.displayElements.text[0]) node.removeAttr('class');
				angular.forEach(node.children(), recursiveRemoveClass);
			};
			angular.forEach(possibleNodes, recursiveRemoveClass);
			// check if in list. If not in list then use formatBlock option
			if(possibleNodes[0].tagName.toLowerCase() !== 'li' &&
				possibleNodes[0].tagName.toLowerCase() !== 'ol' &&
				possibleNodes[0].tagName.toLowerCase() !== 'ul') this.$editor().wrapSelection("formatBlock", "default");
			restoreSelection();
		}
	});


	taRegisterTool('insertImage', {
		iconclass: 'fa fa-picture-o',
		tooltiptext: taTranslations.insertImage.tooltip,
		action: function(){
			var imageLink;
			imageLink = $window.prompt(taTranslations.insertImage.dialogPrompt, 'http://');
			if(imageLink && imageLink !== '' && imageLink !== 'http://'){
				return this.$editor().wrapSelection('insertImage', imageLink, true);
			}
		},
		onElementSelect: {
			element: 'img',
			action: taToolFunctions.imgOnSelectAction
		}
	});
	taRegisterTool('insertVideo', {
		iconclass: 'fa fa-youtube-play',
		tooltiptext: taTranslations.insertVideo.tooltip,
		action: function(){
			var urlPrompt;
			urlPrompt = $window.prompt(taTranslations.insertVideo.dialogPrompt, 'https://');
			if (urlPrompt && urlPrompt !== '' && urlPrompt !== 'https://') {

				videoId = taToolFunctions.extractYoutubeVideoId(urlPrompt);

				/* istanbul ignore else: if it's invalid don't worry - though probably should show some kind of error message */
				if(videoId){
					// create the embed link
					var urlLink = "https://www.youtube.com/embed/" + videoId;
					// create the HTML
					// for all options see: http://stackoverflow.com/questions/2068344/how-do-i-get-a-youtube-video-thumbnail-from-the-youtube-api
					// maxresdefault.jpg seems to be undefined on some.
					var embed = '<img class="ta-insert-video" src="https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg" ta-insert-video="' + urlLink + '" contenteditable="false" allowfullscreen="true" frameborder="0" />';
					// insert
					return this.$editor().wrapSelection('insertHTML', embed, true);
				}
			}
		},
		onElementSelect: {
			element: 'img',
			onlyWithAttrs: ['ta-insert-video'],
			action: taToolFunctions.imgOnSelectAction
		}
	});
	taRegisterTool('insertLink', {
		tooltiptext: taTranslations.insertLink.tooltip,
		iconclass: 'fa fa-link',
		action: function(){
			var urlLink;
			urlLink = $window.prompt(taTranslations.insertLink.dialogPrompt, 'http://');
			if(urlLink && urlLink !== '' && urlLink !== 'http://'){
				return this.$editor().wrapSelection('createLink', urlLink, true);
			}
		},
		activeState: function(commonElement){
			if(commonElement) return commonElement[0].tagName === 'A';
			return false;
		},
		onElementSelect: {
			element: 'a',
			action: taToolFunctions.aOnSelectAction
		}
	});
	taRegisterTool('wordcount', {
		display: '<div id="toolbarWC" style="display:block; min-width:100px;">Words: <span ng-bind="wordcount"></span></div>',
		disabled: true,
		wordcount: 0,
		activeState: function(){ // this fires on keyup
			var textElement = this.$editor().displayElements.text;
			/* istanbul ignore next: will default to '' when undefined */
			var workingHTML = textElement[0].innerHTML || '';
			var noOfWords = 0;

			/* istanbul ignore if: will default to '' when undefined */
			if (workingHTML.replace(/\s*<[^>]*?>\s*/g, '') !== '') {
				noOfWords = workingHTML.replace(/<\/?(b|i|em|strong|span|u|strikethrough|a|img|small|sub|sup|label)( [^>*?])?>/gi, '') // remove inline tags without adding spaces
										.replace(/(<[^>]*?>\s*<[^>]*?>)/ig, ' ') // replace adjacent tags with possible space between with a space
										.replace(/(<[^>]*?>)/ig, '') // remove any singular tags
										.replace(/\s+/ig, ' ') // condense spacing
										.match(/\S+/g).length; // count remaining non-space strings
			}

			//Set current scope
			this.wordcount = noOfWords;
			//Set editor scope
			this.$editor().wordcount = noOfWords;

			return false;
		}
	});
	taRegisterTool('charcount', {
		display: '<div id="toolbarCC" style="display:block; min-width:120px;">Characters: <span ng-bind="charcount"></span></div>',
		disabled: true,
		charcount: 0,
		activeState: function(){ // this fires on keyup
			var textElement = this.$editor().displayElements.text;
			var sourceText = textElement[0].innerText || textElement[0].textContent; // to cover the non-jquery use case.

			// Caculate number of chars
			var noOfChars = sourceText.replace(/(\r\n|\n|\r)/gm,"").replace(/^\s+/g,' ').replace(/\s+$/g, ' ').length;
			//Set current scope
			this.charcount = noOfChars;
			//Set editor scope
			this.$editor().charcount = noOfChars;
			return false;
		}
	});
}]);

// this global var is used to prevent multiple fires of the drop event. Needs to be global to the textAngular file.
var dropFired = false;
var textAngular = angular.module("textAngular", ['ngSanitize', 'textAngularSetup', 'textAngular.factories', 'textAngular.DOM', 'textAngular.validators', 'textAngular.taBind']); //This makes ngSanitize required

textAngular.config([function(){
	// clear taTools variable. Just catches testing and any other time that this config may run multiple times...
	angular.forEach(taTools, function(value, key){ delete taTools[key];	});
}]);

textAngular.directive("textAngular", [
	'$compile', '$timeout', 'taOptions', 'taSelection', 'taExecCommand',
	'textAngularManager', '$document', '$animate', '$log', '$q', '$parse',
	function($compile, $timeout, taOptions, taSelection, taExecCommand,
		textAngularManager, $document, $animate, $log, $q, $parse){
		return {
			require: '?ngModel',
			scope: {},
			restrict: "EA",
			priority: 2, // So we override validators correctly
			link: function(scope, element, attrs, ngModel){
				// all these vars should not be accessable outside this directive
				var _keydown, _keyup, _keypress, _mouseup, _focusin, _focusout,
					_originalContents, _toolbars,
					_serial = (attrs.serial) ? attrs.serial : Math.floor(Math.random() * 10000000000000000),
					_taExecCommand, _resizeMouseDown, _updateSelectedStylesTimeout;

				scope._name = (attrs.name) ? attrs.name : 'textAngularEditor' + _serial;

                angular.element(element).addClass("md-whiteframe-3dp");

				var oneEvent = function(_element, event, action){
					$timeout(function(){
						// shim the .one till fixed
						var _func = function(){
							_element.off(event, _func);
							action.apply(this, arguments);
						};
						_element.on(event, _func);
					}, 100);
				};
				_taExecCommand = taExecCommand(attrs.taDefaultWrap);
				// get the settings from the defaults and add our specific functions that need to be on the scope
				angular.extend(scope, angular.copy(taOptions), {
					// wraps the selection in the provided tag / execCommand function. Should only be called in WYSIWYG mode.
					wrapSelection: function(command, opt, isSelectableElementTool){
						if(command.toLowerCase() === "undo"){
							scope['$undoTaBindtaTextElement' + _serial]();
						}else if(command.toLowerCase() === "redo"){
							scope['$redoTaBindtaTextElement' + _serial]();
						}else{
							// catch errors like FF erroring when you try to force an undo with nothing done
							_taExecCommand(command, false, opt, scope.defaultTagAttributes);
							if(isSelectableElementTool){
								// re-apply the selectable tool events
								scope['reApplyOnSelectorHandlerstaTextElement' + _serial]();
							}
							// refocus on the shown display element, this fixes a display bug when using :focus styles to outline the box.
							// You still have focus on the text/html input it just doesn't show up
							scope.displayElements.text[0].focus();
						}
					},
					showHtml: scope.$eval(attrs.taShowHtml) || false
				});
				// setup the options from the optional attributes
				if(attrs.taFocussedClass)			scope.classes.focussed = attrs.taFocussedClass;
				if(attrs.taTextEditorClass)			scope.classes.textEditor = attrs.taTextEditorClass;
				if(attrs.taHtmlEditorClass)			scope.classes.htmlEditor = attrs.taHtmlEditorClass;
				if(attrs.taDefaultTagAttributes){
					try	{
						//	TODO: This should use angular.merge to enhance functionality once angular 1.4 is required
						angular.extend(scope.defaultTagAttributes, angular.fromJson(attrs.taDefaultTagAttributes));
					} catch (error) {
						$log.error(error);
					}
				}
				// optional setup functions
				if(attrs.taTextEditorSetup)			scope.setup.textEditorSetup = scope.$parent.$eval(attrs.taTextEditorSetup);
				if(attrs.taHtmlEditorSetup)			scope.setup.htmlEditorSetup = scope.$parent.$eval(attrs.taHtmlEditorSetup);
				// optional fileDropHandler function
				if(attrs.taFileDrop)				scope.fileDropHandler = scope.$parent.$eval(attrs.taFileDrop);
				else								scope.fileDropHandler = scope.defaultFileDropHandler;

				_originalContents = element[0].innerHTML;
				// clear the original content
				element[0].innerHTML = '';

				// Setup the HTML elements as variable references for use later
				scope.displayElements = {
					// we still need the hidden input even with a textarea as the textarea may have invalid/old input in it,
					// wheras the input will ALLWAYS have the correct value.
					forminput: angular.element("<input type='hidden' tabindex='-1' style='display: none;'>"),
					html: angular.element("<textarea></textarea>"),
					text: angular.element("<div></div>"),
					// other toolbased elements
					scrollWindow: angular.element("<div class='ta-scroll-window'></div>"),
					popover: angular.element('<div class="popover fade bottom" style="max-width: none; width: 305px;"></div>'),
					popoverArrow: angular.element('<div class="arrow"></div>'),
					popoverContainer: angular.element('<div class="popover-content"></div>'),
					resize: {
						overlay: angular.element('<div class="ta-resizer-handle-overlay"></div>'),
						background: angular.element('<div class="ta-resizer-handle-background"></div>'),
						anchors: [
							angular.element('<div class="ta-resizer-handle-corner ta-resizer-handle-corner-tl"></div>'),
							angular.element('<div class="ta-resizer-handle-corner ta-resizer-handle-corner-tr"></div>'),
							angular.element('<div class="ta-resizer-handle-corner ta-resizer-handle-corner-bl"></div>'),
							angular.element('<div class="ta-resizer-handle-corner ta-resizer-handle-corner-br"></div>')
						],
						info: angular.element('<div class="ta-resizer-handle-info"></div>')
					}
				};

				// Setup the popover
				scope.displayElements.popover.append(scope.displayElements.popoverArrow);
				scope.displayElements.popover.append(scope.displayElements.popoverContainer);
				scope.displayElements.scrollWindow.append(scope.displayElements.popover);

				scope.displayElements.popover.on('mousedown', function(e, eventData){
					/* istanbul ignore else: this is for catching the jqLite testing*/
					if(eventData) angular.extend(e, eventData);
					// this prevents focusout from firing on the editor when clicking anything in the popover
					e.preventDefault();
					return false;
				});

				// define the popover show and hide functions
				scope.showPopover = function(_el){
					scope.displayElements.popover.css('display', 'block');
					scope.reflowPopover(_el);
					$animate.addClass(scope.displayElements.popover, 'in');
					oneEvent($document.find('body'), 'click keyup', function(){scope.hidePopover();});
				};
				scope.reflowPopover = function(_el){
					/* istanbul ignore if: catches only if near bottom of editor */
					if(scope.displayElements.text[0].offsetHeight - 51 > _el[0].offsetTop){
						scope.displayElements.popover.css('top', _el[0].offsetTop + _el[0].offsetHeight + scope.displayElements.scrollWindow[0].scrollTop + 'px');
						scope.displayElements.popover.removeClass('top').addClass('bottom');
					}else{
						scope.displayElements.popover.css('top', _el[0].offsetTop - 54 + scope.displayElements.scrollWindow[0].scrollTop + 'px');
						scope.displayElements.popover.removeClass('bottom').addClass('top');
					}
					var _maxLeft = scope.displayElements.text[0].offsetWidth - scope.displayElements.popover[0].offsetWidth;
					var _targetLeft = _el[0].offsetLeft + (_el[0].offsetWidth / 2.0) - (scope.displayElements.popover[0].offsetWidth / 2.0);
					scope.displayElements.popover.css('left', Math.max(0, Math.min(_maxLeft, _targetLeft)) + 'px');
					scope.displayElements.popoverArrow.css('margin-left', (Math.min(_targetLeft, (Math.max(0, _targetLeft - _maxLeft))) - 11) + 'px');
				};
				scope.hidePopover = function(){
					scope.displayElements.popover.css('display', '');
					scope.displayElements.popoverContainer.attr('style', '');
					scope.displayElements.popoverContainer.attr('class', 'popover-content');
					scope.displayElements.popover.removeClass('in');
				};

				// setup the resize overlay
				scope.displayElements.resize.overlay.append(scope.displayElements.resize.background);
				angular.forEach(scope.displayElements.resize.anchors, function(anchor){ scope.displayElements.resize.overlay.append(anchor);});
				scope.displayElements.resize.overlay.append(scope.displayElements.resize.info);
				scope.displayElements.scrollWindow.append(scope.displayElements.resize.overlay);

				// define the show and hide events
				scope.reflowResizeOverlay = function(_el){
					_el = angular.element(_el)[0];
					scope.displayElements.resize.overlay.css({
						'display': 'block',
						'left': _el.offsetLeft - 5 + 'px',
						'top': _el.offsetTop - 5 + 'px',
						'width': _el.offsetWidth + 10 + 'px',
						'height': _el.offsetHeight + 10 + 'px'
					});
					scope.displayElements.resize.info.text(_el.offsetWidth + ' x ' + _el.offsetHeight);
				};
				/* istanbul ignore next: pretty sure phantomjs won't test this */
				scope.showResizeOverlay = function(_el){
					var _body = $document.find('body');
					_resizeMouseDown = function(event){
						var startPosition = {
							width: parseInt(_el.attr('width')),
							height: parseInt(_el.attr('height')),
							x: event.clientX,
							y: event.clientY
						};
						if(startPosition.width === undefined || isNaN(startPosition.width)) startPosition.width = _el[0].offsetWidth;
						if(startPosition.height === undefined || isNaN(startPosition.height)) startPosition.height = _el[0].offsetHeight;
						scope.hidePopover();
						var ratio = startPosition.height / startPosition.width;
						var mousemove = function(event){
							// calculate new size
							var pos = {
								x: Math.max(0, startPosition.width + (event.clientX - startPosition.x)),
								y: Math.max(0, startPosition.height + (event.clientY - startPosition.y))
							};

							// DEFAULT: the aspect ratio is not locked unless the Shift key is pressed.
							//
							// attribute: ta-resize-force-aspect-ratio -- locks resize into maintaing the aspect ratio
							var bForceAspectRatio = (attrs.taResizeForceAspectRatio !== undefined);
							// attribute: ta-resize-maintain-aspect-ratio=true causes the space ratio to remain locked
							// unless the Shift key is pressed
							var bFlipKeyBinding = attrs.taResizeMaintainAspectRatio;
							var bKeepRatio =  bForceAspectRatio || (bFlipKeyBinding && !event.shiftKey);
							if(bKeepRatio) {
								var newRatio = pos.y / pos.x;
								pos.x = ratio > newRatio ? pos.x : pos.y / ratio;
								pos.y = ratio > newRatio ? pos.x * ratio : pos.y;
							}
							var el = angular.element(_el);
							function roundedMaxVal(val) {
								return Math.round(Math.max(0, val));
							}
							el.css('height', roundedMaxVal(pos.y) + 'px');
							el.css('width', roundedMaxVal(pos.x) + 'px');

							// reflow the popover tooltip
							scope.reflowResizeOverlay(_el);
						};
						_body.on('mousemove', mousemove);
						oneEvent(_body, 'mouseup', function(event){
							event.preventDefault();
							event.stopPropagation();
							_body.off('mousemove', mousemove);
							// at this point, we need to force the model to update! since the css has changed!
							// this fixes bug: #862 - we now hide the popover -- as this seems more consitent.
							// there are still issues under firefox, the window does not repaint. -- not sure
							// how best to resolve this, but clicking anywhere works.
							scope.$apply(function (){
								scope.hidePopover();
								scope.updateTaBindtaTextElement();
							}, 100);
						});
						event.stopPropagation();
						event.preventDefault();
					};

					scope.displayElements.resize.anchors[3].off('mousedown');
					scope.displayElements.resize.anchors[3].on('mousedown', _resizeMouseDown);

					scope.reflowResizeOverlay(_el);
					oneEvent(_body, 'click', function(){scope.hideResizeOverlay();});
				};
				/* istanbul ignore next: pretty sure phantomjs won't test this */
				scope.hideResizeOverlay = function(){
					scope.displayElements.resize.anchors[3].off('mousedown', _resizeMouseDown);
					scope.displayElements.resize.overlay.css('display', '');
				};

				// allow for insertion of custom directives on the textarea and div
				scope.setup.htmlEditorSetup(scope.displayElements.html);
				scope.setup.textEditorSetup(scope.displayElements.text);
				scope.displayElements.html.attr({
					'id': 'taHtmlElement' + _serial,
					'ng-show': 'showHtml',
					'ta-bind': 'ta-bind',
					'ng-model': 'html',
					'ng-model-options': element.attr('ng-model-options')
				});
				scope.displayElements.text.attr({
					'id': 'taTextElement' + _serial,
					'contentEditable': 'true',
					'ta-bind': 'ta-bind',
					'ng-model': 'html',
					'ng-model-options': element.attr('ng-model-options')
				});
             
                
				scope.displayElements.scrollWindow.attr({'ng-hide': 'showHtml'});
				if(attrs.taDefaultWrap) scope.displayElements.text.attr('ta-default-wrap', attrs.taDefaultWrap);

				if(attrs.taUnsafeSanitizer){
					scope.displayElements.text.attr('ta-unsafe-sanitizer', attrs.taUnsafeSanitizer);
					scope.displayElements.html.attr('ta-unsafe-sanitizer', attrs.taUnsafeSanitizer);
				}

				// add the main elements to the origional element
				scope.displayElements.scrollWindow.append(scope.displayElements.text);
				element.append(scope.displayElements.scrollWindow);
				element.append(scope.displayElements.html);

				scope.displayElements.forminput.attr('name', scope._name);
				element.append(scope.displayElements.forminput);

				if(attrs.tabindex){
					element.removeAttr('tabindex');
					scope.displayElements.text.attr('tabindex', attrs.tabindex);
					scope.displayElements.html.attr('tabindex', attrs.tabindex);
				}

				if (attrs.placeholder) {
					scope.displayElements.text.attr('placeholder', attrs.placeholder);
					scope.displayElements.html.attr('placeholder', attrs.placeholder);
				}

				if(attrs.taDisabled){
					scope.displayElements.text.attr('ta-readonly', 'disabled');
					scope.displayElements.html.attr('ta-readonly', 'disabled');
					scope.disabled = scope.$parent.$eval(attrs.taDisabled);
					scope.$parent.$watch(attrs.taDisabled, function(newVal){
						scope.disabled = newVal;
						if(scope.disabled){
							element.addClass(scope.classes.disabled);
						}else{
							element.removeClass(scope.classes.disabled);
						}
					});
				}

				if(attrs.taPaste){
					scope._pasteHandler = function(_html){
						return $parse(attrs.taPaste)(scope.$parent, {$html: _html});
					};
					scope.displayElements.text.attr('ta-paste', '_pasteHandler($html)');
				}

				// compile the scope with the text and html elements only - if we do this with the main element it causes a compile loop
				$compile(scope.displayElements.scrollWindow)(scope);
				$compile(scope.displayElements.html)(scope);

				scope.updateTaBindtaTextElement = scope['updateTaBindtaTextElement' + _serial];
				scope.updateTaBindtaHtmlElement = scope['updateTaBindtaHtmlElement' + _serial];

				// add the classes manually last
				element.addClass("ta-root");
				scope.displayElements.scrollWindow.addClass("ta-text ta-editor " + scope.classes.textEditor);
				scope.displayElements.html.addClass("ta-html ta-editor " + scope.classes.htmlEditor);

				// used in the toolbar actions
				scope._actionRunning = false;
				var _savedSelection = false;
				scope.startAction = function(){
					scope._actionRunning = true;
					// if rangy library is loaded return a function to reload the current selection
					_savedSelection = rangy.saveSelection();
					return function(){
						if(_savedSelection) rangy.restoreSelection(_savedSelection);
					};
				};
				scope.endAction = function(){
					scope._actionRunning = false;
					if(_savedSelection){
						if(scope.showHtml){
							scope.displayElements.html[0].focus();
						}else{
							scope.displayElements.text[0].focus();
						}
						// rangy.restoreSelection(_savedSelection);
						rangy.removeMarkers(_savedSelection);
					}
					_savedSelection = false;
					scope.updateSelectedStyles();
					// only update if in text or WYSIWYG mode
					if(!scope.showHtml) scope['updateTaBindtaTextElement' + _serial]();
				};

				// note that focusout > focusin is called everytime we click a button - except bad support: http://www.quirksmode.org/dom/events/blurfocus.html
				// cascades to displayElements.text and displayElements.html automatically.
				_focusin = function(){
					scope.focussed = true;
					element.addClass(scope.classes.focussed);
					_toolbars.focus();
					element.triggerHandler('focus');
				};
				scope.displayElements.html.on('focus', _focusin);
				scope.displayElements.text.on('focus', _focusin);
				_focusout = function(e){
					// if we are NOT runnig an action and have NOT focussed again on the text etc then fire the blur events
					if(!scope._actionRunning && $document[0].activeElement !== scope.displayElements.html[0] && $document[0].activeElement !== scope.displayElements.text[0]){
						element.removeClass(scope.classes.focussed);
						_toolbars.unfocus();
						// to prevent multiple apply error defer to next seems to work.
						$timeout(function(){
							scope._bUpdateSelectedStyles = false;
							element.triggerHandler('blur');
							scope.focussed = false;
						}, 0);
					}
					e.preventDefault();
					return false;
				};
				scope.displayElements.html.on('blur', _focusout);
				scope.displayElements.text.on('blur', _focusout);

				scope.displayElements.text.on('paste', function(event){
					element.triggerHandler('paste', event);
				});

				// Setup the default toolbar tools, this way allows the user to add new tools like plugins.
				// This is on the editor for future proofing if we find a better way to do this.
				scope.queryFormatBlockState = function(command){
					// $document[0].queryCommandValue('formatBlock') errors in Firefox if we call this when focussed on the textarea
					return !scope.showHtml && command.toLowerCase() === $document[0].queryCommandValue('formatBlock').toLowerCase();
				};
				scope.queryCommandState = function(command){
					// $document[0].queryCommandValue('formatBlock') errors in Firefox if we call this when focussed on the textarea
					return (!scope.showHtml) ? $document[0].queryCommandState(command) : '';
				};
				scope.switchView = function(){
					scope.showHtml = !scope.showHtml;
					$animate.enabled(false, scope.displayElements.html);
					$animate.enabled(false, scope.displayElements.text);
					//Show the HTML view
					if(scope.showHtml){
						//defer until the element is visible
						$timeout(function(){
							$animate.enabled(true, scope.displayElements.html);
							$animate.enabled(true, scope.displayElements.text);
							// [0] dereferences the DOM object from the angular.element
							return scope.displayElements.html[0].focus();
						}, 100);
					}else{
						//Show the WYSIWYG view
						//defer until the element is visible
						$timeout(function(){
							$animate.enabled(true, scope.displayElements.html);
							$animate.enabled(true, scope.displayElements.text);
							// [0] dereferences the DOM object from the angular.element
							return scope.displayElements.text[0].focus();
						}, 100);
					}
				};

				// changes to the model variable from outside the html/text inputs
				// if no ngModel, then the only input is from inside text-angular
				if(attrs.ngModel){
					var _firstRun = true;
					ngModel.$render = function(){
						if(_firstRun){
							// we need this firstRun to set the originalContents otherwise it gets overrided by the setting of ngModel to undefined from NaN
							_firstRun = false;
							// if view value is null or undefined initially and there was original content, set to the original content
							var _initialValue = scope.$parent.$eval(attrs.ngModel);
							if((_initialValue === undefined || _initialValue === null) && (_originalContents && _originalContents !== '')){
								// on passing through to taBind it will be sanitised
								ngModel.$setViewValue(_originalContents);
							}
						}
						scope.displayElements.forminput.val(ngModel.$viewValue);
						// if the editors aren't focused they need to be updated, otherwise they are doing the updating
						scope.html = ngModel.$viewValue || '';
					};
					// trigger the validation calls
					if(element.attr('required')) ngModel.$validators.required = function(modelValue, viewValue) {
						var value = modelValue || viewValue;
						return !(!value || value.trim() === '');
					};
				}else{
					// if no ngModel then update from the contents of the origional html.
					scope.displayElements.forminput.val(_originalContents);
					scope.html = _originalContents;
				}

				// changes from taBind back up to here
				scope.$watch('html', function(newValue, oldValue){
					if(newValue !== oldValue){
						if(attrs.ngModel && ngModel.$viewValue !== newValue) ngModel.$setViewValue(newValue);
						scope.displayElements.forminput.val(newValue);
					}
				});

				if(attrs.taTargetToolbars) _toolbars = textAngularManager.registerEditor(scope._name, scope, attrs.taTargetToolbars.split(','));
				else{
					var _toolbar = angular.element('<md-toolbar layout="layout-wrap" text-angular-toolbar name="textAngularToolbar' + _serial + '">');
					// passthrough init of toolbar options
					if(attrs.taToolbar)						_toolbar.attr('ta-toolbar', attrs.taToolbar);
					if(attrs.taToolbarClass)				_toolbar.attr('ta-toolbar-class', attrs.taToolbarClass);
					if(attrs.taToolbarGroupClass)			_toolbar.attr('ta-toolbar-group-class', attrs.taToolbarGroupClass);
					if(attrs.taToolbarButtonClass)			_toolbar.attr('ta-toolbar-button-class', attrs.taToolbarButtonClass);
					if(attrs.taToolbarActiveButtonClass)	_toolbar.attr('ta-toolbar-active-button-class', attrs.taToolbarActiveButtonClass);
					if(attrs.taFocussedClass)				_toolbar.attr('ta-focussed-class', attrs.taFocussedClass);

                    if(!_toolbar.hasClass("layout-wrap")) _toolbar.addClass("layout-wrap");

					element.prepend(_toolbar);
					$compile(_toolbar)(scope.$parent);
					_toolbars = textAngularManager.registerEditor(scope._name, scope, ['textAngularToolbar' + _serial]);
				}

				scope.$on('$destroy', function(){
					textAngularManager.unregisterEditor(scope._name);
					angular.element(window).off('blur');
				});

				// catch element select event and pass to toolbar tools
				scope.$on('ta-element-select', function(event, element){
					if(_toolbars.triggerElementSelect(event, element)){
						scope['reApplyOnSelectorHandlerstaTextElement' + _serial]();
					}
				});

				scope.$on('ta-drop-event', function(event, element, dropEvent, dataTransfer){
					scope.displayElements.text[0].focus();
					if(dataTransfer && dataTransfer.files && dataTransfer.files.length > 0){
						angular.forEach(dataTransfer.files, function(file){
							// taking advantage of boolean execution, if the fileDropHandler returns true, nothing else after it is executed
							// If it is false then execute the defaultFileDropHandler if the fileDropHandler is NOT the default one
							// Once one of these has been executed wrap the result as a promise, if undefined or variable update the taBind, else we should wait for the promise
							try{
								$q.when(scope.fileDropHandler(file, scope.wrapSelection) ||
									(scope.fileDropHandler !== scope.defaultFileDropHandler &&
									$q.when(scope.defaultFileDropHandler(file, scope.wrapSelection)))).then(function(){
										scope['updateTaBindtaTextElement' + _serial]();
									});
							}catch(error){
								$log.error(error);
							}
						});
						dropEvent.preventDefault();
						dropEvent.stopPropagation();
					/* istanbul ignore else, the updates if moved text */
					}else{
						$timeout(function(){
							scope['updateTaBindtaTextElement' + _serial]();
						}, 0);
					}
				});

				// the following is for applying the active states to the tools that support it
				scope._bUpdateSelectedStyles = false;
				/* istanbul ignore next: browser window/tab leave check */
				angular.element(window).on('blur', function(){
					scope._bUpdateSelectedStyles = false;
					scope.focussed = false;
				});
				// loop through all the tools polling their activeState function if it exists
				scope.updateSelectedStyles = function(){
					var _selection;
					/* istanbul ignore next: This check is to ensure multiple timeouts don't exist */
					if(_updateSelectedStylesTimeout) $timeout.cancel(_updateSelectedStylesTimeout);
					// test if the common element ISN'T the root ta-text node
					if((_selection = taSelection.getSelectionElement()) !== undefined && _selection.parentNode !== scope.displayElements.text[0]){
						_toolbars.updateSelectedStyles(angular.element(_selection));
					}else _toolbars.updateSelectedStyles();
					// used to update the active state when a key is held down, ie the left arrow
					/* istanbul ignore else: browser only check */
					if(scope._bUpdateSelectedStyles) _updateSelectedStylesTimeout = $timeout(scope.updateSelectedStyles, 200);
				};
				// start updating on keydown
				_keydown = function(){
					/* istanbul ignore next: ie catch */
					if(!scope.focussed){
						scope._bUpdateSelectedStyles = false;
						return;
					}
					/* istanbul ignore else: don't run if already running */
					if(!scope._bUpdateSelectedStyles){
						scope._bUpdateSelectedStyles = true;
						scope.$apply(function(){
							scope.updateSelectedStyles();
						});
					}
				};
				scope.displayElements.html.on('keydown', _keydown);
				scope.displayElements.text.on('keydown', _keydown);
				// stop updating on key up and update the display/model
				_keyup = function(){
					scope._bUpdateSelectedStyles = false;
				};
				scope.displayElements.html.on('keyup', _keyup);
				scope.displayElements.text.on('keyup', _keyup);
				// stop updating on key up and update the display/model
				_keypress = function(event, eventData){
					/* istanbul ignore else: this is for catching the jqLite testing*/
					if(eventData) angular.extend(event, eventData);
					scope.$apply(function(){
						if(_toolbars.sendKeyCommand(event)){
							/* istanbul ignore else: don't run if already running */
							if(!scope._bUpdateSelectedStyles){
								scope.updateSelectedStyles();
							}
							event.preventDefault();
							return false;
						}
					});
				};
				scope.displayElements.html.on('keypress', _keypress);
				scope.displayElements.text.on('keypress', _keypress);
				// update the toolbar active states when we click somewhere in the text/html boxed
				_mouseup = function(){
					// ensure only one execution of updateSelectedStyles()
					scope._bUpdateSelectedStyles = false;
					scope.$apply(function(){
						scope.updateSelectedStyles();
					});
				};
				scope.displayElements.html.on('mouseup', _mouseup);
				scope.displayElements.text.on('mouseup', _mouseup);
			}
		};
	}
]);
textAngular.service('textAngularManager', ['taToolExecuteAction', 'taTools', 'taRegisterTool', function(taToolExecuteAction, taTools, taRegisterTool){
	// this service is used to manage all textAngular editors and toolbars.
	// All publicly published functions that modify/need to access the toolbar or editor scopes should be in here
	// these contain references to all the editors and toolbars that have been initialised in this app
	var toolbars = {}, editors = {};
	// when we focus into a toolbar, we need to set the TOOLBAR's $parent to be the toolbars it's linked to.
	// We also need to set the tools to be updated to be the toolbars...
	return {
		// register an editor and the toolbars that it is affected by
		registerEditor: function(name, scope, targetToolbars){
			// targetToolbars are optional, we don't require a toolbar to function
			if(!name || name === '') throw('textAngular Error: An editor requires a name');
			if(!scope) throw('textAngular Error: An editor requires a scope');
			if(editors[name]) throw('textAngular Error: An Editor with name "' + name + '" already exists');
			// _toolbars is an ARRAY of toolbar scopes
			var _toolbars = [];
			angular.forEach(targetToolbars, function(_name){
				if(toolbars[_name]) _toolbars.push(toolbars[_name]);
				// if it doesn't exist it may not have been compiled yet and it will be added later
			});
			editors[name] = {
				scope: scope,
				toolbars: targetToolbars,
				_registerToolbar: function(toolbarScope){
					// add to the list late
					if(this.toolbars.indexOf(toolbarScope.name) >= 0) _toolbars.push(toolbarScope);
				},
				// this is a suite of functions the editor should use to update all it's linked toolbars
				editorFunctions: {
					disable: function(){
						// disable all linked toolbars
						angular.forEach(_toolbars, function(toolbarScope){ toolbarScope.disabled = true; });
					},
					enable: function(){
						// enable all linked toolbars
						angular.forEach(_toolbars, function(toolbarScope){ toolbarScope.disabled = false; });
					},
					focus: function(){
						// this should be called when the editor is focussed
						angular.forEach(_toolbars, function(toolbarScope){
							toolbarScope._parent = scope;
							toolbarScope.disabled = false;
							toolbarScope.focussed = true;
							scope.focussed = true;
						});
					},
					unfocus: function(){
						// this should be called when the editor becomes unfocussed
						angular.forEach(_toolbars, function(toolbarScope){
							toolbarScope.disabled = true;
							toolbarScope.focussed = false;
						});
						scope.focussed = false;
					},
					updateSelectedStyles: function(selectedElement){
						// update the active state of all buttons on liked toolbars
						angular.forEach(_toolbars, function(toolbarScope){
							angular.forEach(toolbarScope.tools, function(toolScope){
								if(toolScope.activeState){
									toolbarScope._parent = scope;
									toolScope.active = toolScope.activeState(selectedElement);
								}
							});
						});
					},
					sendKeyCommand: function(event){
						// we return true if we applied an action, false otherwise
						var result = false;
						if(event.ctrlKey || event.metaKey || event.specialKey) angular.forEach(taTools, function(tool, name){
							if(tool.commandKeyCode && (tool.commandKeyCode === event.which || tool.commandKeyCode === event.specialKey)){
								for(var _t = 0; _t < _toolbars.length; _t++){
									if(_toolbars[_t].tools[name] !== undefined){
										taToolExecuteAction.call(_toolbars[_t].tools[name], scope);
										result = true;
										break;
									}
								}
							}
						});
						return result;
					},
					triggerElementSelect: function(event, element){
						// search through the taTools to see if a match for the tag is made.
						// if there is, see if the tool is on a registered toolbar and not disabled.
						// NOTE: This can trigger on MULTIPLE tools simultaneously.
						var elementHasAttrs = function(_element, attrs){
							var result = true;
							for(var i = 0; i < attrs.length; i++) result = result && _element.attr(attrs[i]);
							return result;
						};
						var workerTools = [];
						var unfilteredTools = {};
						var result = false;
						element = angular.element(element);
						// get all valid tools by element name, keep track if one matches the
						var onlyWithAttrsFilter = false;
						angular.forEach(taTools, function(tool, name){
							if(
								tool.onElementSelect &&
								tool.onElementSelect.element &&
								tool.onElementSelect.element.toLowerCase() === element[0].tagName.toLowerCase() &&
								(!tool.onElementSelect.filter || tool.onElementSelect.filter(element))
							){
								// this should only end up true if the element matches the only attributes
								onlyWithAttrsFilter = onlyWithAttrsFilter ||
									(angular.isArray(tool.onElementSelect.onlyWithAttrs) && elementHasAttrs(element, tool.onElementSelect.onlyWithAttrs));
								if(!tool.onElementSelect.onlyWithAttrs || elementHasAttrs(element, tool.onElementSelect.onlyWithAttrs)) unfilteredTools[name] = tool;
							}
						});
						// if we matched attributes to filter on, then filter, else continue
						if(onlyWithAttrsFilter){
							angular.forEach(unfilteredTools, function(tool, name){
								if(tool.onElementSelect.onlyWithAttrs && elementHasAttrs(element, tool.onElementSelect.onlyWithAttrs)) workerTools.push({'name': name, 'tool': tool});
							});
							// sort most specific (most attrs to find) first
							workerTools.sort(function(a,b){
								return b.tool.onElementSelect.onlyWithAttrs.length - a.tool.onElementSelect.onlyWithAttrs.length;
							});
						}else{
							angular.forEach(unfilteredTools, function(tool, name){
								workerTools.push({'name': name, 'tool': tool});
							});
						}
						// Run the actions on the first visible filtered tool only
						if(workerTools.length > 0){
							for(var _i = 0; _i < workerTools.length; _i++){
								var tool = workerTools[_i].tool;
								var name = workerTools[_i].name;
								for(var _t = 0; _t < _toolbars.length; _t++){
									if(_toolbars[_t].tools[name] !== undefined){
										tool.onElementSelect.action.call(_toolbars[_t].tools[name], event, element, scope);
										result = true;
										break;
									}
								}
								if(result) break;
							}
						}
						return result;
					}
				}
			};
			return editors[name].editorFunctions;
		},
		// retrieve editor by name, largely used by testing suites only
		retrieveEditor: function(name){
			return editors[name];
		},
		unregisterEditor: function(name){
			delete editors[name];
		},
		// registers a toolbar such that it can be linked to editors
		registerToolbar: function(scope){
			if(!scope) throw('textAngular Error: A toolbar requires a scope');
			if(!scope.name || scope.name === '') throw('textAngular Error: A toolbar requires a name');
			if(toolbars[scope.name]) throw('textAngular Error: A toolbar with name "' + scope.name + '" already exists');
			toolbars[scope.name] = scope;
			angular.forEach(editors, function(_editor){
				_editor._registerToolbar(scope);
			});
		},
		// retrieve toolbar by name, largely used by testing suites only
		retrieveToolbar: function(name){
			return toolbars[name];
		},
		// retrieve toolbars by editor name, largely used by testing suites only
		retrieveToolbarsViaEditor: function(name){
			var result = [], _this = this;
			angular.forEach(this.retrieveEditor(name).toolbars, function(name){
				result.push(_this.retrieveToolbar(name));
			});
			return result;
		},
		unregisterToolbar: function(name){
			delete toolbars[name];
		},
		// functions for updating the toolbar buttons display
		updateToolsDisplay: function(newTaTools){
			// pass a partial struct of the taTools, this allows us to update the tools on the fly, will not change the defaults.
			var _this = this;
			angular.forEach(newTaTools, function(_newTool, key){
				_this.updateToolDisplay(key, _newTool);
			});
		},
		// this function resets all toolbars to their default tool definitions
		resetToolsDisplay: function(){
			var _this = this;
			angular.forEach(taTools, function(_newTool, key){
				_this.resetToolDisplay(key);
			});
		},
		// update a tool on all toolbars
		updateToolDisplay: function(toolKey, _newTool){
			var _this = this;
			angular.forEach(toolbars, function(toolbarScope, toolbarKey){
				_this.updateToolbarToolDisplay(toolbarKey, toolKey, _newTool);
			});
		},
		// resets a tool to the default/starting state on all toolbars
		resetToolDisplay: function(toolKey){
			var _this = this;
			angular.forEach(toolbars, function(toolbarScope, toolbarKey){
				_this.resetToolbarToolDisplay(toolbarKey, toolKey);
			});
		},
		// update a tool on a specific toolbar
		updateToolbarToolDisplay: function(toolbarKey, toolKey, _newTool){
			if(toolbars[toolbarKey]) toolbars[toolbarKey].updateToolDisplay(toolKey, _newTool);
			else throw('textAngular Error: No Toolbar with name "' + toolbarKey + '" exists');
		},
		// reset a tool on a specific toolbar to it's default starting value
		resetToolbarToolDisplay: function(toolbarKey, toolKey){
			if(toolbars[toolbarKey]) toolbars[toolbarKey].updateToolDisplay(toolKey, taTools[toolKey], true);
			else throw('textAngular Error: No Toolbar with name "' + toolbarKey + '" exists');
		},
		// removes a tool from all toolbars and it's definition
		removeTool: function(toolKey){
			delete taTools[toolKey];
			angular.forEach(toolbars, function(toolbarScope){
				delete toolbarScope.tools[toolKey];
				for(var i = 0; i < toolbarScope.toolbar.length; i++){
					var toolbarIndex;
					for(var j = 0; j < toolbarScope.toolbar[i].length; j++){
						if(toolbarScope.toolbar[i][j] === toolKey){
							toolbarIndex = {
								group: i,
								index: j
							};
							break;
						}
						if(toolbarIndex !== undefined) break;
					}
					if(toolbarIndex !== undefined){
						toolbarScope.toolbar[toolbarIndex.group].slice(toolbarIndex.index, 1);
						toolbarScope._$element.children().eq(toolbarIndex.group).children().eq(toolbarIndex.index).remove();
					}
				}
			});
		},
		// toolkey, toolDefinition are required. If group is not specified will pick the last group, if index isnt defined will append to group
		addTool: function(toolKey, toolDefinition, group, index){
			taRegisterTool(toolKey, toolDefinition);
			angular.forEach(toolbars, function(toolbarScope){
				toolbarScope.addTool(toolKey, toolDefinition, group, index);
			});
		},
		// adds a Tool but only to one toolbar not all
		addToolToToolbar: function(toolKey, toolDefinition, toolbarKey, group, index){
			taRegisterTool(toolKey, toolDefinition);
			toolbars[toolbarKey].addTool(toolKey, toolDefinition, group, index);
		},
		// this is used when externally the html of an editor has been changed and textAngular needs to be notified to update the model.
		// this will call a $digest if not already happening
		refreshEditor: function(name){
			if(editors[name]){
				editors[name].scope.updateTaBindtaTextElement();
				/* istanbul ignore else: phase catch */
				if(!editors[name].scope.$$phase) editors[name].scope.$digest();
			}else throw('textAngular Error: No Editor with name "' + name + '" exists');
		},
		// this is used by taBind to send a key command in response to a special key event
		sendKeyCommand: function(scope, event){
			var _editor = editors[scope._name];
			/* istanbul ignore else: if nothing to do, do nothing */
			if (_editor && _editor.editorFunctions.sendKeyCommand(event)) {
				/* istanbul ignore else: don't run if already running */
				if(!scope._bUpdateSelectedStyles){
					scope.updateSelectedStyles();
				}
				event.preventDefault();
				return false;
			}
		}
	};
}]);
textAngular.directive('textAngularToolbar', [
	'$compile', 'textAngularManager', 'taOptions', 'taTools', 'taToolExecuteAction', '$window',
	function($compile, textAngularManager, taOptions, taTools, taToolExecuteAction, $window){
		return {
			scope: {
				name: '@' // a name IS required
			},
			restrict: "EA",
			link: function(scope, element, attrs){
				if(!scope.name || scope.name === '') throw('textAngular Error: A toolbar requires a name');
				angular.extend(scope, angular.copy(taOptions));
				if(attrs.taToolbar)						scope.toolbar = scope.$parent.$eval(attrs.taToolbar);
				if(attrs.taToolbarClass)				scope.classes.toolbar = attrs.taToolbarClass;
				if(attrs.taToolbarGroupClass)			scope.classes.toolbarGroup = attrs.taToolbarGroupClass;
				if(attrs.taToolbarButtonClass)			scope.classes.toolbarButton = attrs.taToolbarButtonClass;
				if(attrs.taToolbarActiveButtonClass)	scope.classes.toolbarButtonActive = attrs.taToolbarActiveButtonClass;
				if(attrs.taFocussedClass)				scope.classes.focussed = attrs.taFocussedClass;

				scope.disabled = true;
				scope.focussed = false;
				scope._$element = element;
				element[0].innerHTML = '';
				element.addClass("ta-toolbar " + scope.classes.toolbar);

				scope.$watch('focussed', function(){
					if(scope.focussed) element.addClass(scope.classes.focussed);
					else element.removeClass(scope.classes.focussed);
				});

				var setupToolElement = function(toolDefinition, toolScope, group){
					var toolElement;
					if(toolDefinition && toolDefinition.display){
						toolElement = angular.element(toolDefinition.display);
					}
					else toolElement = angular.element("<md-button>");

                    var mdClass = scope.classes.toolbarButton;
                    
                    if(group == "html") { 
                        mdClass += " md-primary md-hue-2";
                    } else if(group == "bold") {
                        mdClass += " md-primary md-hue-3";
                    } else if(group == "justifyLeft") {
                        mdClass += " md-primary md-hue-1";
                    }
                    
                    

					if(toolDefinition && toolDefinition["class"]) toolElement.addClass(toolDefinition["class"]);
					else toolElement.addClass( mdClass );

					toolElement.attr('name', toolScope.name);
					// important to not take focus from the main text/html entry
					toolElement.attr('ta-button', 'ta-button');
					toolElement.attr('ng-disabled', 'isDisabled()');
					toolElement.attr('tabindex', '-1');
					toolElement.attr('ng-click', 'executeAction()');
					toolElement.attr('ng-class', 'displayActiveToolClass(active)');

					if (toolDefinition && toolDefinition.tooltiptext) {
						toolElement.attr('title', toolDefinition.tooltiptext);
					}
					if(toolDefinition && !toolDefinition.display && !toolScope._display){
						// first clear out the current contents if any
						toolElement[0].innerHTML = '';
						// add the buttonText
						if(toolDefinition.buttontext) toolElement[0].innerHTML = toolDefinition.buttontext;
						// add the icon to the front of the button if there is content
						if(toolDefinition.iconclass){
							var icon = angular.element('<i>'), content = toolElement[0].innerHTML;
							icon.addClass(toolDefinition.iconclass);
							toolElement[0].innerHTML = '';
							toolElement.append(icon);
							if(content && content !== '') toolElement.append('&nbsp;' + content);
						}
					}

					toolScope._lastToolDefinition = angular.copy(toolDefinition);

					return $compile(toolElement)(toolScope);
				};

				// Keep a reference for updating the active states later
				scope.tools = {};
				// create the tools in the toolbar
				// default functions and values to prevent errors in testing and on init
				scope._parent = {
					disabled: true,
					showHtml: false,
					queryFormatBlockState: function(){ return false; },
					queryCommandState: function(){ return false; }
				};
				var defaultChildScope = {
					$window: $window,
					$editor: function(){
						// dynamically gets the editor as it is set
						return scope._parent;
					},
					isDisabled: function(){
						// to set your own disabled logic set a function or boolean on the tool called 'disabled'
						return ( // this bracket is important as without it it just returns the first bracket and ignores the rest
							// when the button's disabled function/value evaluates to true
							(typeof this.$eval('disabled') !== 'function' && this.$eval('disabled')) || this.$eval('disabled()') ||
							// all buttons except the HTML Switch button should be disabled in the showHtml (RAW html) mode
							(this.name !== 'html' && this.$editor().showHtml) ||
							// if the toolbar is disabled
							this.$parent.disabled ||
							// if the current editor is disabled
							this.$editor().disabled
						);
					},
					displayActiveToolClass: function(active){
						return (active)? scope.classes.toolbarButtonActive : '';
					},
					executeAction: taToolExecuteAction
				};

				angular.forEach(scope.toolbar, function(group){
					// setup the toolbar group
					var groupElement = angular.element('<div layout="row" flex="50">');
					groupElement.addClass(scope.classes.toolbarGroup);
					angular.forEach(group, function(tool){
						// init and add the tools to the group
						// a tool name (key name from taTools struct)
						//creates a child scope of the main angularText scope and then extends the childScope with the functions of this particular tool
						// reference to the scope and element kept
						scope.tools[tool] = angular.extend(scope.$new(true), taTools[tool], defaultChildScope, {name: tool});
						scope.tools[tool].$element = setupToolElement(taTools[tool], scope.tools[tool], group[0]);
						// append the tool compiled with the childScope to the group element
						groupElement.append(scope.tools[tool].$element);
					});
					// append the group to the toolbar
					element.append(groupElement);
				});

				// update a tool
				// if a value is set to null, remove from the display
				// when forceNew is set to true it will ignore all previous settings, used to reset to taTools definition
				// to reset to defaults pass in taTools[key] as _newTool and forceNew as true, ie `updateToolDisplay(key, taTools[key], true);`
				scope.updateToolDisplay = function(key, _newTool, forceNew){
					var toolInstance = scope.tools[key];
					if(toolInstance){
						// get the last toolDefinition, then override with the new definition
						if(toolInstance._lastToolDefinition && !forceNew) _newTool = angular.extend({}, toolInstance._lastToolDefinition, _newTool);
						if(_newTool.buttontext === null && _newTool.iconclass === null && _newTool.display === null)
							throw('textAngular Error: Tool Definition for updating "' + key + '" does not have a valid display/iconclass/buttontext value');

						// if tool is defined on this toolbar, update/redo the tool
						if(_newTool.buttontext === null){
							delete _newTool.buttontext;
						}
						if(_newTool.iconclass === null){
							delete _newTool.iconclass;
						}
						if(_newTool.display === null){
							delete _newTool.display;
						}

						var toolElement = setupToolElement(_newTool, toolInstance);
						toolInstance.$element.replaceWith(toolElement);
						toolInstance.$element = toolElement;
					}
				};

				// we assume here that all values passed are valid and correct
				scope.addTool = function(key, _newTool, groupIndex, index){
					scope.tools[key] = angular.extend(scope.$new(true), taTools[key], defaultChildScope, {name: key});
					scope.tools[key].$element = setupToolElement(taTools[key], scope.tools[key]);
					var group;
					if(groupIndex === undefined) groupIndex = scope.toolbar.length - 1;
					group = angular.element(element.children()[groupIndex]);

					if(index === undefined){
						group.append(scope.tools[key].$element);
						scope.toolbar[groupIndex][scope.toolbar[groupIndex].length - 1] = key;
					}else{
						group.children().eq(index).after(scope.tools[key].$element);
						scope.toolbar[groupIndex][index] = key;
					}
				};

				textAngularManager.registerToolbar(scope);

				scope.$on('$destroy', function(){
					textAngularManager.unregisterToolbar(scope.name);
				});
			}
		};
	}
]);
