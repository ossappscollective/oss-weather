#!/usr/bin/env node
/**
 * iOS SwiftUI Code Generator
 * Generates SwiftUI widget views from JSON layout definitions with Mapbox expression support
 *
 * CLI:
 *  -i, --input <layoutsDir>    Input directory with .json layouts (default: ../widgets)
 *  -o, --output <outputDir>    Output directory for generated Swift files (default: App_Resources iOS widgets generated)
 *  -w, --widget <widgetName>   Only generate a single widget (by layout.name or filename). If omitted, generate all.
 *  -h, --help                  Show usage
 */

import * as fs from 'fs';
import * as path from 'path';
import { Expression, compileExpression, compilePropertyValue as compilePropValue } from './expression-compiler';
import { BaseLayoutElement, getSettingKey, getSingleBinding, hasTemplateBinding, isExpression, isSettingReference, resolveTemplates, toPlatformFontWeight } from './shared-utils';
import { DEFAULT_COLOR_MAPS } from './modifier-builders';
import { compilePropertyValue } from './expression-compiler';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FONT_SIZE = 12;
const DEFAULT_IMAGE_SIZE = 48;
const DEFAULT_LOOP_LIMIT = 10;
const DEFAULT_PADDING = 8;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// EXPRESSION & TEMPLATE HANDLING
// ============================================================================

/**
 * Compile an expression or value to Swift code
 */
function compileToSwift(value: Expression | undefined, defaultValue: string = '""'): string {
    if (value === undefined) return defaultValue;

    // Handle template strings with {{}} bindings
    if (typeof value === 'string' && hasTemplateBinding(value)) {
        return convertTemplateToSwift(value);
    }

    // Handle Mapbox expressions
    if (isExpression(value)) {
        return compileExpression(value, {
            platform: 'swift',
            context: 'value'
        });
    }

    // Handle literal values
    if (typeof value === 'string') {
        return `"${escapeSwiftString(value)}"`;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'boolean') {
        return String(value);
    }

    return defaultValue;
}

/**
 * Compile an expression to Swift condition (for if statements)
 */
function compileConditionToSwift(condition: Expression | undefined): string {
    if (condition === undefined) return 'true';

    // Handle Mapbox expressions
    if (isExpression(condition)) {
        return compileExpression(condition, {
            platform: 'swift',
            context: 'condition'
        });
    }

    // Handle string conditions (legacy format)
    if (typeof condition === 'string') {
        // Replace size.width/height references
        return condition.replace(/size\.width/g, 'width').replace(/size\.height/g, 'height');
    }

    return 'true';
}

/**
 * Convert template string {{property}} to Swift string interpolation
 */
function convertTemplateToSwift(template: string): string {
    // Check if it's a single binding
    const singleBinding = getSingleBinding(template);
    if (singleBinding) {
        const normalized = normalizeDataPath(singleBinding);
        return `String(describing: ${normalized})`;
    }

    // Multiple bindings or mixed text - convert to Swift string interpolation
    const swiftString = template.replace(/\{\{([^}]+)\}\}/g, (_, prop) => {
        const normalized = normalizeDataPath(prop.trim());
        return `\\(String(describing: ${normalized}))`;
    });

    return `"${escapeSwiftString(swiftString)}"`;
}

/**
 * Normalize a property path for Swift
 * - 'temperature' -> 'data.temperature'
 * - 'item.hour' -> 'item.hour'
 * - 'data.temperature' -> 'data.temperature'
 * - 'size.width' -> 'width'
 */
function normalizeDataPath(raw: string): string {
    const p = raw.trim();

    // Size properties map to geometry variables
    if (p === 'size.width') return 'width';
    if (p === 'size.height') return 'height';
    if (p.startsWith('size.')) return p.replace('size.', '');

    // Item and data paths are already prefixed
    if (p.startsWith('data.') || p.startsWith('item.') || p.startsWith('config.')) {
        return p;
    }

    // Add data prefix
    return `data.${p}`;
}

/**
 * Escape string for Swift string literals
 */
