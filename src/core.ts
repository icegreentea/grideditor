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

import {
  SelectionType,
  SelectionOperation,
  SelectionManager,
  SelectionEvent,
  CellsSelectionEvent,
  RowsSelectionEvent,
  ColumnsSelectionEvent,
} from "./SelectionManager2";

import { ScrollManager } from "./ScrollManager";

type HeaderDefinition = {
  name: string;
};

type GridMode = "view" | "edit";

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

    this.selection_manager = new SelectionManager(this.table_element, this.scroll_element);
    this.scroll_manager = new ScrollManager(this.table_element, this.scroll_element);
    this.event_manager = new EventManager(this.selection_manager, this.scroll_manager);

    this.table_element.addEventListener("tableselectionchanged", (e) =>
      this.tableSelectionChanged(e)
    );
    document.addEventListener("keydown", (e) => {
      this.onTableKeyDown(e);
    });
  }

  onTableKeyDown(e: KeyboardEvent) {
    //console.log(e);
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

  tableSelectionChanged(e) {
    if ("detail" in e) {
      let ev: SelectionEvent = e.detail;
      if (ev.operation != "noop") {
        const cells = Array.from(this.table_element.querySelectorAll(`td`));

        if (ev.operation == "set") {
          let selected_cells: HTMLTableCellElement[];

          for (const cell of cells) {
            cell.setAttribute("data-logical-state", "neutral");
            cell.classList.remove("selection-start");
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

          getLogicalCell(
            this.table_element,
            ev.selection_start_x,
            ev.selection_start_y
          ).classList.add("selection-start");
        } else if (ev.operation == "add") {
          let added_cells: HTMLTableCellElement[];
          if (ev.selection_type == SelectionType.CELLS) {
            added_cells = cells.filter((cell) => {
              const [x, y] = getLogicalCoord(cell);
              return (
                (ev as CellsSelectionEvent).x_range.contains(x) &&
                (ev as CellsSelectionEvent).y_range.contains(y)
              );
            });
          } else if (ev.selection_type == SelectionType.ROWS) {
            added_cells = cells.filter((cell) => {
              const [x, y] = getLogicalCoord(cell);
              return (ev as RowsSelectionEvent).y_range.contains(y);
            });
          } else if (ev.selection_type == SelectionType.COLS) {
            added_cells = cells.filter((cell) => {
              const [x, y] = getLogicalCoord(cell);
              return (ev as ColumnsSelectionEvent).x_range.contains(x);
            });
          }
          for (const cell of added_cells) {
            cell.setAttribute("data-logical-state", "selected");
          }
        } else if (ev.operation == "remove") {
          let deselected_cells: HTMLTableCellElement[];
          if (ev.selection_type == SelectionType.CELLS) {
            deselected_cells = cells.filter((cell) => {
              const [x, y] = getLogicalCoord(cell);
              return !(
                (ev as CellsSelectionEvent).x_range.contains(x) &&
                (ev as CellsSelectionEvent).y_range.contains(y)
              );
            });
          } else if (ev.selection_type == SelectionType.ROWS) {
            deselected_cells = cells.filter((cell) => {
              const [x, y] = getLogicalCoord(cell);
              return !(ev as RowsSelectionEvent).y_range.contains(y);
            });
          } else if (ev.selection_type == SelectionType.COLS) {
            deselected_cells = cells.filter((cell) => {
              const [x, y] = getLogicalCoord(cell);
              return !(ev as ColumnsSelectionEvent).x_range.contains(x);
            });
          }
          for (const cell of deselected_cells) {
            cell.setAttribute("data-logical-state", "neutral");
          }
        }
      }

      if (ev.operation == "set") {
        if (ev.selection_type == SelectionType.CELLS) {
          this.scroll_manager.scrollColumnFullyIntoView(ev.x_range.start);
          this.scroll_manager.scrollRowFullyIntoView(ev.y_range.start);
        }
      } else if (ev.operation == "add" || ev.operation == "remove") {
      }
    }
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
    document.addEventListener("mousemove", (e) => this.scroll_manager.onMouseMove(e));
    document.addEventListener("mousedown", (e) => this.scroll_manager.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.scroll_manager.onMouseUp(e));
    document.addEventListener("mousedragoffgridmove", (e: CustomEvent) =>
      this.selection_manager.onMouseDragOffGridMove(e)
    );
  }
}

export { Grid };
