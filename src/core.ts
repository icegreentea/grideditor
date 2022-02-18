import {
  getLogicalCell,
  getLogicalCoord,
  getGridCell,
  clampedDecrement,
  clampedIncrement,
  getLogicalX,
  getLogicalY,
} from "./helper";

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
      cell.addEventListener("mouseleave", (e) => this.selection_manager.onTableCellMouseLeave(e));
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
    const selection = this.selection_manager.getCurrentSelection();
    const cells = Array.from(this.table_element.querySelectorAll(`td`));
    for (const cell of cells) {
      cell.setAttribute("data-logical-state", "neutral");
    }
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
  }
}

enum SelectionType {
  CELLS,
  ROWS,
  COLS,
}

enum CellType {
  DATA,
  HEADER,
  INDEX,
}

type SelectionRange = { start: number; end: number };
type SeletionOperation = "add" | "remove" | "set";

type SelectionEvent = CellsSelectionEvent | RowsSelectionEvent | ColumnsSelectionEvent;

type CellsSelectionEvent = {
  operation: SeletionOperation;
  selection_type: SelectionType;
  x_range: SelectionRange;
  y_range: SelectionRange;
  delta_x_range: SelectionRange;
  delta_y_range: SelectionRange;
};

type RowsSelectionEvent = {
  operation: SeletionOperation;
  selection_type: SelectionType;
  y_range: SelectionRange;
  delta_y_range: SelectionRange;
};

type ColumnsSelectionEvent = {
  operation: SeletionOperation;
  selection_type: SelectionType;
  x_range: SelectionRange;
  delta_x_range: SelectionRange;
};

class SelectionManager {
  mousehold_active = false;
  table_element: HTMLTableElement = null;
  shift_active = false;

  selection_type: SelectionType = SelectionType.CELLS;

  selected_rows_start: number = 1;
  selected_rows_end: number = 1;

  selected_columns_start: number = 1;
  selected_columns_end: number = 1;

  selected_cells_start_x: number = 1;
  selected_cells_start_y: number = 1;
  selected_cells_end_x: number = 1;
  selected_cells_end_y: number = 1;

  selection_start_cell: HTMLTableCellElement = null;

  shiftKey: boolean = false;

  constructor(table_element) {
    this.table_element = table_element;
    this.selection_start_cell = getLogicalCell(this.table_element, 0, 0);
    this.table_element.dispatchEvent(new Event("tableselectionchanged"));
  }

  get selected_cells_x_range(): SelectionRange {
    return {
      start: this.selected_cells_start_x,
      end: this.selected_cells_end_x,
    };
  }

  get selected_cells_y_range(): SelectionRange {
    return {
      start: this.selected_cells_start_y,
      end: this.selected_cells_end_y,
    };
  }

  get selected_rows_range(): SelectionRange {
    return {
      start: this.selected_rows_start,
      end: this.selected_rows_end,
    };
  }

  get selected_column_range(): SelectionRange {
    return {
      start: this.selected_columns_start,
      end: this.selected_columns_end,
    };
  }

  deactivate() {
    this.mousehold_active = false;
    this.selection_type = null;
    this.selection_start_cell = null;
    this.selected_rows_start = null;
    this.selected_rows_end = null;

    this.selected_columns_start = null;
    this.selected_columns_end = null;

    this.selected_cells_start_x = null;
    this.selected_cells_start_y = null;
    this.selected_cells_end_x = null;
    this.selected_cells_end_y = null;
  }

  onKeyUp(e) {
    if (!e.shiftKey) {
      this.shiftKey = false;
    }
  }

