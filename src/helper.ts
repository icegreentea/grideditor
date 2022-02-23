type XCoord = number;
type YCoord = number;

function getLogicalCell(
  table_element: HTMLTableElement,
  logical_x: number,
  logical_y: number
): HTMLTableCellElement {
  return table_element.querySelector(
    `td[data-logical-x="${logical_x}"][data-logical-y="${logical_y}"]`
  );
}

function getGridCell(
  table_element: HTMLTableElement,
  grid_x: number,
  grid_y: number
): HTMLTableCellElement {
  return table_element.querySelector(`td[data-grid-x="${grid_x}"][data-grid-y="${grid_y}"]`);
}

function clampedDecrement(x: number, limit: number): number {
  if (x > limit) return x - 1;
  return x;
}

function clampedIncrement(x: number, limit: number): number {
  if (x < limit) return x + 1;
  return x;
}

function getLogicalX(element: HTMLElement): XCoord {
  return parseInt(element.getAttribute("data-logical-x"));
}

function getLogicalY(element: HTMLElement): YCoord {
  return parseInt(element.getAttribute("data-logical-y"));
}

function getLogicalCoord(element): [XCoord, YCoord] {
  return [
    parseInt(element.getAttribute("data-logical-x")),
    parseInt(element.getAttribute("data-logical-y")),
  ];
}

declare global {
  interface Element {
    setAttribute(name: string, value: boolean): void;
    setAttribute(name: string, value: number): void;
  }
}

export {
  getLogicalCell,
  getLogicalCoord,
  getGridCell,
  clampedDecrement,
  clampedIncrement,
  getLogicalX,
  getLogicalY,
};
