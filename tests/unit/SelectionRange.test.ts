import SelectionRange from "../../src/SelectionRange";

test("Starting with 1 wide", () => {
  const base = new SelectionRange(5, 5);
  const shiftHigh = new SelectionRange(5, 6);
  const shiftLow = new SelectionRange(4, 5);

  expect(base.incrementHigh()).toEqual(shiftHigh);
  expect(base.incrementLow()).toEqual(shiftHigh);
  expect(base.decrementHigh()).toEqual(shiftLow);
  expect(base.decrementLow()).toEqual(shiftLow);
  expect(base.extendHigh()).toEqual(shiftHigh);
  expect(base.shrinkHigh()).toEqual(shiftLow);
  expect(base.extendLow()).toEqual(shiftLow);
  expect(base.shrinkLow()).toEqual(shiftHigh);
});

test("Test clamping", () => {
  const base = new SelectionRange(1, 5);
  expect(base.decrementLow(1)).toEqual(base);
  expect(base.incrementHigh(5)).toEqual(base);
  expect(base.decrementLow(0).low).toBe(0);
  expect(base.incrementHigh(6).high).toBe(6);
});

test("Test step size", () => {
  const base = new SelectionRange(1, 5);
  expect(base.decrementLow(undefined, 2).low).toEqual(-1);
  expect(base.incrementHigh(undefined, 2).high).toEqual(7);
});

test("Test step size and clamping together", () => {
  const base = new SelectionRange(1, 5);
  expect(base.decrementLow(0, 2).low).toEqual(0);
  expect(base.incrementHigh(6, 2).high).toEqual(6);
});
