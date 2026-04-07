#!/usr/bin/env node
/**
 * Android Glance Code Generator with Mapbox-Style Expressions
 * Generates Glance composables from JSON layout definitions using Mapbox expression syntax
 */

import * as fs from 'fs';
import * as path from 'path';
import { Expression, compileExpression as compileExpr, compilePropertyValue as compilePropValue, compilePropertyValue } from './expression-compiler';
import { isExpression, toPlatformFontWeight, toPlatformHorizontalAlignment, toPlatformVerticalAlignment } from './shared-utils';
import { buildGlanceModifier, formatColor } from './modifier-builders';

interface LayoutElement {
    type: string;
    id?: string;
    visible?: boolean;
    visibleIf?: Expression;
    padding?: Expression;
    paddingHorizontal?: Expression;
    paddingVertical?: Expression;
    margin?: Expression;
    marginHorizontal?: Expression;
    marginVertical?: Expression;
    spacing?: Expression;
    alignment?: string;
    crossAlignment?: string;
    contentAlignment?: string;
    width?: Expression;
    height?: Expression;
    fillWidth?: boolean;
    fillHeight?: boolean;
    fillMaxSize?: boolean;
    flex?: Expression;
    backgroundColor?: Expression;
    cornerRadius?: Expression;
    children?: LayoutElement[];
    // Element-specific
    text?: Expression;
    fontSize?: Expression;
    fontWeight?: Expression;
    color?: Expression;
    textAlign?: string;
    maxLines?: Expression;
    src?: Expression;
    size?: Expression;
    thickness?: Expression;
    direction?: string;
    items?: string;
    limit?: number;
    itemTemplate?: LayoutElement;
    condition?: Expression;
    then?: LayoutElement;
    else?: LayoutElement;
    format?: string;
    style?: string;
    [key: string]: any;
}

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
    layout: LayoutElement;
    generatePreviews?: boolean;
    preview?: {
        sizes?: { width: number; height: number }[];
        fakeData?: Record<string, any>;
    };
}

/**
 * Format a color value for use as a Glance text color (requires ColorProvider wrapper for hex colors)
 */
function formatTextColor(v: string): string {
    const color = formatColor(v, 'kotlin');
    if (color.startsWith('Color(')) {
        return `ColorProvider(${color})`;
    }
    return color;
}

/**
 * Compile a dimension value (dp) - handles both literals and expressions
 * Ensures the result has '.dp' appended appropriately
 */
function compileDpValue(value: Expression | undefined, defaultValue?: string): string {
    if (value === undefined) return defaultValue || '';
    if (typeof value === 'number') return `${value}.dp`;
    const compiled = compilePropValue(value, { platform: 'kotlin', formatter: (v: number) => `${v}.dp` });
    if (!compiled || compiled === 'null' || compiled === '') return defaultValue || '';
    // If the result already has .dp in it (e.g. from 'when' expressions), return as-is
    if (compiled.includes('.dp')) return compiled;
    // Strip outer parens from compileArithmetic output before re-wrapping to avoid double parens
    const unwrapped = compiled.replace(/^\((.+)\)$/, '$1');
    return `(${unwrapped}).dp`;
}

/**
 * Compile a font-size value (sp) - handles both literals and expressions
 * Ensures the result has '.sp' appended appropriately
 */
function compileSpValue(value: Expression | undefined, defaultValue?: string): string {
    if (value === undefined) return defaultValue || '';
    if (typeof value === 'number') return `(${value} * fontScaleFactor).sp`;
    const compiled = compilePropValue(value, { platform: 'kotlin', formatter: (v: number) => `${v}.sp` });
    if (!compiled || compiled === 'null' || compiled === '') return defaultValue || '';
    // If the result already has .sp in it (e.g. from 'when' expressions), return as-is
    if (compiled.includes('.sp')) return compiled;
    // Strip outer parens from compileArithmetic output before re-wrapping to avoid double parens
    const unwrapped = compiled.replace(/^\((.+)\)$/, '$1');
    return `(${unwrapped} * fontScaleFactor).sp`;
}

/**
 * Wrap color expression with hex parsing for config.settings.color references
 */
function wrapColorParsingKotlin(colorExpr: string): string {
    // If the expression contains config.settings, wrap with Color parsing
    if (colorExpr.includes('config.settings')) {
        // Find all config.settings?.get("...")?.jsonPrimitive?.contentOrNull patterns
        const settingsPattern = /config\.settings\?\.get\([^)]+\)\?\.jsonPrimitive\?\.contentOrNull/g;
        if (settingsPattern.test(colorExpr)) {
            // Store the expression result in a variable, then check if it's a string (hex color) and parse it
            return `run { val colorValue = ${colorExpr}; if (colorValue is String) ColorProvider(Color(colorValue.toColorIntRgba())) else GlanceTheme.colors.onSurface }`;
        }
    }
    return colorExpr;
}

/**
 * Generate Kotlin code for an element
 */
