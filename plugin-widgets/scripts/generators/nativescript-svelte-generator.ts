#!/usr/bin/env node
/**
 * NativeScript Svelte Component Generator
 * Generates Svelte Native (Svelte 4) components from JSON widget layouts.
 *
 * - All static element properties (color, text, size...) are exported as Svelte `export let` props
 *   so consumers can override them.
 * - Dynamic bindings ({{...}} placeholders) are converted into Svelte expressions
 *   and reference `data` or `item` depending on context.
 * - For-each elements are rendered as a CollectionView + Template by default if they were defined
 *   using `forEach` in the layout; otherwise we fall back to `#each` in StackLayout.
 *
 * Output dir default: app/components/widgets/generated
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseLayoutElement, getSingleBinding, hasTemplateBinding, isExpression } from './shared-utils';
import { compilePropertyValue as compilePropValue } from './expression-compiler';

type AnyObj = Record<string, any>;

interface WidgetLayout {
    name: string;
    displayName?: string;
    description?: string;
    defaultPadding?: number;
    color?: Expression; // Top-level default color for all text elements
    background?: {
        type: string;
        color?: string;
    };
    variants?: {
        condition: string;
        layout: BaseLayoutElement;
    }[];
    layout: BaseLayoutElement;
}

/**
 * Convert a raw binding string with placeholders into a Svelte expression
 * - If the whole string is a single binding: return the inner expression (normalized)
 * - If mixed text + bindings: return a template literal expression
 */
function convertBindingToSvelteExpr(raw: string, defaultPrefix = 'data'): string {
    if (!raw || !hasTemplateBinding(raw)) {
        return JSON.stringify(raw ?? '');
    }

    // Single binding?
    const singleExpr = getSingleBinding(raw);
    if (singleExpr !== null) {
        return normalizeExpr(singleExpr, defaultPrefix);
    }

    // Mixed content -> build template literal
    const tpl = raw
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${')
        .replace(/\{\{([^}]+)\}\}/g, (_, expr) => '${' + normalizeExpr(expr.trim(), defaultPrefix) + '}');
    return '`' + tpl + '`';
}

/**
 * Normalize an expression so that simple identifiers map to data.* by default
 */
function normalizeExpr(expr: string, defaultPrefix = 'data'): string {
    // Do not prefix expressions that include function calls or dots already
    if (/[()]/.test(expr)) {
        // if expression contains dots but not item./data. - try to prefix simple paths in the expr
        return expr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (m) => {
            // skip booleans and numbers and well-known words
            if (['true', 'false', 'null', 'undefined'].includes(m)) return m;
            if (/^\d+$/.test(m)) return m;
            if (/^item$/.test(m) || /^data$/.test(m) || /^size$/.test(m)) return m;
            return `${defaultPrefix}.${m}`;
        });
    }

    // Single token without dots -> prefix
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
        if (/^(item|data|size)$/.test(expr)) return expr;
        return `${defaultPrefix}.${expr}`;
    }

    // Has dots already (item.prop or data.prop) -> keep as-is
    if (expr.includes('.')) return expr;

    return expr;
}

/**
 * Decide if value is a data path (for 'items' or similar)
 */
function isLikelyDataPath(val: any): boolean {
    if (!val || typeof val !== 'string') return false;
    // Only treat explicit data/item/size paths as data paths;
    // plain tokens like "center" or "onSurface" should NOT be treated as data by default.
    if (val.startsWith('data.') || val.startsWith('item.') || val.startsWith('size.')) return true;
    return false;
}

function isSimpleToken(val: any): boolean {
    return typeof val === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(val);
}

/**
 * Convert JS value to Svelte/TS default value literal
 */
function toLiteral(v: any): string {
    if (typeof v === 'string') return JSON.stringify(v);
    if (v === null) return 'null';
    return String(v);
}

/**
 * Build color token var name for a simple token like onSurface -> colorOnSurface
 */
