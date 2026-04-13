/**
 * Modifier Builder Utilities for Widget Layout Generators
 *
 * Provides platform-specific modifier/property builders for applying
 * sizing, spacing, and styling to UI elements.
 */

import { Platform, compilePropertyValue } from './expression-compiler';
import { BaseLayoutElement, isThemeColor, parseHexColor } from './shared-utils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Platform-specific modifier/property context
 */
export interface ModifierContext {
    platform: Platform;
    element: BaseLayoutElement;
    colorMap?: Record<string, string>;
}

/**
 * Generated modifier code
 */
export interface ModifierResult {
    code: string;
    isEmpty: boolean;
}

// ============================================================================
// PLATFORM-SPECIFIC COLOR MAPS
// ============================================================================

/**
 * Default color maps for each platform
 */
export const DEFAULT_COLOR_MAPS: Record<Platform, Record<string, string>> = {
    kotlin: {
        onSurface: 'GlanceTheme.colors.onSurface',
        onSurfaceVariant: 'GlanceTheme.colors.onSurfaceVariant',
        primary: 'GlanceTheme.colors.primary',
        error: 'GlanceTheme.colors.error',
        widgetBackground: 'GlanceTheme.colors.background',
        surface: 'GlanceTheme.colors.surface',
        surfaceVariant: 'GlanceTheme.colors.surfaceVariant'
    },
    swift: {
        onSurface: 'WidgetColorProvider.onSurface',
        onSurfaceVariant: 'WidgetColorProvider.onSurfaceVariant',
        primary: 'WidgetColorProvider.primary',
        error: 'WidgetColorProvider.error',
        widgetBackground: 'WidgetColorProvider.background',
        surface: 'WidgetColorProvider.surface',
        surfaceVariant: 'WidgetColorProvider.surfaceVariant'
    },
    javascript: {
        onSurface: '#E6E1E5',
        onSurfaceVariant: '#CAC4D0',
        primary: '#D0BCFF',
        error: '#F2B8B5',
        widgetBackground: '#1C1B1F',
        surface: '#2B2930'
    },
    typescript: {
        onSurface: '#E6E1E5',
        onSurfaceVariant: '#CAC4D0',
        primary: '#D0BCFF',
        error: '#F2B8B5',
        widgetBackground: '#1C1B1F',
        surface: '#2B2930'
    }
};

// ============================================================================
// COLOR FORMATTERS
// ============================================================================

/**
 * Format color value for the target platform
 */
export function formatColor(colorValue: string, platform: Platform, colorMap?: Record<string, string>): string {
    // Use provided color map or default
    const map = colorMap || DEFAULT_COLOR_MAPS[platform];

    // Check if it's a theme color
    if (isThemeColor(colorValue)) {
        return map[colorValue] || colorValue;
    }

    // Parse hex color
    const hexColor = parseHexColor(colorValue);
    if (hexColor) {
        switch (platform) {
            case 'kotlin':
                return `Color(0xFF${hexColor})`;
            case 'swift':
                return `Color(hex: "${hexColor}")`;
            case 'javascript':
            case 'typescript':
                return `"#${hexColor}"`;
        }
    }

    // Return as-is if not recognized
    return colorValue;
}

// ============================================================================
// DIMENSION FORMATTERS
// ============================================================================

/**
 * Format dimension value (width, height, padding, etc.) for the target platform
 */
export function formatDimension(value: number, platform: Platform): string {
    switch (platform) {
        case 'kotlin':
            return `(${value}).dp`;
        case 'swift':
            return String(value);
        case 'javascript':
        case 'typescript':
            return `"${value}px"`;
    }
}

/**
 * Format font size for the target platform
 */
export function formatFontSize(value: number, platform: Platform): string {
    switch (platform) {
        case 'kotlin':
            return `${value}.sp`;
        case 'swift':
            return String(value);
        case 'javascript':
        case 'typescript':
            return `"${value}px"`;
    }
}

// ============================================================================
// MODIFIER BUILDERS
// ============================================================================

/**
 * Build complete modifier chain for Kotlin/Glance
 * Returns GlanceModifier chain with all applicable modifiers
 */