function escapeSwiftString(str: string): string {
    // Handle Swift interpolation specially
    const placeholder = '__SWIFT_INTERP__';
    const withPlaceholders = str.replace(/\\\(/g, placeholder);
    const escaped = withPlaceholders.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return escaped.replace(new RegExp(placeholder, 'g'), '\\(');
}

// ============================================================================
// PROPERTY COMPILATION HELPERS
// ============================================================================

/**
 * Convert font weight to Swift weight token
 * Supports both literal values and expressions (including config.settings.*)
 */
function toSwiftFontWeight(weight?: Expression, fallback: string = 'normal'): string {
    if (weight === undefined) {
        return toPlatformFontWeight(fallback, 'swift');
    }

    // Use compileExpression for all non-literal values (expressions, config.settings, etc.)
    if (isExpression(weight)) {
        return compilePropValue(
            weight,
            {
                platform: 'swift',
                formatter: (v: string) => toPlatformFontWeight(v, 'swift')
            },
            toPlatformFontWeight(fallback, 'swift')
        );
    }

    // Handle string literals (including numeric weight values like '700')
    if (typeof weight === 'string') {
        const key = weight.toLowerCase();
        if (/^(700|800|900)$/.test(key)) return toPlatformFontWeight('bold', 'swift');
        if (/^(500|600)$/.test(key)) return toPlatformFontWeight('medium', 'swift');
        return toPlatformFontWeight(key, 'swift');
    }

    // Handle expressions
    if (isExpression(weight)) {
        return compileExpression(weight, {
            platform: 'swift',
            context: 'value'
        });
    }

    return toPlatformFontWeight(fallback, 'swift');
}

/**
 * Convert alignment to SwiftUI alignment
 * Also handles expression-based alignments (case/conditional expressions)
 */
function toSwiftAlignment(alignment?: any, crossAlignment?: any, isVertical: boolean = true): string {
    if (isVertical) {
        // For VStack: crossAlignment is horizontal
        const hAlign = crossAlignment;
        if (isExpression(hAlign)) {
            // Compile the expression and map enum values to SwiftUI alignment
            const compiled = compileExpression(hAlign, {
                platform: 'swift',
                context: 'value',
                formatter: (v: string) => {
                    switch (v) {
                        case 'start':
                            return '.leading';
                        case 'end':
                            return '.trailing';
                        case 'center':
                            return '.center';
                        default:
                            return '.center';
                    }
                }
            });
            return compiled;
        }
        const h = (hAlign as string) || 'center';
        switch (h) {
            case 'start':
                return '.leading';
            case 'center':
                return '.center';
            case 'end':
                return '.trailing';
            case 'stretch':
                return '.leading';
            default:
                return '.center';
        }
    } else {
        // For HStack: crossAlignment is vertical
        const vAlign = crossAlignment;
        if (isExpression(vAlign)) {
            const compiled = compileExpression(vAlign, {
                platform: 'swift',
                context: 'value',
                formatter: (v: string) => {
                    switch (v) {
                        case 'start':
                            return '.top';
                        case 'end':
                            return '.bottom';
                        case 'center':
                            return '.center';
                        default:
                            return '.center';
                    }
                }
            });
            return compiled;
        }
        const v = (vAlign as string) || 'center';
        switch (v) {
            case 'start':
                return '.top';
            case 'center':
                return '.center';
            case 'end':
                return '.bottom';
            default:
                return '.center';
        }
    }
}

/**
 * Convert color reference to Swift
 */
function toSwiftColor(color?: Expression): string {
    if (color === undefined) return 'WidgetColorProvider.onSurface';

    // Handle string colors
    if (typeof color === 'string') {
        if (color.startsWith('#')) {
            return `Color(hex: "${color}")`;
        }
        return DEFAULT_COLOR_MAPS.swift[color] || 'WidgetColorProvider.onSurface';
    }

    // Handle expressions
    if (isExpression(color)) {
        return compileExpression(color, {
            platform: 'swift',
            context: 'value',
            formatter: (v: string) => {
                if (v.startsWith('#')) {
                    return `Color(hex: "${v}")`;
                }
                return DEFAULT_COLOR_MAPS.swift[v] || 'WidgetColorProvider.onSurface';
            }
        });
    }

    return 'WidgetColorProvider.onSurface';
}

/**
 * Wrap color expression with hex parsing for config.settings.color references
 */
function wrapColorParsingSwift(colorExpr: string): string {
    // If the expression contains config.settings, wrap with Color parsing
    if (colorExpr.includes('entry.config.settings')) {
        // Wrap with UIColor hex parsing
        return `(${colorExpr} as? String).flatMap { Color(UIColor(hexString: $0)) } ?? WidgetColorProvider.onSurface`;
    }
    return colorExpr;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate spacing value from element property
 * Handles both literal numbers and expressions
 */
function calculateSpacing(element: BaseLayoutElement): number | string {
    if (element.spacing === undefined) return 0;
    if (typeof element.spacing === 'number') return element.spacing;
    return compileToSwift(element.spacing, '0');
}

/**
 * Compile a size (fontSize, size, etc.) to Swift
 * Handles both literal numbers and expressions
 */
function compileSizeToSwift(value: any, defaultVal: number): string {
    if (value === undefined) return String(defaultVal);
    if (typeof value === 'number') return String(value);
    if (isExpression(value)) {
        return compileExpression(value, { platform: 'swift', context: 'value' });
    }
    return String(value);
}

/**
 * Compile a dimension to Swift dp/pt value (no .dp suffix needed in Swift)
 */
function compileDimToSwift(value: any, defaultVal: number): string {
    if (value === undefined) return String(defaultVal);
    if (typeof value === 'number') return String(value);
    if (isExpression(value)) {
        return compileExpression(value, { platform: 'swift', context: 'value' });
    }
    return String(value);
}

/**
 * Build SwiftUI view modifiers for sizing (fill/frame/flex)
 * Returns array of modifier strings like ".frame(maxWidth: .infinity)"
 */
function buildSwiftSizeModifiers(element: BaseLayoutElement): string[] {
    const mods: string[] = [];
    if (element.fillMaxSize) {
        mods.push('.frame(maxWidth: .infinity, maxHeight: .infinity)');
    } else {
        if (element.fillWidth) {
            mods.push('.frame(maxWidth: .infinity)');
        } else if (element.width !== undefined && !isExpression(element.width)) {
            mods.push(`.frame(width: ${element.width})`);
        }
        if (element.fillHeight) {
            mods.push('.frame(maxHeight: .infinity)');
        } else if (element.height !== undefined && !isExpression(element.height)) {
            mods.push(`.frame(height: ${element.height})`);
        }
    }
    return mods;
}

/**
 * Build a SwiftUI padding modifier string from element padding properties
 */
function buildSwiftPaddingModifier(element: BaseLayoutElement): string[] {
    const mods: string[] = [];

    if (element.padding !== undefined) {
        const v = compileDimToSwift(element.padding, 0);
        mods.push(`.padding(${v})`);
    }
    if (element.paddingHorizontal !== undefined && element.paddingVertical !== undefined) {
        const h = compileDimToSwift(element.paddingHorizontal, 0);
        const v2 = compileDimToSwift(element.paddingVertical, 0);
        mods.push(`.padding(.horizontal, ${h})`);
        mods.push(`.padding(.vertical, ${v2})`);
    } else {
        if (element.paddingHorizontal !== undefined) {
            const h = compileDimToSwift(element.paddingHorizontal, 0);
            mods.push(`.padding(.horizontal, ${h})`);
        }
        if (element.paddingVertical !== undefined) {
            const v2 = compileDimToSwift(element.paddingVertical, 0);
            mods.push(`.padding(.vertical, ${v2})`);
        }
    }
    if (element.paddingTop !== undefined) {
        const v = compileDimToSwift(element.paddingTop, 0);
        mods.push(`.padding(.top, ${v})`);
    }
    if (element.paddingBottom !== undefined) {
        const v = compileDimToSwift(element.paddingBottom, 0);
        mods.push(`.padding(.bottom, ${v})`);
    }
    if (element.paddingLeft !== undefined) {
        const v = compileDimToSwift(element.paddingLeft, 0);
        mods.push(`.padding(.leading, ${v})`);
    }
    if (element.paddingRight !== undefined) {
        const v = compileDimToSwift(element.paddingRight, 0);
        mods.push(`.padding(.trailing, ${v})`);
    }

    return mods;
}

/**
 * Apply all visual modifiers (size, padding, background, cornerRadius, opacity) to a view's last line
 */
function applySwiftModifiers(lines: string[], element: BaseLayoutElement): void {
    const sizeModifiers = buildSwiftSizeModifiers(element);
    const paddingModifiers = buildSwiftPaddingModifier(element);
    const allMods = [...sizeModifiers, ...paddingModifiers];

    if (element.backgroundColor) {
        const bgColor = toSwiftColor(element.backgroundColor);
        allMods.push(`.background(${bgColor})`);
    }
    if (element.cornerRadius) {
        const radius = compileDimToSwift(element.cornerRadius, 0);
        allMods.push(`.cornerRadius(${radius})`);
    }
    if (element.flex !== undefined) {
        // In SwiftUI, flex is handled by Spacer() inside containers, but when set on a
        // container element itself it means it should expand. Use layoutPriority for this.
        allMods.push('.layoutPriority(1)');
    }

    // Add opacity modifier (only this new modifier to avoid duplicates)
    if (element.opacity !== undefined) {
        const opacityExpr = compilePropertyValue(element.opacity, {
            platform: 'swift',
            context: 'value',
            formatter: (v: number) => `${v}`
        });
        if (opacityExpr) {
            allMods.push(`.opacity(${opacityExpr})`);
        }
    }

    if (allMods.length > 0) {
        // Append all modifiers to the last line
        lines[lines.length - 1] += allMods.join('');
    }
}

// ============================================================================
// ELEMENT GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate Swift code for an element
 */
function generateElement(element: BaseLayoutElement, indent: string = '                ', defaultColor?: string): string {
    const lines: string[] = [];

    // Handle visibility condition
    const wrapWithIf = element.visibleIf !== undefined;
    const currentIndent = wrapWithIf ? indent + '    ' : indent;

    if (wrapWithIf) {
        const condition = compileConditionToSwift(element.visibleIf);
        lines.push(`${indent}if ${condition} {`);
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
        case 'chips':
            lines.push(...generateChips(element, currentIndent, defaultColor));
            break;
        case 'hourlyChart':
            lines.push(...generateHourlyChart(element, currentIndent, defaultColor));
            break;
        default:
            lines.push(`${currentIndent}// Unknown element type: ${element.type}`);
    }

    if (wrapWithIf) {
        lines.push(`${indent}}`);
    }

    return lines.join('\n');
}

function generateColumn(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];
    const spacing = calculateSpacing(element);
    const alignment = toSwiftAlignment(element.alignment, element.crossAlignment, true);

    lines.push(`${indent}VStack(alignment: ${alignment}, spacing: ${spacing}) {`);

    if (element.children) {
        for (const child of element.children) {
            // flex: 1 child in a column = flexible vertical spacer → Spacer()
            if (child.type === 'spacer' && child.flex !== undefined) {
                lines.push(`${indent}    Spacer()`);
            } else {
                lines.push(generateElement(child, indent + '    ', defaultColor));
            }
        }
    }

    lines.push(`${indent}}`);
    applySwiftModifiers(lines, element);

    return lines;
}

function generateRow(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];
    const spacing = calculateSpacing(element);
    const alignment = toSwiftAlignment(element.alignment, element.crossAlignment, false);

    lines.push(`${indent}HStack(alignment: ${alignment}, spacing: ${spacing}) {`);

    if (element.children) {
        for (const child of element.children) {
            // flex: 1 child in a row = flexible horizontal spacer → Spacer()
            if (child.type === 'spacer' && child.flex !== undefined) {
                lines.push(`${indent}    Spacer()`);
            } else {
                lines.push(generateElement(child, indent + '    ', defaultColor));
            }
        }
    }

    lines.push(`${indent}}`);
    applySwiftModifiers(lines, element);

    return lines;
}

