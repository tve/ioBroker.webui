import { __decorate } from "tslib";
import { BaseCustomWebComponentConstructorAppend, DomHelper, css, customElement } from "@node-projects/base-custom-webcomponent";
import { iobrokerHandler } from "../common/IobrokerHandler";
let TranslateableText = class TranslateableText extends BaseCustomWebComponentConstructorAppend {
    constructor() {
        super();
        this._restoreCachedInititalValues();
    }
    connectedCallback() {
        this._languageChangedHandler = iobrokerHandler.languageChanged.on(() => this._translate);
        this._translate();
    }
    disconnectedCallback() {
        this._languageChangedHandler.dispose();
    }
    _translate() {
        DomHelper.removeAllChildnodes(this.shadowRoot);
        this.shadowRoot.appendChild(document.createTextNode(this.innerText));
    }
};
TranslateableText.style = css `
        :host {
            display: inline;
        }

        *[node-projects-hide-at-run-time] {
            display: none !important;
        }`;
TranslateableText = __decorate([
    customElement("t-t")
], TranslateableText);
export { TranslateableText };