function generateElement(element: LayoutElement, indent: string = '            ', defaultColor?: string): string {
    const lines: string[] = [];

    // Handle visibility condition
    const wrapWithIf = element.visibleIf !== undefined;
    const currentIndent = wrapWithIf ? indent + '    ' : indent;

    if (wrapWithIf && element.visibleIf !== undefined) {
        const condition = compileExpr(element.visibleIf, { platform: 'kotlin', context: 'condition' });
        lines.push(`${indent}if (${condition}) {`);
    }

    switch (element.type) {
        case 'column':
            lines.push(...generateColumn(element, currentIndent, defaultColor));
            break;
        case 'row':
            lines.push(...generateRow(element, currentIndent, defaultColor));
            break;
        case 'stack':
            lines.push(...generateStack(element, currentIndent, defaultColor));
            break;
        case 'label':
            lines.push(...generateLabel(element, currentIndent, defaultColor));
            break;
        case 'image':
            lines.push(...generateImage(element, currentIndent));
            break;
        case 'spacer':
            lines.push(...generateSpacer(element, currentIndent));
            break;
        case 'divider':
            lines.push(...generateDivider(element, currentIndent));
            break;
        case 'scrollView':
            lines.push(...generateScrollView(element, currentIndent, defaultColor));
            break;
        case 'forEach':
            lines.push(...generateForEach(element, currentIndent, defaultColor));
            break;
        case 'conditional':
            lines.push(...generateConditional(element, currentIndent, defaultColor));
            break;
        case 'clock':
            lines.push(...generateClock(element, currentIndent, defaultColor));
            break;
        case 'date':
            lines.push(...generateDate(element, currentIndent, defaultColor));
            break;
        default:
            lines.push(`${currentIndent}// Unknown element type: ${element.type}`);
    }

    if (wrapWithIf) {
        lines.push(`${indent}}`);
    }

    return lines.join('\n');
}

function generateColumn(element: LayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];
    const vertAlign = element.alignment
        ? isExpression(element.alignment)
            ? compileExpr(element.alignment, { platform: 'kotlin', context: 'value', formatter: (v: string) => toPlatformVerticalAlignment(v, 'glance') })
            : toPlatformVerticalAlignment(element.alignment, 'glance')
        : undefined;
    // crossAlignment can be an expression (for conditional alignment)
    const horizAlign = element.crossAlignment
        ? isExpression(element.crossAlignment)
            ? compileExpr(element.crossAlignment, { platform: 'kotlin', context: 'value', formatter: (v: string) => toPlatformHorizontalAlignment(v, 'glance') })
            : toPlatformHorizontalAlignment(element.crossAlignment, 'glance')
        : undefined;

    const modifier = buildGlanceModifier(element);

    lines.push(`${indent}Column(`);
    lines.push(`${indent}    modifier = ${modifier},`);
    if (horizAlign) {
        lines.push(`${indent}    horizontalAlignment = ${horizAlign},`);
    }
    if (vertAlign) {
        lines.push(`${indent}    verticalAlignment = ${vertAlign},`);
    }
    lines.push(`${indent}) {`);

    if (element.children) {
        // Insert Spacer composables between children if spacing is defined
        const spacingValue = element.spacing;
        for (let i = 0; i < element.children.length; i++) {
            const child = element.children[i];

            // Add spacer before child (except first)
            if (i > 0 && spacingValue !== undefined) {
                const spacingExpr = compileDpValue(spacingValue, undefined);
                if (spacingExpr) {
                    lines.push(`${indent}    Spacer(modifier = GlanceModifier.height(${spacingExpr}))`);
                }
            }

            lines.push(generateElement(child, indent + '    ', defaultColor));
        }
    }

    lines.push(`${indent}}`);
    return lines;
}

function generateRow(element: LayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    const horizAlign = element.alignment
        ? isExpression(element.alignment)
            ? compileExpr(element.alignment, { platform: 'kotlin', context: 'value', formatter: (v: string) => toPlatformHorizontalAlignment(v, 'glance') })
            : toPlatformHorizontalAlignment(element.alignment, 'glance')
        : undefined;
    // crossAlignment can be an expression (for conditional alignment)
    const vertAlign = element.crossAlignment
        ? isExpression(element.crossAlignment)
            ? compileExpr(element.crossAlignment, { platform: 'kotlin', context: 'value', formatter: (v: string) => toPlatformVerticalAlignment(v, 'glance') })
            : toPlatformVerticalAlignment(element.crossAlignment, 'glance')
        : undefined;

    const isSpaceBetween = element.alignment === 'space-between' || element.alignment === 'spaceBetween';

    const modifier = buildGlanceModifier(element);

    lines.push(`${indent}Row(`);
    lines.push(`${indent}    modifier = ${modifier},`);
    if (horizAlign) {
        lines.push(`${indent}    horizontalAlignment = ${horizAlign},`);
    }
    if (vertAlign) {
        lines.push(`${indent}    verticalAlignment = ${vertAlign},`);
    }
    lines.push(`${indent}) {`);

    if (element.children) {
        // Handle space-between by inserting Spacer between children
        if (isSpaceBetween && element.children.length > 1) {
            for (let i = 0; i < element.children.length; i++) {
                const child = element.children[i];

                // Add spacer before child (except first)
                if (i > 0) {
                    lines.push(`${indent}    Spacer(modifier = GlanceModifier.defaultWeight())`);
                }

                lines.push(generateElement(child, indent + '    ', defaultColor));
            }
        } else {
            // Normal layout with optional spacing
            const spacingValue = element.spacing;
            for (let i = 0; i < element.children.length; i++) {
                const child = element.children[i];

                // Add spacer before child (except first)
                if (i > 0 && spacingValue !== undefined) {
                    const spacingExpr = compileDpValue(spacingValue, undefined);
                    if (spacingExpr) {
                        lines.push(`${indent}    Spacer(modifier = GlanceModifier.width(${spacingExpr}))`);
                    }
                }

                lines.push(generateElement(child, indent + '    ', defaultColor));
            }
        }
    }

    lines.push(`${indent}}`);
    return lines;
}

