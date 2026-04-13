/**
 * Expression Compiler for Widget Layout Generators
 *
 * Compiles Mapbox-style expressions to platform-specific code.
 * Supports: Kotlin (Glance), Swift (SwiftUI), JavaScript (NativeScript), and TypeScript (HTML)
 */

import { isExpression, isItemPath } from './shared-utils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Expression = any[] | string | number | boolean | null | undefined;

/**
 * Target platform for expression compilation
 */
export type Platform = 'kotlin' | 'swift' | 'javascript' | 'typescript';

/**
 * Expression compilation context
 */
export type CompilationContext = 'value' | 'condition';

/**
 * Formatter function to convert literal values to platform-specific strings
 */
export type ValueFormatter = (value: any) => string;

/**
 * Type hint for config.settings property access
 */
export type SettingType = 'boolean' | 'string' | 'number' | 'unknown';

/**
 * Compilation options
 */
export interface CompilationOptions {
    platform: Platform;
    context?: CompilationContext;
    formatter?: ValueFormatter;
    addDataPrefix?: boolean;
    forceFormatter?: boolean;
    /** Type hints for config.settings.* properties (for generating correct accessors) */
    settingTypes?: Map<string, SettingType>;
}

/**
 * Infer the type of a value from a literal or expression
 */
function inferType(value: Expression): SettingType {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    return 'unknown';
}

/**
 * Analyze an expression tree to infer types for config.settings.* properties
 * This is called before compiling to build a type hint map
 */
function inferSettingTypes(expr: Expression, typeMap: Map<string, SettingType> = new Map()): Map<string, SettingType> {
    if (!isExpression(expr)) {
        return typeMap;
    }

    const [op, ...args] = expr;

    // In comparisons, infer type from the non-get operand
    if (op === '==' || op === '!=' || op === '<' || op === '<=' || op === '>' || op === '>=') {
        const left = args[0];
        const right = args[1];

        // Check if left is ["get", "config.settings.X"]
        if (isExpression(left) && left[0] === 'get' && typeof left[1] === 'string' && left[1].startsWith('config.settings.')) {
            const settingKey = left[1].substring(16);
            const inferredType = inferType(right);
            if (inferredType !== 'unknown') {
                typeMap.set(settingKey, inferredType);
            }
        }

        // Check if right is ["get", "config.settings.X"]
        if (isExpression(right) && right[0] === 'get' && typeof right[1] === 'string' && right[1].startsWith('config.settings.')) {
            const settingKey = right[1].substring(16);
            const inferredType = inferType(left);
            if (inferredType !== 'unknown') {
                typeMap.set(settingKey, inferredType);
            }
        }
    }

    // Recursively analyze child expressions
    for (const arg of args) {
        if (isExpression(arg)) {
            inferSettingTypes(arg, typeMap);
        }
    }

    return typeMap;
}

// ============================================================================
// EXPRESSION COMPILER
// ============================================================================

/**
 * Compile a Mapbox-style expression to platform-specific code
 *
 * @param expr - Expression to compile
 * @param options - Compilation options
 * @returns Compiled platform-specific code string
 *
 * @example
 * // Kotlin (Glance)
 * compileExpression(["get", "temperature"], { platform: 'kotlin' })
 * // => "data.temperature"
 *
 * // Swift
 * compileExpression(["get", "temperature"], { platform: 'swift' })
 * // => "data.temperature"
 *
 * // Conditional
 * compileExpression(["<", ["get", "temp"], 32], { platform: 'kotlin', context: 'condition' })
 * // => "data.temp < 32"
 *
 * // Config setting with type inference
 * compileExpression(["case", ["==", ["get", "config.settings.clockBold"], true], "bold", "normal"], { platform: 'kotlin' })
 * // => "when { config.settings?.get("clockBold")?.jsonPrimitive?.booleanOrNull == true -> ..."
 */
