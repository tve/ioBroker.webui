import { Connection } from "@iobroker/socket-client";
import { TypedEvent } from "@node-projects/base-custom-webcomponent";
import { IScreen } from "./interfaces/IScreen.js";

declare global {
    interface Window {
        iobrokerHost: string;
        iobrokerPort: number;
        iobrokerWebuiRootUrl: string;
    }
}

const screenFileExtension = ".screen";

class IobrokerHandler {

    static instance = new IobrokerHandler();

    host: ioBroker.HostObject;
    connection: Connection;
    adapterName = "webui";
    configPath = "config/";

    namespace = "webui.0";

    private _screens: Record<string, IScreen> = {};
    //private _styles: Record<string, IStyle> = {};
    //private _screenTemplateMap = new WeakMap<IScreen, HTMLTemplateElement>();
    //private _styleSheetMap = new WeakMap<IStyle, CSSStyleSheet>();

    screensChanged = new TypedEvent<void>();
    stylesChanged = new TypedEvent<void>();

    constructor() {
    }

    async init() {
        this.connection = new Connection({ protocol: 'ws', host: window.iobrokerHost, port: window.iobrokerPort, admin5only: false, autoSubscribes: [] });
        await this.connection.startSocket();
        await this.connection.waitForFirstConnection();
        await this.readAllScreens();

        console.log("ioBroker handler ready.")
    }

    async readAllScreens() {
        try {
            const screenNames = (await this.connection.readDir(this.adapterName, this.configPath + "screens"))
                .filter(x => x.file.endsWith(screenFileExtension))
                .map(x => x.file.substring(0, x.file.length - screenFileExtension.length));
            const screenPromises = screenNames.map(x => {
                try {
                    return this.connection.readFile(this.adapterName, this.configPath + "screens/" + x + screenFileExtension, false);
                }
                catch (err) {
                    console.error("Error reading Screen", x, err);
                    return null;
                }
            })
            const screensLoaded = await Promise.all(screenPromises);
            this._screens = {};
            screenNames.forEach((x, i) => {
                try {
                    const dec = new TextDecoder();
                    //@ts-ignore
                    this._screens[x.toLocaleLowerCase()] = JSON.parse(dec.decode(Uint8Array.from(screensLoaded[i].file.data)));
                }
                catch (err) {
                    console.error("Error parsing Screen", x, err);
                }
            });
            this.screensChanged.emit();
        }
        catch (err) {
            console.error("Error reading Screens", err)
        }
    }

    async saveScreen(name: string, screen: IScreen) {
        const enc = new TextEncoder();
        //@ts-ignore
        await this.connection.writeFile64(this.adapterName, "/" + this.configPath + "screens/" + name.toLocaleLowerCase() + screenFileExtension, enc.encode(JSON.stringify(screen)));
        this.readAllScreens();
    }

    getScreenNames() {
        return Object.keys(this._screens);
    }

    getScreen(name: string): IScreen {
        return this._screens[name.toLocaleLowerCase()];
    }

    async sendCommand(command: 'addNpm' | 'removeNpm' | 'updateNpm', data: string, clientId: string = ''): Promise<void> {
        await this.connection.setState(this.namespace + '.control.data', { val: data });
        await this.connection.setState(this.namespace + '.control.clientIds', { val: clientId });
        await this.connection.setState(this.namespace + '.control.command', { val: command });
    }


    /*async readAllStyles() {
        const styleNames = (await this.connection.readDir(this.adapterName, this.configPath + "styles")).map(x => x.file);
        const stylePromises = styleNames.map(x => this.connection.readFile(this.adapterName, this.configPath + "styles/" + x))
        const stylesLoaded = await Promise.all(stylePromises);
        this._styles = {};
        styleNames.forEach((x, i) => this._styles[x.toLocaleLowerCase()] = JSON.parse(stylesLoaded[i].file));
        this.screensChanged.emit();
    }

    async saveStyle(name: string, style: IStyle) {
        await this.connection.writeFile64(this.adapterName, this.configPath + "styles/" + name.toLocaleLowerCase(), btoa(JSON.stringify(style)));
        this.readAllStyles();
    }

    getStyleNames() {
        return Object.keys(this._styles);
    }

    getStyle(name: string): IStyle {
        return this._styles[name.toLocaleLowerCase()];
    }*/
}

export const iobrokerHandler = IobrokerHandler.instance;