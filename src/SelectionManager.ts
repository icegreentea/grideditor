import {
  getLogicalCell,
  getLogicalCoord,
  getGridCell,
  clampedDecrement,
  clampedIncrement,
  getLogicalX,
  getLogicalY,
} from "./helper";

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
  selection_type: SelectionType.CELLS;
  x_range: SelectionRange;
  y_range: SelectionRange;
  delta_x_range: SelectionRange;
  delta_y_range: SelectionRange;
};

type RowsSelectionEvent = {
  operation: SeletionOperation;
  selection_type: SelectionType.ROWS;
  y_range: SelectionRange;
  delta_y_range: SelectionRange;
};

type ColumnsSelectionEvent = {
  operation: SeletionOperation;
  selection_type: SelectionType.COLS;
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
          operation: "set",
          selection_type: SelectionType.CELLS,
          x_range: this._sortedRange(this.selected_cells_x_range),
          y_range: this._sortedRange(this.selected_cells_y_range),
          delta_x_range: this._sortedRange(this.selected_cells_x_range),
          delta_y_range: this._sortedRange(this.selected_cells_y_range),
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
    let ev: SelectionEvent;

    if (this.selection_type == SelectionType.CELLS) {
      let delta_x,
        delta_y: number = null;
      let operation = "add" as SeletionOperation;

      if (cell_type == CellType.DATA) {
        [delta_x, delta_y] = getLogicalCoord(e.target);
        if (this._inRange(delta_x, this.selected_cells_start_x, this.selected_cells_end_x)) {
          if (this._inRange(delta_y, this.selected_cells_start_y, this.selected_cells_end_y)) {
            operation = "remove";
          }
        }

        [this.selected_cells_end_x, this.selected_cells_end_y] = [delta_x, delta_y];
      } else if (cell_type == CellType.INDEX) {
        delta_y = getLogicalY(e.target);
        if (this._inRange(delta_y, this.selected_cells_start_y, this.selected_cells_end_y)) {
          operation = "remove";
        }
        this.selected_cells_end_y = delta_y;
      } else if (cell_type == CellType.HEADER) {
        delta_x = getLogicalX(e.target);
        if (this._inRange(delta_x, this.selected_cells_start_x, this.selected_cells_end_x)) {
          operation = "remove";
        }
        this.selected_cells_end_x = delta_x;
      }
      let _ev: CellsSelectionEvent = {
        operation: operation,
        selection_type: SelectionType.CELLS,
        x_range: this.selected_cells_x_range,
        y_range: this.selected_cells_y_range,
        delta_x_range: { start: delta_x, end: delta_x },
        delta_y_range: { start: delta_y, end: delta_y },
      };
      ev = _ev;
    } else if (this.selection_type == SelectionType.ROWS) {
      const delta_y = getLogicalY(e.target);
      const operation: SeletionOperation = this._inRange(
        delta_y,
        this.selected_rows_range,
        this.selected_rows_end
      )
        ? "remove"
        : "add";
      this.selected_rows_end = delta_y;
      let _ev: RowsSelectionEvent = {
        operation: operation,
        selection_type: SelectionType.ROWS,
        y_range: this.selected_rows_range,
        delta_y_range: { start: delta_y, end: delta_y },
      };
      ev = _ev;
    } else if (this.selection_type == SelectionType.COLS) {
      const delta_x = getLogicalX(e.target);
      const operation: SeletionOperation = this._inRange(
        delta_x,
        this.selected_columns_start,
        this.selected_columns_end
      )
        ? "remove"
        : "add";
      this.selected_columns_end = delta_x;
    }
    this.table_element.dispatchEvent(
      new CustomEvent("tableselectionchanged", {
        detail: ev,
      })
    );
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

  _sortedRange(range: SelectionRange) {
    if (range.start == range.end) return range;
    if (range.start > range.end)
      return {
        start: range.end,
        end: range.start,
      };
    return range;
  }

  _inRange(x, a, b) {
    let [ma, mb] = this._getRange(a, b);
    return x >= ma && x <= mb;
  }
}

export {
  SelectionManager,
  SelectionType,
  SelectionEvent,
  CellsSelectionEvent,
  RowsSelectionEvent,
  ColumnsSelectionEvent,
};
