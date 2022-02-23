import {
  getLogicalCell,
  getLogicalCoord,
  CellType,
  getCellType,
  getNearestLogicalCoord,
} from "./helper";
import SelectionRange from "./SelectionRange";

enum SelectionType {
  CELLS,
  ROWS,
  COLS,
}

const DIRECTION_MAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

type SelectionOperation = "set" | "add" | "remove" | "noop";

type SelectionEvent = CellsSelectionEvent | RowsSelectionEvent | ColumnsSelectionEvent;

class SelectionManager {
  mousehold_active = false;
  shift_active = false;
  #table_element: HTMLTableElement = null;
  selection_start_cell: HTMLTableCellElement = null;
  #selection_type: SelectionType;
  cell_selection_manager: CellSelectionManager;
  row_selection_manager: RowSelectionManager;
  column_selection_manager: ColumnSelectionManager;

  #max_x: number;
  #max_y: number;

  constructor(table_element) {
    this.table_element = table_element;
    this.cell_selection_manager = new CellSelectionManager();
    this.row_selection_manager = new RowSelectionManager();
    this.column_selection_manager = new ColumnSelectionManager();
  }

  get table_element(): HTMLTableElement {
    return this.#table_element;
  }

  public set table_element(v: HTMLTableElement) {
    if (this.#table_element !== v) {
      this.#table_element = v;
    }
  }

  get selection_type() {
    return this.#selection_type;
  }

  public set selection_type(v: SelectionType) {
    if (v != this.#selection_type) {
      this.#selection_type = v;
    }
  }

  deactivate() {}

  raiseTableSelectionChanged(ev: SelectionEvent) {
    this.table_element.dispatchEvent(
      new CustomEvent("tableselectionchanged", {
        detail: ev,
      })
    );
  }

  onKeyUp(e: KeyboardEvent) {
    if (!e.shiftKey) {
      this.shift_active = false;
    }
  }

  onKeyDown(e: KeyboardEvent) {
    if (this.selection_start_cell === null) {
      return;
    }
    if (e.key == "Shift") {
      this.shift_active = true;
    }
    if (!e.shiftKey) {
      this.shift_active = false;
    }

    const max_x = parseInt(this.table_element.getAttribute("data-logical-max-x"));
    const max_y = parseInt(this.table_element.getAttribute("data-logical-max-y"));

    if (e.shiftKey) {
      const [base_x, base_y] = getLogicalCoord(this.selection_start_cell);
      let ev: SelectionEvent;
      if (this.selection_type == SelectionType.CELLS) {
        if (e.key == "ArrowLeft") {
          ev = this.cell_selection_manager.translateSelectionEnd("left", max_x, max_y);
        } else if (e.key == "ArrowRight") {
          ev = this.cell_selection_manager.translateSelectionEnd("right", max_x, max_y);
        } else if (e.key == "ArrowUp") {
          ev = this.cell_selection_manager.translateSelectionEnd("up", max_x, max_y);
        } else if (e.key == "ArrowDown") {
          ev = this.cell_selection_manager.translateSelectionEnd("down", max_x, max_y);
        }
      } else if (this.selection_type == SelectionType.COLS) {
        if (e.key == "ArrowLeft") {
          ev = this.column_selection_manager.translateSelectionEnd("left", max_x);
        } else if (e.key == "ArrowRight") {
          ev = this.column_selection_manager.translateSelectionEnd("right", max_x);
        }
      } else if (this.selection_type == SelectionType.ROWS) {
        if (e.key == "ArrowUp") {
          ev = this.row_selection_manager.translateSelectionEnd("up", max_y);
        } else if (e.key == "ArrowDown") {
          ev = this.row_selection_manager.translateSelectionEnd("down", max_y);
        }
      }
      if (ev != null) {
        this.raiseTableSelectionChanged(ev);
      }
    } else {
      let [x, y] = getLogicalCoord(this.selection_start_cell);
      if (e.key == "ArrowLeft") {
        if (x > 0) x = x - 1;
      } else if (e.key == "ArrowRight") {
        if (x < max_x - 1) x = x + 1;
      } else if (e.key == "ArrowUp") {
        if (y > 0) y = y - 1;
      } else if (e.key == "ArrowDown") {
        if (y < max_y - 1) y = y + 1;
      }
      this.selection_type = SelectionType.CELLS;
      this.selection_start_cell = getLogicalCell(this.table_element, x, y);
      const ev = this.cell_selection_manager.setSelection(x, y, this.selection_start_cell);
      this.raiseTableSelectionChanged(ev);
    }
  }