export function compileExpression(expr: Expression, options: CompilationOptions): string {
    const { addDataPrefix = true, context = 'value', formatter, forceFormatter = false, platform } = options;

    // If no settingTypes provided, infer them from the expression tree
    if (!options.settingTypes && isExpression(expr)) {
        options = { ...options, settingTypes: inferSettingTypes(expr) };
    }

    // Handle null/undefined
    if (expr === null || expr === undefined) {
        return platform === 'swift' ? 'nil' : 'null';
    }

    // Handle literal values
    if (typeof expr === 'string') {
        if (expr.startsWith('color.')) {
            const colorName = expr.substring(6); // Remove 'color.' prefix
            return compileColorReference(colorName, platform);
        }
        if (formatter && context === 'value') {
            return formatter(expr);
        }
        return context === 'value' ? `"${escapeString(expr, platform)}"` : expr;
    }

    if (typeof expr === 'number') {
        if (formatter && context === 'value') {
            return formatter(expr);
        }
        return String(expr);
    }

    if (typeof expr === 'boolean') {
        if (formatter && context === 'value') {
            return formatter(expr);
        }
        return String(expr);
    }

    // Not an expression array
    if (!isExpression(expr)) {
        if (formatter && context === 'value') {
            return formatter(expr);
        }
        return String(expr);
    }

    // Compile expression operators
    const [op, ...args] = expr;
    let result;
    switch (op) {
        case 'get':
            // Look up inferred type for config.settings properties
            let settingType: SettingType = 'unknown';
            if (typeof args[0] === 'string' && args[0].startsWith('config.settings.')) {
                const settingKey = args[0].substring(16);
                settingType = options.settingTypes?.get(settingKey) || 'unknown';
            }
            result = compileGet(args[0], platform, addDataPrefix, settingType);
            break;
        case 'has':
            const a = compileExpression(args[0], { ...options, context: 'value', formatter: undefined });
            result = `${a} != null`;
            break;

        // Arithmetic
        case '+':
        case '-':
        case '*':
        case '/':
            result = compileArithmetic(op, args, options);
            break;

        // Math functions
        case 'min':
            result = compileMathMin(args, options);
            break;
        case 'max':
            result = compileMathMax(args, options);
            break;

        // Comparison
        case '<':
        case '<=':
        case '>':
        case '>=':
        case '==':
        case '!=':
            result = compileComparison(op, args, options);
            break;

        // Logical
        case '!':
            result = compileNot(args, options);
            break;
        case 'all':
            result = compileAll(args, options);
            break;
        case 'any':
            result = compileAny(args, options);
            break;

        // Conditional
        case 'case':
            result = compileCase(args, options);
            break;

        // String operations
        case 'concat':
            result = compileConcat(args, options);
            break;
        case 'upcase':
            result = compileUpcase(args, options);
            break;
        case 'downcase':
            result = compileDowncase(args, options);
            break;
        case 'substring':
            result = compileSubstring(args, options);
            break;

        // Date/Time formatting
        case 'format':
            result = compileFormat(args, options);
            break;

        // Template interpolation
        case 'interpolate':
            result = compileInterpolate(args, options);
            break;

        default:
            console.warn(`Unknown expression operator: ${op}`);
            result = `/* unknown op: ${op} */`;
            break;
    }
    if (forceFormatter && formatter && context === 'value') {
        return formatter(result);
    }
    return result;
}

// ============================================================================
// PROPERTY ACCESS OPERATORS
// ============================================================================

/**
 * Compile "get" operator - property access
 */
