import { ApplicationSettings, File, Folder, Observable, Utils, knownFolders, path } from '@nativescript/core';
import { prefs } from './preferences';
import { createGlobalEventListener, globalObservable } from '@shared/utils/svelte/ui';
import { ANIMATIONS_ENABLED, PROVIDER_PADDING } from '~/helpers/constants';

export const iconThemesFolder = path.join(knownFolders.currentApp().path, 'assets/icon_themes');
export const onIconPackChanged = createGlobalEventListener('iconPack');
export const onIconAnimationsChanged = createGlobalEventListener('iconAnimations');

const WEATHER_CODE_MAPPING = new Map<number, number>();
WEATHER_CODE_MAPPING.set(201, 200);
WEATHER_CODE_MAPPING.set(202, 200);
WEATHER_CODE_MAPPING.set(211, 210);
WEATHER_CODE_MAPPING.set(212, 211);
WEATHER_CODE_MAPPING.set(221, 212);
WEATHER_CODE_MAPPING.set(230, 200);
WEATHER_CODE_MAPPING.set(231, 201);
WEATHER_CODE_MAPPING.set(232, 202);

WEATHER_CODE_MAPPING.set(300, 500);
WEATHER_CODE_MAPPING.set(301, 300);
WEATHER_CODE_MAPPING.set(302, 300);
WEATHER_CODE_MAPPING.set(310, 300);
WEATHER_CODE_MAPPING.set(311, 310);
WEATHER_CODE_MAPPING.set(312, 311);
WEATHER_CODE_MAPPING.set(313, 313);
WEATHER_CODE_MAPPING.set(314, 313);
WEATHER_CODE_MAPPING.set(321, 301);

WEATHER_CODE_MAPPING.set(501, 500);
WEATHER_CODE_MAPPING.set(502, 501);
WEATHER_CODE_MAPPING.set(503, 502);
WEATHER_CODE_MAPPING.set(504, 503);
WEATHER_CODE_MAPPING.set(510, 500);
WEATHER_CODE_MAPPING.set(511, 501);
WEATHER_CODE_MAPPING.set(520, 500);
WEATHER_CODE_MAPPING.set(521, 501);
WEATHER_CODE_MAPPING.set(522, 503);
WEATHER_CODE_MAPPING.set(531, 503);

WEATHER_CODE_MAPPING.set(601, 600);
WEATHER_CODE_MAPPING.set(602, 601);
WEATHER_CODE_MAPPING.set(603, 602);
WEATHER_CODE_MAPPING.set(611, 601);
WEATHER_CODE_MAPPING.set(612, 600);
WEATHER_CODE_MAPPING.set(613, 601);
WEATHER_CODE_MAPPING.set(615, 600);
WEATHER_CODE_MAPPING.set(616, 601);
WEATHER_CODE_MAPPING.set(620, 600);
WEATHER_CODE_MAPPING.set(621, 601);
WEATHER_CODE_MAPPING.set(622, 602);

WEATHER_CODE_MAPPING.set(711, 701);
WEATHER_CODE_MAPPING.set(721, 701);
WEATHER_CODE_MAPPING.set(731, 701);
WEATHER_CODE_MAPPING.set(741, 701);
WEATHER_CODE_MAPPING.set(751, 731);
WEATHER_CODE_MAPPING.set(761, 731);
WEATHER_CODE_MAPPING.set(762, 731);
WEATHER_CODE_MAPPING.set(771, 701);
WEATHER_CODE_MAPPING.set(781, 771);

WEATHER_CODE_MAPPING.set(801, 800);
WEATHER_CODE_MAPPING.set(802, 801);
WEATHER_CODE_MAPPING.set(803, 802);
WEATHER_CODE_MAPPING.set(804, 803);

function fillIconMap(folderPath: string, map: Map<number, number>) {
    map.clear();
    Folder.fromPath(folderPath)
        .getEntitiesSync()
        .map((e) => e.name)
        .reduce((acc, current) => {
            current = current.split('.').slice(0, -1).join('.');
            const length = current.length;
            if (length === 3) {
                acc.set(parseInt(current, 10), 0);
            } else {
                const id = parseInt(current.slice(0, -1), 10);
                if (!acc.has(id)) {
                    acc.set(id, 1);
                }
            }
            return acc;
        }, map);
}
export class IconService extends Observable {
    getIconConfig(folderPath = this.iconSetFolderPath) {
        if (!this.iconSetConfig) {
            this.iconSetConfig = JSON.parse(File.fromPath(path.join(folderPath, 'config.json')).readTextSync());
        }
        return this.iconSetConfig;
    }
    getPackName() {
        return this.getIconConfig().name;
    }
    getPackIcon(iconSet?: string) {
        if (iconSet) {
            if (iconSet.startsWith('provider:')) {
                return this.getIconPath(800, true, false, iconSet);
            }
            return path.join(iconThemesFolder, iconSet, 'images/800d.png');
        }
        return this.getIconConfig().sampleIconPath ?? path.join(this.iconSetFolderPath, 'images/800d.png');
    }
    iconSet: string;
    iconSetFolderPath: string;
    iconSetConfig;
    images: Map<number, number> = new Map<number, number>();
    lotties: Map<number, number> = new Map<number, number>();
    mappingCache: Map<string, string> = new Map<string, string>();
    mAnimated: boolean;
    constructor() {
        super();
        this.load(false);
        this.updateAnimatedState(false);
        prefs.on('key:icon_set', () => this.load(), this);
        prefs.on('key:animations', () => this.updateAnimatedState(), this);
    }
    updateAnimatedState(fire = true) {
        this.mAnimated = ApplicationSettings.getBoolean('animations', ANIMATIONS_ENABLED);
        if (fire) {
            globalObservable.notify({ eventName: 'iconAnimations', data: this.mAnimated });
        }
    }
    get animated() {
        return this.mAnimated;
    }
    usingLottie = true;
    usingProvider = false;

