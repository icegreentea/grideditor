import {
  getLogicalCell,
  getLogicalCoord,
  getGridCell,
  clampedDecrement,
  clampedIncrement,
  getLogicalX,
  getLogicalY,
  CellType,
} from "./helper";
/*
import {
  SelectionManager,
  SelectionType,
  SelectionEvent,
  CellsSelectionEvent,
  RowsSelectionEvent,
  ColumnsSelectionEvent,
} from "./SelectionManager";
*/
import {
  SelectionType,
  SelectionOperation,
  SelectionManager,
  SelectionEvent,
  CellsSelectionEvent,
  RowsSelectionEvent,
  ColumnsSelectionEvent,
} from "./SelectionManager2";

type HeaderDefinition = {
  name: string;
};

class Grid {
  #focused_cell = null;
  #active_textarea = null;
  table_element: HTMLTableElement;
  scroll_element: HTMLDivElement;
  target_element: HTMLDivElement;
  selection_manager: SelectionManager;
  scroll_manager: ScrollManager;
  event_manager: EventManager;
  header_data: HeaderDefinition[];
  data: object[];

  constructor(element: HTMLDivElement, header_data: HeaderDefinition[], data: object[]) {
    this.target_element = element;
    this.header_data = header_data;
    this.data = data;

    this._createTable();

    this.selection_manager = new SelectionManager(this.table_element);
    this.scroll_manager = new ScrollManager(this.table_element, this.scroll_element);
    this.event_manager = new EventManager(this.selection_manager, this.scroll_manager);

    this.table_element.addEventListener("tableselectionchanged", (e) =>
      this.tableSelectionChanged(e)
    );
  }

  _createTable() {
    this.target_element.classList.add("coresheet_container");
    let inner_el = document.createElement("div");
    inner_el.classList.add("coresheet_content");
    this.scroll_element = inner_el;
    this.target_element.appendChild(inner_el);

    let table = document.createElement("table");
    table.classList.add("coresheet");
    table.setAttribute("unselectable", "yes");
    table.setAttribute("cellspacing", 0);
    table.setAttribute("cellpadding", 0);
    this.table_element = table;
    inner_el.appendChild(table);

    let colgroup = document.createElement("colgroup");
    table.appendChild(colgroup);

    let thead = document.createElement("thead");
    table.appendChild(thead);

    let header_row = document.createElement("tr");
    header_row.setAttribute("data-grid-y", 0);
    thead.appendChild(header_row);
    colgroup.appendChild(document.createElement("col"));

    let spacer_el = document.createElement("td");
    spacer_el.setAttribute("data-grid-y", 0);
    spacer_el.setAttribute("data-grid-x", 0);
    header_row.appendChild(spacer_el);

    const column_order = [];
    let SPACER_COLS = 1;
    let SPACER_ROWS = 1;

    /* Creating headers
     */
    for (const [idx, header_elem] of this.header_data.entries()) {
      let _el = document.createElement("td");
      _el.setAttribute("data-grid-y", 0);
      _el.setAttribute("data-grid-x", idx + SPACER_COLS);
      _el.setAttribute("data-logical-x", idx);
      _el.setAttribute("data-header-cell", "");
      _el.textContent = header_elem["name"];
      header_row.appendChild(_el);
      column_order.push(header_elem["name"]);
      let col = document.createElement("col");
      col.style.width = "100px";
      //col.setAttribute("width", 100);
      colgroup.appendChild(col);
    }

    let body = document.createElement("tbody");
    table.appendChild(body);
    for (const [row_idx, data_row] of this.data.entries()) {
      let new_row = document.createElement("tr");
      new_row.setAttribute("data-grid-y", row_idx + SPACER_ROWS);
      new_row.setAttribute("data-logical-y", row_idx);

      /* Creating index columns */
      let spacer_cell = document.createElement("td");
      spacer_cell.setAttribute("data-grid-y", row_idx + SPACER_ROWS);
      spacer_cell.setAttribute("data-logical-y", row_idx);
      spacer_cell.setAttribute("data-grid-x", 0);
      spacer_cell.setAttribute("data-index-cell", "");
      spacer_cell.textContent = row_idx.toString();
      new_row.appendChild(spacer_cell);

      for (const [col_idx, column_name] of column_order.entries()) {
        let new_cell = document.createElement("td");
        new_cell.setAttribute("data-grid-y", row_idx + SPACER_ROWS);
        new_cell.setAttribute("data-logical-y", row_idx);
        new_cell.setAttribute("data-grid-x", col_idx + SPACER_COLS);
        new_cell.setAttribute("data-logical-x", col_idx);
        new_cell.setAttribute("data-cell-type", "data");
        new_cell.textContent = data_row[column_name];
        new_row.appendChild(new_cell);
      }
      body.appendChild(new_row);
    }

    const all_cells = table.querySelectorAll("td");
    for (const cell of all_cells) {
      //cell.addEventListener("click", (e) => this.tableCellOnClick(e))
      cell.addEventListener("mousedown", (e) => this.selection_manager.onTableCellMouseDown(e));
      cell.addEventListener("mouseenter", (e) => this.selection_manager.onTableCellMouseEnter(e));
      //cell.addEventListener("mouseleave", (e) => this.selection_manager.onTableCellMouseLeave(e));
      cell.addEventListener("mouseup", (e) => this.selection_manager.onTableCellMouseUp(e));
      cell.setAttribute("data-logical-state", "neutral");
    }

    table.setAttribute("data-logical-max-x", column_order.length);
    table.setAttribute("data-logical-max-y", this.data.length);
  }