  onKeyDown(e) {
    if (this.selection_start_cell === null) {
      return;
    }
    if (e.keyCode == 16) {
      this.shift_active = true;
    }
    if (!e.shiftKey) {
      this.shift_active = false;
    }

    if (e.shiftKey) {
      if (this.selection_type == SelectionType.CELLS) {
        this._onKeyDown_Shift_Cells(e);
      } else if (this.selection_type == SelectionType.ROWS) {
        this._onKeyDown_Shift_Rows(e);
      } else if ((this.selection_type = SelectionType.COLS)) {
        this._onKeyDown_Shift_Columns(e);
      }
    } else {
      const max_x = parseInt(this.table_element.getAttribute("data-logical-max-x"));
      const max_y = parseInt(this.table_element.getAttribute("data-logical-max-y"));

      let [x, y] = getLogicalCoord(this.selection_start_cell);
      if (e.keyCode == 37) {
        // left-arrow
        if (x > 0) x = x - 1;
      } else if (e.keyCode == 39) {
        //right-arrow
        if (x < max_x - 1) x = x + 1;
      } else if (e.keyCode == 38) {
        // up-arrow
        if (y > 0) y = y - 1;
      } else if (e.keyCode == 40) {
        // down-arrow
        if (y < max_y - 1) y = y + 1;
      }
      this.selected_cells_start_x = this.selected_cells_end_x = x;
      this.selected_cells_start_y = this.selected_cells_end_y = y;
      this.selection_start_cell = getLogicalCell(this.table_element, x, y);
      this.selection_type = SelectionType.CELLS;
      const ev: CellsSelectionEvent = {
        operation: "set",
        selection_type: SelectionType.CELLS,
        x_range: this.selected_cells_x_range,
        y_range: this.selected_cells_y_range,
        delta_x_range: this.selected_cells_x_range,
        delta_y_range: this.selected_cells_y_range,
      };
      this.table_element.dispatchEvent(
        new CustomEvent("tableselectionchanged", {
          detail: ev,
        })
      );
    }
  }

  _onKeyDown_Shift_Cells(e) {
    const max_x = parseInt(this.table_element.getAttribute("data-logical-max-x"));
    const max_y = parseInt(this.table_element.getAttribute("data-logical-max-y"));
    const [base_x, base_y] = getLogicalCoord(this.selection_start_cell);
    let x_range = this._getRange(this.selected_cells_start_x, this.selected_cells_end_x);
    let y_range = this._getRange(this.selected_cells_start_y, this.selected_cells_end_y);
    if (e.keyCode == 37) {
      // left-arrow
      if (x_range[0] == base_x) {
        // selection to right of start
        x_range[1] = clampedDecrement(x_range[1], 0);
      } else if (x_range[1] == base_x) {
        // selection to left of start
        x_range[0] = clampedDecrement(x_range[0], 0);
      }
    } else if (e.keyCode == 39) {
      //right-arrow
      if (x_range[0] == base_x) {
        // selection to right of start
        x_range[1] = clampedIncrement(x_range[1], max_x - 1);
      } else if (x_range[1] == base_x) {
        // selection to left of start
        x_range[0] = clampedIncrement(x_range[0], max_x - 1);
      }
    } else if (e.keyCode == 38) {
      // up-arrow
      if (y_range[0] == base_y) {
        // selection to below of start
        y_range[1] = clampedDecrement(y_range[1], 0);
      } else if (y_range[1] == base_y) {
        // selection to above of start
        y_range[0] = clampedDecrement(y_range[0], 0);
      }
    } else if (e.keyCode == 40) {
      // down-arrow
      if (y_range[0] == base_y) {
        // selection to below of start
        y_range[1] = clampedIncrement(y_range[1], max_y - 1);
      } else if (y_range[1] == base_y) {
        // selection to above of start
        y_range[0] = clampedIncrement(y_range[0], max_y - 1);
      }
    }
    [this.selected_cells_start_x, this.selected_cells_end_x] = x_range;
    [this.selected_cells_start_y, this.selected_cells_end_y] = y_range;
    this.table_element.dispatchEvent(new Event("tableselectionchanged"));
  }

  _onKeyDown_Shift_Rows(e) {
    const max_x = parseInt(this.table_element.getAttribute("data-logical-max-x"));
    const max_y = parseInt(this.table_element.getAttribute("data-logical-max-y"));
    const base_y = getLogicalY(this.selection_start_cell);
    let y_range = this._getRange(this.selected_rows_start, this.selected_rows_end);
    let operation: SeletionOperation;
    let delta: number;

    if (e.keyCode == 37) {
      // left-arrow
      return;
    } else if (e.keyCode == 39) {
      //right-arrow
      return;
    } else if (e.keyCode == 38) {
      // up-arrow
      if (y_range[0] == base_y) {
        // selection to below of start
        delta = y_range[1];
        y_range[1] = clampedDecrement(y_range[1], 0);
        operation = "remove";
      } else if (y_range[1] == base_y) {
        // selection to above of start
        y_range[0] = clampedDecrement(y_range[0], 0);
        delta = y_range[0];
        operation = "add";
      }
    } else if (e.keyCode == 40) {
      // down-arrow
      if (y_range[0] == base_y) {
        // selection to below of start
        y_range[1] = clampedIncrement(y_range[1], max_y - 1);
        delta = y_range[1];
        operation = "add";
      } else if (y_range[1] == base_y) {
        // selection to above of start
        delta = y_range[0];
        y_range[0] = clampedIncrement(y_range[0], max_y - 1);
        operation = "remove";
      }
    }
    [this.selected_rows_start, this.selected_rows_end] = y_range;
    const ev: RowsSelectionEvent = {
      operation: operation,
      selection_type: SelectionType.ROWS,
      y_range: this.selected_rows_range,
      delta_y_range: { start: delta, end: delta },
    };
    this.table_element.dispatchEvent(
      new CustomEvent("tableselectionchanged", {
        detail: ev,
      })
    );
  }