function colorTokenToVar(token: string) {
    // Convert theme token to camelCase variable name with 'color' prefix
    const normalized = token.replace(/[^a-zA-Z0-9]/g, '');
    return `color${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

/**
 * Collect used color tokens in layout elements (non-hex, non-data path)
 */
function collectUsedColorsFromElement(element: BaseLayoutElement, usedColors: Set<string>) {
    const keys = ['color', 'backgroundColor'];
    for (const k of keys) {
        const v = (element as any)[k];
        if (!v || typeof v !== 'string') continue;
        if (hasTemplateBinding(v)) continue;
        if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(v)) continue;
        if (isLikelyDataPath(v)) continue;
        // token -> var name
        usedColors.add(colorTokenToVar(v));
    }

    const children = element.children ?? [];
    for (let i = 0; i < children.length; i++) {
        collectUsedColorsFromElement(children[i], usedColors);
    }

    if (element.type === 'forEach' && element.itemTemplate) {
        collectUsedColorsFromElement(element.itemTemplate, usedColors);
    }
    if (element.type === 'conditional') {
        if (element.then) collectUsedColorsFromElement(element.then, usedColors);
        if (element.else) collectUsedColorsFromElement(element.else, usedColors);
    }
}

// Collect color tokens used in the whole layout, including top-level layout background + variants
function collectUsedColorsFromLayout(layout: WidgetLayout, usedColors: Set<string>) {
    // top-level background
    const bg = layout.background?.color;
    if (typeof bg === 'string' && !hasTemplateBinding(bg) && !/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(bg) && !isLikelyDataPath(bg)) {
        usedColors.add(colorTokenToVar(bg));
    }

    // layout root element
    if (layout.layout) {
        collectUsedColorsFromElement(layout.layout, usedColors);
    }

    // variants
    if (layout.variants && Array.isArray(layout.variants)) {
        for (const v of layout.variants) {
            if (v?.layout) collectUsedColorsFromElement(v.layout, usedColors);
        }
    }
}

/**
 * Evaluate a Mapbox expression to TypeScript/Svelte expression
 */
function evaluateMapboxExpression(expr: any, context: string = 'data', usedColors?: Set<string>): string {
    if (!Array.isArray(expr)) {
        if (typeof expr === 'string') {
            if (expr === 'get') return expr;

            if (expr.startsWith('color.')) {
                const varName = colorTokenToVar(expr.slice(6));
                usedColors?.add(varName);
                return varName;
            }
            return JSON.stringify(expr);
        }
        return JSON.stringify(expr);
    }

    const [op, ...args] = expr;
    switch (op) {
        case 'get': {
            const path = args[0];
            if (typeof path === 'string') {
                // Handle paths like "size.height" or "data.temperature"
                if (path.startsWith('size.')) {
                    return path; // size.height, size.width
                }
                if (path.startsWith('data.')) {
                    return path;
                }
                if (path.startsWith('config.')) {
                    return path;
                }
                if (path.startsWith('color.')) {
                    const varName = colorTokenToVar(path.slice(6));
                    usedColors?.add(varName);
                    return varName;
                }
                if (path.startsWith('item.')) {
                    if (path === 'item.iconPath') {
                        return `\`\${iconSetFolderPath}/images/\${${path}}.png\``;
                    }
                    return path;
                }
                // Default context
                return `${context}.${path}`;
            }
            return JSON.stringify(path);
        }
        case 'has': {
            // Check if a property exists
            const path = args[0];
            if (typeof path === 'string') {
                if (path.startsWith('item.')) {
                    return `${path} != null`;
                }
                if (path.startsWith('data.')) {
                    return `${path} != null`;
                }
                if (path.startsWith('config.')) {
                    return `${path} != null`;
                }
                // Default context
                return `${context}.${path} != null`;
            }
            return `${evaluateMapboxExpression(path, context)} != null`;
        }
        case 'all': {
            // Logical AND - all conditions must be true
            if (args.length === 0) return 'true';
            if (args.length === 1) return evaluateMapboxExpression(args[0], context);

            const conditions = args.map((arg) => {
                const evaluated = evaluateMapboxExpression(arg, context, usedColors);
                // Wrap complex expressions in parentheses
                if (evaluated.includes('?') || evaluated.includes('||') || evaluated.includes('&&')) {
                    return `(${evaluated})`;
                }
                return evaluated;
            });
            return conditions.join(' && ');
        }
        case 'any': {
            // Logical OR - any condition must be true
            if (args.length === 0) return 'false';
            if (args.length === 1) return evaluateMapboxExpression(args[0], context, usedColors);

            const conditions = args.map((arg) => {
                const evaluated = evaluateMapboxExpression(arg, context, usedColors);
                // Wrap complex expressions in parentheses
                if (evaluated.includes('?') || evaluated.includes('||') || evaluated.includes('&&')) {
                    return `(${evaluated})`;
                }
                return evaluated;
            });
            return conditions.join(' || ');
        }
        case 'not': {
            // Logical NOT
            if (args.length === 0) return 'true';
            const condition = evaluateMapboxExpression(args[0], context, usedColors);
            // Wrap complex expressions in parentheses
            if (condition.includes('?') || condition.includes('||') || condition.includes('&&')) {
                return `!(${condition})`;
            }
            return `!${condition}`;
        }
        case 'case': {
            // ["case", condition1, value1, condition2, value2, ..., fallback]
            // Convert to nested ternary: condition1 ? value1 : (condition2 ? value2 : fallback)
            if (args.length === 0) return 'null';
            if (args.length === 1) return evaluateMapboxExpression(args[0], context, usedColors);

            // Build from the end backwards to properly nest ternaries
            let result = evaluateMapboxExpression(args[args.length - 1], context, usedColors); // fallback

            // Walk backwards through condition/value pairs
            for (let i = args.length - 3; i >= 0; i -= 2) {
                const condition = evaluateMapboxExpression(args[i], context, usedColors);
                const value = evaluateMapboxExpression(args[i + 1], context, usedColors);
                result = `${condition} ? ${value} : ${result}`;
            }

            return result;
        }
        case '<':
        case '>':
        case '<=':
        case '>=':
        case '==':
        case '!=': {
            const left = evaluateMapboxExpression(args[0], context, usedColors);
            const right = evaluateMapboxExpression(args[1], context, usedColors);
            let theOp = op;
            if (theOp === '==') {
                theOp = '===';
            } else if (theOp === '!=') {
                theOp = '!==';
            }
            return `${left} ${theOp} ${right}`;
        }
        case '+':
        case '-':
        case '*':
        case '/':
        case '%': {
            const left = evaluateMapboxExpression(args[0], context, usedColors);
            const right = evaluateMapboxExpression(args[1], context, usedColors);
            return `${left} ${op} ${right}`;
        }
        case 'min': {
            const a = evaluateMapboxExpression(args[0], context, usedColors);
            const b = evaluateMapboxExpression(args[1], context, usedColors);
            return `Math.min(${a}, ${b})`;
        }
        case 'max': {
            const a = evaluateMapboxExpression(args[0], context, usedColors);
            const b = evaluateMapboxExpression(args[1], context, usedColors);
            return `Math.max(${a}, ${b})`;
        }
        case 'concat': {
            // String concatenation
            const parts = args.map((arg) => evaluateMapboxExpression(arg, context, usedColors));
            return parts.join(' + ');
        }
        case 'coalesce': {
            // Return first non-null value
            if (args.length === 0) return 'null';
            if (args.length === 1) return evaluateMapboxExpression(args[0], context, usedColors);

            const values = args.map((arg) => evaluateMapboxExpression(arg, context, usedColors));
            // Build nested ternary: val1 != null ? val1 : (val2 != null ? val2 : val3)
            let result = values[values.length - 1];
            for (let i = values.length - 2; i >= 0; i--) {
                result = `${values[i]} != null ? ${values[i]} : ${result}`;
            }
            return result;
        }
        case 'substring': {
            // ["substring", string, start, length]
            const str = evaluateMapboxExpression(args[0], context, usedColors);
            const start = evaluateMapboxExpression(args[1], context, usedColors);
            if (args.length > 2) {
                const length = evaluateMapboxExpression(args[2], context, usedColors);
                return `${str}.substring(${start}, ${start} + ${length})`;
            }
            return `${str}.substring(${start})`;
        }
        case 'format': {
            // ["format", dateValue, pattern]
            const value = evaluateMapboxExpression(args[0], context, usedColors);
            const pattern = args[1];
            // For NativeScript, we'll use a custom formatDate function
            return `formatDate(${value}, ${JSON.stringify(pattern)})`;
        }
        default:
            console.warn(`[evaluateMapboxExpression] Unsupported operator: ${op}`);
            return JSON.stringify(expr);
    }
}