  onTableCellMouseDown(e: MouseEvent) {
    if (this.mousehold_active) {
      this.deactivate();
      return;
    }

    const cell_type = getCellType(e.target as HTMLTableCellElement);
    this.mousehold_active = true;
    const [x, y] = getNearestLogicalCoord(e.target);
    let ev: SelectionEvent;
    if (this.shift_active) {
      if (this.selection_type == SelectionType.CELLS) {
        const evs = this.cell_selection_manager.updateSelectionEnd(x, y);
        this.raiseTableSelectionChanged(evs[0]);
        this.raiseTableSelectionChanged(evs[1]);
      } else if (this.selection_type == SelectionType.COLS) {
        const ev = this.column_selection_manager.updateSelectionEnd(x);
        this.raiseTableSelectionChanged(ev);
      } else if (this.selection_type == SelectionType.ROWS) {
        const ev = this.row_selection_manager.updateSelectionEnd(y);
        this.raiseTableSelectionChanged(ev);
      }
    } else {
      if (cell_type == CellType.DATA) {
        this.selection_type = SelectionType.CELLS;
        this.selection_start_cell = e.target as HTMLTableCellElement;
        ev = this.cell_selection_manager.setSelection(x, y, this.selection_start_cell);
      } else if (cell_type == CellType.INDEX) {
        this.selection_type = SelectionType.ROWS;
        this.selection_start_cell = getLogicalCell(this.table_element, x, y);
        ev = this.row_selection_manager.setSelection(y, this.selection_start_cell);
      } else if (cell_type == CellType.HEADER) {
        this.selection_type = SelectionType.COLS;
        this.selection_start_cell = getLogicalCell(this.table_element, x, y);
        ev = this.column_selection_manager.setSelection(x, this.selection_start_cell);
      }
      if (ev != null) {
        this.raiseTableSelectionChanged(ev);
      }
    }
  }

  onTableCellMouseUp(e: MouseEvent) {
    this.mousehold_active = false;
  }

  onTableCellMouseEnter(e: MouseEvent) {
    const target = e.target as HTMLTableCellElement;
    if (!this.mousehold_active) return;
    const cell_type = getCellType(target);

    const [new_x, new_y] = getNearestLogicalCoord(target);

    if (this.selection_type == SelectionType.CELLS) {
      const [x_event, y_event] = this.cell_selection_manager.updateSelectionEnd(new_x, new_y);
      this.raiseTableSelectionChanged(x_event);
      this.raiseTableSelectionChanged(y_event);
    } else if (this.selection_type == SelectionType.ROWS) {
      const ev = this.row_selection_manager.updateSelectionEnd(new_y);
      this.raiseTableSelectionChanged(ev);
    } else if (this.selection_type == SelectionType.COLS) {
      const ev = this.column_selection_manager.updateSelectionEnd(new_x);
      this.raiseTableSelectionChanged(ev);
    }
  }
}

type CellsSelectionEvent = {
  selection_type: SelectionType.CELLS;
  operation: SelectionOperation;
  x_range: SelectionRange;
  y_range: SelectionRange;
  delta_x_range: SelectionRange;
  delta_y_range: SelectionRange;
};

class CellSelectionManager {
  selection_start_cell: HTMLTableCellElement = null;
  x_range: SelectionRange;
  y_range: SelectionRange;

  constructor() {}

  setSelection(
    x_range: SelectionRange | number,
    y_range: SelectionRange | number,
    selection_start_cell: HTMLTableCellElement
  ): CellsSelectionEvent {
    if (typeof x_range == "number") {
      x_range = new SelectionRange(x_range, x_range);
    }
    if (typeof y_range == "number") {
      y_range = new SelectionRange(y_range, y_range);
    }

    this.x_range = x_range;
    this.y_range = y_range;
    this.selection_start_cell = selection_start_cell;
    return {
      operation: "set",
      selection_type: SelectionType.CELLS,
      x_range: this.x_range,
      y_range: this.y_range,
      delta_x_range: SelectionRange.Noop(),
      delta_y_range: SelectionRange.Noop(),
    };
  }

  contains(x, y) {
    return this.x_range.contains(x) && this.y_range.contains(y);
  }

  updateSelectionEnd(x_end?: number, y_end?: number): [CellsSelectionEvent, CellsSelectionEvent] {
    if (x_end == null) {
      x_end = this.x_range.end;
    }
    if (y_end == null) {
      y_end = this.y_range.end;
    }
    const new_x_range = new SelectionRange(this.x_range.start, x_end);
    const new_y_range = new SelectionRange(this.y_range.start, y_end);
    const [delta_x, x_op] = this.x_range.getForwardDelta(new_x_range);
    const [delta_y, y_op] = this.y_range.getForwardDelta(new_y_range);
    const x_event: CellsSelectionEvent = {
      selection_type: SelectionType.CELLS,
      operation: x_op,
      x_range: new_x_range,
      y_range: this.y_range,
      delta_x_range: delta_x,
      delta_y_range: SelectionRange.Noop(),
    };
    const y_event: CellsSelectionEvent = {
      selection_type: SelectionType.CELLS,
      operation: y_op,
      x_range: new_x_range,
      y_range: new_y_range,
      delta_x_range: SelectionRange.Noop(),
      delta_y_range: delta_y,
    };
    this.x_range = new_x_range;
    this.y_range = new_y_range;
    return [x_event, y_event];
  }