function generateStack(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    // Convert contentAlignment to SwiftUI ZStack alignment
    const contentAlignment = (element as any).contentAlignment as string | undefined;
    let stackAlignment = '';
    if (contentAlignment) {
        const alignMap: Record<string, string> = {
            TopStart: '.topLeading',
            TopCenter: '.top',
            TopEnd: '.topTrailing',
            CenterStart: '.leading',
            Center: '.center',
            CenterEnd: '.trailing',
            BottomStart: '.bottomLeading',
            BottomCenter: '.bottom',
            BottomEnd: '.bottomTrailing'
        };
        const mapped = alignMap[contentAlignment];
        if (mapped) stackAlignment = `alignment: ${mapped}`;
    }

    lines.push(`${indent}ZStack${stackAlignment ? `(${stackAlignment})` : ''} {`);

    if (element.children) {
        for (const child of element.children) {
            if (child.type === 'spacer' && child.flex !== undefined) {
                lines.push(`${indent}    Spacer()`);
            } else {
                lines.push(generateElement(child, indent + '    ', defaultColor));
            }
        }
    }

    lines.push(`${indent}}`);
    applySwiftModifiers(lines, element);

    return lines;
}

function generateLabel(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];

    // Compile text expression
    const textExpr = compileToSwift(element.text, '""');

    lines.push(`${indent}Text(${textExpr})`);

    // Font size - supports expressions (min/max)
    const fontSize = compileSizeToSwift(element.fontSize, DEFAULT_FONT_SIZE);
    const fontWeight = toSwiftFontWeight(element.fontWeight);
    lines.push(`${indent}    .font(.system(size: ${fontSize}, weight: ${fontWeight}))`);

    // Color - use element color if defined, otherwise fall back to defaultColor, otherwise use theme default
    let color: string;
    if (element.color !== undefined && element.color !== null) {
        color = toSwiftColor(element.color);
    } else if (defaultColor && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(defaultColor)) {
        // defaultColor is a simple identifier (variable name) - use directly
        color = defaultColor;
    } else if (defaultColor) {
        // defaultColor is an expression - compile it
        color = toSwiftColor(defaultColor);
    } else {
        color = 'WidgetColorProvider.onSurface';
    }
    lines.push(`${indent}    .foregroundColor(${color})`);

    // Text alignment - supports expressions
    if (element.textAlign !== undefined) {
        if (isExpression(element.textAlign)) {
            const compiled = compileExpression(element.textAlign, {
                platform: 'swift',
                context: 'value',
                formatter: (v: string) => {
                    if (v === 'center') return '.center';
                    if (v === 'right' || v === 'end') return '.trailing';
                    return '.leading';
                }
            });
            lines.push(`${indent}    .multilineTextAlignment(${compiled})`);
        } else {
            const align = element.textAlign === 'center' ? 'center' : element.textAlign === 'right' || element.textAlign === 'end' ? 'trailing' : 'leading';
            lines.push(`${indent}    .multilineTextAlignment(.${align})`);
        }
    }

    // Line limit
    if (element.maxLines) {
        const maxLines = typeof element.maxLines === 'number' ? element.maxLines : compileToSwift(element.maxLines, '1');
        lines.push(`${indent}    .lineLimit(${maxLines})`);
    }

    // Apply padding/background/cornerRadius modifiers
    applySwiftModifiers(lines, element);

    return lines;
}

