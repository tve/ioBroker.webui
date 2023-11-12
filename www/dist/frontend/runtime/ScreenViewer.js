var ScreenViewer_1;
import { __decorate } from "tslib";
import { BaseCustomWebComponentConstructorAppend, css, cssFromString, customElement, DomHelper, htmlFromString, property } from "@node-projects/base-custom-webcomponent";
import { IobrokerWebuiBindingsHelper } from "../helper/IobrokerWebuiBindingsHelper.js";
import { iobrokerHandler } from "../common/IobrokerHandler.js";
import { ScriptSystem } from "../scripting/ScriptSystem.js";
let ScreenViewer = class ScreenViewer extends BaseCustomWebComponentConstructorAppend {
    static { ScreenViewer_1 = this; }
    static style = css `
    :host {
        height: 100%;
        position: relative;
        display: block;
    }

    *[node-projects-hide-at-run-time] {
        display: none !important;
    }
    `;
    _iobBindings;
    _loading;
    _refreshViewSubscription;
    _screenName;
    _screensChangedSubscription;
    _scriptObject;
    get screenName() {
        return this._screenName;
    }
    set screenName(value) {
        if (this._screenName != value) {
            this._screenName = value;
            this._loadScreen();
        }
    }
    _relativeSignalsPath;
    get relativeSignalsPath() {
        return this._relativeSignalsPath;
    }
    set relativeSignalsPath(value) {
        if (this._relativeSignalsPath != value) {
            this._relativeSignalsPath = value;
        }
    }
    objects;
    constructor() {
        super();
        this._restoreCachedInititalValues();
    }
    ready() {
        this._parseAttributesToProperties();
        if (this._screenName)
            this._loadScreen();
    }
    removeBindings() {
        if (this._iobBindings)
            this._iobBindings.forEach(x => x());
        this._iobBindings = null;
    }
    async _loadScreen() {
        if (!this._loading) {
            this._loading = true;
            await iobrokerHandler.waitForReady();
            this._loading = false;
            this.removeBindings();
            DomHelper.removeAllChildnodes(this.shadowRoot);
            const screen = await iobrokerHandler.getScreen(this.screenName);
            if (screen) {
                this.loadScreenData(screen.html, screen.style, screen.script);
            }
        }
    }
    async loadScreenData(html, style, script) {
        let globalStyle = iobrokerHandler.config?.globalStyle ?? '';
        if (globalStyle && style)
            this.shadowRoot.adoptedStyleSheets = [ScreenViewer_1.style, iobrokerHandler.globalStylesheet, cssFromString(style)];
        else if (globalStyle)
            this.shadowRoot.adoptedStyleSheets = [ScreenViewer_1.style, iobrokerHandler.globalStylesheet];
        else if (style)
            this.shadowRoot.adoptedStyleSheets = [ScreenViewer_1.style, cssFromString(style)];
        else
            this.shadowRoot.adoptedStyleSheets = [ScreenViewer_1.style];
        const template = htmlFromString(html);
        const documentFragment = template.content.cloneNode(true);
        this.shadowRoot.appendChild(documentFragment);
        this._iobBindings = IobrokerWebuiBindingsHelper.applyAllBindings(this.shadowRoot, this.relativeSignalsPath, this);
        this._scriptObject = await ScriptSystem.assignAllScripts(script, this.shadowRoot, this);
    }
    _getRelativeSignalsPath() {
        return this._relativeSignalsPath;
    }
    connectedCallback() {
        this._refreshViewSubscription = iobrokerHandler.refreshView.on(() => this._loadScreen());
        this._screensChangedSubscription = iobrokerHandler.screensChanged.on(() => {
            if (this._screenName)
                this._loadScreen();
        });
        this._scriptObject?.connectedCallback?.(this);
    }
    disconnectedCallback() {
        this._refreshViewSubscription?.dispose();
        this._screensChangedSubscription?.dispose();
        this._scriptObject?.disconnectedCallback?.(this);
    }
};
__decorate([
    property()
], ScreenViewer.prototype, "screenName", null);
__decorate([
    property()
], ScreenViewer.prototype, "relativeSignalsPath", null);
ScreenViewer = ScreenViewer_1 = __decorate([
    customElement("iobroker-webui-screen-viewer")
], ScreenViewer);
export { ScreenViewer };
