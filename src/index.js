import esutils from "esutils";
import * as t from "babel-types";

// type ElementState = {
//   tagExpr: Object; // tag node
//   tagName: string; // raw string tag name
//   args: Array<Object>; // array of call arguments
//   call?: Object; // optional call property that can be set to override the call expression returned
//   pre?: Function; // function called with (state: ElementState) before building attribs
//   post?: Function; // function called with (state: ElementState) after building attribs
// };


export default function (opts) {
    let visitor = {};

    visitor.JSXNamespacedName = function (path) {
        // TODO
    };

    visitor.JSXElement = {
        exit(path, file) {
            let els = isVoidElement(path) ? [buildElementVoid(path)] : buildElement(path);
            if (!t.isJSXElement(path.parentPath)) {
                path.replaceWith(createPatchFn(path, els));
            } else {
                path.replaceWithMultiple(els);
            }
        }
    };

    visitor.JSXText = {
        exit(path, file) {
            path.replaceWith(buildText(path.node));
        }
    };

    visitor.JSXExpressionContainer = {
        exit(path) {
            if (t.isJSXElement(path.parentPath)) {
                let content = !t.isStringLiteral(path.node.expression) && !t.isNumericLiteral(path.node.expression)
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

    function createPatchFn(path, children) {
        return t.functionExpression(t.identifier(''), [], t.blockStatement(children.map(ch => t.expressionStatement(ch))));
    }

    function buildText(node) {
        return t.callExpression(t.identifier('text'), [t.stringLiteral(node.value.toString())]);
    }

    function buildElementVoid(path) {
        let attrs = convertAttributes(path);
        let openingElement = path.node.openingElement;

        return t.callExpression(t.identifier('elementVoid'), [t.stringLiteral(openingElement.name.name), t.stringLiteral(path.scope.generateUidIdentifier('voidEl').name), t.arrayExpression(attrs.staticAttrs), ...attrs.dynamicAttrs]);
    }

    function buildElement(path) {
        let attrs = convertAttributes(path);
        let openingElement = path.node.openingElement;

        return [
            t.callExpression(t.identifier('elementOpen'), [t.stringLiteral(openingElement.name.name), t.stringLiteral(path.scope.generateUidIdentifier('el').name), t.arrayExpression(attrs.staticAttrs), ...attrs.dynamicAttrs]),
            ...flattenChildren(path.node.children),
            t.callExpression(t.identifier('elementClose'), [t.stringLiteral(openingElement.name.name)])
        ]
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

        return {staticAttrs, dynamicAttrs};

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
