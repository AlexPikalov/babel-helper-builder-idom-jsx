"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (opts) {
    var visitor = {};

    visitor.JSXNamespacedName = function (path) {
        // TODO
    };

    visitor.JSXElement = {
        exit: function exit(path, file) {
            var els = isVoidElement(path) ? [buildElementVoid(path)] : buildElement(path);
            if (!t.isJSXElement(path.parentPath)) {
                path.replaceWith(createPatchFn(path, els));
            } else {
                path.replaceWithMultiple(els);
            }
        }
    };

    visitor.JSXText = {
        exit: function exit(path, file) {
            path.replaceWith(buildText(path.node));
        }
    };

    visitor.JSXExpressionContainer = {
        exit: function exit(path) {
            if (t.isJSXElement(path.parentPath)) {
                var content = !t.isStringLiteral(path.node.expression) && !t.isNumericLiteral(path.node.expression) ? path.node.expression : buildText(path.node.expression);
                path.replaceWith(content);
            }
        }
    };

    return visitor;

    function isVoidElement(path) {
        return path.node.openingElement.selfClosing;
    }

    function createPatchFn(path, children) {
        return t.functionExpression(t.identifier(''), [], t.blockStatement(children.map(function (ch) {
            return t.expressionStatement(ch);
        })));
    }

    function buildText(node) {
        return t.callExpression(t.identifier('text'), [t.stringLiteral(node.value.toString())]);
    }

    function buildElementVoid(path) {
        var attrs = convertAttributes(path);
        var openingElement = path.node.openingElement;

        return t.callExpression(t.identifier('elementVoid'), [t.stringLiteral(openingElement.name.name), t.stringLiteral(path.scope.generateUidIdentifier('voidEl').name), t.arrayExpression(attrs.staticAttrs)].concat(_toConsumableArray(attrs.dynamicAttrs)));
    }

    function buildElement(path) {
        var attrs = convertAttributes(path);
        var openingElement = path.node.openingElement;

        return [t.callExpression(t.identifier('elementOpen'), [t.stringLiteral(openingElement.name.name), t.stringLiteral(path.scope.generateUidIdentifier('el').name), t.arrayExpression(attrs.staticAttrs)].concat(_toConsumableArray(attrs.dynamicAttrs)))].concat(_toConsumableArray(flattenChildren(path.node.children)), [t.callExpression(t.identifier('elementClose'), [t.stringLiteral(openingElement.name.name)])]);
    }

    function flattenChildren(children) {
        return children.reduce(function (m, child) {
            if (child.type === 'SequenceExpression') {
                return m.concat(child.expressions);
            } else {
                m.push(child);
                return m;
            }
        }, []);
    }

    function convertAttributes(path) {
        var attrs = path.node.openingElement.attributes;
        var staticAttrs = attrs.filter(function (node) {
            return !t.isJSXExpressionContainer(node.value) && !t.isJSXSpreadAttribute(node);
        }).reduce(flattenAttrs, []);
        var dynamicAttrs = attrs.filter(function (node) {
            return t.isJSXExpressionContainer(node.value) && !t.isJSXSpreadAttribute(node);
        }).reduce(flattenAttrs, []);

        return { staticAttrs: staticAttrs, dynamicAttrs: dynamicAttrs };

        function flattenAttrs(memo, attr) {
            var name = t.stringLiteral(attr.name.name);
            var value = convertAttributeValue(attr.value);
            return memo.concat([name, value]);
        }
    }

    function convertAttributeValue(node) {
        if (t.isJSXExpressionContainer(node)) {
            return node.expression;
        } else {
            return node;
        }
    }
};

var _esutils = require("esutils");

var _esutils2 = _interopRequireDefault(_esutils);

var _babelTypes = require("babel-types");

var t = _interopRequireWildcard(_babelTypes);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// type ElementState = {
//   tagExpr: Object; // tag node
//   tagName: string; // raw string tag name
//   args: Array<Object>; // array of call arguments
//   call?: Object; // optional call property that can be set to override the call expression returned
//   pre?: Function; // function called with (state: ElementState) before building attribs
//   post?: Function; // function called with (state: ElementState) after building attribs
// };