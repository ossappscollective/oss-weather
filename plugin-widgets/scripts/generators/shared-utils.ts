/**
 * Shared Utility Functions for Widget Layout Generators
 *
 * This module provides common functionality used across all widget layout generators:
 * - Expression evaluation and compilation
 * - Modifier/property building
 * - Style generation
 * - Type guards and validation
 * - Alignment conversion
 * - Color mapping
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Mapbox-style expression: array format for dynamic values
 * Example: ["get", "temperature"] or ["case", ["<", 10, 20], "cold", "warm"]
 */
import { readFileSync } from 'fs';
import { join } from 'path';

export type Expression = any[] | string | number | boolean | null | undefined;

/**
 * Base layout element structure shared across all generators
 */
export interface BaseLayoutElement {
    type: string;
    id?: string;
    visible?: boolean;
    visibleIf?: Expression;

    // Spacing
    padding?: Expression;
    paddingHorizontal?: Expression;
    paddingVertical?: Expression;
    margin?: Expression;
    marginHorizontal?: Expression;
    marginVertical?: Expression;
    spacing?: Expression;

    // Alignment
    alignment?: string;
    crossAlignment?: string;

    // Sizing
    width?: Expression;
    height?: Expression;
    fillWidth?: boolean;
    fillHeight?: boolean;
    fillMaxSize?: boolean;
    flex?: Expression;

    // Appearance
    backgroundColor?: Expression;
    cornerRadius?: Expression;

    // Container
    children?: BaseLayoutElement[];

    // Element-specific properties
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
    limit?: Expression;
    itemTemplate?: BaseLayoutElement;
    condition?: Expression;
    then?: BaseLayoutElement;
    else?: BaseLayoutElement;
    format?: string;
    style?: string;
    [key: string]: any;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a value is a Mapbox-style expression (array format)
 *
 * @param value - Value to check
 * @returns True if value is an array with a string operator as first element
 *
 * @example
 * isExpression(["get", "temperature"]) // true
 * isExpression("hello") // false
 * isExpression([1, 2, 3]) // false (first element not string)
 */
export function isExpression(value: any): value is any[] {
    return Array.isArray(value) && value.length > 0 && typeof value[0] === 'string';
}

/**
 * Check if a value contains template binding syntax ({{property}})
 *
 * @param value - String to check
 * @returns True if string contains {{...}} placeholders
 *
 * @example
 * hasTemplateBinding("Hello {{name}}") // true
 * hasTemplateBinding("data.temperature") // false
 */
export function hasTemplateBinding(value?: string): boolean {
    if (!value || typeof value !== 'string') return false;
    return /\{\{[^}]+\}\}/.test(value);
}

/**
 * Check if a value is a settings reference (config.settings.*)
 *
 * @param value - Value to check
 * @returns True if string starts with 'config.settings.'
 */
export function isSettingReference(value?: string): boolean {
    return typeof value === 'string' && value.startsWith('config.settings.');
}

/**
 * Extract setting key from a settings reference
 *
 * @param value - Settings reference string (e.g., 'config.settings.clockBold')
 * @returns Setting key (e.g., 'clockBold')
 */
export function getSettingKey(value: string): string {
    return value.substring(16); // Remove 'config.settings.' prefix
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Sanitize identifier: keep only alphanumeric characters and underscores
 *
 * @param str - String to sanitize
 * @returns Sanitized string safe for use as identifier
 */
export function sanitizeIdentifier(str: string): string {
    return str.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Convert string to camelCase
 *
 * @param str - String to convert
 * @returns camelCase version of string
 */
export function toCamelCase(str: string): string {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^(.)/, (c) => c.toLowerCase());
}

/**
 * Convert string to PascalCase
 *
 * @param str - String to convert
 * @returns PascalCase version of string
 */
export function toPascalCase(str: string): string {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^(.)/, (c) => c.toUpperCase());
}

/**
 * Convert string to snake_case for resource keys
 *
 * @param str - String to convert
 * @returns snake_case version of string
 */
export function toSnakeCase(str: string): string {
    return str
        .replace(/\s+/g, '_')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
}

// ============================================================================
// PROPERTY PATH UTILITIES
// ============================================================================

