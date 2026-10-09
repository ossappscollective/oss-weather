import { Align, Canvas, FontMetrics, Paint } from '@nativescript-community/ui-canvas';
import { File, Folder, ImageSource, knownFolders, path } from '@nativescript/core';

// data icons (font glyphs) drawn to png files: widgets cannot use the app icon fonts
const ICON_SIZE = 64;

let iconsFolder: string;
function getIconsFolder() {
    if (!iconsFolder) {
        if (__IOS__) {
            // the widget extension only reads the shared App Group container
            const containerURL = NSFileManager.defaultManager.containerURLForSecurityApplicationGroupIdentifier(WidgetUtils.suiteName);
            iconsFolder = containerURL.URLByAppendingPathComponent('WidgetData/icons').path;
        } else {
            iconsFolder = path.join(knownFolders.documents().path, 'widget_icons');
        }
        Folder.fromPath(iconsFolder);
    }
    return iconsFolder;
}

const paint = new Paint();
paint.setAntiAlias(true);
paint.setTextAlign(Align.CENTER);
const fontMetrics = new FontMetrics();

export function renderWidgetIcon(glyph: string, fontFamily: string, color: string): string {
    if (!glyph) {
        return '';
    }
    const fileName = `${fontFamily}_${glyph.codePointAt(0).toString(16)}_${color.replace('#', '')}.png`;
    const filePath = path.join(getIconsFolder(), fileName);
    if (File.exists(filePath)) {
        return filePath;
    }
    const canvas = new Canvas(ICON_SIZE, ICON_SIZE);
    paint.setFontFamily(fontFamily);
    paint.setTextSize(ICON_SIZE * 0.85);
    paint.setColor(color);
    paint.getFontMetrics(fontMetrics);
    // glyph centered on the baseline metrics (icon fonts sit their glyphs at the capital height)
    canvas.drawText(glyph, ICON_SIZE / 2, ICON_SIZE / 2 - (fontMetrics.ascent + fontMetrics.descent) / 2, paint);
    new ImageSource(canvas.getImage()).saveToFile(filePath, 'png');
    canvas.release();
    return filePath;
}