function buildAttribute(widgetName: string, prop: string, value: any, elementPath: string[], defaultPrefix = 'data', usedColors?: Set<string>): string | null {
    if (value === undefined || value === null) return null;

    // map layout prop names -> Svelte/NativeScript attribute names
    const attrMap: Record<string, string | string[]> = {
        alignment: 'verticalAlignment',
        cornerRadius: 'borderRadius',
        crossAlignment: 'horizontalAlignment',
        textAlign: 'textAlignment',
        paddingVertical: ['paddingTop', 'paddingBottom'],
        paddingHorizontal: ['paddingLeft', 'paddingRight'],
        spacing: 'padding'
    };
    const attrName = attrMap[prop] ?? prop;

    // Skip limit - it's handled specially in forEach processing
    if (prop === 'limit') {
        return null;
    }

    // Visible / visibleIf should map to a `visibility` attribute
    if (prop === 'visibleIf') {
        let expr = '';
        if (typeof value === 'string' && hasTemplateBinding(value)) {
            expr = convertBindingToSvelteExpr(value, defaultPrefix);
        } else if (typeof value === 'string') {
            expr = normalizeExpr(value, defaultPrefix);
        } else if (typeof value === 'boolean') {
            // If it's a constant boolean, don't generate visibility attribute if true
            if (value === true) return null;
            return `visibility="hidden"`;
        } else if (Array.isArray(value)) {
            const expr = evaluateMapboxExpression(value, defaultPrefix);
            return `visibility={(${expr}) ? 'visible' : 'collapsed'}`;
        } else {
            return null;
        }
        return `visibility={${expr} ? 'visible' : 'collapsed'}`;
    }

    if (prop === 'visible') {
        if (typeof value === 'boolean') {
            // Don't generate attribute if always visible
            if (value === true) return null;
            return `visibility="hidden"`;
        } else if (typeof value === 'string') {
            const expr = hasTemplateBinding(value) ? convertBindingToSvelteExpr(value, defaultPrefix) : normalizeExpr(value, defaultPrefix);
            if (expr !== 'true') {
                return `visibility={${expr} ? 'visible' : 'hidden'}`;
            }
        }
        return null;
    }

    // Handle alignment properties with start/end mapping
    if (prop === 'alignment' || prop === 'verticalAlignment') {
        if (Array.isArray(value)) {
            // Expression-based alignment - compile it with mapped values
            const expr = evaluateMapboxExpression(value, defaultPrefix);
            // wrap in a ternary if it uses string values that need mapping
            return `${attrName}={${expr}}`;
        }
        const mappedValue = typeof value === 'string' ? mapAlignment(value, true) : value;
        if (mappedValue !== undefined) {
            if (typeof mappedValue === 'string') {
                return `${attrName}="${mappedValue}"`;
            }
            return `${attrName}={${JSON.stringify(mappedValue)}}`;
        }
    }

    if (prop === 'crossAlignment' || prop === 'horizontalAlignment') {
        if (Array.isArray(value)) {
            // Expression-based alignment
            const expr = evaluateMapboxExpression(value, defaultPrefix);
            return `${attrName}={${expr}}`;
        }
        const mappedValue = typeof value === 'string' ? mapAlignment(value, false) : value;
        if (typeof mappedValue === 'string') {
            return `${attrName}="${mappedValue}"`;
        }
        return `${attrName}={${JSON.stringify(mappedValue)}}`;
    }

    // fillWidth/fillHeight/fillMaxSize -> NativeScript stretch alignment
    if (prop === 'fillWidth') {
        // if (value === true) return `horizontalAlignment="stretch"`;
        return null;
    }
    if (prop === 'fillHeight') {
        // if (value === true) return `verticalAlignment="stretch"`;
        return null;
    }
    if (prop === 'fillMaxSize') {
        // if (value === true) return `horizontalAlignment="stretch" verticalAlignment="stretch"`;
        return null;
    }

    // Handle font weight mapping with expression support (including config.settings)
    if (prop === 'fontWeight') {
        if (isExpression(value)) {
            const compiled = compilePropValue(
                value,
                {
                    platform: 'javascript',
                    formatter: (v: string) => `"${mapFontWeight(v)}"`
                },
                '"normal"'
            );
            return `${attrName}={${compiled}}`;
        }
        const weight = mapFontWeight(value);
        return `${attrName}="${weight}"`;
    }

    // Handle text property with localization
    if (prop === 'text') {
        if (typeof value === 'string') {
            if (hasTemplateBinding(value)) {
                // Has binding syntax
                const expr = convertBindingToSvelteExpr(value, defaultPrefix);
                return `${attrName}={${expr}}`;
            } else if (value.startsWith('data.') || value.startsWith('item.') || value.startsWith('size.')) {
                // Direct data path
                return `${attrName}={${value}}`;
            } else if (shouldLocalize(value)) {
                // Static text that should be localized
                return `${attrName}={lc('${value}')}`;
            } else {
                // Static text
                return `${attrName}="${value}"`;
            }
        } else if (Array.isArray(value)) {
            const expr = evaluateMapboxExpression(value, defaultPrefix);
            return `${attrName}={${expr}}`;
        }
        return `${attrName}={${JSON.stringify(value)}}`;
    }

    // handle a 'size' virtual prop: translate into width and height attributes
    if (prop === 'size') {
        if (Array.isArray(value)) {
            // Mapbox expression
            const expr = evaluateMapboxExpression(value, defaultPrefix);
            return `width={${expr}} height={${expr}}`;
        }
        if (typeof value === 'string' && hasTemplateBinding(value)) {
            const expr = convertBindingToSvelteExpr(value, defaultPrefix);
            return `width={${expr}} height={${expr}}`;
        }
        if (typeof value === 'string' && isLikelyDataPath(value)) {
            const path = value.startsWith('data.') || value.startsWith('item.') ? value : `${defaultPrefix}.${value}`;
            return `width={${path}} height={${path}}`;
        }
        return `width={${JSON.stringify(value)}} height={${JSON.stringify(value)}}`;
    }

    // Handle Mapbox expressions (arrays)
    if (Array.isArray(value)) {
        let expr = evaluateMapboxExpression(value, defaultPrefix, usedColors);
        if (expr === 'data.iconPath') {
            expr = `\`\${iconSetFolderPath}/images/\${${expr}}.png\``;
        }
        if (Array.isArray(attrName)) {
            return attrName.map((attr) => `${attr}={${expr}}`).join(' ');
        }
        return `${attrName}={${expr}}`;
    }

    // handle bindings first
    if (typeof value === 'string' && hasTemplateBinding(value)) {
        let expr = convertBindingToSvelteExpr(value, defaultPrefix);
        if (value === '{{item.iconPath}}') {
            expr = `\`\${iconSetFolderPath}/images/\${${expr}}.png\``;
        }
        if (Array.isArray(attrName)) {
            return attrName.map((attr) => `${attr}={${expr}}`).join(' ');
        }
        return `${attrName}={${expr}}`;
    }

    // items => treat tokens like 'hourlyData' as data path
    if (prop === 'items' && typeof value === 'string') {
        if (value.startsWith('data.') || value.startsWith('item.') || value.startsWith('size.')) {
            return `${attrName}={${value}}`;
        } else if (isSimpleToken(value)) {
            const path = `${defaultPrefix}.${value}`;
            return `${attrName}={${path}}`;
        } else {
            return `${attrName}={${JSON.stringify(value)}}`;
        }
    }

    // Colors: map tokens to local variables derived from $colors store
    if ((prop === 'color' || prop === 'backgroundColor') && typeof value === 'string') {
        const isHex = /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value);
        if (isHex) {
            return `${attrName}="${value}"`;
        }
        if (value.startsWith('data.') || value.startsWith('item.') || value.startsWith('size.')) {
            return `${attrName}={${value}}`;
        }
        if (isSimpleToken(value)) {
            const varName = colorTokenToVar(value);
            usedColors?.add(varName);
            return `${attrName}={${varName}}`;
        }
        return `${attrName}="${value}"`;
    }

    // simple literal -> inline as a literal expression OR string literal
    if (typeof value === 'number' || typeof value === 'boolean') {
        if (Array.isArray(attrName)) {
            return attrName.map((attr) => `${attr}={${JSON.stringify(value)}}`).join(' ');
        }
        return `${attrName}={${JSON.stringify(value)}}`;
    }
    if (typeof value === 'string') {
        if (value.startsWith('data.') || value.startsWith('item.') || value.startsWith('size.')) {
            if (value === '{{item.iconPath}}') {
                value = `\`\${iconSetFolderPath}/images/\${${value}}.png\``;
            }
            return `${attrName}={${value}}`;
        }
        // Use string literals (no curly braces) for constant strings
        if (Array.isArray(attrName)) {
            return attrName.map((attr) => `${attr}="${value}"`).join(' ');
        }
        return `${attrName}="${value}"`;
    }

    return null;
}

