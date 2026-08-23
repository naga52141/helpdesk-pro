// Only nextPriority is exercised here — it's the one pure function in this file, with
// no DB/socket/email side effects. checkSlaWarnings/checkSlaBreaches themselves are
// covered by the real end-to-end Selenium suite (test_sla_escalation.py) against a real
// database, in line with this project's stance on not mocking the DB in that layer.
const { nextPriority } = require("../src/utils/slaWarnings");

describe("nextPriority", () => {
  test.each([
    ["low", "medium"],
    ["medium", "high"],
    ["high", "critical"],
  ])("escalates %s to %s", (current, expected) => {
    expect(nextPriority(current)).toBe(expected);
  });

  test("critical has nowhere further to escalate", () => {
    expect(nextPriority("critical")).toBeNull();
  });

  test("an unrecognized priority returns null rather than throwing", () => {
    expect(nextPriority("urgent")).toBeNull();
  });
});