    load(fireChange = true) {
        this.iconSet = ApplicationSettings.getString('icon_set', 'meteocons');
        if (this.iconSet.startsWith('provider:')) {
            this.iconSetFolderPath = null;
            this.iconSetConfig = JSON.parse(com.akylas.weather.WeatherIconProviderRegistry.getPackageInfo(Utils.android.getApplicationContext(), this.iconSet.substring(9)));
            this.images.clear();
            this.lotties.clear();
            this.usingLottie = false;
            this.usingProvider = true;
            DEV_LOG && console.log('load', this.iconSet, this.iconSetConfig);
        } else {
            this.iconSetFolderPath = path.join(iconThemesFolder, this.iconSet);
            this.iconSetConfig = null;
            fillIconMap(path.join(this.iconSetFolderPath, 'images'), this.images);
            fillIconMap(path.join(this.iconSetFolderPath, 'lottie'), this.lotties);
            this.usingLottie = true;
            this.usingProvider = false;
        }
        this.mappingCache.clear();
        if (fireChange) {
            globalObservable.notify({ eventName: 'iconPack', data: this.iconSet });
        }
    }

    getIconPath(iconId, isDay: boolean, animated = this.animated, iconSet = this.iconSet) {
        if (!iconId && iconId !== 0) {
            return null;
        }
        if (__ANDROID__ && iconSet.startsWith('provider:')) {
            let realIconId = iconId;
            while (realIconId !== undefined && WEATHER_CODE_MAPPING.get(realIconId)) {
                realIconId = WEATHER_CODE_MAPPING.get(realIconId);
            }
            if (!realIconId) {
                return null;
            }
            const context = Utils.android.getApplicationContext();
            // TODO: support AnimatableIconView
            return com.akylas.weather.WeatherIconProviderRegistry.getDrawablePath(context, iconSet.substring(9), realIconId, isDay, false);
        } else {
            const iconSetFolderPath = path.join(iconThemesFolder, iconSet || iconService.iconSet);
            const realIcon = iconService.getIcon(iconId, isDay, false);
            if (animated) {
                return `~/assets/icon_themes/${iconSet}/lottie/${realIcon}.lottie`;
            } else {
                return `${iconSetFolderPath}/images/${realIcon}.png`;
            }
        }
    }
    getIcon(iconId: number, isDay: boolean, animated = this.animated) {
        if (!iconId && iconId !== 0) {
            return null;
        }
        const key = `${iconId}${isDay ? 1 : 0}${animated ? 1 : 0}`;
        const cached = this.mappingCache.get(key);
        if (cached) {
            return cached;
        }
        const mapIds = animated ? this.lotties : this.images;
        let realIconId = iconId;
        let mapId = mapIds.get(realIconId);
        while (mapId === undefined && realIconId !== undefined) {
            realIconId = WEATHER_CODE_MAPPING.get(realIconId);
            mapId = mapIds.get(realIconId);
        }
        if (!realIconId) {
            return null;
        }
        const result = `${realIconId}${mapId === 1 ? (isDay ? 'd' : 'n') : ''}`;
        this.mappingCache.set(key, result);
        return result;
    }
    async getAvailableThemes() {
        const theme_folders = await Folder.fromPath(iconThemesFolder).getEntities();

        const result = await Promise.all(
            theme_folders.map(async (folder) => {
                const jsonData = JSON.parse(await File.fromPath(path.join(folder.path, 'config.json')).readText());
                const icon = this.getPackIcon(folder.name);
                return {
                    icon,
                    name: jsonData.name,
                    description: jsonData.description,
                    id: folder.name,
                    imageWidth: 50,
                    imageMargin: 0
                };
            })
        );
        if (__ANDROID__) {
            const context = Utils.android.getApplicationContext();
            const iconPacks = JSON.parse(com.akylas.weather.WeatherIconProviderRegistry.listInstalledProviders(context));
            DEV_LOG && console.log('iconPacks', iconPacks);
            iconPacks.forEach((iconPack) => {
                result.push({
                    icon: iconPack.sampleIconPath,
                    name: iconPack.name,
                    id: `provider:${iconPack.id}`,
                    description: null,
                    imageWidth: 50 - 2 * PROVIDER_PADDING,
                    imageMargin: PROVIDER_PADDING
                });
            });
        }
        return result;
    }
}
export const iconService = new IconService();