/**
 * Normalize a property path for the target platform
 * Handles data., item., size., and config. prefixes
 *
 * @param path - Property path to normalize
 * @param addDataPrefix - Whether to add 'data.' prefix if missing
 * @returns Normalized property path
 *
 * @example
 * normalizePropertyPath("temperature") // "data.temperature"
 * normalizePropertyPath("item.hour") // "item.hour"
 * normalizePropertyPath("data.temp") // "data.temp"
 */
export function normalizePropertyPath(path: string, addDataPrefix: boolean = true): string {
    const trimmed = path.trim();

    // Already has a recognized prefix
    if (trimmed.startsWith('data.') || trimmed.startsWith('item.') || trimmed.startsWith('size.') || trimmed.startsWith('config.')) {
        return trimmed;
    }

    // Add data prefix if requested
    return addDataPrefix ? `data.${trimmed}` : trimmed;
}

/**
 * Extract property name from a path (last segment)
 *
 * @param path - Property path
 * @returns Last segment of path
 *
 * @example
 * getPropertyName("data.weather.temperature") // "temperature"
 */
export function getPropertyName(path: string): string {
    const parts = path.split('.');
    return parts[parts.length - 1];
}

/**
 * Check if a path references an item in a loop
 *
 * @param path - Property path to check
 * @returns True if path starts with 'item.'
 */
export function isItemPath(path: string): boolean {
    return path.trim().startsWith('item.');
}

// ============================================================================
// TEMPLATE STRING UTILITIES
// ============================================================================

/**
 * Extract a single binding from a template string if it's the only content
 * Returns null if template contains multiple bindings or plain text
 *
 * @param template - Template string to check
 * @returns Property name if single binding, null otherwise
 *
 * @example
 * getSingleBinding("{{temperature}}") // "temperature"
 * getSingleBinding("Temp: {{temperature}}") // null (has text)
 * getSingleBinding("{{temp}} {{unit}}") // null (multiple bindings)
 */
export function getSingleBinding(template?: string): string | null {
    if (!template) return null;
    const match = template.trim().match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    return match ? match[1].trim() : null;
}

/**
 * Parse template string and extract all bindings
 * Returns array of segments alternating between text and bindings
 *
 * @param template - Template string to parse
 * @returns Array of {type: 'text' | 'binding', value: string}
 *
 * @example
 * parseTemplate("Hello {{name}}!")
 * // [{type: 'text', value: 'Hello '}, {type: 'binding', value: 'name'}, {type: 'text', value: '!'}]
 */
export function parseTemplate(template: string): { type: 'text' | 'binding'; value: string }[] {
    const result: { type: 'text' | 'binding'; value: string }[] = [];
    const parts = template.split(/(\{\{\s*[^}]+\s*\}\})/g);

    for (const part of parts) {
        if (!part) continue;

        const bindingMatch = part.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
        if (bindingMatch) {
            result.push({ type: 'binding', value: bindingMatch[1].trim() });
        } else {
            result.push({ type: 'text', value: part });
        }
    }

    return result;
}

// ============================================================================
// ALIGNMENT CONVERSION
// ============================================================================

/**
 * Alignment values used across platforms
 */
export type AlignmentValue = 'start' | 'center' | 'end' | 'space-between' | 'spaceBetween';

/**
 * Convert generic alignment to platform-specific horizontal alignment
 *
 * @param alignment - Generic alignment value
 * @param platform - Target platform ('glance' | 'swift' | 'nativescript' | 'html')
 * @returns Platform-specific horizontal alignment string
 */
