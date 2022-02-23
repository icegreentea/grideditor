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

type SelectionOperation = "set" | "add" | "remove" | "noop";

type SelectionEvent = CellsSelectionEvent | RowsSelectionEvent | ColumnsSelectionEvent;

class SelectionManager {
  mousehold_active = false;
  shift_active = false;
  table_element: HTMLTableElement = null;
  selection_start_cell: HTMLTableCellElement = null;
  #selection_type: SelectionType;
  cell_selection_manager: CellSelectionManager;
  row_selection_manager: RowSelectionManager;
  column_selection_manager: ColumnSelectionManager;

  constructor(table_element) {
    this.table_element = table_element;
    this.cell_selection_manager = new CellSelectionManager();
    this.row_selection_manager = new RowSelectionManager();
    this.column_selection_manager = new ColumnSelectionManager();
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

  onTableCellMouseDown(e: MouseEvent) {
    if (this.mousehold_active) {
      this.deactivate();
      return;
    }

    const cell_type = getCellType(e.target as HTMLTableCellElement);
    if (this.shift_active) {
    } else {
      this.mousehold_active = true;
      const [x, y] = getNearestLogicalCoord(e.target);
      let ev: SelectionEvent;

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
    return [x_event, y_event];
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
    return y_event;
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
    return x_event;
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
