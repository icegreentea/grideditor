import { HEADER_CELL_ATTR, INDEX_CELL_ATTR } from "./dom_consts";

function isHeaderCell(element: HTMLElement) {
  if (element == null) return false;
  return element.hasAttribute(HEADER_CELL_ATTR);
}

function isIndexCell(element: HTMLElement) {
  if (element == null) return false;
  return element.hasAttribute(INDEX_CELL_ATTR);
}

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

function getCellType(elem: HTMLTableCellElement) {
  if (elem.hasAttribute("data-header-cell")) {
    return CellType.HEADER;
  } else if (elem.hasAttribute("data-index-cell")) {
    return CellType.INDEX;
  }
  return CellType.DATA;
}

enum CellType {
  DATA,
  INDEX,
  HEADER,
}

function getGridCell(
  table_element: HTMLTableElement,
  grid_x: number,
  grid_y: number
): HTMLTableCellElement {
  return table_element.querySelector(`td[data-grid-x="${grid_x}"][data-grid-y="${grid_y}"]`);
}

function getGridRow(table_element: HTMLTableElement, grid_y: number): HTMLTableCellElement[] {
  return Array.from(table_element.querySelectorAll(`td[data-grid-y="${grid_y}"]`));
}

function getGridCol(table_element: HTMLTableElement, grid_x: number): HTMLTableCellElement[] {
  return Array.from(table_element.querySelectorAll(`td[data-grid-x="${grid_x}"]`));
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

function getGridX(element: HTMLElement): XCoord {
  return parseInt(element.getAttribute("data-grid-x"));
}

function getGridY(element: HTMLElement): XCoord {
  return parseInt(element.getAttribute("data-grid-y"));
}

function getNearestLogicalCoord(element) {
  switch (getCellType(element)) {
    case CellType.DATA:
      return getLogicalCoord(element);
    case CellType.HEADER:
      return [getLogicalX(element), 0];
    case CellType.INDEX:
      return [0, getLogicalY(element)];
    default:
      return [0, 0];
  }
}

function findParent(
  target: HTMLElement,
  predicate: (e: HTMLElement) => boolean,
  include_self = true
): HTMLElement {
  let found = false;
  if (include_self && predicate(target)) return target;
  while (!found) {
    if (target.parentElement == null) return null;
    target = target.parentElement;
    if (predicate(target)) return target;
  }
  return null;
}

function findParentTableCell(target, include_self = true) {
  return findParent(
    target,
    (e: HTMLElement) => {
      return e.tagName == "TD";
    },
    include_self
  );
}

function isCellWidthOverflow(target: HTMLElement) {
  return target.clientWidth < target.scrollWidth;
}

function isCellHeightOverflow(target: HTMLElement) {
  return target.clientHeight < target.scrollHeight;
}

declare global {
  interface Element {
    setAttribute(name: string, value: boolean): void;
    setAttribute(name: string, value: number): void;
  }
}

function checkTextWidth(text: string, font = null) {
  const canvas =
    checkTextWidth.canvas || (checkTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  if (font != null) {
    context.font = font;
  }
  const widths = text.split(/\r?\n/).map((line) => {
    return context.measureText(line).width;
  });
  return Math.max(...widths);
}

function checkTextHeight(text: string, font = null) {
  const lines = text.split(/\r?\n/);
  const canvas =
    checkTextWidth.canvas || (checkTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  if (font != null) {
    context.font = font;
  }
  return context.measureText("test").fontBoundingBoxAscent * lines.length;
}

export {
  getLogicalCell,
  getLogicalCoord,
  getGridCell,
  clampedDecrement,
  clampedIncrement,
  getLogicalX,
  getLogicalY,
  getCellType,
  CellType,
  getNearestLogicalCoord,
  getGridX,
  getGridY,
  findParentTableCell,
  getGridRow,
  isCellHeightOverflow,
  isCellWidthOverflow,
  getGridCol,
  checkTextWidth,
  checkTextHeight,
};