  translateSelectionEnd(
    direction: "left" | "right" | "up" | "down",
    max_x: number,
    max_y: number
  ): SelectionEvent | undefined {
    if (direction == "left") {
      if (this.x_range.end > 0) {
        const [x_event, y_event] = this.updateSelectionEnd(this.x_range.end - 1, null);
        return x_event;
      }
    } else if (direction == "right") {
      if (this.x_range.end < max_x - 1) {
        const [x_event, y_event] = this.updateSelectionEnd(this.x_range.end + 1, null);
        return x_event;
      }
    } else if (direction == "up") {
      if (this.y_range.end > 0) {
        const [x_event, y_event] = this.updateSelectionEnd(null, this.y_range.end - 1);
        return y_event;
      }
    } else if (direction == "down") {
      if (this.y_range.end < max_y - 1) {
        const [x_event, y_event] = this.updateSelectionEnd(null, this.y_range.end + 1);
        return y_event;
      }
    }
  }
}

type RowsSelectionEvent = {
  selection_type: SelectionType.ROWS;
  operation: SelectionOperation;
  y_range: SelectionRange;
  delta_y_range: SelectionRange;
};

class RowSelectionManager {
  selection_start_cell: HTMLTableCellElement;
  y_range: SelectionRange;

  constructor() {}

  setSelection(
    y_range: SelectionRange | number,
    selection_start_cell: HTMLTableCellElement
  ): RowsSelectionEvent {
    if (typeof y_range == "number") {
      y_range = new SelectionRange(y_range, y_range);
    }

    this.y_range = y_range;
    this.selection_start_cell = selection_start_cell;
    return {
      operation: "set",
      selection_type: SelectionType.ROWS,
      y_range: this.y_range,
      delta_y_range: SelectionRange.Noop(),
    };
  }

  contains(y) {
    return this.y_range.contains(y);
  }

  updateSelectionEnd(y_end: number): RowsSelectionEvent {
    const new_y_range = new SelectionRange(this.y_range.start, y_end);
    const [delta_y, y_op] = this.y_range.getForwardDelta(new_y_range);

    const y_event: RowsSelectionEvent = {
      selection_type: SelectionType.ROWS,
      operation: y_op,
      y_range: new_y_range,
      delta_y_range: delta_y,
    };
    this.y_range = new_y_range;
    return y_event;
  }

  translateSelectionEnd(direction: "up" | "down", max_y: number): RowsSelectionEvent | undefined {
    if (direction == "up") {
      if (this.y_range.end > 0) {
        return this.updateSelectionEnd(this.y_range.end - 1);
      }
    } else if (direction == "down") {
      if (this.y_range.end < max_y - 1) {
        return this.updateSelectionEnd(this.y_range.end + 1);
      }
    }
  }
}

type ColumnsSelectionEvent = {
  selection_type: SelectionType.COLS;
  operation: SelectionOperation;
  x_range: SelectionRange;
  delta_x_range: SelectionRange;
};

class ColumnSelectionManager {
  selection_start_cell: HTMLTableCellElement;
  x_range: SelectionRange;

  constructor() {}

  setSelection(
    x_range: SelectionRange | number,
    selection_start_cell: HTMLTableCellElement
  ): ColumnsSelectionEvent {
    if (typeof x_range == "number") {
      x_range = new SelectionRange(x_range, x_range);
    }

    this.x_range = x_range;
    this.selection_start_cell = selection_start_cell;
    return {
      operation: "set",
      selection_type: SelectionType.COLS,
      x_range: this.x_range,
      delta_x_range: SelectionRange.Noop(),
    };
  }

  contains(x) {
    return this.x_range.contains(x);
  }

  updateSelectionEnd(x_end: number): ColumnsSelectionEvent {
    const new_x_range = new SelectionRange(this.x_range.start, x_end);
    const [delta_x, x_op] = this.x_range.getForwardDelta(new_x_range);
    const x_event: ColumnsSelectionEvent = {
      selection_type: SelectionType.COLS,
      operation: x_op,
      x_range: new_x_range,
      delta_x_range: delta_x,
    };
    this.x_range = new_x_range;
    return x_event;
  }

  translateSelectionEnd(
    direction: "left" | "right",
    max_x: number
  ): ColumnsSelectionEvent | undefined {
    if (direction == "left") {
      if (this.x_range.end > 0) {
        return this.updateSelectionEnd(this.x_range.end - 1);
      }
    } else if (direction == "right") {
      if (this.x_range.end < max_x - 1) {
        return this.updateSelectionEnd(this.x_range.end + 1);
      }
    }
  }
}

export {
  SelectionType,
  CellType,
  SelectionOperation,
  SelectionManager,
  SelectionEvent,
  CellsSelectionEvent,
  RowsSelectionEvent,
  ColumnsSelectionEvent,
};
