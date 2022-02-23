import { getLogicalCell, getLogicalCoord } from "./helper";
import SelectionRange from "./SelectionRange";

enum SelectionType {
  CELLS,
  ROWS,
  COLS,
}

enum CellType {
  DATA,
  INDEX,
  HEADER,
}

type SelectionOperation = "set" | "add" | "remove";

type SelectionEvent = CellsSelectionEvent | RowsSelectionEvent | ColumnsSelectionEvent;

class SelectionManager {
  mousehold_active = false;
  shift_active = false;
  table_element: HTMLTableElement = null;
  selection_start_cell: HTMLTableCellElement = null;
  selection_type: SelectionType;
  cell_selection_manager: CellSelectionManager;
  row_selection_manager: RowSelectionManager;
  column_selection_manager: ColumnSelectionManager;

  constructor(table_element) {
    this.table_element = table_element;
    this.cell_selection_manager = new CellSelectionManager();
    this.row_selection_manager = new RowSelectionManager();
    this.column_selection_manager = new ColumnSelectionManager();
  }

  deactivate() {}

  onTableCellMouseDown(e: MouseEvent) {
    if (this.mousehold_active) {
      this.deactivate();
      return;
    }

    const cell_type = getCellType(e.target as HTMLTableCellElement);
    if (this.shift_active) {
    } else {
      this.mousehold_active = true;
      const [x, y] = getLogicalCoord(e.target);
      let ev: SelectionEvent;

      if (cell_type == CellType.DATA) {
        this.selection_type = SelectionType.CELLS;
        this.selection_start_cell = e.target as HTMLTableCellElement;
        ev = this.cell_selection_manager.setSelection(x, y, this.selection_start_cell);
      } else if (cell_type == CellType.INDEX) {
        this.selection_type = SelectionType.ROWS;
        this.selection_start_cell = getLogicalCell(this.table_element, 0, y);
        ev = this.row_selection_manager.setSelection(y, this.selection_start_cell);
      } else if (cell_type == CellType.HEADER) {
        this.selection_type = SelectionType.COLS;
        this.selection_start_cell = getLogicalCell(this.table_element, x, 0);
        ev = this.column_selection_manager.setSelection(x, this.selection_start_cell);
      }
      if (ev != null) {
        this.table_element.dispatchEvent(
          new CustomEvent("tableselectionchanged", {
            detail: ev,
          })
        );
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

    let operation = "add" as SelectionOperation;

    if (this.selection_type == SelectionType.CELLS) {
      if (cell_type == CellType.DATA) {
        const [new_x, new_y] = getLogicalCoord(target);
        if (this.cell_selection_manager.contains(new_x, new_y)) {
          operation = "remove";
        }
      }
    } else if (this.selection_type == SelectionType.ROWS) {
    } else if (this.selection_type == SelectionType.COLS) {
    }
  }
}

type CellsSelectionEvent =
  | {
      selection_type: SelectionType.CELLS;
      operation: "add" | "remove";
      x_range: SelectionRange;
      y_range: SelectionRange;
      delta_x_range: SelectionRange;
      delta_y_range: SelectionRange;
    }
  | {
      selection_type: SelectionType.CELLS;
      operation: "set";
      x_range: SelectionRange;
      y_range: SelectionRange;
      delta_x_range?: never;
      delta_y_range?: never;
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
    };
  }

  contains(x, y) {
    return this.x_range.contains(x) && this.y_range.contains(y);
  }

  shrinkSelecetion(x_range_shrink?: SelectionRange, y_range_shrink?: SelectionRange) {}
}

type RowsSelectionEvent =
  | {
      selection_type: SelectionType.ROWS;
      operation: "add" | "remove";
      y_range: SelectionRange;
      delta_y_range: SelectionRange;
    }
  | {
      selection_type: SelectionType.ROWS;
      operation: "set";
      y_range: SelectionRange;
      delta_y_range?: never;
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
    };
  }

  contains(y) {
    return this.y_range.contains(y);
  }
}

type ColumnsSelectionEvent =
  | {
      selection_type: SelectionType.COLS;
      operation: "add" | "remove";
      x_range: SelectionRange;
      delta_x_range: SelectionRange;
    }
  | {
      selection_type: SelectionType.COLS;
      operation: "set";
      x_range: SelectionRange;
      delta_x_range?: never;
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
    };
  }

  contains(x) {
    return this.x_range.contains(x);
  }
}

function getCellType(elem: HTMLTableCellElement) {
  if (elem.hasAttribute("data-header-cell")) {
    return CellType.HEADER;
  } else if (elem.hasAttribute("data-index-cell")) {
    return CellType.INDEX;
  }
  return CellType.DATA;
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
