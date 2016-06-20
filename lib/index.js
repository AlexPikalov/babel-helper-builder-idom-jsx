'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ID_ATTR = undefined;

exports.default = function (opts) {
    var visitor = {};

    visitor.JSXNamespacedName = function (path) {
        // TODO
    };

    visitor.JSXElement = {
        exit: function exit(path, file) {
            var attrs = convertAttributes(path);
            var elName = path.node.openingElement.name.name;
            var el = isVoidElement(path) ? buildElementVoid(elName, attrs) : buildElement(elName, attrs, flattenChildren(path.node.children));
            path.replaceWith(el);
        }
    };

    visitor.JSXText = {
        exit: function exit(path, file) {
            path.replaceWith(buildText(path.node.value));
        }
    };

    visitor.JSXExpressionContainer = {
        exit: function exit(path) {
            if (t.isJSXElement(path.parentPath)) {
                var content = t.isCallExpression(path.node.expression) || t.isNewExpression(path.node.expression) ? path.node.expression : buildText(path.node.expression);
                path.replaceWith(content);
            }
        }
    };

    return visitor;

    function isVoidElement(path) {
        return path.node.openingElement.selfClosing;
    }

    function buildText(value) {
        return t.newExpression(t.identifier('Text'), [t.stringLiteral(value)]);
    }

    function buildElementVoid(el, attrs) {
        var _attrs = t.objectExpression([t.objectProperty(t.stringLiteral('staticAttrs'), t.arrayExpression(attrs.staticAttrs)), t.objectProperty(t.stringLiteral('dynamicAttrs'), t.arrayExpression(attrs.dynamicAttrs))]);
        var args = attrs.id ? [t.stringLiteral(el), _attrs, attrs.id] : [t.stringLiteral(el), _attrs];
        return t.newExpression(t.identifier('ElVoid'), args);
    }

    function buildElement(el, attrs, children) {
        var _attrs = t.objectExpression([t.objectProperty(t.stringLiteral('staticAttrs'), t.arrayExpression(attrs.staticAttrs)), t.objectProperty(t.stringLiteral('dynamicAttrs'), t.arrayExpression(attrs.dynamicAttrs))]);
        var args = attrs.id ? [t.stringLiteral(el), _attrs, t.arrayExpression(children), attrs.id] : [t.stringLiteral(el), _attrs, t.arrayExpression(children)];
        return t.newExpression(t.identifier('El'), args);
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
        var id = attrs.reduce(function (_id, node) {
            if (node.name.name === ID_ATTR) {
                return convertAttributeValue(node.value);
            }
            return _id;
        }, null);

        return id ? { staticAttrs: staticAttrs, dynamicAttrs: dynamicAttrs, id: id } : { staticAttrs: staticAttrs, dynamicAttrs: dynamicAttrs };

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

var _babelTypes = require('babel-types');

var t = _interopRequireWildcard(_babelTypes);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var ID_ATTR = exports.ID_ATTR = 'data-xid'; // import esutils from "esutils";