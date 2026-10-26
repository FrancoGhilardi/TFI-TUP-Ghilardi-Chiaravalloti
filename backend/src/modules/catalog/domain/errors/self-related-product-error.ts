import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

export class SelfRelatedProductError extends BusinessRuleViolationError {
  constructor() {
    super("SELF_RELATED_PRODUCT", "Un producto no puede figurar como similar de sí mismo.");
  }
}
