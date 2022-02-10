class Grid {
  #focused_cell = null;
  #active_textarea = null;
  table_element = null;

  constructor(element, header_data, data) {
    this.element = element;
    this.header_data = header_data;
    this.data = data;

    this._createTable();
    this.selection_manager = new SelectionManager(this.table_element);
    this.table_element.addEventListener("tableselectionchanged", (e) =>
      this.tableSelectionChanged(e)
    );
  }

  _createTable() {
    this.element.classList.add("coresheet_container");
    let inner_el = document.createElement("div");
    inner_el.classList.add("coresheet_content");
    this.element.appendChild(inner_el);

    let table = document.createElement("table");
    table.classList.add("coresheet");
    table.setAttribute("unselectable", "yes");
    table.setAttribute("cellspacing", 0);
    table.setAttribute("cellpadding", 0);
    this.table_element = table;
    inner_el.appendChild(table);

    let thead = document.createElement("thead");
    table.appendChild(thead);

    let header_row = document.createElement("tr");
    header_row.setAttribute("data-grid-y", 0);
    thead.appendChild(header_row);

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
      spacer_cell.textContent = row_idx;
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
    if (selection.selection_type == selectionType.CELLS) {
      selected_cells = cells.filter((cell) => {
        const x = parseInt(cell.getAttribute("data-logical-x"));
        const y = parseInt(cell.getAttribute("data-logical-y"));
        return (
          selection.logical_x_range[0] <= x &&
          x <= selection.logical_x_range[1] &&
          selection.logical_y_range[0] <= y &&
          y <= selection.logical_y_range[1]
        );
      });
    } else if (selection.selection_type == selectionType.ROWS) {
      selected_cells = cells.filter((cell) => {
        const y = parseInt(cell.getAttribute("data-logical-y"));
        return selection.logical_y_range[0] <= y && y <= selection.logical_y_range[1];
      });
    } else if (selection.selection_type == selectionType.COLS) {
      selected_cells = cells.filter((cell) => {
        const x = parseInt(cell.getAttribute("data-logical-x"));
        return selection.logical_x_range[0] <= x && x <= selection.logical_x_range[1];
      });
    }

    for (const cell of selected_cells) {
      cell.setAttribute("data-logical-state", "selected");
    }
  }
}

/**
 * Enum for selection type
 * @readonly
 * @enum {string}
 */
const selectionType = {
  CELLS: "cells",
  ROWS: "rows",
  COLS: "cols",
};

/**
 * Enum for cell type.
 * @readonly
 * @enum {string}
 */
const cellType = {
  DATA: "data",
  HEADER: "header",
  INDEX: "index",
};

class SelectionManager {
  mousehold_active = false;
  table_element = null;

  /**
   * @type {selectionType|undefined}
   */
  selection_type = null;

  selected_rows_start = null;
  selceted_rows_end = null;

  selected_columns_start = null;
  selected_columns_end = null;

  selected_cells_start_x = null;
  selected_cells_start_y = null;
  selected_cells_ends_x = null;
  selected_cells_end_y = null;

  selection_start_cell = null;

