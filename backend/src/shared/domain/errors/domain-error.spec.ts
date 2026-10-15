import {
  AuthenticationError,
  BusinessRuleViolationError,
  ConflictError,
  DomainError,
  EntityNotFoundError,
  ForbiddenActionError,
  InvalidValueError,
} from "./index.js";

class ProductNotFoundError extends EntityNotFoundError {
  constructor() {
    super("PRODUCT_NOT_FOUND", "Product not found");
  }
}
class EmailTakenError extends ConflictError {
  constructor() {
    super("EMAIL_TAKEN", "Email taken");
  }
}
class RuleBrokenError extends BusinessRuleViolationError {
  constructor() {
    super("RULE_BROKEN", "Rule broken");
  }
}
class BadValueError extends InvalidValueError {
  constructor() {
    super("BAD_VALUE", "Bad value");
  }
}
class BadCredentialsError extends AuthenticationError {
  constructor() {
    super("BAD_CREDENTIALS", "Bad credentials");
  }
}
class NotAllowedError extends ForbiddenActionError {
  constructor() {
    super("NOT_ALLOWED", "Not allowed");
  }
}

const cases = [
  [new ProductNotFoundError(), EntityNotFoundError, "ProductNotFoundError", "PRODUCT_NOT_FOUND"],
  [new EmailTakenError(), ConflictError, "EmailTakenError", "EMAIL_TAKEN"],
  [new RuleBrokenError(), BusinessRuleViolationError, "RuleBrokenError", "RULE_BROKEN"],
  [new BadValueError(), InvalidValueError, "BadValueError", "BAD_VALUE"],
  [new BadCredentialsError(), AuthenticationError, "BadCredentialsError", "BAD_CREDENTIALS"],
  [new NotAllowedError(), ForbiddenActionError, "NotAllowedError", "NOT_ALLOWED"],
] as const;

describe("DomainError hierarchy", () => {
  it.each(cases)("%o exposes code, message and class name", (error, _base, name, code) => {
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(name);
    expect(error.code).toBe(code);
    expect(error.message).not.toBe("");
  });

  it("discriminates between the six branches", () => {
    const bases = cases.map(([, base]) => base);
    for (const [error, base] of cases) {
      for (const other of bases) {
        expect(error instanceof other).toBe(other === base);
      }
    }
  });
});