  set focusedCell(cell_element) {
    if (cell_element === this.#focused_cell || cell_element === this.#active_textarea) {
      return;
    }

    const all_cells = this.table_element.querySelectorAll("td");
    for (const cell of all_cells) {
      cell.setAttribute("data-logical-state", "neutral");
    }
    if (this.#active_textarea !== null) {
      this.#focused_cell.removeChild(this.#active_textarea);
      this.#focused_cell.textContent = this.#active_textarea.value;
      this.#active_textarea = null;
    }

    this.#focused_cell = cell_element;
    if (cell_element != null) {
      this.#focused_cell.setAttribute("data-logical-state", "focus");
      let _text = this.#focused_cell.textContent;
      this.#active_textarea = document.createElement("textarea");
      this.#active_textarea.setAttribute("id", "table-active-textarea");
      this.#active_textarea.value = _text;
      this.#focused_cell.textContent = null;
      this.#focused_cell.appendChild(this.#active_textarea);
    }
  }

  get focusedCell() {
    return this.#focused_cell;
  }

  tableCellOnClick(e) {
    //const parent_table = e.target.closest("table");
    if (e.target.hasAttribute("data-header-cell")) {
      const all_cells = this.table_element.querySelectorAll("td");
      for (const cell of all_cells) {
        cell.setAttribute("data-logical-state", "neutral");
      }
      var col_idx = e.target.getAttribute("data-grid-x");
      for (const cell of this.table_element.querySelectorAll(`td[data-grid-x="${col_idx}"]`)) {
        cell.setAttribute("data-logical-state", "selected");
      }
    } else {
      this.focusedCell = e.target;
    }
  }