function compileGet(prop: string, platform: Platform, addDataPrefix: boolean, settingType?: SettingType): string {
    // Handle color.X - reference to theme colors
    if (prop.startsWith('color.')) {
        const colorName = prop.substring(6); // Remove 'color.' prefix
        return compileColorReference(colorName, platform);
    }

    // Handle size.width/height specially - map to direct width/height variables in Swift
    if (prop.startsWith('size.')) {
        const parts = prop.split('.');
        if (parts.length === 2) {
            if (platform === 'kotlin') {
                return `size.${parts[1]}.value`;
            } else if (platform === 'swift') {
                // In Swift, size.width maps to the geometry variable 'width'
                return parts[1]; // Just return 'width' or 'height'
            }
        }
        return prop;
    }

    // Handle config.settings.* with type-aware accessors
    if (prop.startsWith('config.settings.')) {
        const settingKey = prop.substring(16); // Remove 'config.settings.' prefix
        return compileSettingAccess(settingKey, platform, settingType || 'unknown');
    }

    // Handle item properties (in forEach loops)
    if (isItemPath(prop)) {
        return prop;
    }

    // Check if already prefixed
    if (prop.startsWith('data.') || prop.startsWith('config.')) {
        return prop;
    }

    // Add data prefix if needed
    return addDataPrefix ? `data.${prop}` : prop;
}

/**
 * Compile color.X reference to platform-specific theme color
 */
function compileColorReference(colorName: string, platform: Platform): string {
    // Import DEFAULT_COLOR_MAPS from modifier-builders at runtime
    const { DEFAULT_COLOR_MAPS } = require('./modifier-builders');
    const colorMap = DEFAULT_COLOR_MAPS[platform];

    // Return the platform-specific theme color reference
    return colorMap[colorName] || colorName;
}

/**
 * Generate platform-specific typed accessor for config.settings property
 */
function compileSettingAccess(key: string, platform: Platform, type: SettingType): string {
    switch (platform) {
        case 'kotlin':
            return compileKotlinSettingAccess(key, type);
        case 'swift':
            return compileSwiftSettingAccess(key, type);
        case 'javascript':
        case 'typescript':
            // JavaScript/TypeScript can access settings directly without type casting
            return `config.settings?.${key}`;
    }
}

/**
 * Generate Kotlin typed accessor for config.settings
 * Examples:
 *  - boolean: config.settings?.get("clockBold")?.jsonPrimitive?.booleanOrNull
 *  - string: config.settings?.get("theme")?.jsonPrimitive?.contentOrNull
 *  - number: config.settings?.get("fontSize")?.jsonPrimitive?.intOrNull
 */
function compileKotlinSettingAccess(key: string, type: SettingType): string {
    const baseAccess = `config.settings?.get("${key}")?.jsonPrimitive`;
    switch (type) {
        case 'boolean':
            return `${baseAccess}?.booleanOrNull`;
        case 'string':
            return `${baseAccess}?.contentOrNull`;
        case 'number':
            // Default to intOrNull; could also be doubleOrNull depending on context
            return `${baseAccess}?.intOrNull`;
        case 'unknown':
            // Fallback: return as string content
            return `${baseAccess}?.contentOrNull`;
    }
}

/**
 * Generate Swift typed accessor for config.settings
 * Examples:
 *  - boolean: entry.config.settings["clockBold"] as? Bool
 *  - string: entry.config.settings["theme"] as? String
 *  - number: entry.config.settings["fontSize"] as? Int
 */
function compileSwiftSettingAccess(key: string, type: SettingType): string {
    const baseAccess = `entry.config.settings["${key}"]`;
    switch (type) {
        case 'boolean':
            return `${baseAccess} as? Bool`;
        case 'string':
            return `${baseAccess} as? String`;
        case 'number':
            return `${baseAccess} as? Int`;
        case 'unknown':
            // Fallback: try String
            return `${baseAccess} as? String`;
    }
}

/**
 * Compile "has" operator - check if property exists/has value
 */
function compileHas(prop: string, platform: Platform, addDataPrefix: boolean): string {
    const path = compileGet(prop, platform, addDataPrefix);

    switch (platform) {
        case 'kotlin':
            return `${path}.isNotEmpty()`;
        case 'swift':
            return `!${path}.isEmpty`;
        case 'javascript':
        case 'typescript':
            return `${path} !== undefined && ${path} !== null && ${path} !== ''`;
    }
}

