import * as t from "babel-types";

export const ID_ATTR = 'data-xid';

export default function (opts) {
    let visitor = {};

    visitor.JSXNamespacedName = function (path) {
        // TODO
    };

    visitor.JSXElement = {
        exit(path, file) {
            let attrs = convertAttributes(path);
            let elName = path.node.openingElement.name.name;
            let el = isVoidElement(path) ? buildElementVoid(elName, attrs) : buildElement(elName, attrs, flattenChildren(path.node.children));
            path.replaceWith(el);
        }
    };

    visitor.JSXText = {
        exit(path, file) {
            path.replaceWith(buildText(path.node.value));
        }
    };

    visitor.JSXExpressionContainer = {
        exit(path) {
            if (t.isJSXElement(path.parentPath)) {
                let content = t.isCallExpression(path.node.expression) || t.isNewExpression(path.node.expression)
                    ? path.node.expression
                    : buildText(path.node.expression);
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
        let _attrs = t.objectExpression([
            t.objectProperty(t.stringLiteral('staticAttrs'), t.arrayExpression(attrs.staticAttrs)),
            t.objectProperty(t.stringLiteral('dynamicAttrs'), t.arrayExpression(attrs.dynamicAttrs))
        ]);
        let args = attrs.id ? [t.stringLiteral(el), _attrs, attrs.id] : [t.stringLiteral(el), _attrs]
        return t.newExpression(t.identifier('ElVoid'), args);
    }

    function buildElement(el, attrs, children) {
        let _attrs = t.objectExpression([
            t.objectProperty(t.stringLiteral('staticAttrs'), t.arrayExpression(attrs.staticAttrs)),
            t.objectProperty(t.stringLiteral('dynamicAttrs'), t.arrayExpression(attrs.dynamicAttrs))
        ]);
        let args = attrs.id ? [t.stringLiteral(el), _attrs, t.arrayExpression(children), attrs.id] : [t.stringLiteral(el), _attrs, t.arrayExpression(children)]
        return t.newExpression(t.identifier('El'), args);
    }

    function flattenChildren(children) {
        return children.reduce((m, child) => {
            if (child.type === 'SequenceExpression') {
                return m.concat(child.expressions);
            } else {
                m.push(child);
                return m;
            }
        }, []);
    }

    function convertAttributes(path) {
        let attrs = path.node.openingElement.attributes;
        let staticAttrs = attrs
            .filter(node => !t.isJSXExpressionContainer(node.value) && !t.isJSXSpreadAttribute(node))
            .reduce(flattenAttrs, []);
        let dynamicAttrs = attrs
            .filter(node => t.isJSXExpressionContainer(node.value) && !t.isJSXSpreadAttribute(node))
            .reduce(flattenAttrs, []);
        let id = attrs.reduce((_id, node) => {
            if (node.name.name === ID_ATTR) {
                return convertAttributeValue(node.value);
            }
            return _id;
        }, null);

        return id ? {staticAttrs, dynamicAttrs, id} : {staticAttrs, dynamicAttrs};

        function flattenAttrs(memo, attr) {
            let name = t.stringLiteral(attr.name.name);
            let value = convertAttributeValue(attr.value);
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
}