  tableSelectionChanged(e) {
    if ("detail" in e) {
      let ev: SelectionEvent = e.detail;
      let selected_cells: HTMLTableCellElement[];
      if (ev.operation != "noop") {
        const cells = Array.from(this.table_element.querySelectorAll(`td`));
        for (const cell of cells) {
          cell.setAttribute("data-logical-state", "neutral");
        }
        if (ev.selection_type == SelectionType.CELLS) {
          selected_cells = cells.filter((cell) => {
            const [x, y] = getLogicalCoord(cell);
            return (
              (ev as CellsSelectionEvent).x_range.contains(x) &&
              (ev as CellsSelectionEvent).y_range.contains(y)
            );
          });
        } else if (ev.selection_type == SelectionType.ROWS) {
          selected_cells = cells.filter((cell) => {
            const [x, y] = getLogicalCoord(cell);
            return (ev as RowsSelectionEvent).y_range.contains(y);
          });
        } else if (ev.selection_type == SelectionType.COLS) {
          selected_cells = cells.filter((cell) => {
            const [x, y] = getLogicalCoord(cell);
            return (ev as ColumnsSelectionEvent).x_range.contains(x);
          });
        }

        for (const cell of selected_cells) {
          cell.setAttribute("data-logical-state", "selected");
        }
      }
    } else {
      /*
      const selection = this.selection_manager.getCurrentSelection();

      let selected_cells;
      if (selection.selection_type == SelectionType.CELLS) {
        selected_cells = cells.filter((cell) => {
          const [x, y] = getLogicalCoord(cell);
          return (
            selection.logical_x_range[0] <= x &&
            x <= selection.logical_x_range[1] &&
            selection.logical_y_range[0] <= y &&
            y <= selection.logical_y_range[1]
          );
        });
      } else if (selection.selection_type == SelectionType.ROWS) {
        selected_cells = cells.filter((cell) => {
          const y = getLogicalY(cell);
          return selection.logical_y_range[0] <= y && y <= selection.logical_y_range[1];
        });
      } else if (selection.selection_type == SelectionType.COLS) {
        selected_cells = cells.filter((cell) => {
          const x = getLogicalX(cell);
          return selection.logical_x_range[0] <= x && x <= selection.logical_x_range[1];
        });
      }

      for (const cell of selected_cells) {
        cell.setAttribute("data-logical-state", "selected");
      }
      */
    }
  }
}

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

  getVisibleRows() {
    const cells = Array.from(this.table_element.querySelectorAll("tbody > tr > td:first-child"));
    return cells
      .filter((c) => {
        return _isRowVisible(this.view_bounds, c.getBoundingClientRect());
      })
      .map((c) => {
        return parseInt(c.getAttribute("data-logical-y"));
      });
  }

  getFullyVisibleRows() {
    const cells = Array.from(this.table_element.querySelectorAll("tbody > tr > td:first-child"));
    return cells
      .filter((c) => {
        return _isRowFullyVisible(this.view_bounds, c.getBoundingClientRect());
      })
      .map((c) => {
        return parseInt(c.getAttribute("data-logical-y"));
      });
  }

  getVisibleColumns() {
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

  getFullyVisibleColumns() {
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
    const visible_rows = this.getFullyVisibleRows();
    return getLogicalCell(this.table_element, 0, visible_rows[visible_rows.length - 1] + 1);
  }

  getNextVisibleRowUp() {
    const visible_rows = this.getFullyVisibleRows();
    return getLogicalCell(this.table_element, 0, visible_rows[0] - 1);
  }

  getNextVisibleColumnLeft() {
    const visible_cols = this.getFullyVisibleColumns();
    return getLogicalCell(this.table_element, visible_cols[0] - 1, 0);
  }

  getNextVisibleColumnRight() {
    const visible_cols = this.getFullyVisibleColumns();
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

class EventManager {
  selection_manager: SelectionManager;
  scroll_manager: ScrollManager;

  constructor(selection_manager, scroll_manager) {
    this.selection_manager = selection_manager;
    this.scroll_manager = scroll_manager;
    this._setupEventChains();
  }

  _setupEventChains() {
    document.addEventListener("keydown", (e) => this.selection_manager.onKeyDown(e));
    document.addEventListener("keyup", (e) => this.selection_manager.onKeyUp(e));
    //document.addEventListener("mousemove", (e) => this.selection_manager.onMouseMove(e));
  }
}

export { Grid };