/**
 * Check if a string should be localized
 */
function shouldLocalize(text: string): boolean {
    // Don't localize if it's a data binding or expression
    if (text.startsWith('data.') || text.startsWith('item.') || text.startsWith('size.')) {
        return false;
    }
    // Don't localize if it contains binding syntax
    if (text.includes('{') || text.includes('}')) {
        return false;
    }
    // Don't localize numbers or very short strings
    if (/^\d+$/.test(text) || text.length <= 1) {
        return false;
    }
    return true;
}

/**
 * Map font weight names to numeric values
 */
function mapFontWeight(weight: string | number): number | string {
    // return weight;
    if (typeof weight === 'number') {
        return weight;
    }

    const weightMap: Record<string, number> = {
        thin: 100,
        ultralight: 200,
        light: 300,
        normal: 400,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        ultrabold: 800,
        heavy: 800,
        black: 900
    };

    const normalized = weight.toLowerCase();
    return weightMap[normalized] || 400;
}

/**
 * Map alignment values to NativeScript equivalents
 */
function mapAlignment(value: string, isVertical: boolean): string {
    const map: Record<string, string | undefined> = {
        start: isVertical ? 'top' : 'left',
        end: isVertical ? 'bottom' : 'right',
        center: 'center',
        stretch: undefined
    };
    return map[value] || value;
}