function generateImage(element: BaseLayoutElement, indent: string): string[] {
    const lines: string[] = [];
    const size = compileSizeToSwift(element.size, DEFAULT_IMAGE_SIZE);

    // Compile src expression
    const srcExpr = compileToSwift(element.src, '"default_icon"');

    lines.push(`${indent}WeatherIconView(${srcExpr}, description: data.description, size: ${size})`);
    applySwiftModifiers(lines, element);

    return lines;
}

function generateSpacer(element: BaseLayoutElement, indent: string): string[] {
    if (element.size !== undefined) {
        const size = typeof element.size === 'number' ? element.size : compileToSwift(element.size, '8');
        // Use width for horizontal spacers, height for vertical spacers
        const dimension = element.direction === 'horizontal' ? 'width' : 'height';
        return [`${indent}Spacer().frame(${dimension}: ${size})`];
    }
    return [`${indent}Spacer()`];
}

function generateDivider(element: BaseLayoutElement, indent: string): string[] {
    const color = toSwiftColor(element.color || 'onSurfaceVariant');
    const thickness = typeof element.thickness === 'number' ? element.thickness : element.thickness ? compileToSwift(element.thickness, '1') : 1;
    return [`${indent}Divider().frame(height: ${thickness}).background(${color}.opacity(0.3))`];
}

