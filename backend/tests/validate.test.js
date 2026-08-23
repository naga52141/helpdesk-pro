const { isValidEmail, isOneOf, isPositiveInt } = require("../src/utils/validate");

describe("isValidEmail", () => {
  test.each([
    "user@example.com",
    "first.last@company.co.uk",
    "alex.kim+tag@helpdeskpro.local",
  ])("accepts %s", (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  test.each([
    "not-an-email",
    "missing-domain@",
    "@missing-local.com",
    "spaces in@address.com",
    "",
    null,
    undefined,
    12345,
  ])("rejects %p", (value) => {
    expect(isValidEmail(value)).toBe(false);
  });
});

describe("isOneOf", () => {
  const PRIORITIES = ["low", "medium", "high", "critical"];

  test("accepts a value present in the allowed list", () => {
    expect(isOneOf("high", PRIORITIES)).toBe(true);
  });

  test("rejects a value not present in the allowed list", () => {
    expect(isOneOf("urgent", PRIORITIES)).toBe(false);
  });

  test("is case-sensitive", () => {
    expect(isOneOf("High", PRIORITIES)).toBe(false);
  });

  test("rejects against an empty allowed list", () => {
    expect(isOneOf("anything", [])).toBe(false);
  });
});

describe("isPositiveInt", () => {
  test.each([1, 42, "7", 100])("accepts %p", (value) => {
    expect(isPositiveInt(value)).toBe(true);
  });

  test.each([0, -1, 1.5, "abc", "", null, undefined, NaN])("rejects %p", (value) => {
    expect(isPositiveInt(value)).toBe(false);
  });
});
