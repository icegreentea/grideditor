import {
  getGridCell,
  getLogicalCell,
  getLogicalCoord,
  getLogicalX,
  getLogicalY,
  getNearestLogicalCoord,
} from "./helper";
import { MouseDragOffGridEvent } from "./events";

function _isCellVisible(view_bounds, cell_bounds) {
  return _isRowVisible(view_bounds, cell_bounds) && _isColumnVisible(view_bounds, cell_bounds);
}

function _isCellFullyVisible(view_bounds, cell_bounds) {
  return (
    _isRowFullyVisible(view_bounds, cell_bounds) && _isColumnFullyVisible(view_bounds, cell_bounds)
  );
}

function _isRowVisible(view_bounds, cell_bounds) {
  const { top, bottom } = view_bounds;
  if (cell_bounds.top >= top && cell_bounds.bottom <= bottom) return true;
  if (cell_bounds.top <= top && cell_bounds.bottom >= top) return true;
  if (cell_bounds.top <= bottom && cell_bounds.bottom >= bottom) return true;
  return false;
}

function _isRowFullyVisible(view_bounds, cell_bounds) {
  return cell_bounds.top >= view_bounds.top && cell_bounds.bottom <= view_bounds.bottom;
}

function _isColumnVisible(view_bounds, cell_bounds) {
  const { left, right } = view_bounds;
  if (cell_bounds.left >= left && cell_bounds.right <= right) return true;
  if (cell_bounds.left <= left && cell_bounds.right >= left) return true;
  if (cell_bounds.left <= right && cell_bounds.right >= right) return true;
  return false;
}

function _isColumnFullyVisible(view_bounds, cell_bounds) {
  return cell_bounds.left >= view_bounds.left && cell_bounds.right <= view_bounds.right;
}

class ScrollManager {
  table_element: HTMLTableElement;
  scroll_element: HTMLDivElement;

  constructor(table_element, scroll_element) {
    this.table_element = table_element;
    this.scroll_element = scroll_element;
  }

  raiseMouseDragOffGridMove(ev?: MouseDragOffGridEvent) {
    if (ev != null) {
      document.dispatchEvent(
        new CustomEvent("mousedragoffgridmove", {
          detail: ev,
        })
      );
    } else {
      document.dispatchEvent(new Event("mousedragoffgridmove"));
    }
  }

  onMouseMove(e: MouseEvent) {
    //const { top, left, right, bottom } = this.scroll_element.getBoundingClientRect();
    const { top, left, right, bottom } = this.view_bounds;
    const { clientX: mouseX, clientY: mouseY } = e;
    if (!(mouseX < left || mouseX > right || mouseY < top || mouseY > bottom)) {
      // mouse is within table - we don't do anything here
      return;
    }
    let aligned_col_idx, aligned_row_idx: number;
    let x_direction: "left" | "right" | "middle";
    let y_direction: "above" | "below" | "middle";

    if (mouseY < top) {
      y_direction = "above";
      aligned_row_idx = this.getVisibleRowIndices().sort((a, b) => a - b)[0];
    } else if (mouseY > bottom) {
      y_direction = "below";
      aligned_row_idx = this.getVisibleRowIndices().sort((a, b) => b - a)[0];
    } else {
      y_direction = "middle";
      aligned_row_idx = getLogicalY(this.lookupNearestRowIndexCell(mouseY));
    }
    if (mouseX < left) {
      x_direction = "left";
      aligned_col_idx = this.getVisibleColumnIndices().sort((a, b) => a - b)[0];
    } else if (mouseX > right) {
      x_direction = "right";
      aligned_col_idx = this.getVisibleColumnIndices().sort((a, b) => b - a)[0];
    } else {
      x_direction = "middle";
      aligned_col_idx = getLogicalX(this.lookupNearestColumnHeaderCell(mouseX));
    }
    let ev: MouseDragOffGridEvent = {
      mouseX: mouseX,
      mouseY: mouseY,
      aligned_column_index: aligned_col_idx,
      aligned_row_index: aligned_row_idx,
      x_direction: x_direction,
      y_direction: y_direction,
    };
    this.raiseMouseDragOffGridMove(ev);
  }

  get view_bounds() {
    let { left, bottom, right, top } = this.scroll_element.getBoundingClientRect();
    let { width: index_width, height: header_height } = getGridCell(
      this.table_element,
      0,
      0
    ).getBoundingClientRect();
    left = left + index_width;
    top = top + header_height;
    right = right - (this.scroll_element.offsetWidth - this.scroll_element.clientWidth);
    bottom = bottom - (this.scroll_element.offsetHeight - this.scroll_element.clientHeight);
    return { left, bottom, right, top };
  }

  isLogicalCellVisible(logical_x, logical_y) {
    const cell = getLogicalCell(this.table_element, logical_x, logical_y);
    return _isCellVisible(
      this.scroll_element.getBoundingClientRect(),
      cell.getBoundingClientRect()
    );
  }