function generateScrollView(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];
    const axis = element.direction === 'horizontal' ? '.horizontal' : '.vertical';

    lines.push(`${indent}ScrollView(${axis}, showsIndicators: false) {`);

    if (element.children) {
        const containerType = element.direction === 'horizontal' ? 'HStack' : 'VStack';
        lines.push(`${indent}    ${containerType}(spacing: 8) {`);
        for (const child of element.children) {
            lines.push(generateElement(child, indent + '        ', defaultColor));
        }
        lines.push(`${indent}    }`);
    }

    lines.push(`${indent}}`);

    return lines;
}

function generateForEach(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];
    const items = element.items || 'items';
    const limit = element.limit;

    const dataPath = items.includes('.') ? items : `data.${items}`;

    // Handle limit expression
    let prefix: string;
    if (limit !== undefined) {
        const limitValue = typeof limit === 'number' ? limit : compileToSwift(limit, String(DEFAULT_LOOP_LIMIT));
        prefix = `${dataPath}.prefix(${limitValue})`;
    } else {
        prefix = dataPath;
    }

    lines.push(`${indent}ForEach(Array(${prefix}.enumerated()), id: \\.offset) { index, item in`);

    if (element.itemTemplate) {
        lines.push(generateElement(element.itemTemplate, indent + '    ', defaultColor));
    }

    lines.push(`${indent}}`);

    return lines;
}