function generateMarkup(
    widgetName: string,
    element: BaseLayoutElement,
    elementPath: string[],
    usedTemplateImport: { val: boolean },
    usedColors: Set<string>,
    defaultPrefix = 'data',
    defaultColor?: string
): string {
    const indent = '    '.repeat(elementPath.length);
    const elType = element.type;

    // Detect if this row/column has any flex children -> needs GridLayout
    const hasFlex1Children = (elType === 'row' || elType === 'column') && (element.children ?? []).some((c) => c.flex !== undefined);
    const hasPadding = element.padding || element.paddingHorizontal || element.paddingHorizontal;

    const tag = (() => {
        switch (elType) {
            case 'column':
                return hasFlex1Children ? 'gridlayout' : 'stacklayout';
            case 'row':
                return hasFlex1Children ? 'gridlayout' : 'stacklayout';
            case 'stack':
                return 'gridlayout';
            case 'label':
                return 'label';
            case 'image':
                return 'image';
            case 'spacer':
                return null; // Don't render spacer as element
            case 'divider':
                return 'stacklayout';
            case 'scrollView':
                return null; // Don't render scrollview, will be handled specially
            case 'forEach':
                return 'collectionview';
            case 'conditional':
                return 'fragment';
            case 'clock':
                return 'label';
            case 'date':
                return 'label';
            case 'cspan':
                return 'cspan';
            default:
                return 'stacklayout';
        }
    })();

    // Handle spacer: apply as margin to previous sibling (done in parent)
    if (elType === 'spacer') {
        return '';
    }

    // Handle scrollView: check if it contains a forEach, if so merge into collectionview
    if (elType === 'scrollView') {
        const children = element.children ?? [];

        // Look for forEach in children (could be nested in row/column)
        const findForEach = (el: BaseLayoutElement): BaseLayoutElement | null => {
            if (el.type === 'forEach') return el;
            if (el.children) {
                for (const child of el.children) {
                    const found = findForEach(child);
                    if (found) return found;
                }
            }
            return null;
        };

        const forEachElement = findForEach(element);

        if (forEachElement) {
            // Merge scrollView properties into forEach element
            // Map direction to orientation
            const orientation = element.direction === 'horizontal' ? 'horizontal' : element.direction === 'vertical' ? 'vertical' : undefined;

            const mergedElement = {
                ...forEachElement,
                // Use orientation instead of direction
                ...(orientation && { direction: orientation }),
                height: element.height || forEachElement.height,
                width: element.width || forEachElement.width,
                // showIndicators: element.showIndicators,
                // scrollBarIndicatorVisible: element.showIndicators
            };

            // Generate the collectionview with merged properties
            return generateMarkup(widgetName, mergedElement, elementPath, usedTemplateImport, usedColors, defaultPrefix, defaultColor);
        } else {
            // No forEach found, render children directly (unwrap scrollView)
            const childMarkups: string[] = [];
            for (let i = 0; i < children.length; i++) {
                const childMarkup = generateMarkup(widgetName, children[i], elementPath, usedTemplateImport, usedColors, defaultPrefix, defaultColor);
                if (childMarkup) childMarkups.push(childMarkup);
            }
            return childMarkups.join('\n');
        }
    }

    if (!tag) return '';

    const attrsArr: string[] = [];
    const seenAttrs = new Set<string>(); // Track attributes to avoid duplicates

    if (tag === 'gridlayout') {
        attrsArr.push('row="auto"');
        seenAttrs.add('row');
    }

    const attributesToMap = [
        'padding',
        'paddingHorizontal',
        'paddingVertical',
        'margin',
        'marginHorizontal',
        'marginVertical',
        'marginBottom',
        'marginRight',
        'width',
        'height',
        'cornerRadius',
        'spacing',
        'backgroundColor',
        'color',
        'fontSize',
        'fontWeight',
        'textAlign',
        'textAlignment',
        'maxLines',
        'size',
        'thickness',
        'visible',
        'visibleIf',
        'col',
        'row',
        'colSpan',
        'rowSpan',
        'textWrap',
        'showIndicators',
        'fillWidth',
        'fillHeight',
        'fillMaxSize',
        'opacity'
    ];

    // Handle limit for forEach by modifying items before processing
    let itemsValue: string | undefined;
    if (elType === 'forEach' && element.limit !== undefined) {
        const itemsPath =
            typeof element.items === 'string'
                ? element.items.startsWith('data.') || element.items.startsWith('item.')
                    ? element.items
                    : `${defaultPrefix}.${element.items}`
                : `${defaultPrefix}.items`;

        // Build the slice expression
        const limitValue = Array.isArray(element.limit) ? evaluateMapboxExpression(element.limit, defaultPrefix) : typeof element.limit === 'number' ? element.limit.toString() : element.limit;

        itemsValue = `${itemsPath}?.slice(0, ${limitValue})`;
    }

    for (const k of Object.keys(element)) {
        // Skip limit and direction (direction is converted to orientation below)
        if (k === 'limit' || k === 'direction') continue;

        if (!attributesToMap.includes(k) && k !== 'text' && k !== 'src' && k !== 'items') {
            // alignment/crossAlignment on non-container elements (labels, images inside a stack) still apply directly
            if ((k === 'alignment' || k === 'crossAlignment') && elType !== 'column' && elType !== 'row') {
                // These position the element itself within a parent stack overlay
                const v = (element as any)[k];
                const attr = buildAttribute(widgetName, k, v, elementPath, defaultPrefix, usedColors);
                if (attr) {
                    const attrNames = attr.match(/[a-zA-Z_][a-zA-Z0-9_]*(?==)/g) ?? [attr.split('=')[0].split('{')[0].trim()];
                    const firstAttrName = attrNames[0];
                    if (!seenAttrs.has(firstAttrName)) {
                        attrsArr.push(attr);
                        for (const an of attrNames) seenAttrs.add(an);
                    }
                }
            }
            continue;
        }
        const v = (element as any)[k];

        const attr = buildAttribute(widgetName, k, v, elementPath, defaultPrefix, usedColors);
        if (attr) {
            // Extract all attribute names from attr (handles multi-attr returns like "width={X} height={X}")
            const attrNames = attr.match(/[a-zA-Z_][a-zA-Z0-9_]*(?==)/g) ?? [attr.split('=')[0].split('{')[0].trim()];
            const firstAttrName = attrNames[0];
            if (!seenAttrs.has(firstAttrName)) {
                attrsArr.push(attr);
                for (const an of attrNames) seenAttrs.add(an);
            }
        }
    }

    // Inject default color for text elements (label, clock, date) if they don't have their own color
    if ((elType === 'label' || elType === 'clock' || elType === 'date') && !seenAttrs.has('color') && defaultColor) {
        // Check if defaultColor is a simple identifier (variable name)
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(defaultColor)) {
            // Use variable directly
            attrsArr.push(`color={${defaultColor}}`);
            seenAttrs.add('color');
        } else {
            // It's an expression - compile it
            const colorAttr = buildAttribute(widgetName, 'color', defaultColor, elementPath, defaultPrefix, usedColors);
            if (colorAttr) {
                attrsArr.push(colorAttr);
                seenAttrs.add('color');
            }
        }
    }

    // For 'row' and 'column' we need orientation prop (or rows/columns for GridLayout)
    if (elType === 'column' && !seenAttrs.has('orientation')) {
        if (hasFlex1Children) {
            // Build GridLayout rows definition: '*' for flex spacers, fixed dp for numeric spacers, 'auto' for others
            const rowDefs: string[] = [];
            for (const child of element.children ?? []) {
                if (child.type === 'spacer') {
                    if (child.flex !== undefined) {
                        rowDefs.push('*');
                    } else {
                        // Use explicit size if numeric; expression-based sizes use 'auto' (absolutelayout measures itself)
                        rowDefs.push(typeof (child as any).size === 'number' ? `${(child as any).size}` : 'auto');
                    }
                } else {
                    rowDefs.push(child.flex !== undefined ? '*' : 'auto');
                }
            }
            attrsArr.push(`rows="${rowDefs.join(',')}"`);
        } else {
            attrsArr.push(`orientation="vertical"`);
        }
        seenAttrs.add('orientation');
    } else if (elType === 'row' && !seenAttrs.has('orientation')) {
        if (hasFlex1Children) {
            // Build GridLayout columns definition
            const colDefs: string[] = [];
            for (const child of element.children ?? []) {
                if (child.type === 'spacer') {
                    if (child.flex !== undefined) {
                        colDefs.push('*');
                    } else {
                        colDefs.push(typeof (child as any).size === 'number' ? `${(child as any).size}` : 'auto');
                    }
                } else {
                    colDefs.push(child.flex !== undefined ? '*' : 'auto');
                }
            }
            attrsArr.push(`columns="${colDefs.join(',')}"`);
        } else {
            attrsArr.push(`orientation="horizontal"`);
        }
        seenAttrs.add('orientation');
    } else if (elType === 'divider' && !seenAttrs.has('height')) {
        const thickness = element.thickness ?? 1;
        attrsArr.push(`height={${thickness}}`);
        seenAttrs.add('height');
        if (!element.color && !seenAttrs.has('backgroundColor')) {
            const defaultVar = colorTokenToVar('onSurfaceVariant');
            usedColors.add(defaultVar);
            attrsArr.push(`backgroundColor={${defaultVar}}`);
            seenAttrs.add('backgroundColor');
        }
    } else if (elType === 'forEach') {
        // Handle orientation from direction property for forEach/collectionview
        if (element.direction && !seenAttrs.has('orientation')) {
            const orientation = element.direction === 'horizontal' ? 'horizontal' : 'vertical';
            seenAttrs.add('orientation');
            attrsArr.push(`orientation="${orientation}"`);
            seenAttrs.add('colWidth');
            attrsArr.push(`colWidth="auto"`);
        }

        // Replace items attribute with sliced version if limit was set
        if (itemsValue) {
            const itemsAttrIndex = attrsArr.findIndex((a) => a.startsWith('items='));
            if (itemsAttrIndex !== -1) {
                attrsArr[itemsAttrIndex] = `items={${itemsValue}}`;
            } else {
                // Items attribute wasn't added yet, add it now
                attrsArr.push(`items={${itemsValue}}`);
                seenAttrs.add('items');
            }
        }
    }

    if (elType === 'clock' && !seenAttrs.has('text')) {
        // Always use locale-aware time (respects system 24h/12h and AM/PM preference)
        attrsArr.push(`text={nowTime()}`);
        seenAttrs.add('text');
    }

    if (elType === 'date' && !seenAttrs.has('text')) {
        const style = (element as any).style;
        let dateExpr: string;
        switch (style) {
            case 'dayMonth':
                dateExpr = `formatDateWithoutYear(new Date(), 'll')`;
                break;
            case 'fullDate':
                dateExpr = `formatDate(new Date(), 'LL')`;
                break;
            case 'year':
                dateExpr = `formatDate(new Date(), 'YYYY')`;
                break;
            case 'month':
                dateExpr = `formatDate(new Date(), 'MMMM')`;
                break;
            case 'date':
            default:
                dateExpr = `formatDate(new Date(), 'll')`;
                break;
        }
        attrsArr.push(`text={${dateExpr}}`);
        seenAttrs.add('text');
    }

    const attrStr = attrsArr.length ? ' ' + attrsArr.join(' ') : '';

    // Now generate children markup
    let childrenMarkup = '';
    const children = element.children ?? [];
    const childMarkups: string[] = [];

    // Indentation for direct children elements (one level deeper than current element)
    const childIndent = indent + '    ';

    // Orientation for spacer sizing (horizontal spacer needs width, vertical needs height)
    const parentOrientation = elType === 'row' || (elType === 'forEach' && element.direction === 'horizontal') ? 'horizontal' : 'vertical';

    /**
     * Inject a complete attribute string (e.g. `horizontalAlignment="center"` or `col={2}`)
     * into the opening tag of the first element in a markup string.
     * Does nothing if the attribute is already present or if the markup starts with a block expression.
     */
    function injectAttrIntoMarkup(markup: string, fullAttr: string): string {
        const firstLT = markup.indexOf('<');
        if (firstLT === -1) return markup;

        let closingGT = -1;
        let braceDepth = 0;

        for (let i = firstLT + 1; i < markup.length; i++) {
            const char = markup[i];
            if (char === '{') {
                braceDepth++;
            } else if (char === '}') {
                braceDepth--;
            } else if (char === '>' && braceDepth === 0) {
                closingGT = i;
                break;
            }
        }

        if (closingGT === -1) return markup;

        const attrName = fullAttr.split('=')[0].trim();
        const openingTag = markup.substring(firstLT, closingGT + 1);
        if (openingTag.includes(`${attrName}=`)) return markup; // already present

        return markup.slice(0, closingGT) + ` ${fullAttr}` + markup.slice(closingGT);
    }

    function addAttrToMarkup(markup: string, attrName: string, attrVal: string | number): string {
        const valStr = typeof attrVal === 'number' ? `{${attrVal}}` : `="${attrVal}"`;
        return injectAttrIntoMarkup(markup, `${attrName}=${valStr}`);
    }

    /**
     * Build an alignment attribute string for injecting into a child element.
     * Handles both literal string values and expression arrays.
     */
    function buildAlignmentAttrStr(value: any, attrName: string, isVertical: boolean): string | null {
        if (value === undefined || value === null) return null;
        if (Array.isArray(value)) {
            const expr = evaluateMapboxExpression(value, defaultPrefix);
            return `${attrName}={${expr}}`;
        }
        if (typeof value === 'string') {
            const mapped = mapAlignment(value, isVertical);
            if (!mapped) return null;
            return `${attrName}="${mapped}"`;
        }
        return null;
    }

    /**
     * Inject a list of attribute strings into each branch of a {#if}/{:else} block.
     * Depth-tracks nested {#if} blocks so only top-level {:else}/{/if} are used as boundaries.
     * Branches are processed from last to first to avoid index-shift issues when content lengths change.
     */
    function injectAttrsIntoBranches(block: string, attrsToInject: string[]): string {
        // Walk through lines to find top-level branch boundaries
        const branchStarts: number[] = [];
        const branchEnds: number[] = [];
        let depth = 0;
        let pos = block.indexOf('\n') + 1; // skip the opening {#if ...} line
        branchStarts.push(pos);

        while (pos < block.length) {
            const lineEnd = block.indexOf('\n', pos);
            const line = lineEnd === -1 ? block.slice(pos) : block.slice(pos, lineEnd);
            const trimLine = line.trimStart();

            if (/^\{#(if|each|await)\b/.test(trimLine)) {
                depth++;
            } else if (/^\{\/(if|each|await)\b/.test(trimLine)) {
                if (depth === 0) {
                    branchEnds.push(pos);
                    break;
                }
                depth--;
            } else if (/^\{:else\b/.test(trimLine) && depth === 0) {
                // {:else} and {:else if} are the branch delimiters for {#if}
                branchEnds.push(pos);
                const newStart = lineEnd !== -1 ? lineEnd + 1 : block.length;
                branchStarts.push(newStart);
            }
            pos = lineEnd !== -1 ? lineEnd + 1 : block.length;
        }

        // Process branches from last to first to avoid offset shifts
        let result = block;
        for (let b = branchStarts.length - 1; b >= 0; b--) {
            const start = branchStarts[b];
            const end = branchEnds[b]; // may be undefined if no matching {/if} found
            if (end === undefined || end <= start) continue; // skip malformed or empty branches
            const branchContent = result.slice(start, end);
            if (!branchContent.includes('<')) continue;
            let injected = branchContent;
            for (const attr of attrsToInject) {
                injected = injectAttrIntoMarkup(injected, attr);
            }
            if (injected !== branchContent) {
                result = result.slice(0, start) + injected + result.slice(end);
            }
        }
        return result;
    }

    /**
     * Inject alignment attributes from a container (column/row) into a child markup string.
     * In NativeScript, alignment of children is set on the children, not on the container.
     * - column parent: crossAlignment → horizontalAlignment on child, alignment → verticalAlignment on child
     * - row parent: crossAlignment → verticalAlignment on child, alignment → horizontalAlignment on child
     * For {#if} conditional blocks, injects into each branch's root element.
     * For {#each} blocks, skips (each-item templates handle their own alignment).
     */
    function injectParentAlignmentAttrs(childMarkup: string): string {
        if (elType !== 'column' && elType !== 'row') return childMarkup;
        const isColumnParent = elType === 'column';
        const attrsToInject: string[] = [];
        // crossAlignment is the cross-axis: horizontal for columns, vertical for rows
        if (element.crossAlignment !== undefined) {
            const attr = buildAlignmentAttrStr(element.crossAlignment, isColumnParent ? 'horizontalAlignment' : 'verticalAlignment', !isColumnParent);
            if (attr) attrsToInject.push(attr);
        }
        // alignment is the main-axis: vertical for columns, horizontal for rows
        if (element.alignment !== undefined) {
            const attr = buildAlignmentAttrStr(element.alignment, isColumnParent ? 'verticalAlignment' : 'horizontalAlignment', isColumnParent);
            if (attr) attrsToInject.push(attr);
        }
        if (attrsToInject.length === 0) return childMarkup;

        const trimmed = childMarkup.trimStart();
        // For {#if} blocks: inject into each branch's root element
        if (trimmed.startsWith('{#if')) {
            return injectAttrsIntoBranches(childMarkup, attrsToInject);
        }
        // For {#each} or other Svelte control blocks: skip (not applicable here)
        if (trimmed.startsWith('{')) return childMarkup;

        let m = childMarkup;
        for (const attr of attrsToInject) {
            m = injectAttrIntoMarkup(m, attr);
        }
        return m;
    }

    if (hasFlex1Children) {
        // GridLayout mode: assign col/row slots to each child; spacers occupy their slot
        const isRow = elType === 'row';
        const slotAttr = isRow ? 'col' : 'row';
        let slotIdx = 0;

        for (let i = 0; i < children.length; i++) {
            const childDef = children[i];

            if (childDef.type === 'spacer') {
                if (childDef.flex !== undefined) {
                    // Flex spacer: occupies a * slot in the grid, no markup needed
                    slotIdx++;
                } else {
                    // Fixed spacer: render as absolutelayout in its own grid slot
                    const rawSize = (childDef as any).size;
                    const sizeExpr = Array.isArray(rawSize) ? evaluateMapboxExpression(rawSize, defaultPrefix) : typeof rawSize === 'number' ? String(rawSize) : '0';
                    const dimAttr = isRow ? `width={${sizeExpr}}` : `height={${sizeExpr}}`;
                    childMarkups.push(`${childIndent}<absolutelayout ${dimAttr} ${slotAttr}={${slotIdx}}></absolutelayout>`);
                    slotIdx++;
                }
                continue;
            }

            // Regular child: generate markup and inject col/row slot index
            let childMarkup = generateMarkup(widgetName, children[i], [...elementPath, `${element.type}${i}`], usedTemplateImport, usedColors, defaultPrefix, defaultColor);
            if (childMarkup) {
                childMarkup = addAttrToMarkup(childMarkup, slotAttr, slotIdx);
                childMarkups.push(childMarkup);
            }
            slotIdx++;
        }
    } else {
        for (let i = 0; i < children.length; i++) {
            const childDef = children[i];

            if (childDef.type === 'spacer') {
                // Render spacer as absolutelayout with explicit dimension
                const rawSize = (childDef as any).size;
                const sizeExpr = Array.isArray(rawSize) ? evaluateMapboxExpression(rawSize, defaultPrefix) : typeof rawSize === 'number' ? String(rawSize) : '0';
                const dimAttr = parentOrientation === 'horizontal' ? `width={${sizeExpr}}` : `height={${sizeExpr}}`;
                childMarkups.push(`${childIndent}<absolutelayout ${dimAttr}></absolutelayout>`);
                continue;
            }

            const childMarkup = generateMarkup(widgetName, children[i], [...elementPath, `${element.type}${i}`], usedTemplateImport, usedColors, defaultPrefix, defaultColor);
            if (childMarkup) childMarkups.push(childMarkup);
        }
    }

    // Apply parent container alignment to all children (after collapse check so collapsed
    // elements don't carry stale inner-container alignment that blocks outer parent injection)
    for (let i = 0; i < childMarkups.length; i++) {
        childMarkups[i] = injectParentAlignmentAttrs(childMarkups[i]);
    }

    // Single-child collapse: check BEFORE injecting parent alignment.
    // When collapsing, skip alignment injection here so the outer parent can inject its own
    // alignment after the collapse (avoiding stale inner-container alignment on the merged element).
    const canCollapse =
        (elType === 'column' || elType === 'row' || elType === 'stack') && !hasFlex1Children && !hasPadding && childMarkups.length === 1 && !childMarkups[0].trimStart().startsWith('{');
    if (canCollapse) {
        const SKIP_ATTRS = new Set(['orientation', 'rows', 'columns', 'items', 'showIndicators', 'scrollBarIndicatorVisible']);
        let collapsed = childMarkups[0];
        for (const attr of attrsArr) {
            const name = attr.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)?.[0];
            if (name && !SKIP_ATTRS.has(name)) {
                collapsed = injectAttrIntoMarkup(collapsed, attr);
            }
        }
        return collapsed;
    }

    if (elType === 'forEach') {
        usedTemplateImport.val = true;

        // Generate the inner template with item context
        const innerTemplate = element.itemTemplate ? generateMarkup(widgetName, element.itemTemplate, [...elementPath, 'itemTemplate'], usedTemplateImport, usedColors, 'item', defaultColor) : '';

        if (innerTemplate) {
            const templateIndent = indent + '    ';
            childrenMarkup = `\n${templateIndent}<Template let:item>\n${innerTemplate}\n${templateIndent}</Template>\n${indent}`;
        }
    } else if (childMarkups.length > 0) {
        childrenMarkup = '\n' + childMarkups.join('\n') + '\n' + indent;
    }

    // For conditional element
    if (elType === 'conditional') {
        const condRaw = element.condition ?? 'true';
        let condExpr = 'true';
        if (typeof condRaw === 'string' && hasTemplateBinding(condRaw)) {
            condExpr = convertBindingToSvelteExpr(condRaw, defaultPrefix);
        } else if (typeof condRaw === 'string') {
            condExpr = normalizeExpr(condRaw, defaultPrefix);
        } else if (Array.isArray(condRaw)) {
            condExpr = evaluateMapboxExpression(condRaw, defaultPrefix);
        } else {
            condExpr = JSON.stringify(condRaw);
        }
        let thenMarkup = '';
        let elseMarkup = '';
        if (element.then) thenMarkup = generateMarkup(widgetName, element.then, [...elementPath, 'then'], usedTemplateImport, usedColors, defaultPrefix, defaultColor);
        if (element.else) elseMarkup = generateMarkup(widgetName, element.else, [...elementPath, 'else'], usedTemplateImport, usedColors, defaultPrefix, defaultColor);
        return `${indent}{#if ${condExpr}}\n${thenMarkup}\n${indent}{:else}\n${elseMarkup}\n${indent}{/if}`;
    }

    // For label with children (cspan or nested elements)
    if (elType === 'label' && children.length > 0) {
        const start = `${indent}<label${attrStr}>`;
        let inner = '';
        for (let i = 0; i < children.length; i++) {
            inner += '\n' + generateMarkup(widgetName, children[i], [...elementPath, `labelChild${i}`], usedTemplateImport, usedColors, defaultPrefix, defaultColor);
        }
        const end = `${indent}</label>`;
        return `${start}${inner}\n${end}`;
    }

    const start = `${indent}<${tag}${attrStr}>`;
    const end = `</${tag}>`;
    const selfClosing = ['image', 'cspan'];
    if (selfClosing.includes(tag) && children.length === 0 && !element.text) {
        return `${start}${end}`;
    }

    return `${start}${childrenMarkup}${end}`;
}

/**
 * Generate the full Svelte component for a layout
 */
function generateSvelteComponent(layout: WidgetLayout): string {
    const widgetName = layout.name;
    const usedTemplateImport = { val: false };

    const usedColors = new Set<string>();
    collectUsedColorsFromLayout(layout, usedColors);

    // Check if widget uses clock element
    const usesClock = JSON.stringify(layout).includes('"type":"clock"');
    // Check if widget uses dayMonth date style (needs formatDateWithoutYear helper)
    const usesDayMonth = JSON.stringify(layout).includes('"style":"dayMonth"');

    let script = `<script context="module" lang="ts">\n`;
    script += `    // Auto-generated Svelte Native component for widget "${layout.name}"\n`;
    // script += `    import type { Writable } from 'svelte/store';\n`;
    script += `    import { Template } from '@nativescript-community/svelte-native/components';\n`;
    const localeImports = ['formatDate', 'l', 'lc'];
    if (usesDayMonth) localeImports.push('formatDateWithoutYear');
    script += `    import { ${localeImports.join(', ')} } from '~/helpers/locale';\n`;
    script += `    import { titlecase } from '@nativescript-community/l';\n`;
    script += `    import { path } from '@nativescript/core';\n`;
    script += `    import { iconService, iconThemesFolder } from '~/services/icon';\n`;
    script += `    import { colors } from '~/variables';\n`;
    script += `    import type { WeatherWidgetData, WidgetConfig } from 'plugin-widgets/WidgetTypes';\n`;
    script += `</script>\n`;
    script += `<script lang="ts">\n`;

    // Export props with proper typing
    script += `    export let config: WidgetConfig;\n`;
    script += `    export let data: WeatherWidgetData;\n`;
    // script += `    export let width: number = ${layout.supportedSizes?.[0]?.width ?? 160};\n`;
    // script += `    export let height: number = ${layout.supportedSizes?.[0]?.height ?? 160};\n`;
    script += `    export let size: { width: number; height: number };\n\n`;
    script += `    $: iconSetFolderPath = path.join(iconThemesFolder, config.iconSet ?? iconService.iconSet);\n\n`;

    // Compile top-level color if present
    let defaultColorRef: string | undefined;
    let colorAttr;
    if (layout.color !== undefined) {
        // Build attribute to get the formatted expression
        colorAttr = buildAttribute(widgetName, 'color', layout.color, ['root'], 'data', usedColors);
    }

    // If we have used color tokens, generate reactive destructuring from $colors
    if (usedColors.size > 0) {
        const vars = Array.from(usedColors).sort().join(', ');
        script += `    $: ({ ${vars} } = $colors);\n`;
    }

    if (colorAttr) {
        // Extract the value part from color="{value}" or color="value"
        const match = colorAttr.match(/color=(?:{([^}]+)}|"([^"]+)")/);
        if (match) {
            const colorExpr = match[1] || match[2];
            // Add widgetColor const declaration after script imports
            script += `    $: widgetColor = ${colorExpr};\n`;
            defaultColorRef = 'widgetColor';
        }
    }

    // Helper functions - only add if used
    if (usesClock) {
        script += `\n    function nowTime() {\n`;
        script += `        return formatDate(new Date(), 'LT');\n`;
        script += `    }\n`;
    }

    script += `</script>\n\n`;

    // Build top-level wrapper element (container)
    const wrapperAttrs: string[] = [];
    wrapperAttrs.push(`width={size.width}`, `height={size.height}`, `{...$$restProps}`);
    if (layout.background?.color) {
        const v = layout.background.color;
        const attrBg = buildAttribute(widgetName, 'backgroundColor', v, ['root'], 'data', usedColors);
        if (attrBg) wrapperAttrs.push(attrBg);
    }
    // if (layout.defaultPadding !== undefined) {
    //     let value = layout.defaultPadding;
    //     if (Array.isArray(value)) {
    //         value = evaluateMapboxExpression(value, '') as any;
    //     }
    //     wrapperAttrs.push(`padding={${value}}`);
    // }
    wrapperAttrs.push(`class="widget-container"`);

    const wrapperTag = 'gridlayout';
    const wrapperAttrStr = wrapperAttrs.join(' ');

    const bodyMarkup = generateMarkup(widgetName, layout.layout, ['root'], usedTemplateImport, usedColors, 'data', defaultColorRef);

    const component = `${script}<${wrapperTag} ${wrapperAttrStr}>\n${bodyMarkup}\n</${wrapperTag}>\n`;
    return component;
}