// ============================================================================
// ARITHMETIC OPERATORS
// ============================================================================

function compileArithmetic(op: '+' | '-' | '*' | '/', args: Expression[], options: CompilationOptions): string {
    // Don't pass formatter to sub-expressions - units only apply to the final result
    const left = compileExpression(args[0], { ...options, context: 'value', formatter: undefined });
    const right = compileExpression(args[1], { ...options, context: 'value', formatter: undefined });

    // For Kotlin, Float (size.*.value) mixed with Double literals needs explicit Float suffix
    if (options.platform === 'kotlin') {
        const leftIsFloat = left.includes('.value');
        const rightIsFloat = right.includes('.value');
        if (leftIsFloat || rightIsFloat) {
            return `(${ensureKotlinFloat(left)} ${op} ${ensureKotlinFloat(right)})`;
        }
    }

    return `(${left} ${op} ${right})`;
}

/**
 * Ensure numeric literals in an expression use Float suffix for Kotlin
 * Converts e.g. "0.16" -> "0.16f", "30.0" -> "30.0f", "30" -> "30.0f"
 */
function ensureKotlinFloat(expr: string): string {
    // Replace bare decimal float literals (not already suffixed with 'f')
    let result = expr.replace(/\b(\d+\.\d+)(?![fF\d])\b/g, '$1f');
    // Replace bare integer literals with float form (e.g., "30" -> "30.0f")
    // Only match standalone integers not followed by '.', 'f', 'F', or another digit
    result = result.replace(/\b(\d+)(?![fF.\d])\b/g, '$1.0f');
    return result;
}

function compileMathMin(args: Expression[], options: CompilationOptions): string {
    const a = compileExpression(args[0], { ...options, context: 'value', formatter: undefined });
    const b = compileExpression(args[1], { ...options, context: 'value', formatter: undefined });

    if (options.platform === 'kotlin') {
        // Ensure Float compatibility when size values are involved
        const needsFloat = a.includes('.value') || b.includes('.value');
        if (needsFloat) {
            return `min(${ensureKotlinFloat(a)}, ${ensureKotlinFloat(b)})`;
        }
        return `min(${a}, ${b})`;
    }
    if (options.platform === 'swift') {
        return `min(${a}, ${b})`;
    }
    return `Math.min(${a}, ${b})`;
}

function compileMathMax(args: Expression[], options: CompilationOptions): string {
    const a = compileExpression(args[0], { ...options, context: 'value', formatter: undefined });
    const b = compileExpression(args[1], { ...options, context: 'value', formatter: undefined });

    if (options.platform === 'kotlin') {
        const needsFloat = a.includes('.value') || b.includes('.value');
        if (needsFloat) {
            return `max(${ensureKotlinFloat(a)}, ${ensureKotlinFloat(b)})`;
        }
        return `max(${a}, ${b})`;
    }
    if (options.platform === 'swift') {
        return `max(${a}, ${b})`;
    }
    return `Math.max(${a}, ${b})`;
}

// ============================================================================
// COMPARISON OPERATORS
// ============================================================================

function compileComparison(op: '<' | '<=' | '>' | '>=' | '==' | '!=', args: Expression[], options: CompilationOptions): string {
    const left = compileExpression(args[0], { ...options, context: 'condition', formatter: undefined });
    const right = compileExpression(args[1], { ...options, context: 'condition', formatter: undefined });

    // Swift uses different equality operators
    if (options.platform === 'swift') {
        if (op === '==') return `${left} == ${right}`;
        if (op === '!=') return `${left} != ${right}`;
    }
    if (options.platform === 'javascript') {
        if (op === '==') return `${left} === ${right}`;
        if (op === '!=') return `${left} !== ${right}`;
    }

    return `${left} ${op} ${right}`;
}

// ============================================================================
// LOGICAL OPERATORS
// ============================================================================