export function toPlatformHorizontalAlignment(alignment: string, platform: 'glance' | 'swift' | 'nativescript' | 'html'): string {
    const normalized = alignment.toLowerCase().replace('-', '');

    switch (platform) {
        case 'glance':
            switch (normalized) {
                case 'start':
                    return 'Alignment.Horizontal.Start';
                case 'center':
                    return 'Alignment.Horizontal.CenterHorizontally';
                case 'end':
                    return 'Alignment.Horizontal.End';
                case 'spacebetween':
                    return 'Alignment.Horizontal.Start'; // Glance handles this differently
                default:
                    return 'Alignment.Horizontal.CenterHorizontally';
            }

        case 'swift':
            switch (normalized) {
                case 'start':
                    return '.leading';
                case 'center':
                    return '.center';
                case 'end':
                    return '.trailing';
                default:
                    return '.center';
            }

        case 'nativescript':
            switch (normalized) {
                case 'start':
                    return 'left';
                case 'center':
                    return 'center';
                case 'end':
                    return 'right';
                default:
                    return 'center';
            }

        case 'html':
            switch (normalized) {
                case 'start':
                    return 'flex-start';
                case 'center':
                    return 'center';
                case 'end':
                    return 'flex-end';
                case 'spacebetween':
                    return 'space-between';
                default:
                    return 'center';
            }
    }
}

/**
 * Convert generic alignment to platform-specific vertical alignment
 *
 * @param alignment - Generic alignment value
 * @param platform - Target platform ('glance' | 'swift' | 'nativescript' | 'html')
 * @returns Platform-specific vertical alignment string
 */
export function toPlatformVerticalAlignment(alignment: string | undefined, platform: 'glance' | 'swift' | 'nativescript' | 'html'): string {
    const normalized = alignment?.toLowerCase();

    switch (platform) {
        case 'glance':
            switch (normalized) {
                case 'start':
                    return 'Alignment.Vertical.Top';
                case 'center':
                    return 'Alignment.Vertical.CenterVertically';
                case 'end':
                    return 'Alignment.Vertical.Bottom';
                default:
                    return 'Alignment.Vertical.CenterVertically';
            }

        case 'swift':
            switch (normalized) {
                case 'start':
                    return '.top';
                case 'center':
                    return '.center';
                case 'end':
                    return '.bottom';
                default:
                    return '.center';
            }

        case 'nativescript':
            switch (normalized) {
                case 'start':
                    return 'top';
                case 'center':
                    return 'center';
                case 'end':
                    return 'bottom';
                default:
                    return 'center';
            }

        case 'html':
            switch (normalized) {
                case 'start':
                    return 'flex-start';
                case 'center':
                    return 'center';
                case 'end':
                    return 'flex-end';
                default:
                    return 'center';
            }
    }
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Theme color names used across platforms
 */
export const THEME_COLOR_NAMES = ['onSurface', 'onSurfaceVariant', 'primary', 'error', 'widgetBackground', 'surface', 'surfaceVariant'] as const;

/**
 * Check if a color value is a theme color name
 *
 * @param color - Color value to check
 * @returns True if color is a recognized theme color name
 */
export function isThemeColor(color: string): boolean {
    return THEME_COLOR_NAMES.includes(color as any);
}

/**
 * Parse hex color string to ensure it's valid
 * Handles both #RRGGBB and RRGGBB formats
 *
 * @param hexColor - Hex color string
 * @returns Normalized hex color without # prefix, or null if invalid
 */
export function parseHexColor(hexColor: string): string | null {
    const cleaned = hexColor.replace('#', '');
    if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
        return cleaned.toUpperCase();
    }
    return null;
}

// ============================================================================
// FONT WEIGHT UTILITIES
// ============================================================================

/**
 * Standard font weight names
 */
export type FontWeight = 'normal' | 'medium' | 'bold';

/**
 * Convert generic font weight to platform-specific value
 *
 * @param weight - Generic font weight
 * @param platform - Target platform
 * @returns Platform-specific font weight string
 */
export function toPlatformFontWeight(weight: string | undefined, platform: 'glance' | 'swift' | 'nativescript' | 'html'): string {
    const normalized = weight?.toLowerCase();

    switch (platform) {
        case 'glance':
            switch (normalized) {
                case 'normal':
                    return 'FontWeight.Normal';
                case 'medium':
                    return 'FontWeight.Medium';
                case 'bold':
                    return 'FontWeight.Bold';
                default:
                    return 'FontWeight.Normal';
            }

        case 'swift':
            switch (normalized) {
                case 'light':
                    return '.light';
                case 'normal':
                    return '.regular';
                case 'medium':
                    return '.medium';
                case 'bold':
                    return '.bold';
                default:
                    return '.regular';
            }

        case 'nativescript':
            switch (normalized) {
                case 'light':
                    return '300';
                case 'normal':
                    return 'normal';
                case 'medium':
                    return '500';
                case 'bold':
                    return 'bold';
                default:
                    return 'normal';
            }

        case 'html':
            switch (normalized) {
                case 'light':
                    return '300';
                case 'normal':
                    return '400';
                case 'medium':
                    return '500';
                case 'bold':
                    return '700';
                default:
                    return '400';
            }
    }
}