function generateStack(element: LayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    const modifier = buildGlanceModifier(element);

    // Map contentAlignment string to Glance Alignment constant
    let contentAlignmentStr = '';
    if (element.contentAlignment) {
        const alignmentMap: Record<string, string> = {
            TopStart: 'Alignment.TopStart',
            TopCenter: 'Alignment.TopCenter',
            TopEnd: 'Alignment.TopEnd',
            CenterStart: 'Alignment.CenterStart',
            Center: 'Alignment.Center',
            CenterEnd: 'Alignment.CenterEnd',
            BottomStart: 'Alignment.BottomStart',
            BottomCenter: 'Alignment.BottomCenter',
            BottomEnd: 'Alignment.BottomEnd'
        };
        contentAlignmentStr = alignmentMap[element.contentAlignment] || element.contentAlignment;
    }

    lines.push(`${indent}Box(`);
    lines.push(`${indent}    modifier = ${modifier}${contentAlignmentStr ? ',' : ''}`);
    if (contentAlignmentStr) {
        lines.push(`${indent}    contentAlignment = ${contentAlignmentStr}`);
    }
    lines.push(`${indent}) {`);

    if (element.children) {
        for (const child of element.children) {
            lines.push(generateElement(child, indent + '    ', defaultColor));
        }
    }

    lines.push(`${indent}}`);
    return lines;
}

function generateLabel(element: LayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    // Build modifier for the text element (padding support)
    const textModifier = buildGlanceModifier(element);
    const hasModifier = textModifier !== 'GlanceModifier';

    // Compile text (might be template string or expression)
    let textExpr: string;
    if (typeof element.text === 'string' && element.text.includes('{{')) {
        // Template string like "{{temperature}}" or "{{item.temperature}}"
        // Check if it's a simple single substitution
        const singleMatch = element.text.match(/^\{\{([^}]+)\}\}$/);
        if (singleMatch) {
            // Single property substitution - use directly without string interpolation
            const prop = singleMatch[1];
            if (prop.startsWith('item.')) {
                textExpr = prop;
            } else {
                textExpr = `data.${prop}`;
            }
        } else {
            // Complex template with multiple substitutions or text
            textExpr = element.text.replace(/\{\{([^}]+)\}\}/g, (_, prop) => {
                // If it's an item property, don't add data. prefix
                if (prop.startsWith('item.')) {
                    return `\${${prop}}`;
                }
                return `\${data.${prop}}`;
            });
            textExpr = `"${textExpr}"`;
        }
    } else if (Array.isArray(element.text)) {
        // Mapbox expression
        textExpr = compileExpr(element.text, { platform: 'kotlin', context: 'value' });
    } else if (typeof element.text === 'string' && !element.text.includes('data.') && !element.text.includes('item.')) {
        // Static text string - should be localized
        // Convert to snake_case for resource name (e.g., "Hourly" -> "hourly")
        const resourceKey = element.text.toLowerCase().replace(/\s+/g, '_');
        const i1 = indent + '    '; // text = line indent
        const i2 = i1 + '    '; // getIdentifier args indent
        textExpr = `context.getString(\n${i2}context.resources.getIdentifier(\n${i2}    "${resourceKey}",\n${i2}    "string",\n${i2}    context.packageName\n${i2})\n${i1})`;
    } else {
        textExpr = compilePropValue(element.text, { platform: 'kotlin', formatter: (v: string) => `"${v}"` }, '""');
    }

    const fontSizeExpr = compileSpValue(element.fontSize, undefined);
    // Use element color if defined, otherwise fall back to defaultColor, otherwise use theme default
    let colorExpr: string;
    if (element.color !== undefined && element.color !== null) {
        colorExpr = compilePropValue(element.color, { platform: 'kotlin', formatter: (v: string) => formatTextColor(v) }, 'GlanceTheme.colors.onSurface');
    } else if (defaultColor && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(defaultColor)) {
        // defaultColor is a simple identifier (variable name) - use directly
        colorExpr = defaultColor;
    } else if (defaultColor) {
        // defaultColor is an expression - compile it
        colorExpr = compilePropValue(defaultColor, { platform: 'kotlin', formatter: (v: string) => formatTextColor(v) }, 'GlanceTheme.colors.onSurface');
    } else {
        colorExpr = 'GlanceTheme.colors.onSurface';
    }

    // Handle fontWeight with proper expression support and literal transformation
    const fontWeightExpr = compilePropValue(
        element.fontWeight,
        {
            platform: 'kotlin',
            formatter: (v: string) => toPlatformFontWeight(v, 'glance')
        },
        undefined
    );

    const maxLinesExpr = compilePropValue(element.maxLines, { platform: 'kotlin', formatter: (v: number) => String(v) }, undefined);

    lines.push(`${indent}Text(`);
    if (hasModifier) {
        lines.push(`${indent}    modifier = ${textModifier},`);
    }
    lines.push(`${indent}    text = ${textExpr},`);

    // Build style
    const styleProps: string[] = [];
    if (fontSizeExpr) {
        styleProps.push(`fontSize = ${fontSizeExpr}`);
    }
    if (fontWeightExpr) {
        styleProps.push(`fontWeight = ${fontWeightExpr}`);
    }
    if (colorExpr) {
        if (element.opacity !== undefined) {
            const opacityExpr = compilePropertyValue(element.opacity, {
                platform: 'kotlin',
                context: 'value',
                formatter: (v: number) => `${v}f`
            });
            colorExpr = `ColorProvider(widgetColor.getColor(context).copy(alpha = ${opacityExpr}))`;
        }
        styleProps.push(`color = ${colorExpr}`);
    }
    if (element.textAlign !== undefined) {
        const alignMap: Record<string, string> = {
            left: 'TextAlign.Start',
            center: 'TextAlign.Center',
            right: 'TextAlign.End'
        };
        if (isExpression(element.textAlign)) {
            const textAlignExpr = compileExpr(element.textAlign, { platform: 'kotlin', context: 'value', formatter: (v: string) => alignMap[v] || 'TextAlign.Start' });
            styleProps.push(`textAlign = ${textAlignExpr}`);
        } else {
            styleProps.push(`textAlign = ${alignMap[element.textAlign] || 'TextAlign.Start'}`);
        }
    }

    if (styleProps.length > 0) {
        const styleStr = styleProps.join(', ');
        lines.push(`${indent}    style = TextStyle(${styleStr}),`);
    }

    if (maxLinesExpr) {
        lines.push(`${indent}    maxLines = ${maxLinesExpr}`);
    } else {
        // Remove trailing comma from style line if no maxLines
        const lastIdx = lines.length - 1;
        if (lines[lastIdx].endsWith(',')) {
            lines[lastIdx] = lines[lastIdx].slice(0, -1);
        }
    }

    lines.push(`${indent})`);
    return lines;
}