function compileNot(args: Expression[], options: CompilationOptions): string {
    const condition = compileExpression(args[0], { ...options, context: 'condition', formatter: undefined });
    return `!(${condition})`;
}

function compileAll(args: Expression[], options: CompilationOptions): string {
    const conditions = args.map((arg) => compileExpression(arg, { ...options, context: 'condition', formatter: undefined }));
    return `(${conditions.join(' && ')})`;
}

function compileAny(args: Expression[], options: CompilationOptions): string {
    const conditions = args.map((arg) => compileExpression(arg, { ...options, context: 'condition', formatter: undefined }));
    return `(${conditions.join(' || ')})`;
}

// ============================================================================
// CONDITIONAL OPERATOR (CASE)
// ============================================================================

/**
 * Compile "case" operator - conditional expression
 * Format: ["case", condition1, value1, condition2, value2, ..., fallback]
 */
function compileCase(args: Expression[], options: CompilationOptions): string {
    const { platform } = options;
    const pairs: { condition: string; value: string }[] = [];

    // Process condition-value pairs
    for (let i = 0; i < args.length - 1; i += 2) {
        if (i + 1 < args.length) {
            const condition = compileExpression(args[i], { ...options, context: 'condition', formatter: undefined });
            const value = compileExpression(args[i + 1], options);
            pairs.push({ condition, value });
        }
    }

    // Last arg is the fallback
    const hasFallback = args.length % 2 === 1;
    const fallback = hasFallback ? compileExpression(args[args.length - 1], options) : options.formatter ? options.formatter('') : '""';

    // Generate platform-specific code
    switch (platform) {
        case 'kotlin':
            return compileKotlinCase(pairs, fallback);
        case 'swift':
            return compileSwiftCase(pairs, fallback);
        case 'javascript':
        case 'typescript':
            return compileJavaScriptCase(pairs, fallback);
    }
}

function compileKotlinCase(pairs: { condition: string; value: string }[], fallback: string): string {
    if (pairs.length === 0) return fallback;

    const whenCases = pairs.map((p) => `${p.condition} -> ${p.value}`).join('; ');
    return `when { ${whenCases}; else -> ${fallback} }`;
}

function compileSwiftCase(pairs: { condition: string; value: string }[], fallback: string): string {
    if (pairs.length === 0) return fallback;

    // Swift uses ternary for simple cases, but for multiple conditions we need if-else chain
    if (pairs.length === 1) {
        return `${pairs[0].condition} ? ${pairs[0].value} : ${fallback}`;
    }

    // For multiple conditions, generate nested ternary (not ideal but works)
    let result = fallback;
    for (let i = pairs.length - 1; i >= 0; i--) {
        result = `${pairs[i].condition} ? ${pairs[i].value} : ${result}`;
    }
    return result;
}

function compileJavaScriptCase(pairs: { condition: string; value: string }[], fallback: string): string {
    if (pairs.length === 0) return fallback;

    // JavaScript uses ternary operator
    let result = fallback;
    for (let i = pairs.length - 1; i >= 0; i--) {
        result = `${pairs[i].condition} ? ${pairs[i].value} : ${result}`;
    }
    return result;
}

// ============================================================================
// STRING OPERATORS
// ============================================================================

function compileConcat(args: Expression[], options: CompilationOptions): string {
    const parts = args.map((arg) => compileExpression(arg, { ...options, context: 'value' }));

    switch (options.platform) {
        case 'kotlin':
            return parts.join(' + ');
        case 'swift':
            return parts.join(' + ');
        case 'javascript':
        case 'typescript':
            return parts.join(' + ');
    }
}

function compileUpcase(args: Expression[], options: CompilationOptions): string {
    const str = compileExpression(args[0], { ...options, context: 'value' });

    switch (options.platform) {
        case 'kotlin':
            return `${str}.uppercase()`;
        case 'swift':
            return `${str}.uppercased()`;
        case 'javascript':
        case 'typescript':
            return `${str}.toUpperCase()`;
    }
}

