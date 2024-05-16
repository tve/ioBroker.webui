import { BaseCustomWebcomponentBindingsService, BindingsRefactorService, JsonFileElementsService, PreDefinedElementsService, SeperatorContextMenu, TextRefactorService, createDefaultServiceContainer } from "@node-projects/web-component-designer";
import { NodeHtmlParserService } from '@node-projects/web-component-designer-htmlparserservice-nodehtmlparser';
import { CodeViewMonaco } from '@node-projects/web-component-designer-codeview-monaco';
import { CssToolsStylesheetService } from '@node-projects/web-component-designer-stylesheetservice-css-tools';
import { BindableObjectDragDropService, BindingsEditor, VisualizationBindingsService, PropertyGridDragDropService, ScriptRefactorService } from "@node-projects/web-component-designer-visualization-addons";
import { IobrokerWebuiBindableObjectsService } from "../services/IobrokerWebuiBindableObjectsService.js";
import { IobrokerWebuiDemoProviderService } from "../services/IobrokerWebuiDemoProviderService.js";
import { IobrokerWebuiConfirmationWrapper } from "./IobrokerWebuiConfirmationWrapper.js";
import customElementsObserver from "../widgets/customElementsObserver.js";
import { IobrokerWebuiExternalDragDropService } from "../services/IobrokerWebuiExternalDragDropService.js";
import { IobrokerWebuiCopyPasteService } from "../services/IobrokerWebuiCopyPasteService.js";
import { IobrokerWebuiEventsService } from "../services/IobrokerWebuiEventsService.js";
import { IobrokerWebuiPropertiesService } from "../services/IobrokerWebuiPropertiesService.js";
import { IobrokerWebuiConfigButtonProvider } from "../services/IobrokerWebuiConfigButtonProvider.js";
import { IobrokerWebuiCustomElementContextMenu } from "../services/IobrokerWebuiCustomElementContextMenu.js";
import { IobrokerWebuiRefactorService } from "../services/IobrokerWebuiRefactorService.js";
import { IobrokerWebuiSpecialPropertiesService } from "../services/IobrokerWebuiSpecialPropertiesService.js";
import { iobrokerHandler } from "../common/IobrokerHandler.js";
import { ExpandCollapseContextMenu } from "@node-projects/web-component-designer-widgets-wunderbaum";
import { IobrokerWebuiScreenContextMenu } from "../services/IobrokerWebuiScreenContextMenu.js";
export function configureDesigner(bindingsHelper) {
    const serviceContainer = createDefaultServiceContainer();
    serviceContainer.register("bindingService", new BaseCustomWebcomponentBindingsService());
    serviceContainer.register("htmlParserService", new NodeHtmlParserService());
    serviceContainer.register("bindableObjectsService", new IobrokerWebuiBindableObjectsService());
    serviceContainer.register("bindableObjectDragDropService", new BindableObjectDragDropService(bindingsHelper, iobrokerHandler));
    serviceContainer.register("bindingService", new VisualizationBindingsService(bindingsHelper));
    serviceContainer.register("demoProviderService", new IobrokerWebuiDemoProviderService());
    serviceContainer.register("externalDragDropService", new IobrokerWebuiExternalDragDropService());
    serviceContainer.register("copyPasteService", new IobrokerWebuiCopyPasteService());
    serviceContainer.register("eventsService", new IobrokerWebuiEventsService());
    serviceContainer.register("propertyGridDragDropService", new PropertyGridDragDropService());
    serviceContainer.register("refactorService", new BindingsRefactorService());
    serviceContainer.register("refactorService", new TextRefactorService());
    serviceContainer.register("refactorService", new ScriptRefactorService());
    serviceContainer.register("refactorService", new IobrokerWebuiRefactorService());
    serviceContainer.register("stylesheetService", designerCanvas => new CssToolsStylesheetService(designerCanvas));
    serviceContainer.config.codeViewWidget = CodeViewMonaco;
    serviceContainer.register('elementsService', new JsonFileElementsService('webui', './dist/frontend/elements-webui.json'));
    serviceContainer.register('elementsService', new JsonFileElementsService('native', './node_modules/@node-projects/web-component-designer/config/elements-native.json'));
    serviceContainer.register('propertyService', new IobrokerWebuiPropertiesService());
    serviceContainer.register('propertyService', new IobrokerWebuiSpecialPropertiesService());
    serviceContainer.designViewConfigButtons.push(new IobrokerWebuiConfigButtonProvider());
    serviceContainer.designerContextMenuExtensions.push(new SeperatorContextMenu());
    serviceContainer.designerContextMenuExtensions.push(new IobrokerWebuiCustomElementContextMenu());
    serviceContainer.designerContextMenuExtensions.push(new IobrokerWebuiScreenContextMenu());
    serviceContainer.designerContextMenuExtensions.push(new ExpandCollapseContextMenu());
    for (let l of customElementsObserver.getElements()) {
        if (l[1].length > 0) {
            const elementsCfg = {
                elements: l[1]
            };
            let elService = new PreDefinedElementsService(l[0], elementsCfg);
            serviceContainer.register('elementsService', elService);
        }
    }
    serviceContainer.config.openBindingsEditor = async (property, designItems, binding, target) => {
        let dynEdt = new BindingsEditor(property, binding, target, serviceContainer, window.appShell);
        let cw = new IobrokerWebuiConfirmationWrapper();
        cw.title = "Edit Binding of '" + property.name + "' - " + property.propertyType;
        cw.appendChild(dynEdt);
        let dlg = window.appShell.openDialog(cw, { x: 200, y: 200, width: 700, height: 460 });
        cw.cancelClicked.on((e) => {
            dlg.close();
        });
        cw.okClicked.on((e) => {
            dlg.close();
            let bnd = { signal: dynEdt.objectNames, target };
            bnd.inverted = dynEdt.invert;
            bnd.twoWay = dynEdt.twoWay;
            bnd.expression = dynEdt.expression;
            bnd.expressionTwoWay = dynEdt.expressionTwoWay;
            bnd.historic = dynEdt.historic;
            if (dynEdt.objectValueType)
                bnd.type = dynEdt.objectValueType;
            if (dynEdt.converters.length > 0) {
                let cObj = {};
                for (let c of dynEdt.converters) {
                    cObj[c.key] = c.value;
                }
                bnd.converter = cObj;
            }
            if (dynEdt.events)
                bnd.events = dynEdt.events.split(';');
            let serializedBnd = bindingsHelper.serializeBinding(designItems[0].element, property.name, bnd);
            let group = designItems[0].openGroup('edit_binding');
            designItems[0].setAttribute(serializedBnd[0], serializedBnd[1]);
            group.commit();
        });
    };
    //LazyLoader.LoadJavascript(window.iobrokerWebRootUrl + 'webui.0.widgets/importmap.js');
    import(window.iobrokerWebRootUrl + 'webui.0.widgets/configWidgets.js').then(x => {
        x.registerNpmWidgets(serviceContainer);
        //paletteTree.loadControls(serviceContainer, serviceContainer.elementsServices);
    }).catch(err => {
        //console.warn('error loading widgets designer generated code', err);
    });
    import(window.iobrokerWebRootUrl + 'webui.0.widgets/designerAddons.js').then(x => {
        x.registerDesignerAddons(serviceContainer);
    }).catch(err => {
        //console.warn('error loading widgets designer addons', err);
    });
    return serviceContainer;
}