function generateImage(element: LayoutElement, indent: string): string[] {
    const lines: string[] = [];

    // Compile src - it's a path string, not a resource ID
    let srcExpr: string;
    if (typeof element.src === 'string' && element.src.includes('{{')) {
        // Template string like "{{iconPath}}" or "{{item.iconPath}}"
        const propName = element.src.replace(/\{\{([^}]+)\}\}/g, '$1');
        // If it's an item property, don't add data. prefix
        if (propName.startsWith('item.')) {
            srcExpr = propName;
        } else {
            srcExpr = `data.${propName}`;
        }
    } else {
        srcExpr = compilePropValue(element.src, { platform: 'kotlin', formatter: (v: string) => `data.${v}` }, 'data.iconPath');
    }

    const sizeExpr = compileDpValue(element.size, '24.dp');

    lines.push(`${indent}WeatherWidgetManager.getIconImageProviderFromPath(${srcExpr}, LocalContext.current)?.let { provider ->`);
    lines.push(`${indent}    Image(`);
    lines.push(`${indent}       provider = provider,`);
    lines.push(`${indent}       contentDescription = ${srcExpr},`);
    lines.push(`${indent}       modifier = GlanceModifier.size(${sizeExpr})`);
    lines.push(`${indent}    )`);
    lines.push(`${indent}}`);

    return lines;
}

function generateSpacer(element: LayoutElement, indent: string): string[] {
    const lines: string[] = [];

    const sizeExpr = compileDpValue(element.size, undefined);
    const flexExpr = compilePropValue(element.flex, { platform: 'kotlin', formatter: (v: number) => String(v) }, undefined);

    // If flex is defined, use defaultWeight() modifier
    if (flexExpr && flexExpr !== 'null') {
        lines.push(`${indent}Spacer(modifier = GlanceModifier.defaultWeight())`);
        return lines;
    }

    // direction: "horizontal" uses width, default uses height
    const dimension = element.direction === 'horizontal' ? 'width' : 'height';

    if (sizeExpr && sizeExpr !== 'null' && sizeExpr !== '') {
        lines.push(`${indent}Spacer(modifier = GlanceModifier.${dimension}(${sizeExpr}))`);
    }
    // If both are null/undefined, don't generate anything

    return lines;
}

function generateDivider(element: LayoutElement, indent: string): string[] {
    const lines: string[] = [];
    const thicknessExpr = compilePropValue(element.thickness, { platform: 'kotlin', formatter: (v: number) => `${v}.dp` }, '1.dp');
    const colorExpr = compilePropValue(element.color, { platform: 'kotlin', formatter: (v: string) => formatColor(v, 'kotlin') }, 'GlanceTheme.colors.onSurfaceVariant');

    lines.push(`${indent}Box(`);
    lines.push(`${indent}    modifier = GlanceModifier.fillMaxWidth().height(${thicknessExpr})`);
    lines.push(`${indent}        .background(${colorExpr})`);
    lines.push(`${indent}) {}`);

    return lines;
}