// ============================================================================
// INDENTATION UTILITIES
// ============================================================================

/**
 * Create indentation string
 *
 * @param level - Indentation level
 * @param spacesPerLevel - Number of spaces per level (default: 4)
 * @returns Indentation string
 */
export function indent(level: number, spacesPerLevel: number = 4): string {
    return ' '.repeat(level * spacesPerLevel);
}

/**
 * Add indentation to each line of a multi-line string
 *
 * @param text - Text to indent
 * @param level - Indentation level
 * @param spacesPerLevel - Number of spaces per level (default: 4)
 * @returns Indented text
 */
export function indentLines(text: string, level: number, spacesPerLevel: number = 4): string {
    const indentation = indent(level, spacesPerLevel);
    return text
        .split('\n')
        .map((line) => indentation + line)
        .join('\n');
}

// ============================================================================
// MODIFIER BUILDING UTILITIES
// ============================================================================

/**
 * Properties that can be applied as modifiers to elements
 */
export interface ModifierProperties {
    // Sizing
    width?: Expression;
    height?: Expression;
    fillWidth?: boolean;
    fillHeight?: boolean;
    fillMaxSize?: boolean;
    flex?: Expression;

    // Spacing
    padding?: Expression;
    paddingHorizontal?: Expression;
    paddingVertical?: Expression;
    margin?: Expression;
    marginHorizontal?: Expression;
    marginVertical?: Expression;

    // Appearance
    backgroundColor?: Expression;
    cornerRadius?: Expression;
}

/**
 * Extract modifier properties from an element
 *
 * @param element - Layout element
 * @returns Object containing only modifier properties
 */
export function extractModifierProperties(element: BaseLayoutElement): ModifierProperties {
    return {
        width: element.width,
        height: element.height,
        fillWidth: element.fillWidth,
        fillHeight: element.fillHeight,
        fillMaxSize: element.fillMaxSize,
        flex: element.flex,
        padding: element.padding,
        paddingHorizontal: element.paddingHorizontal,
        paddingVertical: element.paddingVertical,
        margin: element.margin,
        marginHorizontal: element.marginHorizontal,
        marginVertical: element.marginVertical,
        backgroundColor: element.backgroundColor,
        cornerRadius: element.cornerRadius
    };
}

/**
 * Check if element has any modifier properties
 *
 * @param element - Layout element to check
 * @returns True if element has at least one modifier property
 */
export function hasModifiers(element: BaseLayoutElement): boolean {
    return !!(
        element.width ||
        element.height ||
        element.fillWidth ||
        element.fillHeight ||
        element.fillMaxSize ||
        element.flex ||
        element.padding ||
        element.paddingHorizontal ||
        element.paddingVertical ||
        element.margin ||
        element.marginHorizontal ||
        element.marginVertical ||
        element.backgroundColor ||
        element.cornerRadius
    );
}

/**
 * Inline the shared elements: { "type": "template", "name": "dailyRow" } is replaced by
 * src/widgets/templates/dailyRow.json (templates can use other templates)
 */
export function resolveTemplates<T>(value: T, templatesDir: string): T {
    if (Array.isArray(value)) {
        return value.map((item) => resolveTemplates(item, templatesDir)) as T;
    }
    if (value && typeof value === 'object') {
        const element = value as Record<string, unknown>;
        if (element.type === 'template' && typeof element.name === 'string') {
            return resolveTemplates(JSON.parse(readFileSync(join(templatesDir, `${element.name}.json`), 'utf-8')), templatesDir);
        }
        return Object.fromEntries(Object.entries(element).map(([key, child]) => [key, resolveTemplates(child, templatesDir)])) as T;
    }
    return value;
}