function compileDowncase(args: Expression[], options: CompilationOptions): string {
    const str = compileExpression(args[0], { ...options, context: 'value' });

    switch (options.platform) {
        case 'kotlin':
            return `${str}.lowercase()`;
        case 'swift':
            return `${str}.lowercased()`;
        case 'javascript':
        case 'typescript':
            return `${str}.toLowerCase()`;
    }
}

function compileSubstring(args: Expression[], options: CompilationOptions): string {
    const str = compileExpression(args[0], { ...options, context: 'value' });
    const start = compileExpression(args[1], { ...options, context: 'value' });

    if (args.length > 2) {
        const length = compileExpression(args[2], { ...options, context: 'value' });

        switch (options.platform) {
            case 'kotlin':
                return `${str}.substring(${start}, ${start} + ${length})`;
            case 'swift':
                return `String(${str}.prefix(${start} + ${length}).suffix(${length}))`;
            case 'javascript':
            case 'typescript':
                return `${str}.substring(${start}, ${start} + ${length})`;
        }
    }

    switch (options.platform) {
        case 'kotlin':
            return `${str}.substring(${start})`;
        case 'swift':
            return `String(${str}.suffix(from: ${start}))`;
        case 'javascript':
        case 'typescript':
            return `${str}.substring(${start})`;
    }
}

// ============================================================================
// DATE/TIME FORMATTING
// ============================================================================

function compileFormat(args: Expression[], options: CompilationOptions): string {
    const value = compileExpression(args[0], { ...options, context: 'value' });
    const pattern = args[1] as string;

    switch (options.platform) {
        case 'kotlin':
            return `SimpleDateFormat("${pattern}").format(${value})`;
        case 'swift':
            // Swift date formatting is more complex, return a placeholder
            return `DateFormatter.format(${value}, pattern: "${pattern}")`;
        case 'javascript':
        case 'typescript':
            return `formatDate(${value}, "${pattern}")`;
    }
}

// ============================================================================
// TEMPLATE INTERPOLATION
// ============================================================================

function compileInterpolate(args: Expression[], options: CompilationOptions): string {
    const template = args[0] as string;

    // Convert {{prop}} to platform-specific interpolation
    switch (options.platform) {
        case 'kotlin':
            return `"${template.replace(/\{\{([^}]+)\}\}/g, (_, prop) => `\${data.${prop}}`)}"`;
        case 'swift':
            return `"${template.replace(/\{\{([^}]+)\}\}/g, (_, prop) => `\\(data.${prop})`)}"`;
        case 'javascript':
        case 'typescript':
            return `\`${template.replace(/\{\{([^}]+)\}\}/g, (_, prop) => `\${data.${prop}}`)} \``;
    }
}

// ============================================================================
// STRING ESCAPING
// ============================================================================

/**
 * Escape string for the target platform
 */
function escapeString(str: string, platform: Platform): string {
    switch (platform) {
        case 'kotlin':
            return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        case 'swift':
            // Handle Swift string interpolation specially
            const placeholder = '__SWIFT_INTERP__';
            const withPlaceholders = str.replace(/\\\(/g, placeholder);
            const escaped = withPlaceholders.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return escaped.replace(new RegExp(placeholder, 'g'), '\\(');
        case 'javascript':
        case 'typescript':
            return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compile a property value that might be a literal or expression
 *
 * @param value - Value to compile
 * @param options - Compilation options
 * @param defaultValue - Default value if undefined
 * @returns Compiled string
 */
export function compilePropertyValue<T>(value: Expression | undefined, options: CompilationOptions, defaultValue?: string): string {
    if (value === undefined) {
        return defaultValue || '';
    }

    // If it's a literal value and we have a formatter, format it directly
    if (!isExpression(value) && options.formatter) {
        return options.formatter(value as T);
    }

    // It's an expression, compile it
    return compileExpression(value, options);
}