function generateScrollView(element: LayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    const direction = element.direction || 'vertical';

    if (direction === 'horizontal') {
        // Generate Row with forEach for horizontal scrolling
        // Note: Glance does not support LazyRow - only LazyColumn exists
        lines.push(`${indent}Row {`);
        if (element.children && element.children.length > 0) {
            // Check if children contain a forEach, if so handle specially
            const hasForEach = element.children.some((child) => child.type === 'forEach' || (child.children && child.children.some((c) => c.type === 'forEach')));

            if (hasForEach) {
                // Find the forEach element (may be nested in row/column)
                for (const child of element.children) {
                    if (child.type === 'forEach') {
                        // Generate items directly from forEach
                        if (child.items && child.itemTemplate) {
                            const limitValue = child.limit || 10;
                            const limitCode = isExpression(limitValue) ? compileExpr(limitValue, { platform: 'kotlin', context: 'value' }) : limitValue;

                            lines.push(`${indent}    data.${child.items}.take(${limitCode}).forEach { item ->`);
                            lines.push(generateElement(child.itemTemplate, indent + '        ', defaultColor));
                            lines.push(`${indent}    }`);
                        }
                    } else if (child.children) {
                        // Check nested children for forEach
                        for (const nestedChild of child.children) {
                            if (nestedChild.type === 'forEach') {
                                if (nestedChild.items && nestedChild.itemTemplate) {
                                    const limitValue = nestedChild.limit || 10;
                                    const limitCode = isExpression(limitValue) ? compileExpr(limitValue, { platform: 'kotlin', context: 'value' }) : limitValue;

                                    lines.push(`${indent}    data.${nestedChild.items}.take(${limitCode}).forEach { item ->`);
                                    lines.push(generateElement(nestedChild.itemTemplate, indent + '        ', defaultColor));
                                    lines.push(`${indent}    }`);
                                }
                            }
                        }
                    }
                }
            } else {
                // No forEach, wrap each child in item{}
                for (const child of element.children) {
                    lines.push(`${indent}    item {`);
                    lines.push(generateElement(child, indent + '        ', defaultColor));
                    lines.push(`${indent}    }`);
                }
            }
        }
        lines.push(`${indent}}`);
    } else {
        // Generate LazyColumn for vertical scrolling
        lines.push(`${indent}LazyColumn {`);
        if (element.children && element.children.length > 0) {
            // Check if children contain a forEach, if so handle specially
            const hasForEach = element.children.some((child) => child.type === 'forEach' || (child.children && child.children.some((c) => c.type === 'forEach')));

            if (hasForEach) {
                // Find the forEach element (may be nested in row/column)
                for (const child of element.children) {
                    if (child.type === 'forEach') {
                        // Generate items directly from forEach
                        if (child.items && child.itemTemplate) {
                            const limitValue = child.limit || 10;
                            const limitCode = isExpression(limitValue) ? compileExpr(limitValue, { platform: 'kotlin', context: 'value' }) : limitValue;

                            lines.push(`${indent}    items(data.${child.items}.take(${limitCode})) { item ->`);
                            lines.push(generateElement(child.itemTemplate, indent + '        ', defaultColor));
                            lines.push(`${indent}    }`);
                        }
                    } else if (child.children) {
                        // Check nested children for forEach
                        for (const nestedChild of child.children) {
                            if (nestedChild.type === 'forEach') {
                                if (nestedChild.items && nestedChild.itemTemplate) {
                                    const limitValue = nestedChild.limit || 10;
                                    const limitCode = isExpression(limitValue) ? compileExpr(limitValue, { platform: 'kotlin', context: 'value' }) : limitValue;

                                    lines.push(`${indent}    items(data.${nestedChild.items}.take(${limitCode})) { item ->`);
                                    lines.push(generateElement(nestedChild.itemTemplate, indent + '        ', defaultColor));
                                    lines.push(`${indent}    }`);
                                }
                            }
                        }
                    }
                }
            } else {
                // No forEach, wrap each child in item{}
                for (const child of element.children) {
                    lines.push(`${indent}    item {`);
                    lines.push(generateElement(child, indent + '        ', defaultColor));
                    lines.push(`${indent}    }`);
                }
            }
        }
        lines.push(`${indent}}`);
    }

    return lines;
}

function generateForEach(element: LayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    if (!element.items || !element.itemTemplate) {
        lines.push(`${indent}// forEach requires items and itemTemplate`);
        return lines;
    }

    // Compile limit expression if it's a Mapbox expression, otherwise use literal value
    const limitValue = element.limit || 10;
    const limitCode = isExpression(limitValue) ? compileExpr(limitValue, { platform: 'kotlin', context: 'value' }) : limitValue;

    lines.push(`${indent}data.${element.items}.take(${limitCode}).forEach { item ->`);
    lines.push(generateElement(element.itemTemplate, indent + '    ', defaultColor));
    lines.push(`${indent}}`);

    return lines;
}

function generateConditional(element: LayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    if (!element.condition) {
        lines.push(`${indent}// conditional requires condition property`);
        return lines;
    }

    const condition = compileExpr(element.condition, { platform: 'kotlin', context: 'condition' });

    lines.push(`${indent}if (${condition}) {`);
    if (element.then) {
        lines.push(generateElement(element.then, indent + '    ', defaultColor));
    }
    lines.push(`${indent}}`);

    if (element.else) {
        lines.push(`${indent}else {`);
        lines.push(generateElement(element.else, indent + '    ', defaultColor));
        lines.push(`${indent}}`);
    }

    return lines;
}