/**
 * Generate Svelte component for a specific widget
 */
export function generateWidgetSvelte(layoutsDir: string, outputDir: string, widgetName: string): void {
    if (!fs.existsSync(layoutsDir)) {
        console.error(`Layouts directory not found: ${layoutsDir}`);
        return;
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const layoutPath = path.join(layoutsDir, `${widgetName}.json`);
    if (!fs.existsSync(layoutPath)) {
        console.error(`Widget layout not found: ${layoutPath}`);
        return;
    }

    const raw = fs.readFileSync(layoutPath, 'utf-8');
    let layout: WidgetLayout;
    try {
        layout = JSON.parse(raw) as WidgetLayout;
    } catch (e) {
        console.error(`Failed to parse ${layoutPath}:`, (e as Error).message);
        return;
    }

    const svelte = generateSvelteComponent(layout);
    const outFile = path.join(outputDir, `${layout.name}View.generated.svelte`);
    fs.writeFileSync(outFile, svelte, 'utf-8');
    console.log(`Generated Svelte component: ${outFile}`);
}

/**
 * Generate Svelte components for all widget layouts found in layoutsDir
 */
export function generateAllWidgetsSvelte(layoutsDir: string, outputDir: string): void {
    if (!fs.existsSync(layoutsDir)) {
        console.error(`Layouts directory not found: ${layoutsDir}`);
        return;
    }

    const widgetFiles = fs.readdirSync(layoutsDir).filter((f) => f.endsWith('.json'));
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const file of widgetFiles) {
        const widgetName = file.replace('.json', '');
        generateWidgetSvelte(layoutsDir, outputDir, widgetName);
    }
}

// CLI entrypoint
// if (require.main === module) {
const args = process.argv.slice(2);
const layoutsDir = args[0] || path.join(__dirname, '..', '..', 'src', 'widgets');
const outputDir = args[1] || path.join(__dirname, '..', '..', 'src', 'svelte', 'generated');
const specificWidget = args[2]; // Optional: specific widget name to regenerate

if (specificWidget) {
    // Generate only the specified widget
    generateWidgetSvelte(layoutsDir, outputDir, specificWidget);
    console.log(`NativeScript Svelte generation complete for ${specificWidget}!`);
} else {
    // Generate all widgets
    generateAllWidgetsSvelte(layoutsDir, outputDir);
    console.log('NativeScript Svelte generation complete!');
}
// }
