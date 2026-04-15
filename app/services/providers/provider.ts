import { lc } from '~/helpers/locale';

const singletons = {};

export abstract class Provider {
    id: string;
    private static _singleton: Provider;

    getName() {
        return lc(`provider.${this.id}`);
    }
    getModelName(key) {
        return key;
    }

    static getUrl() {
        return '';
    }
    public static getSettings() {
        return [];
    }

    public static requiresApiKey() {
        return false;
    }
    public static hasApiKey(): boolean {
        return false;
    }
    public static getApiKey(): string {
        return null;
    }
    public static setApiKey(key: string) {}
    static getApiKeyDescription() {
        return null;
    }

    public static getInstance<T extends Provider>(this: new () => T): T {
        // we use static id because prototype.constructor.name might not be uniq when uglified
        const key = this['id'];
        if (!singletons[key]) {
            singletons[key] = new this();
        }
        return singletons[key];
    }
}