function generateClock(element: LayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    const fontSizeExpr = compileSpValue(element.fontSize, undefined);
    // Use element color if defined, otherwise fall back to defaultColor, otherwise use theme default
    let colorExpr: string;
    if (element.color !== undefined && element.color !== null) {
        colorExpr = compilePropValue(element.color, { platform: 'kotlin', formatter: (v: string) => formatColor(v, 'kotlin') }, 'GlanceTheme.colors.onSurface');
    } else if (defaultColor && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(defaultColor)) {
        // defaultColor is a simple identifier (variable name) - use directly
        colorExpr = defaultColor;
    } else if (defaultColor) {
        // defaultColor is an expression - compile it
        colorExpr = compilePropValue(defaultColor, { platform: 'kotlin', formatter: (v: string) => formatColor(v, 'kotlin') }, 'GlanceTheme.colors.onSurface');
    } else {
        colorExpr = 'GlanceTheme.colors.onSurface';
    }

    // Handle fontWeight with proper expression support and literal transformation
    const fontWeightExpr = compilePropValue(
        element.fontWeight,
        {
            platform: 'kotlin',
            formatter: (v: string) => toPlatformFontWeight(v, 'glance')
        },
        undefined
    );

    // Always use locale-aware time format (respects system 24h/12h and AM/PM preference)
    const timeExpr = `android.text.format.DateFormat.getTimeFormat(context).format(java.util.Date())`;

    lines.push(`${indent}Text(`);
    lines.push(`${indent}    text = ${timeExpr},`);

    const styleProps: string[] = [];
    if (fontSizeExpr) {
        styleProps.push(`fontSize = ${fontSizeExpr}`);
    }
    if (fontWeightExpr) {
        styleProps.push(`fontWeight = ${fontWeightExpr}`);
    }
    if (colorExpr) {
        styleProps.push(`color = ${colorExpr}`);
    }
    if (element.textAlign !== undefined) {
        const alignMap: Record<string, string> = { left: 'TextAlign.Start', center: 'TextAlign.Center', right: 'TextAlign.End' };
        if (isExpression(element.textAlign)) {
            const textAlignExpr = compileExpr(element.textAlign, { platform: 'kotlin', context: 'value', formatter: (v: string) => alignMap[v] || 'TextAlign.Start' });
            styleProps.push(`textAlign = ${textAlignExpr}`);
        } else {
            styleProps.push(`textAlign = ${alignMap[element.textAlign] || 'TextAlign.Start'}`);
        }
    }

    if (styleProps.length > 0) {
        lines.push(`${indent}    style = TextStyle(${styleProps.join(', ')})`);
    }

    lines.push(`${indent})`);

    return lines;
}

function generateDate(element: LayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    const fontSizeExpr = compileSpValue(element.fontSize, undefined);
    // Use element color if defined, otherwise fall back to defaultColor, otherwise use theme default
    let colorExpr: string;
    if (element.color !== undefined && element.color !== null) {
        colorExpr = compilePropValue(element.color, { platform: 'kotlin', formatter: (v: string) => formatColor(v, 'kotlin') }, 'GlanceTheme.colors.onSurface');
    } else if (defaultColor && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(defaultColor)) {
        // defaultColor is a simple identifier (variable name) - use directly
        colorExpr = defaultColor;
    } else if (defaultColor) {
        // defaultColor is an expression - compile it
        colorExpr = compilePropValue(defaultColor, { platform: 'kotlin', formatter: (v: string) => formatColor(v, 'kotlin') }, 'GlanceTheme.colors.onSurface');
    } else {
        colorExpr = 'GlanceTheme.colors.onSurface';
    }

    // Handle fontWeight with proper expression support and literal transformation
    const fontWeightExpr = compilePropValue(
        element.fontWeight,
        {
            platform: 'kotlin',
            formatter: (v: string) => toPlatformFontWeight(v, 'glance')
        },
        undefined
    );

    // Determine date expression based on style (use locale-aware formats)
    let dateExpr: string;
    if (element.format) {
        dateExpr = `android.text.format.DateFormat.format("${element.format}", java.util.Date()).toString()`;
    } else {
        switch (element.style) {
            case 'dayMonth':
                dateExpr = `run {
                    val mediumFormat = android.text.format.DateFormat.getMediumDateFormat(context)
                    if (mediumFormat is java.text.SimpleDateFormat) {
                        var pattern = mediumFormat.toPattern()
                        pattern = pattern.replace(Regex("[\\\\s,./-]*y+[\\\\s,./-]*"), "").trim()
                        java.text.SimpleDateFormat(pattern, java.util.Locale.getDefault()).format(java.util.Date())
                    } else {
                        mediumFormat.format(java.util.Date())
                    }
                }`;
                break;
            case 'fullDate':
                dateExpr = `android.text.format.DateFormat.getLongDateFormat(context).format(java.util.Date())`;
                break;
            case 'year':
                dateExpr = `android.text.format.DateFormat.format("yyyy", java.util.Date()).toString()`;
                break;
            case 'month':
                dateExpr = `android.text.format.DateFormat.format("MMMM", java.util.Date()).toString()`;
                break;
            case 'date':
            default:
                dateExpr = `android.text.format.DateFormat.getMediumDateFormat(context).format(java.util.Date())`;
                break;
        }
    }

    lines.push(`${indent}Text(`);
    lines.push(`${indent}    text = ${dateExpr},`);

    const styleProps: string[] = [];
    if (fontSizeExpr) {
        styleProps.push(`fontSize = ${fontSizeExpr}`);
    }
    if (colorExpr) {
        if (element.opacity !== undefined) {
            const opacityExpr = compilePropertyValue(element.opacity, {
                platform: 'kotlin',
                context: 'value',
                formatter: (v: number) => `${v}f`
            });
            colorExpr = `ColorProvider(widgetColor.getColor(context).copy(alpha = ${opacityExpr}))`;
        }
        styleProps.push(`color = ${colorExpr}`);
    }
    if (fontWeightExpr) {
        styleProps.push(`fontWeight = ${fontWeightExpr}`);
    }

    if (styleProps.length > 0) {
        lines.push(`${indent}    style = TextStyle(${styleProps.join(', ')})`);
    }

    lines.push(`${indent})`);

    return lines;
}