  _onKeyDown_Shift_Columns(e) {
    const max_x = parseInt(this.table_element.getAttribute("data-logical-max-x"));
    const max_y = parseInt(this.table_element.getAttribute("data-logical-max-y"));
    const base_x = getLogicalX(this.selection_start_cell);
    let x_range = this._getRange(this.selected_columns_start, this.selected_columns_end);
    let operation: SeletionOperation;
    let delta: number;

    if (e.keyCode == 37) {
      // left-arrow
      if (x_range[0] == base_x) {
        // selection to right of start
        delta = x_range[1];
        x_range[1] = clampedDecrement(x_range[1], 0);
        operation = "remove";
      } else if (x_range[1] == base_x) {
        // selection to left of start
        x_range[0] = clampedDecrement(x_range[0], 0);
        delta = x_range[0];
        operation = "add";
      }
    } else if (e.keyCode == 39) {
      //right-arrow
      if (x_range[0] == base_x) {
        // selection to right of start
        x_range[1] = clampedIncrement(x_range[1], max_x - 1);
        delta = x_range[1];
        operation = "add";
      } else if (x_range[1] == base_x) {
        // selection to left of start
        delta = x_range[0];
        x_range[0] = clampedIncrement(x_range[0], max_x - 1);
        operation = "remove";
      }
    } else if (e.keyCode == 38) {
      // up-arrow
      return;
    } else if (e.keyCode == 40) {
      // down-arrow
      return;
    }
    [this.selected_columns_start, this.selected_columns_end] = x_range;
    const ev: ColumnsSelectionEvent = {
      operation: operation,
      selection_type: SelectionType.COLS,
      x_range: this.selected_column_range,
      delta_x_range: { start: delta, end: delta },
    };
    this.table_element.dispatchEvent(
      new CustomEvent("tableselectionchanged", {
        detail: ev,
      })
    );
  }

  onTableCellMouseDown(e) {
    if (this.mousehold_active) {
      this.deactivate();
      return;
    }
    const cell_type = this.getCellType(e.target);
    if (this.shift_active) {
      if (cell_type == CellType.DATA) {
      } else if (cell_type == CellType.INDEX) {
      } else if (cell_type == CellType.HEADER) {
      }
      return;
    } else {
      let ev: SelectionEvent;
      this.mousehold_active = true;
      if (cell_type == CellType.DATA) {
        this.selection_type = SelectionType.CELLS;
        this.selection_start_cell = e.target;
        [this.selected_cells_start_x, this.selected_cells_start_y] = getLogicalCoord(e.target);
        [this.selected_cells_end_x, this.selected_cells_end_y] = [
          this.selected_cells_start_x,
          this.selected_cells_start_y,
        ];
        const _ev: CellsSelectionEvent = {
          operation: "add",
          selection_type: SelectionType.CELLS,
          x_range: this.selected_cells_x_range,
          y_range: this.selected_cells_y_range,
          delta_x_range: this.selected_cells_x_range,
          delta_y_range: this.selected_cells_y_range,
        };
        ev = _ev;
      } else if (cell_type == CellType.INDEX) {
        this.selection_type = SelectionType.ROWS;
        this.selected_rows_start = this.selected_rows_end = getLogicalY(e.target);
        this.selection_start_cell = getLogicalCell(this.table_element, 0, this.selected_rows_start);
        const _ev: RowsSelectionEvent = {
          operation: "set",
          selection_type: SelectionType.ROWS,
          y_range: this.selected_rows_range,
          delta_y_range: this.selected_rows_range,
        };
        ev = _ev;
      } else if (cell_type == CellType.HEADER) {
        this.selection_type = SelectionType.COLS;
        this.selected_columns_start = this.selected_columns_end = getLogicalX(e.target);
        this.selection_start_cell = getLogicalCell(
          this.table_element,
          this.selected_columns_start,
          0
        );
        const _ev: ColumnsSelectionEvent = {
          operation: "set",
          selection_type: SelectionType.COLS,
          x_range: this.selected_column_range,
          delta_x_range: this.selected_column_range,
        };
        ev = _ev;
      }

      this.table_element.dispatchEvent(
        new CustomEvent("tableselectionchanged", {
          detail: ev,
        })
      );
    }
  }