function swiftNumber(value: Expression | undefined, defaultValue: number) {
    return value === undefined ? String(defaultValue) : compileToSwift(value, String(defaultValue));
}

function swiftDefaultColor(defaultColor?: string) {
    return defaultColor && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(defaultColor) ? defaultColor : 'WidgetColorProvider.onSurface';
}

// modern weather data chips (ModernComponents.swift): content sized, wrapping on maxRows rows of maxWidth
function generateChips(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const items = element.items || 'chips';
    // data chips are optional (older app data), item chips are not
    const list = items.startsWith('item.') ? items : `(data.${items} ?? [])`;
    const lines = [
        `${indent}WidgetChipsView(chips: ${list}, color: ${swiftDefaultColor(defaultColor)}, fontSize: ${swiftNumber(element.fontSize, 12)}, iconSize: ${swiftNumber(element.iconSize, 14)}, spacing: ${swiftNumber(element.chipSpacing, 4)}, limit: ${swiftNumber(element.limit, 4)}, maxWidth: ${swiftNumber(element.maxWidth, 10000)}, maxRows: ${swiftNumber(element.maxRows, 1)})`
    ];
    applySwiftModifiers(lines, element);
    return lines;
}

// the app hourly card chart (ModernComponents.swift): temperature curve and values, precipitation
function generateHourlyChart(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const items = element.items || 'hourlyData';
    const lines = [
        `${indent}WidgetHourlyChartView(hours: ${items.startsWith('item.') ? items : `data.${items}`}, limit: ${swiftNumber(element.limit, 6)}, color: ${swiftDefaultColor(defaultColor)}, fontSize: ${swiftNumber(element.fontSize, 13)})`
    ];
    applySwiftModifiers(lines, { ...element, height: element.height ?? 80 });
    return lines;
}