/**
 * Generate preview composable functions for a widget layout
 */
function generatePreviewBlock(layout: WidgetLayout, className: string): string[] {
    const lines: string[] = [];

    // Determine preview sizes
    let sizes: { width: number; height: number }[];
    if (layout.preview?.sizes && layout.preview.sizes.length > 0) {
        sizes = layout.preview.sizes;
    } else {
        sizes = [{ width: 260, height: 120 }];
    }

    // Build fakeData Kotlin constructor arguments
    const fakeData = layout.preview?.fakeData;
    const fakeDataLines: string[] = [];

    if (fakeData) {
        const scalar = (key: string, v: any) => `        ${key} = "${v}"`;

        const hourlyItem = (item: any) => {
            const props = [
                item.time !== undefined ? `time = "${item.time}"` : null,
                item.temperature !== undefined ? `temperature = "${item.temperature}"` : null,
                item.iconPath !== undefined ? `iconPath = "icon_themes/meteocons/images/${item.iconPath}.png"` : null,
                item.precipAccumulation !== undefined ? `precipAccumulation = "${item.precipAccumulation}"` : null,
                item.windSpeed !== undefined ? `windSpeed = "${item.windSpeed}"` : null,
                item.description !== undefined ? `description = "${item.description}"` : null,
                item.precipitation !== undefined ? `precipitation = "${item.precipitation}"` : null
            ].filter(Boolean);
            return `HourlyData(${props.join(', ')})`;
        };

        const dailyItem = (item: any) => {
            const props = [
                item.day !== undefined ? `day = "${item.day}"` : null,
                item.iconPath !== undefined ? `iconPath = "icon_themes/meteocons/images/${item.iconPath}.png"` : null,
                item.temperatureHigh !== undefined ? `temperatureHigh = "${item.temperatureHigh}"` : null,
                item.temperatureLow !== undefined ? `temperatureLow = "${item.temperatureLow}"` : null,
                item.precipAccumulation !== undefined ? `precipAccumulation = "${item.precipAccumulation}"` : null,
                item.precipitation !== undefined ? `precipitation = "${item.precipitation}"` : null,
                item.windSpeed !== undefined ? `windSpeed = "${item.windSpeed}"` : null,
                item.description !== undefined ? `description = "${item.description}"` : null
            ].filter(Boolean);
            return `DailyData(${props.join(', ')})`;
        };

        for (const [key, value] of Object.entries(fakeData)) {
            switch (key) {
                case 'temperature':
                case 'description':
                case 'locationName':
                case 'date':
                    fakeDataLines.push(`${scalar(key, value)},`);
                    break;
                case 'iconPath':
                    fakeDataLines.push(`${scalar(key, `icon_themes/meteocons/images/${value}.png`)},`);
                    break;
                case 'hourlyData':
                    fakeDataLines.push(`        hourlyData = listOf(${(value as any[]).map(hourlyItem).join(', ')}),`);
                    break;
                case 'dailyData':
                    fakeDataLines.push(`        dailyData = listOf(${(value as any[]).map(dailyItem).join(', ')}),`);
                    break;
            }
        }
    }
    fakeDataLines.push(`        lastUpdate = System.currentTimeMillis(),`);
    fakeDataLines.push(`        loadingState = WidgetLoadingState.LOADED`);

    // @Preview annotations (one per size)
    lines.push(`@OptIn(ExperimentalGlancePreviewApi::class)`);
    for (const size of sizes) {
        lines.push(`@Preview(widthDp = ${size.width}, heightDp = ${size.height})`);
    }
    lines.push(`@Composable`);
    lines.push(`private fun Preview() {`);
    lines.push(`    val fakeWeatherWidgetData = WeatherWidgetData(`);
    lines.push(...fakeDataLines);
    lines.push(`    )`);
    lines.push(`    ${className}(`);
    lines.push(`        config = WidgetConfig(), data = fakeWeatherWidgetData,`);
    lines.push(`    )`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`@OptIn(ExperimentalGlancePreviewApi::class)`);
    lines.push(`@Preview(widthDp = 260, heightDp = 120)`);
    lines.push(`@Composable`);
    lines.push(`private fun ErrorPreview() {`);
    lines.push(`    val fakeErrorWeatherWidgetData = WeatherWidgetData(`);
    lines.push(`        loadingState = WidgetLoadingState.ERROR,`);
    lines.push(`        errorMessage = "Unable to fetch weather data"`);
    lines.push(`    )`);
    lines.push(`    GlanceTheme(colors = WidgetTheme.colors) {`);
    lines.push(`        WidgetComposables.WidgetBackground {`);
    lines.push(`            WidgetComposables.NoDataContent(`);
    lines.push(`                WidgetLoadingState.ERROR,`);
    lines.push(`                fakeErrorWeatherWidgetData.errorMessage`);
    lines.push(`            )`);
    lines.push(`        }`);
    lines.push(`    }`);
    lines.push(`}`);
    lines.push(``);

    return lines;
}

/**
 * Generate the complete Kotlin file
 */