  isLogicalCellFullyVisible(logical_x, logical_y) {
    const cell = getLogicalCell(this.table_element, logical_x, logical_y);
    return _isCellFullyVisible(
      this.scroll_element.getBoundingClientRect(),
      cell.getBoundingClientRect()
    );
  }

  lookupNearestColumnHeaderCell(mouse_X): HTMLTableCellElement {
    const cells = this.getVisibleColumnHeaderCells();
    return cells.filter((c) => {
      const { top, left, right, bottom } = c.getBoundingClientRect();
      return mouse_X >= left && mouse_X < right;
    })[0];
  }

  lookupNearestRowIndexCell(mouse_Y): HTMLTableCellElement {
    const cells = this.getVisibleRowIndexCells();
    return cells.filter((c) => {
      const { top, left, right, bottom } = c.getBoundingClientRect();
      return mouse_Y >= top && mouse_Y < bottom;
    })[0];
  }

  getVisibleColumnHeaderCells(): HTMLTableCellElement[] {
    const cells: HTMLTableCellElement[] = Array.from(
      this.table_element.querySelectorAll("thead > tr > td:not(:first-child)")
    );
    return cells.filter((c) => {
      return _isColumnVisible(this.view_bounds, c.getBoundingClientRect());
    });
  }

  getVisibleRowIndexCells(): HTMLTableCellElement[] {
    const cells: HTMLTableCellElement[] = Array.from(
      this.table_element.querySelectorAll("tbody > tr > td:first-child")
    );
    return cells.filter((c) => {
      return _isRowVisible(this.view_bounds, c.getBoundingClientRect());
    });
  }

  getVisibleRowIndices() {
    const cells = Array.from(this.table_element.querySelectorAll("tbody > tr > td:first-child"));
    return cells
      .filter((c) => {
        return _isRowVisible(this.view_bounds, c.getBoundingClientRect());
      })
      .map((c) => {
        return parseInt(c.getAttribute("data-logical-y"));
      });
  }

  getFullyVisibleRowIndices() {
    const cells = Array.from(this.table_element.querySelectorAll("tbody > tr > td:first-child"));
    return cells
      .filter((c) => {
        return _isRowFullyVisible(this.view_bounds, c.getBoundingClientRect());
      })
      .map((c) => {
        return parseInt(c.getAttribute("data-logical-y"));
      });
  }

  getVisibleColumnIndices() {
    const cells = Array.from(
      this.table_element.querySelectorAll("thead > tr > td:not(:first-child)")
    );
    return cells
      .filter((c) => {
        return _isColumnVisible(this.view_bounds, c.getBoundingClientRect());
      })
      .map((c) => {
        return parseInt(c.getAttribute("data-logical-x"));
      });
  }

  getFullyVisibleColumnIndices() {
    const cells = Array.from(
      this.table_element.querySelectorAll("thead > tr > td:not(:first-child)")
    );
    return cells
      .filter((c) => {
        return _isColumnVisible(this.view_bounds, c.getBoundingClientRect());
      })
      .map((c) => {
        return parseInt(c.getAttribute("data-logical-x"));
      });
  }

  getNextVisibleRowDown() {
    const visible_rows = this.getFullyVisibleRowIndices();
    return getLogicalCell(this.table_element, 0, visible_rows[visible_rows.length - 1] + 1);
  }

  getNextVisibleRowUp() {
    const visible_rows = this.getFullyVisibleRowIndices();
    return getLogicalCell(this.table_element, 0, visible_rows[0] - 1);
  }

  getNextVisibleColumnLeft() {
    const visible_cols = this.getFullyVisibleColumnIndices();
    return getLogicalCell(this.table_element, visible_cols[0] - 1, 0);
  }

  getNextVisibleColumnRight() {
    const visible_cols = this.getFullyVisibleColumnIndices();
    return getLogicalCell(this.table_element, visible_cols[visible_cols.length - 1] + 1, 0);
  }

  scrollRowUp() {
    const prev_row = this.getNextVisibleRowUp();
    if (prev_row === null) return;
    const offset = prev_row.getBoundingClientRect().top - this.view_bounds.top;
    this.scroll_element.scrollBy(0, offset);
  }

  scrollRowDown() {
    const next_row = this.getNextVisibleRowDown();
    if (next_row === null) return;
    const offset = next_row.getBoundingClientRect().bottom - this.view_bounds.bottom;
    this.scroll_element.scrollBy(0, offset + 1);
  }

  scrollColumnLeft() {
    const next_col = this.getNextVisibleColumnLeft();
    if (next_col === null) return;
    const offset = next_col.getBoundingClientRect().left - this.view_bounds.left;
    this.scroll_element.scrollBy(offset, 0);
  }

  scrollColumnRight() {
    const next_col = this.getNextVisibleColumnRight();
    if (next_col === null) return;
    const offset = next_col.getBoundingClientRect().right - this.view_bounds.right;
    this.scroll_element.scrollBy(offset + 1, 0);
  }
}

export { ScrollManager };