function generateConditional(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const lines: string[] = [];
    const condition = compileConditionToSwift(element.condition);

    lines.push(`${indent}if ${condition} {`);
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

function generateClock(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const fontSize = compileSizeToSwift(element.fontSize, 24);
    const fontWeight = toSwiftFontWeight(element.fontWeight, 'bold');
    // Use element color if defined, otherwise fall back to defaultColor, otherwise use theme default
    let color: string;
    if (element.color !== undefined && element.color !== null) {
        color = toSwiftColor(element.color);
    } else if (defaultColor && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(defaultColor)) {
        color = defaultColor;
    } else if (defaultColor) {
        color = toSwiftColor(defaultColor);
    } else {
        color = 'WidgetColorProvider.onSurface';
    }

    const lines: string[] = [];
    // Always use locale-aware time (respects system 24h/12h and AM/PM preference)
    lines.push(`${indent}Text(Date(), style: .time)`);
    lines.push(`${indent}    .font(.system(size: ${fontSize}, weight: ${fontWeight}))`);
    lines.push(`${indent}    .foregroundColor(${color})`);

    return lines;
}

function generateDate(element: BaseLayoutElement, indent: string, defaultColor?: string): string[] {
    const fontSize = compileSizeToSwift(element.fontSize, 14);
    const fontWeight = toSwiftFontWeight(element.fontWeight, 'normal');
    // Use element color if defined, otherwise fall back to defaultColor, otherwise use theme default
    let color: string;
    if (element.color !== undefined && element.color !== null) {
        color = toSwiftColor(element.color);
    } else if (defaultColor && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(defaultColor)) {
        color = defaultColor;
    } else if (defaultColor) {
        color = toSwiftColor(defaultColor);
    } else {
        color = 'WidgetColorProvider.onSurface';
    }
    const style = (element as any).style as string | undefined;

    const lines: string[] = [];

    if (style === 'dayMonth') {
        lines.push(`${indent}Text({`);
        lines.push(`${indent}    let f = DateFormatter()`);
        lines.push(`${indent}    f.setLocalizedDateFormatFromTemplate("MMMd")`);
        lines.push(`${indent}    return f.string(from: Date())`);
        lines.push(`${indent}}())`);
    } else if (style === 'fullDate') {
        lines.push(`${indent}Text({`);
        lines.push(`${indent}    let f = DateFormatter()`);
        lines.push(`${indent}    f.dateStyle = .long`);
        lines.push(`${indent}    f.timeStyle = .none`);
        lines.push(`${indent}    return f.string(from: Date())`);
        lines.push(`${indent}}())`);
    } else if (style === 'year') {
        lines.push(`${indent}Text({`);
        lines.push(`${indent}    let f = DateFormatter()`);
        lines.push(`${indent}    f.dateFormat = "yyyy"`);
        lines.push(`${indent}    return f.string(from: Date())`);
        lines.push(`${indent}}())`);
    } else if (style === 'month') {
        lines.push(`${indent}Text({`);
        lines.push(`${indent}    let f = DateFormatter()`);
        lines.push(`${indent}    f.dateFormat = "MMMM"`);
        lines.push(`${indent}    return f.string(from: Date())`);
        lines.push(`${indent}}())`);
    } else {
        lines.push(`${indent}Text(Date(), style: .date)`);
    }
    lines.push(`${indent}    .font(.system(size: ${fontSize}, weight: ${fontWeight}))`);
    lines.push(`${indent}    .foregroundColor(${color})`);

    return lines;
}

/**
 * Generate the complete Swift widget view file
 */
function generateWidgetView(layout: WidgetLayout): string {
    const name = layout.name;
    const viewName = `${name}View`;

    // Handle default padding - it could be an expression
    let defaultPadding = String(DEFAULT_PADDING);
    if (layout.defaultPadding !== undefined) {
        if (typeof layout.defaultPadding === 'number') {
            defaultPadding = String(layout.defaultPadding);
        } else if (isExpression(layout.defaultPadding)) {
            defaultPadding = compileExpression(layout.defaultPadding, {
                platform: 'swift',
                context: 'value'
            });
        }
    }

    let code = `// Auto-generated from ${name}.json - DO NOT EDIT MANUALLY
// Generated by widget-layouts/generators/swift-generator.ts

import SwiftUI
import WidgetKit

@available(iOS 14.0, *)
struct ${viewName}: View {
    let entry: WeatherEntry
    @Environment(\\.widgetFamily) var family
    
    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height
            let config = entry.config ?? WidgetConfig()
            `;

    // Compile top-level color if present
    let defaultColorRef: string | undefined;
    if (layout.color !== undefined) {
        const colorExpr = toSwiftColor(layout.color);
        const wrappedColor = wrapColorParsingSwift(colorExpr);
        code += `let widgetColor = ${wrappedColor}\n            `;
        defaultColorRef = 'widgetColor';
    }

    code += `
            if let data = entry.data, entry.data?.loadingState == WeatherWidgetData.LoadingState.loaded {
                WidgetContainer(padding: ${defaultPadding}) {
`;

    // Generate variant conditions
    if (layout.variants && layout.variants.length > 0) {
        for (let i = 0; i < layout.variants.length; i++) {
            const variant = layout.variants[i];
            const condition = compileConditionToSwift(variant.condition);
            const keyword = i === 0 ? 'if' : '} else if';

            code += `                    ${keyword} ${condition} {\n`;
            code += generateElement(variant.layout, '                        ', defaultColorRef) + '\n';
        }

        // Default layout
        code += `                    } else {\n`;
        code += generateElement(layout.layout, '                        ', defaultColorRef) + '\n';
        code += `                    }\n`;
    } else {
        code += generateElement(layout.layout, '                    ', defaultColorRef) + '\n';
    }

    code += `                }
            } else {
                NoDataView(state: entry.data?.loadingState ?? WeatherWidgetData.LoadingState.none, errorMessage: entry.data?.errorMessage)
            }
        }
    }
}
`;

    return code;
}

/**
 * Find all .json files recursively under `dir`.
 */
function findJsonFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findJsonFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            files.push(full);
        }
    }
    return files;
}

/**
 * Generate all widget views from JSON layouts
 */