  getVisibleCells() {
    const cells = this.table_element.querySelectorAll("td");
    const bottom_bound = window.innerHeight || document.documentElement.clientHeight;
    const right_bound = window.innerWidth || document.documentElement.clientWidth;
  }

  onMouseMove(e) {
    if (!this.mousehold_active) return;
    const { top, left, right, bottom } = this.table_element.getBoundingClientRect();
    const { clientX, clientY } = e;

    if (!(clientX < left || clientX > right || clientY < top || clientY > bottom)) {
      // mouse is within table - we don't do anything here
      return;
    }
    if (clientX > right) {
      // need to scroll right
      if (clientX - right < 50) {
        // slow
      } else {
        // fast scroll
      }
    }
    if (clientY > bottom) {
      // need to scroll down
      if (clientY - bottom < 50) {
        // slow
      } else {
        // fast scroll
      }
    }

    if (this.selection_type == SelectionType.CELLS) {
    } else if (this.selection_type == SelectionType.ROWS) {
    } else if (this.selection_type == SelectionType.COLS) {
    }

    //console.log(clientX, clientY);
  }

  onTableCellMouseEnter(e) {
    if (!this.mousehold_active) return;
    const cell_type = this.getCellType(e.target);

    if (this.selection_type == SelectionType.CELLS) {
      if (cell_type == CellType.DATA) {
        [this.selected_cells_end_x, this.selected_cells_end_y] = getLogicalCoord(e.target);
      } else if (cell_type == CellType.INDEX) {
        this.selected_cells_end_y = getLogicalY(e.target);
      } else if (cell_type == CellType.HEADER) {
        this.selected_cells_end_x = getLogicalX(e.target);
      }
    } else if (this.selection_type == SelectionType.ROWS) {
      this.selected_rows_end = getLogicalY(e.target);
    } else if (this.selection_type == SelectionType.COLS) {
      this.selected_columns_end = getLogicalX(e.target);
    }
    this.table_element.dispatchEvent(new Event("tableselectionchanged"));
  }

  onTableCellMouseLeave(e) {
    if (!this.mousehold_active) return;
    const cell_type = this.getCellType(e.target);
  }

  onTableCellMouseUp(e) {
    if (!this.mousehold_active) return;
    const cell_type = this.getCellType(e.target);
    this.mousehold_active = false;
  }

  /**
   *
   * @param {*} elem
   * @returns {CellType}
   */
  getCellType(elem) {
    if (elem.hasAttribute("data-header-cell")) {
      return CellType.HEADER;
    } else if (elem.hasAttribute("data-index-cell")) {
      return CellType.INDEX;
    }
    return CellType.DATA;
  }

  getCurrentSelection() {
    if (this.selection_type == SelectionType.CELLS) {
      const x_range = this._getRange(this.selected_cells_start_x, this.selected_cells_end_x);
      const y_range = this._getRange(this.selected_cells_start_y, this.selected_cells_end_y);
      return {
        selection_type: this.selection_type,
        logical_x_range: x_range,
        logical_y_range: y_range,
      };
    } else if (this.selection_type == SelectionType.ROWS) {
      const y_range = this._getRange(this.selected_rows_start, this.selected_rows_end);
      return {
        selection_type: this.selection_type,
        logical_y_range: y_range,
      };
    } else if (this.selection_type == SelectionType.COLS) {
      const x_range = this._getRange(this.selected_columns_start, this.selected_columns_end);
      return {
        selection_type: this.selection_type,
        logical_x_range: x_range,
      };
    }
  }

  _getRange(a, b) {
    if (a == b) return [a, b];
    if (a > b) return [b, a];
    return [a, b];
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
    document.addEventListener("mousemove", (e) => this.selection_manager.onMouseMove(e));
  }
}

export { Grid };
