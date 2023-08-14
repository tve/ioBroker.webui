import { TypedEvent } from "@node-projects/base-custom-webcomponent";
import { iobrokerHandler } from "../common/IobrokerHandler.js";
import { PropertiesHelper } from "@node-projects/web-component-designer/dist/elements/services/propertiesService/services/PropertiesHelper.js";
import { BindingTarget } from "@node-projects/web-component-designer/dist/elements/item/BindingTarget.js";
//;,[ are not allowed in bindings, so they could be used for a short form...
export const bindingPrefixProperty = 'bind-prop:';
export const bindingPrefixAttribute = 'bind-attr:';
export const bindingPrefixCss = 'bind-css:';
export const bindingPrefixContent = 'bind-content:';
export class IobrokerWebuiBindingsHelper {
    static parseBinding(element, name, value, bindingTarget, prefix) {
        if (!value.startsWith('{')) {
            let binding = {
                signal: value,
                target: bindingTarget
            };
            if (value.startsWith('=')) {
                value = value.substring(1);
                binding.signal = value;
                binding.twoWay = true;
                if (element instanceof HTMLInputElement)
                    binding.events = ['change'];
                else if (element instanceof HTMLInputElement)
                    binding.events = ['change'];
                else
                    binding.events = [name + '-changed'];
            }
            if (value.startsWith('!')) {
                binding.signal = value.substring(1);
                binding.inverted = true;
            }
            return [PropertiesHelper.dashToCamelCase(name.substring(prefix.length)), binding];
        }
        let binding = JSON.parse(value);
        binding.target = bindingTarget;
        if (binding.twoWay && (binding.events == null || binding.events.length == 0)) {
            if (element instanceof HTMLInputElement)
                binding.events = ['change'];
            else if (element instanceof HTMLInputElement)
                binding.events = ['change'];
            else
                binding.events = [name + '-changed'];
        }
        return [PropertiesHelper.dashToCamelCase(name.substring(prefix.length)), binding];
    }
    static serializeBinding(element, targetName, binding) {
        if (binding.target == BindingTarget.property &&
            binding.converter == null &&
            (binding.events == null || binding.events.length == 0)) {
            if (targetName == 'textContent')
                return [bindingPrefixContent + 'text', (binding.twoWay ? '=' : '') + (binding.inverted ? '!' : '') + binding.signal];
            if (targetName == 'innerHTML')
                return [bindingPrefixContent + 'html', (binding.twoWay ? '=' : '') + (binding.inverted ? '!' : '') + binding.signal];
            return [bindingPrefixProperty + PropertiesHelper.camelToDashCase(targetName), (binding.twoWay ? '=' : '') + (binding.inverted ? '!' : '') + binding.signal];
        }
        let bindingCopy = { ...binding }; //can be removed with custom serialization
        //todo custom serialization
        //let str='{"signal":"'+binding.signal+'",'+binding.
        //remove default event name, not needed
        if (!binding.twoWay || (binding.events != null && binding.events.length == 1)) {
            if (element instanceof HTMLInputElement && binding.events[0] == "change")
                delete bindingCopy.events;
            else if (element instanceof HTMLInputElement && binding.events[0] == "change")
                delete bindingCopy.events;
            else if (element instanceof HTMLInputElement && binding.events[0] == targetName + '-changed')
                delete bindingCopy.events;
        }
        delete bindingCopy.target;
        if (binding.target == BindingTarget.content)
            return [bindingPrefixContent + 'html', JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.attribute)
            return [bindingPrefixAttribute + PropertiesHelper.camelToDashCase(targetName), JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.css)
            return [bindingPrefixCss + PropertiesHelper.camelToDashCase(targetName), JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.property && targetName == 'innerHTML')
            return [bindingPrefixContent + 'html', JSON.stringify(bindingCopy)];
        if (binding.target == BindingTarget.property && targetName == 'textContent')
            return [bindingPrefixContent + 'text', JSON.stringify(bindingCopy)];
        return [bindingPrefixProperty + PropertiesHelper.camelToDashCase(targetName), JSON.stringify(bindingCopy)];
    }
    static getBindingAttributeName(element, propertyName, propertyTarget) {
        if (propertyTarget == BindingTarget.attribute) {
            return bindingPrefixAttribute + PropertiesHelper.camelToDashCase(propertyName);
        }
        if (propertyTarget == BindingTarget.css) {
            return bindingPrefixCss + PropertiesHelper.camelToDashCase(propertyName);
        }
        if (propertyTarget == BindingTarget.property && propertyName == 'innerHTML') {
            return bindingPrefixContent + 'html';
        }
        if (propertyTarget == BindingTarget.property && propertyName == 'textContent') {
            return bindingPrefixContent + 'text';
        }
        return bindingPrefixProperty + PropertiesHelper.camelToDashCase(propertyName);
    }
    static *getBindings(element) {
        for (let a of element.attributes) {
            if (a.name.startsWith(bindingPrefixProperty)) {
                yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name, a.value, BindingTarget.property, bindingPrefixProperty);
            }
            else if (a.name.startsWith(bindingPrefixContent)) {
                yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name == 'bind-content:html' ? 'bind-prop:inner-h-t-m-l' : 'bind-prop:text-content', a.value, BindingTarget.property, bindingPrefixProperty);
            }
            else if (a.name.startsWith(bindingPrefixAttribute)) {
                yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name, a.value, BindingTarget.attribute, bindingPrefixAttribute);
            }
            else if (a.name.startsWith(bindingPrefixCss)) {
                yield IobrokerWebuiBindingsHelper.parseBinding(element, a.name, a.value, BindingTarget.css, bindingPrefixCss);
            }
        }
    }
    static applyAllBindings(rootElement) {
        let retVal = [];
        let allElements = rootElement.querySelectorAll('*');
        for (let e of allElements) {
            const bindings = this.getBindings(e);
            for (let b of bindings) {
                retVal.push(this.applyBinding(e, b));
            }
        }
        return retVal;
    }
    static applyBinding(element, binding) {
        let cb = (id, value) => IobrokerWebuiBindingsHelper.handleValueChanged(element, binding, value);
        iobrokerHandler.connection.subscribeState(binding[1].signal, cb);
        if (binding[1].twoWay) {
            for (let e of binding[1].events) {
                const evt = element[e];
                if (evt instanceof TypedEvent) {
                    evt.on(() => {
                        if (binding[1].target == BindingTarget.property)
                            iobrokerHandler.connection.setState(binding[1].signal, element[binding[0]]);
                    });
                }
                else {
                    element.addEventListener(e, () => {
                        if (binding[1].target == BindingTarget.property)
                            iobrokerHandler.connection.setState(binding[1].signal, element[binding[0]]);
                    });
                }
            }
        }
        return () => iobrokerHandler.connection.unsubscribeState(binding[1].signal, cb);
    }
    static handleValueChanged(element, binding, value) {
        let v = value.val;
        if (binding[1].converter) {
        }
        if (binding[1].inverted)
            v = !v;
        if (binding[1].target == BindingTarget.property)
            element[binding[0]] = v;
        else if (binding[1].target == BindingTarget.attribute)
            element.setAttribute(binding[0], v);
        else if (binding[1].target == BindingTarget.css)
            element.style[binding[0]] = v;
    }
}