function generateKotlinFile(layout: WidgetLayout): string {
    const className = `${layout.name}Content`;
    const packageName = 'com.akylas.weather.widgets.generated';

    const fakeData = layout.preview?.fakeData;
    const needsHourlyData = fakeData && Array.isArray(fakeData.hourlyData) && fakeData.hourlyData.length > 0;
    const needsDailyData = fakeData && Array.isArray(fakeData.dailyData) && fakeData.dailyData.length > 0;

    const lines: string[] = [];

    lines.push(`package ${packageName}`);
    lines.push('');
    lines.push('import android.annotation.SuppressLint');
    lines.push('import androidx.compose.runtime.Composable');
    lines.push('import androidx.compose.ui.graphics.Color');
    lines.push('import androidx.compose.ui.unit.dp');
    lines.push('import androidx.compose.ui.unit.sp');
    lines.push('import androidx.glance.GlanceModifier');
    lines.push('import androidx.glance.GlanceTheme');
    lines.push('import androidx.glance.appwidget.cornerRadius');
    lines.push('import androidx.glance.Image');
    lines.push('import androidx.glance.ImageProvider');
    lines.push('import androidx.glance.LocalContext');
    lines.push('import androidx.glance.LocalSize');
    lines.push('import androidx.glance.background');
    lines.push('import androidx.glance.layout.*');
    lines.push('import androidx.glance.appwidget.lazy.LazyColumn');
    lines.push('import androidx.glance.appwidget.lazy.items');
    lines.push('import androidx.glance.text.FontWeight');
    lines.push('import androidx.glance.text.Text');
    lines.push('import androidx.glance.text.TextAlign');
    lines.push('import androidx.glance.text.TextStyle');
    lines.push('import androidx.glance.unit.ColorProvider');
    lines.push('import androidx.glance.preview.ExperimentalGlancePreviewApi');
    lines.push('import androidx.glance.preview.Preview');
    lines.push('import com.akylas.weather.widgets.WeatherWidgetData');
    lines.push('import com.akylas.weather.widgets.WeatherWidgetManager');
    lines.push('import com.akylas.weather.widgets.WidgetTheme');
    lines.push('import com.akylas.weather.widgets.WidgetConfig');
    lines.push('import com.akylas.weather.widgets.toColorIntRgba');
    if (needsHourlyData) {
        lines.push('import com.akylas.weather.widgets.HourlyData');
    }
    if (needsDailyData) {
        lines.push('import com.akylas.weather.widgets.DailyData');
    }
    lines.push('import com.akylas.weather.widgets.WidgetComposables');
    lines.push('import com.akylas.weather.widgets.WidgetLoadingState');
    lines.push('import kotlin.math.min');
    lines.push('import kotlinx.serialization.json.*');
    lines.push('');
    lines.push('/**');
    lines.push(` * Generated content for ${layout.displayName || layout.name}`);
    lines.push(' * DO NOT EDIT - This file is auto-generated from JSON layout definitions');
    lines.push(' */');
    lines.push('');

    // Generate preview functions if enabled
    if (layout.generatePreviews === true) {
        lines.push(...generatePreviewBlock(layout, className));
    }

    lines.push('@SuppressLint("RestrictedApi")');
    lines.push('@Composable');
    lines.push(`fun ${className}(config: WidgetConfig, data: WeatherWidgetData) {`);
    lines.push('    val context = LocalContext.current');
    lines.push('    val fontScale = context.resources.configuration.fontScale');
    lines.push('    val ignoreFontScale = config.settings?.get("ignoreFontScale")?.jsonPrimitive?.booleanOrNull ?: false');
    lines.push('    val fontScaleFactor = if (ignoreFontScale) 1.0f/fontScale else 1.0f;');
    lines.push('    val size = LocalSize.current');

    // Compile top-level color if present
    let defaultColorRef: string | undefined;
    if (layout.color !== undefined) {
        const colorExpr = compilePropValue(layout.color, { platform: 'kotlin', formatter: (v: string) => formatTextColor(v) }, undefined);
        // Wrap config.settings.color with hex parsing
        const wrappedColor = wrapColorParsingKotlin(colorExpr);
        lines.push(`    val widgetColor = ${wrappedColor}`);
        defaultColorRef = 'widgetColor';
    } else {
        lines.push(`    val widgetColor = GlanceTheme.colors.onSurface`);
    }
    lines.push('');

    // Generate the main content
    lines.push(generateElement(layout.layout, '    ', defaultColorRef));

    lines.push('}');
    lines.push('');

    // Don't generate data classes - they already exist in WeatherWidgetManager
    lines.push('// Data classes (WeatherWidgetData, HourlyForecast, DailyForecast) are defined in WeatherWidgetManager');

    return lines.join('\n');
}

/**
 * Main function
 */
function main() {
    const widgetsDir = path.join(__dirname, '../../src/widgets');
    const outputDir = path.join(__dirname, '../../platforms/android/java/com/akylas/weather/widgets/generated');

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Process all widget JSON files (excluding backups and test files)
    const files = fs.readdirSync(widgetsDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
        const filePath = path.join(widgetsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const layout: WidgetLayout = JSON.parse(content);

        console.log(`Generating Glance code for ${layout.name}...`);

        const kotlinCode = generateKotlinFile(layout);
        const outputPath = path.join(outputDir, `${layout.name}Content.generated.kt`);
        fs.writeFileSync(outputPath, kotlinCode, 'utf-8');

        console.log(`  → ${outputPath}`);
    }

    console.log('\nGlance code generation complete!');
}

if (require.main === module) {
    main();
}

export { generateElement, generateKotlinFile };