export function buildGlanceModifier(element: BaseLayoutElement): string {
    const modifiers: string[] = [];

    // Size modifiers
    if (element.fillMaxSize) {
        modifiers.push('fillMaxSize()');
    } else {
        if (element.fillWidth) {
            modifiers.push('fillMaxWidth()');
        } else if (element.width !== undefined) {
            const widthExpr = compilePropertyValue(element.width, {
                platform: 'kotlin',
                context: 'value',
                formatter: (v: number) => formatDimension(v, 'kotlin')
            });
            if (widthExpr) {
                modifiers.push(`width(${widthExpr})`);
            }
        }

        if (element.fillHeight) {
            modifiers.push('fillMaxHeight()');
        } else if (element.height !== undefined) {
            const heightExpr = compilePropertyValue(element.height, {
                platform: 'kotlin',
                context: 'value',
                formatter: (v: number) => formatDimension(v, 'kotlin')
            });
            if (heightExpr) {
                modifiers.push(`height(${heightExpr})`);
            }
        }
    }

    // Flex/weight modifier
    if (element.flex !== undefined) {
        modifiers.push('defaultWeight()');
    }

    // Padding modifiers
    if (element.padding !== undefined) {
        const paddingExpr = compilePropertyValue(element.padding, {
            platform: 'kotlin',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'kotlin')
        });
        if (paddingExpr) {
            modifiers.push(`padding(${paddingExpr})`);
        }
    }
    // Combine paddingHorizontal + paddingVertical into a single call when both present
    if (element.paddingHorizontal !== undefined && element.paddingVertical !== undefined) {
        const hExpr = compilePropertyValue(element.paddingHorizontal, {
            platform: 'kotlin',
            context: 'value',
            forceFormatter: true,
            formatter: (v: number) => formatDimension(v, 'kotlin')
        });
        const vExpr = compilePropertyValue(element.paddingVertical, {
            platform: 'kotlin',
            forceFormatter: true,
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'kotlin')
        });
        if (hExpr && vExpr) {
            modifiers.push(`padding(horizontal = ${hExpr}, vertical = ${vExpr})`);
        }
    } else {
        if (element.paddingHorizontal !== undefined) {
            const paddingExpr = compilePropertyValue(element.paddingHorizontal, {
                platform: 'kotlin',
                forceFormatter: true,
                context: 'value',
                formatter: (v: number) => formatDimension(v, 'kotlin')
            });
            if (paddingExpr) {
                modifiers.push(`padding(horizontal = ${paddingExpr})`);
            }
        }
        if (element.paddingVertical !== undefined) {
            const paddingExpr = compilePropertyValue(element.paddingVertical, {
                platform: 'kotlin',
                forceFormatter: true,
                context: 'value',
                formatter: (v: number) => formatDimension(v, 'kotlin')
            });
            if (paddingExpr) {
                modifiers.push(`padding(vertical = ${paddingExpr})`);
            }
        }
    }
    // Individual side padding modifiers
    const paddingSides: { key: string; side: string }[] = [
        { key: 'paddingTop', side: 'top' },
        { key: 'paddingBottom', side: 'bottom' },
        { key: 'paddingLeft', side: 'start' },
        { key: 'paddingRight', side: 'end' }
    ];
    for (const { key, side } of paddingSides) {
        if (element[key] !== undefined) {
            const expr = compilePropertyValue(element[key], {
                platform: 'kotlin',
                context: 'value',
                formatter: (v: number) => formatDimension(v, 'kotlin')
            });
            if (expr) {
                // If the expression already produces .dp values (e.g. when expressions, literals),
                // use it directly. Otherwise wrap with .dp.
                if (expr.includes('.dp') || expr.startsWith('when')) {
                    modifiers.push(`padding(${side} = ${expr})`);
                } else {
                    modifiers.push(`padding(${side} = (${expr}).dp)`);
                }
            }
        }
    }

    // Margin modifiers (Glance doesn't have margin, use padding)
    if (element.margin !== undefined) {
        const marginExpr = compilePropertyValue(element.margin, {
            platform: 'kotlin',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'kotlin')
        });
        if (marginExpr) {
            modifiers.push(`padding(${marginExpr})`);
        }
    }
    if (element.marginHorizontal !== undefined) {
        const marginExpr = compilePropertyValue(element.marginHorizontal, {
            platform: 'kotlin',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'kotlin')
        });
        if (marginExpr) {
            modifiers.push(`padding(horizontal = ${marginExpr})`);
        }
    }
    if (element.marginVertical !== undefined) {
        const marginExpr = compilePropertyValue(element.marginVertical, {
            platform: 'kotlin',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'kotlin')
        });
        if (marginExpr) {
            modifiers.push(`padding(vertical = ${marginExpr})`);
        }
    }

    // Background color
    if (element.backgroundColor !== undefined) {
        let colorExpr = compilePropertyValue(element.backgroundColor, {
            platform: 'kotlin',
            context: 'value',
            formatter: (v: string) => formatColor(v, 'kotlin')
        });
        if (colorExpr) {
            if (element.opacity !== undefined) {
                const opacityExpr = compilePropertyValue(element.opacity, {
                    platform: 'kotlin',
                    context: 'value',
                    formatter: (v: number) => `${v}f`
                });
                colorExpr = `ColorProvider(widgetColor.getColor(context).copy(alpha = ${opacityExpr}))`;
            }

            modifiers.push(`background(${colorExpr})`);
        }
    }

    // Corner radius
    if (element.cornerRadius !== undefined) {
        const radiusExpr = compilePropertyValue(element.cornerRadius, {
            platform: 'kotlin',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'kotlin')
        });
        if (radiusExpr) {
            modifiers.push(`cornerRadius(${radiusExpr})`);
        }
    }

    // Opacity (alpha)
    // if (element.opacity !== undefined) {
    //     const opacityExpr = compilePropertyValue(element.opacity, {
    //         platform: 'kotlin',
    //         context: 'value',
    //         formatter: (v: number) => `${v}f`
    //     });
    //     if (opacityExpr) {
    //         modifiers.push(`alpha(${opacityExpr})`);
    //     }
    // }

    if (modifiers.length === 0) {
        return 'GlanceModifier';
    }

    return 'GlanceModifier.' + modifiers.join('.');
}