export function generateAllWidgets(layoutsDir: string, outputDir: string, widgetName?: string): void {
    console.log(`Swift generator: scanning layouts in ${layoutsDir}`);
    // let widgetFiles = findJsonFiles(layoutsDir);
    let widgetFiles = fs.readdirSync(layoutsDir).filter((f) => f.endsWith('.json'));

    // Inform the user
    console.log(`Swift generator: found ${widgetFiles.length} layout JSON file(s) under ${layoutsDir}`);
    if (widgetFiles.length === 0) {
        console.warn(`No layout JSON files found in ${layoutsDir}. Nothing to do.`);
        return;
    }

    // If a widgetName is provided, try to resolve to 1+ JSON files:
    if (widgetName) {
        const matches: string[] = [];

        // First, exact filename match among discovered files
        for (const filepath of widgetFiles) {
            if (path.basename(filepath) === `${widgetName}.json` || path.basename(filepath, '.json') === widgetName) {
                matches.push(filepath);
            }
        }

        // If none by filename, look inside JSON layout.name to find a matching layout
        if (matches.length === 0) {
            for (const f of widgetFiles) {
                try {
                    const layout: WidgetLayout = JSON.parse(fs.readFileSync(f, 'utf-8'));
                    if (layout.name === widgetName) {
                        matches.push(f);
                    }
                } catch {
                    // ignore parse error for this lookup
                }
            }
        }

        if (matches.length === 0) {
            console.error(`No widget named "${widgetName}" found under ${layoutsDir}`);
            return;
        }

        // Replace widgetFiles with absolute paths we've resolved
        widgetFiles = matches.map((p) => (path.isAbsolute(p) ? p : path.join(layoutsDir, p)));
    } else {
        // Already absolute paths from findJsonFiles
        widgetFiles = widgetFiles.map((f) => (path.isAbsolute(f) ? f : path.join(layoutsDir, f)));
    }

    console.log(`Swift generator: generating ${widgetFiles.length} widget(s) to ${outputDir}`);

    for (const layoutFilePath of widgetFiles) {
        try {
            const layout: WidgetLayout = resolveTemplates(JSON.parse(fs.readFileSync(layoutFilePath, 'utf-8')), path.join(path.dirname(layoutFilePath), 'templates'));

            const swiftCode = generateWidgetView(layout);
            const fileName = `${layout.name}View.generated.swift`;
            const outputPath = path.join(outputDir, fileName);

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(outputPath, swiftCode);
            console.log(`Generated: ${outputPath}`);
        } catch (e) {
            console.error(`Failed to generate widget from ${layoutFilePath}:`, (e as Error).message);
        }
    }
}

// CLI entry point
if (require.main === module) {
    const args = process.argv.slice(2);
    let layoutsDir = path.join(__dirname, '..', '..', 'src', 'widgets');
    let outputDir = path.join(__dirname, '..', '..', 'platforms', 'ios', 'extensions', 'widgets', 'generated');
    let widgetName: string | undefined;
    let showHelp = false;

    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        switch (a) {
            case '-i':
            case '--input':
                layoutsDir = args[++i] ?? layoutsDir;
                break;
            case '-o':
            case '--output':
                outputDir = args[++i] ?? outputDir;
                break;
            case '-w':
            case '--widget':
            case '--single':
            case '-s':
                widgetName = args[++i];
                break;
            case '-h':
            case '--help':
                showHelp = true;
                break;
            default:
                // allow some positional args: first arg could be layoutsDir, second is outputDir
                if (!layoutsDir || layoutsDir === path.join(__dirname, '..', '..', 'src', 'widgets')) {
                    layoutsDir = a;
                } else if (!outputDir || outputDir === path.join(__dirname, '..', '..', 'platforms', 'ios', 'extensions', 'widgets', 'generated')) {
                    outputDir = a;
                } else {
                    // ignore unknown
                }
                break;
        }
    }

    if (showHelp) {
        console.log(`Usage: ${path.basename(process.argv[1])} [--input <layoutsDir>] [--output <outputDir>] [--widget <widgetName>]
Options:
    -i, --input     Layouts directory (default: ../widgets)
    -o, --output    Output directory (default: App_Resources iOS widgets generated)
    -w, --widget    Only generate single widget by name or filename (without .json)
    -h, --help      Show this help
        `);
        process.exit(0);
    }

    if (!fs.existsSync(layoutsDir)) {
        console.error(`Layouts directory does not exist: ${layoutsDir}`);
        process.exit(2);
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    generateAllWidgets(layoutsDir, outputDir, widgetName);
    console.log('SwiftUI widget generation complete!');
}
