import { BindingMode, BindingTarget, IBinding, IBindingService, IDesignItem, PropertiesHelper } from "@node-projects/web-component-designer";
import { IobrokerWebuiBindingsHelper } from "../helper/IobrokerWebuiBindingsHelper.js";
import { IIobrokerWebuiBinding } from "../interfaces/IIobrokerWebuiBinding.js";

export class IobrokerWebuiBindingService implements IBindingService {
  getBindings(designItem: IDesignItem): (IBinding & { converter: Record<string, any> })[] {
    const iobBindings = Array.from(IobrokerWebuiBindingsHelper.getBindings(designItem.element));
    return iobBindings.map(x => ({
      targetName: x[1].target == 'css' ? PropertiesHelper.camelToDashCase(x[0]) : x[0],
      target: x[1].target,
      mode: x[1].twoWay ? BindingMode.twoWay : BindingMode.oneWay,
      invert: x[1].inverted,
      bindableObjectNames: x[1].signal.split(';'),
      expression: x[1].expression,
      expressionTwoWay: x[1].expressionTwoWay,
      converter: x[1].converter,
      type: x[1].type,
      changedEvents: x[1].events,
      historic: x[1].historic
    }));
  }

  setBinding(designItem: IDesignItem, binding: IBinding): boolean {
    let bnd: IIobrokerWebuiBinding = { signal: binding.bindableObjectNames.join(';'), target: binding.target };
    bnd.inverted = binding.invert;
    bnd.twoWay = binding.mode == BindingMode.twoWay;
    bnd.expression = binding.expression;
    bnd.expressionTwoWay = binding.expressionTwoWay;
    //@ts-ignore
    bnd.historic = binding.historic;
    bnd.type = binding.type;
    bnd.converter = binding.converters;
    bnd.target = binding.target;
    bnd.events = binding.changedEvents;

    let serializedBnd = IobrokerWebuiBindingsHelper.serializeBinding(designItem.element, binding.targetName, bnd);
    let group = designItem.openGroup('edit_binding');
    designItem.setAttribute(serializedBnd[0], serializedBnd[1]);
    group.commit();

    return true;
  }

  clearBinding(designItem: IDesignItem, propertyName: string, propertyTarget: BindingTarget): boolean {
    const name = IobrokerWebuiBindingsHelper.getBindingAttributeName(designItem.element, propertyName, propertyTarget);
    designItem.removeAttribute(name);
    return true;
  }
}