/**
 * Build modifier chain for Swift/SwiftUI
 * Returns array of modifier method calls to chain
 */
export function buildSwiftModifiers(element: BaseLayoutElement): string[] {
    const modifiers: string[] = [];

    // Frame modifiers (width, height)
    const hasFrame = element.width !== undefined || element.height !== undefined;
    if (hasFrame) {
        const parts: string[] = [];

        if (element.width !== undefined) {
            const widthExpr = compilePropertyValue(element.width, {
                platform: 'swift',
                context: 'value',
                formatter: (v: number) => formatDimension(v, 'swift')
            });
            if (widthExpr) {
                parts.push(`width: ${widthExpr}`);
            }
        }

        if (element.height !== undefined) {
            const heightExpr = compilePropertyValue(element.height, {
                platform: 'swift',
                context: 'value',
                formatter: (v: number) => formatDimension(v, 'swift')
            });
            if (heightExpr) {
                parts.push(`height: ${heightExpr}`);
            }
        }

        if (parts.length > 0) {
            modifiers.push(`frame(${parts.join(', ')})`);
        }
    }

    // Padding
    if (element.padding !== undefined) {
        const paddingExpr = compilePropertyValue(element.padding, {
            platform: 'swift',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'swift')
        });
        if (paddingExpr) {
            modifiers.push(`padding(${paddingExpr})`);
        }
    }

    // Background color
    if (element.backgroundColor !== undefined) {
        const colorExpr = compilePropertyValue(element.backgroundColor, {
            platform: 'swift',
            context: 'value',
            formatter: (v: string) => formatColor(v, 'swift')
        });
        if (colorExpr) {
            modifiers.push(`background(${colorExpr})`);
        }
    }

    // Corner radius
    if (element.cornerRadius !== undefined) {
        const radiusExpr = compilePropertyValue(element.cornerRadius, {
            platform: 'swift',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'swift')
        });
        if (radiusExpr) {
            modifiers.push(`cornerRadius(${radiusExpr})`);
        }
    }

    // Opacity
    if (element.opacity !== undefined) {
        const opacityExpr = compilePropertyValue(element.opacity, {
            platform: 'swift',
            context: 'value',
            formatter: (v: number) => `${v}`
        });
        if (opacityExpr) {
            modifiers.push(`opacity(${opacityExpr})`);
        }
    }

    return modifiers;
}

/**
 * Build CSS-style properties for HTML/JavaScript
 * Returns object with CSS property-value pairs
 */