  constructor(table_element) {
    this.table_element = table_element;
    document.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  deactivate() {
    this.mousehold_active = false;
    this.selection_type = null;
    this.selection_start_cell = null;
    this.selected_rows_start = null;
    this.selceted_rows_end = null;

    this.selected_columns_start = null;
    this.selected_columns_end = null;

    this.selected_cells_start_x = null;
    this.selected_cells_start_y = null;
    this.selected_cells_ends_x = null;
    this.selected_cells_end_y = null;
  }

  onKeyDown(e) {
    if (this.selection_start_cell === null) {
      return;
    }
    const max_x = parseInt(this.table_element.getAttribute("data-logical-max-x"));
    const max_y = parseInt(this.table_element.getAttribute("data-logical-max-y"));

    if (e.shiftKey) {
      if (this.selection_type == selectionType.CELLS) {
        const base_x = parseInt(this.selection_start_cell.getAttribute("data-logical-x"));
        const base_y = parseInt(this.selection_start_cell.getAttribute("data-logical-y"));
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
            y_range[0] = clampedIncrement(y_range[0], max - y - 1);
          }
        }
        this.selected_cells_start_x = x_range[0];
        this.selected_cells_end_x = x_range[1];
        this.selected_cells_start_y = y_range[0];
        this.selected_cells_end_y = y_range[1];
        this.table_element.dispatchEvent(new Event("tableselectionchanged"));
      } else if (this.selection_type == selectionType.ROWS) {
        const base_y = parseInt(this.selection_start_cell.getAttribute("data-logical-y"));
        let y_range = this._getRange(this.selected_rows_start, this.selected_rows_end);
        if (e.keyCode == 37) {
          // left-arrow
        } else if (e.keyCode == 39) {
          //right-arrow
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
        this.selected_rows_start = y_range[0];
        this.selected_rows_end = y_range[1];
        this.table_element.dispatchEvent(new Event("tableselectionchanged"));
      } else if ((this.selection_type = selectionType.COLS)) {
        const base_x = parseInt(this.selection_start_cell.getAttribute("data-logical-x"));
        let x_range = this._getRange(this.selected_columns_start, this.selected_columns_end);
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
        } else if (e.keyCode == 40) {
          // down-arrow
        }
        this.selected_columns_start = x_range[0];
        this.selected_columns_end = x_range[1];
        this.table_element.dispatchEvent(new Event("tableselectionchanged"));
      }
    } else {
      let x = parseInt(this.selection_start_cell.getAttribute("data-logical-x"));
      let y = parseInt(this.selection_start_cell.getAttribute("data-logical-y"));
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
      this.selection_type = selectionType.CELLS;
      this.table_element.dispatchEvent(new Event("tableselectionchanged"));
    }
  }

  onTableCellMouseDown(e) {
    if (this.mousehold_active) {
      this.deactivate();
      return;
    }
    const cell_type = this.getCellType(e.target);
    this.mousehold_active = true;
    this.selection_start_cell = e.target;
    if (cell_type == cellType.DATA) {
      this.selection_type = selectionType.CELLS;
      this.selected_cells_start_x = parseInt(e.target.getAttribute("data-logical-x"));
      this.selected_cells_start_y = parseInt(e.target.getAttribute("data-logical-y"));
      this.selected_cells_end_x = parseInt(e.target.getAttribute("data-logical-x"));
      this.selected_cells_end_y = parseInt(e.target.getAttribute("data-logical-y"));
    } else if (cell_type == cellType.INDEX) {
      this.selection_type = selectionType.ROWS;
      this.selected_rows_start = parseInt(e.target.getAttribute("data-logical-y"));
      this.selected_rows_end = parseInt(e.target.getAttribute("data-logical-y"));
    } else if (cell_type == cellType.HEADER) {
      this.selection_type = selectionType.COLS;
      this.selected_columns_start = parseInt(e.target.getAttribute("data-logical-x"));
      this.selected_columns_end = parseInt(e.target.getAttribute("data-logical-x"));
    }
    this.table_element.dispatchEvent(new Event("tableselectionchanged"));
  }

  onTableCellMouseEnter(e) {
    if (!this.mousehold_active) return;
    const cell_type = this.getCellType(e.target);

    if (this.selection_type == selectionType.CELLS) {
      if (cell_type == cellType.DATA) {
        this.selected_cells_end_x = parseInt(e.target.getAttribute("data-logical-x"));
        this.selected_cells_end_y = parseInt(e.target.getAttribute("data-logical-y"));
      } else if (cell_type == cellType.INDEX) {
        this.selected_cells_end_y = parseInt(e.target.getAttribute("data-logical-y"));
      } else if (cell_type == cellType.HEADER) {
        this.selected_cells_end_x = parseInt(e.target.getAttribute("data-logical-x"));
      }
    } else if (this.selection_type == selectionType.ROWS) {
      this.selected_rows_end = parseInt(e.target.getAttribute("data-logical-y"));
    } else if (this.selection_type == selectionType.COLS) {
      this.selected_columns_end = parseInt(e.target.getAttribute("data-logical-x"));
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
   * @returns {cellType}
   */
  getCellType(elem) {
    if (elem.hasAttribute("data-header-cell")) {
      return cellType.HEADER;
    } else if (elem.hasAttribute("data-index-cell")) {
      return cellType.INDEX;
    }
    return cellType.DATA;
  }

  getCurrentSelection() {
    if (this.selection_type == selectionType.CELLS) {
      const x_range = this._getRange(this.selected_cells_start_x, this.selected_cells_end_x);
      const y_range = this._getRange(this.selected_cells_start_y, this.selected_cells_end_y);
      return {
        selection_type: this.selection_type,
        logical_x_range: x_range,
        logical_y_range: y_range,
      };
    } else if (this.selection_type == selectionType.ROWS) {
      const y_range = this._getRange(this.selected_rows_start, this.selected_rows_end);
      return {
        selection_type: this.selection_type,
        logical_y_range: y_range,
      };
    } else if (this.selection_type == selectionType.COLS) {
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

function getLogicalCell(table_element, logical_x, logical_y) {
  return table_element.querySelector(
    `td[data-logical-x="${logical_x}"][data-logical-y="${logical_y}"]`
  );
}

function clampedDecrement(x, limit) {
  if (x > limit) return x - 1;
  return x;
}

function clampedIncrement(x, limit) {
  if (x < limit) return x + 1;
  return x;
}