export function buildHtmlStyles(element: BaseLayoutElement): Record<string, string> {
    const styles: Record<string, string> = {};

    // Width and height
    if (element.width !== undefined) {
        const widthExpr = compilePropertyValue(element.width, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'javascript')
        });
        if (widthExpr) {
            styles.width = widthExpr.replace(/"/g, '');
        }
    }

    if (element.height !== undefined) {
        const heightExpr = compilePropertyValue(element.height, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'javascript')
        });
        if (heightExpr) {
            styles.height = heightExpr.replace(/"/g, '');
        }
    }

    // Padding
    if (element.padding !== undefined) {
        const paddingExpr = compilePropertyValue(element.padding, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'javascript')
        });
        if (paddingExpr) {
            styles.padding = paddingExpr.replace(/"/g, '');
        }
    }

    if (element.paddingHorizontal !== undefined) {
        const paddingExpr = compilePropertyValue(element.paddingHorizontal, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'javascript')
        });
        if (paddingExpr) {
            const value = paddingExpr.replace(/"/g, '');
            styles['padding-left'] = value;
            styles['padding-right'] = value;
        }
    }

    if (element.paddingVertical !== undefined) {
        const paddingExpr = compilePropertyValue(element.paddingVertical, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'javascript')
        });
        if (paddingExpr) {
            const value = paddingExpr.replace(/"/g, '');
            styles['padding-top'] = value;
            styles['padding-bottom'] = value;
        }
    }

    // Margin
    if (element.margin !== undefined) {
        const marginExpr = compilePropertyValue(element.margin, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'javascript')
        });
        if (marginExpr) {
            styles.margin = marginExpr.replace(/"/g, '');
        }
    }

    if (element.marginHorizontal !== undefined) {
        const marginExpr = compilePropertyValue(element.marginHorizontal, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'javascript')
        });
        if (marginExpr) {
            const value = marginExpr.replace(/"/g, '');
            styles['margin-left'] = value;
            styles['margin-right'] = value;
        }
    }

    if (element.marginVertical !== undefined) {
        const marginExpr = compilePropertyValue(element.marginVertical, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'javascript')
        });
        if (marginExpr) {
            const value = marginExpr.replace(/"/g, '');
            styles['margin-top'] = value;
            styles['margin-bottom'] = value;
        }
    }

    // Background color
    if (element.backgroundColor !== undefined) {
        const colorExpr = compilePropertyValue(element.backgroundColor, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: string) => formatColor(v, 'javascript')
        });
        if (colorExpr) {
            styles['background-color'] = colorExpr.replace(/"/g, '');
        }
    }

    // Border radius (corner radius)
    if (element.cornerRadius !== undefined) {
        const radiusExpr = compilePropertyValue(element.cornerRadius, {
            platform: 'javascript',
            context: 'value',
            formatter: (v: number) => formatDimension(v, 'javascript')
        });
        if (radiusExpr) {
            styles['border-radius'] = radiusExpr.replace(/"/g, '');
        }
    }

    return styles;
}

/**
 * Build NativeScript attribute string for modifiers
 * Returns space-separated attribute string
 */
export function buildNativeScriptAttributes(element: BaseLayoutElement): Record<string, string> {
    const attributes: Record<string, string> = {};

    // Width and height
    if (element.width !== undefined) {
        if (typeof element.width === 'number') {
            attributes.width = String(element.width);
        } else if (typeof element.width === 'string') {
            attributes.width = element.width;
        }
    }

    if (element.height !== undefined) {
        if (typeof element.height === 'number') {
            attributes.height = String(element.height);
        } else if (typeof element.height === 'string') {
            attributes.height = element.height;
        }
    }

    // Padding
    if (element.padding !== undefined) {
        if (typeof element.padding === 'number') {
            attributes.padding = String(element.padding);
        }
    }

    if (element.paddingHorizontal !== undefined) {
        if (typeof element.paddingHorizontal === 'number') {
            attributes.paddingLeft = String(element.paddingHorizontal);
            attributes.paddingRight = String(element.paddingHorizontal);
        }
    }

    if (element.paddingVertical !== undefined) {
        if (typeof element.paddingVertical === 'number') {
            attributes.paddingTop = String(element.paddingVertical);
            attributes.paddingBottom = String(element.paddingVertical);
        }
    }

    // Margin
    if (element.margin !== undefined) {
        if (typeof element.margin === 'number') {
            attributes.margin = String(element.margin);
        }
    }

    // Background color
    if (element.backgroundColor !== undefined) {
        if (typeof element.backgroundColor === 'string') {
            attributes.backgroundColor = element.backgroundColor;
        }
    }

    // Border radius
    if (element.cornerRadius !== undefined) {
        if (typeof element.cornerRadius === 'number') {
            attributes.borderRadius = String(element.cornerRadius);
        }
    }

    return attributes;
}

/**
 * Convert styles object to inline CSS string
 */
export function stylesToCss(styles: Record<string, string>): string {
    return Object.entries(styles)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
}

/**
 * Convert attributes object to HTML attribute string
 */
export function attributesToString(attributes: Record<string, string>): string {
    return Object.entries(attributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
}
