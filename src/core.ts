import {
  getLogicalCell,
  getLogicalCoord,
  getGridCell,
  clampedDecrement,
  clampedIncrement,
  getLogicalX,
  getLogicalY,
  CellType,
  getGridX,
  getGridY,
  findParentTableCell,
  isCellWidthOverflow,
  getGridCol,
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

type DataType = "text" | "number";

type Editor = "text-multi" | "text-single";

class TextView {}

class NumberView {}

class TextEditor {
  initial_value: string;
  fragment: DocumentFragment;
  parent_cell: HTMLTableCellElement;
  #input;
  constructor(initial_value, parent_cell) {
    if (initial_value == null) initial_value = "";
    this.parent_cell = parent_cell;
    this.initial_value = initial_value;
    this.render();
  }

  check() {}

  getEditorValue() {
    return this.#input.value;
  }

  focus() {
    this.#input.focus();
  }

  render(): DocumentFragment {
    const frag = new DocumentFragment();
    const _input = document.createElement("textarea");
    _input.classList.add("multiline-text-editor");
    //_input.style.width = `${this.parent_cell.clientWidth}px`;
    _input.value = this.initial_value;
    this.#input = _input;
    frag.appendChild(_input);
    this.fragment = frag;
    return frag;
  }
}

class NumberEditor {
  initial_value: number;
  fragment: DocumentFragment;
  #input;
  constructor(initial_value) {
    this.initial_value = initial_value;
  }

  check() {}

  getEditorValue() {
    return parseFloat(this.#input.value);
  }

  render(): DocumentFragment {
    const frag = new DocumentFragment();
    const _input = document.createElement("input");
    _input.type = "text";
    _input.value = this.initial_value.toString();
    this.#input = _input;
    frag.appendChild(_input);
    this.fragment = frag;
    return frag;
  }
}

type DataDefinition = {
  name: string;
  //type: DataType;
};

function parse_keys(data: object[]) {
  let keys = new Set();
  for (const [row_idx, row_data] of data.entries()) {
    for (const key of Object.keys(row_data)) {
      keys.add(key);
    }
  }
  return keys;
}

type GridMode = "view" | "edit";

class Grid {
  table_element: HTMLTableElement;
  scroll_element: HTMLDivElement;
  target_element: HTMLDivElement;
  right_sidebar_element: HTMLDivElement;
  selection_manager: SelectionManager;
  scroll_manager: ScrollManager;
  event_manager: EventManager;
  data_definition: DataDefinition[];
  data: object[];
  active_editor;
  #grid_mode: GridMode = "view";

  constructor(element: HTMLDivElement, header_data: DataDefinition[], data: object[]) {
    this.target_element = element;
    this.data_definition = header_data;
    this.data = data;

    this._createTable();

    this.selection_manager = new SelectionManager(this.table_element, this.scroll_element);
    this.scroll_manager = new ScrollManager(this.table_element, this.scroll_element);
    this.event_manager = new EventManager(
      this.table_element,
      this.selection_manager,
      this.scroll_manager
    );

    this.table_element.addEventListener("tableselectionchanged", (e) =>
      this.tableSelectionChanged(e)
    );
    document.addEventListener("keydown", (e) => {
      this.onTableKeyDown(e);
    });
  }

  updateUnderlyingData(cell: HTMLTableCellElement, new_value: string) {
    const [logical_x, logical_y] = getLogicalCoord(cell);
    const key = this.data_definition[logical_x];
    this.data[logical_y][key.name] = new_value;
    cell.innerHTML = new_value;
  }

  getUnderlyingData(cell: HTMLTableCellElement) {
    const [logical_x, logical_y] = getLogicalCoord(cell);
    const key = this.data_definition[logical_x];
    return this.data[logical_y][key.name];
  }

  get grid_mode() {
    return this.#grid_mode;
  }

  public set grid_mode(v: GridMode) {
    if (v != this.grid_mode) {
      console.log("Mode:", v);
      this.#grid_mode = v;
      if (this.grid_mode == "view") {
        this.selection_manager.selection_enabled = true;
      } else if (this.grid_mode == "edit") {
        this.selection_manager.selection_enabled = false;
      }
    }
  }

  onTableKeyDown(e: KeyboardEvent) {
    if (this.grid_mode == "edit") {
      if (e.key == "Enter") {
      } else if (e.key == "Escape") {
        this.grid_mode = "view";
        const [x, y] = getLogicalCoord(this.selection_manager.selection_start_cell);
        this.disableEdit(x, y);
        //this.selection_manager.selection_enabled = true;
      }
    } else if (this.grid_mode == "view") {
      if (this.selection_manager.selection_start_cell != null) {
        if (e.key == "Enter") {
          this.grid_mode = "edit";
          //this.selection_manager.selection_enabled = false;
          const [x, y] = getLogicalCoord(this.selection_manager.selection_start_cell);
          this.enableEdit(x, y);
          e.preventDefault();
        } else if (e.key == "Escape") {
        }
      }
    }
  }

  activateRightSideBar() {
    this.right_sidebar_element.style.width = "25%";
    this.scroll_element.style.width = "75%";
    //this.right_sidebar_element.style.visibility = "visible";
  }

  deactiveRightSideBar() {
    this.right_sidebar_element.style.width = "0%";
    this.scroll_element.style.width = "100%";
    //this.right_sidebar_element.style.visibility = "hidden";
  }

  enableEdit(logical_x, logical_y) {
    const cell = getLogicalCell(this.table_element, logical_x, logical_y);
    cell.classList.add("cell-editor-enabled");
    const original_content = cell.textContent;
    const editor = new TextEditor(this.getUnderlyingData(cell), cell);
    this.active_editor = editor;
    //const editor = document.createElement("textarea");
    //editor.value = `${this.getUnderlyingData(cell)}`;
    cell.innerHTML = null;
    cell.appendChild(editor.fragment);
    editor.focus();
  }

  disableEdit(logical_x, logical_y) {
    //const cell = getLogicalCell(this.table_element, logical_x, logical_y);
    //const editor = cell.querySelector("textarea");
    //cell.removeChild(editor);
    const cell = this.active_editor.parent_cell;
    cell.innerHTML = null;
    this.updateUnderlyingData(cell, this.active_editor.getEditorValue());
    cell.innerHTML = this.active_editor.getEditorValue();
    cell.classList.remove("cell-editor-enabled");
    this.active_editor = null;
    //this.updateUnderlyingData(cell, editor.value);
    //cell.innerHTML = editor.value;
  }

  _createTable() {
    /*
      <div id="coresheet_container">
        <div id="vertical_container">
          <div id="topbar_container"/>
          <div class="main_container">
            <div class="coresheet_scroller"/>
            <div class=""
          </div>
          <div id="bottombar_container"/>
        </div>
      </div>

    */
    this.target_element.classList.add("coresheet_container");
    //let vertical_container = document.createElement("div");

    let right_sidebar_element = document.createElement("div");
    right_sidebar_element.classList.add("right_sidebar_container");
    this.right_sidebar_element = right_sidebar_element;
    let scroller_element = document.createElement("div");
    scroller_element.classList.add("coresheet_scroller");
    this.scroll_element = scroller_element;
    this.target_element.appendChild(scroller_element);
    this.target_element.appendChild(right_sidebar_element);
    scroller_element.style.background = "red";

    let table = document.createElement("table");
    table.classList.add("coresheet");
    table.setAttribute("unselectable", "yes");
    table.setAttribute("cellspacing", 0);
    table.setAttribute("cellpadding", 0);
    this.table_element = table;
    scroller_element.appendChild(table);

    let colgroup = document.createElement("colgroup");
    table.appendChild(colgroup);

    let thead = document.createElement("thead");
    table.appendChild(thead);

    let header_row = document.createElement("tr");
    header_row.setAttribute("data-grid-y", 0);
    thead.appendChild(header_row);
    const index_col = document.createElement("col");
    index_col.style.width = "100px";
    colgroup.appendChild(index_col);

    let spacer_el = document.createElement("td");
    spacer_el.setAttribute("data-grid-y", 0);
    spacer_el.setAttribute("data-grid-x", 0);
    header_row.appendChild(spacer_el);

    const column_order = [];
    let SPACER_COLS = 1;
    let SPACER_ROWS = 1;

    /* Creating headers
     */
    for (const [idx, header_elem] of this.data_definition.entries()) {
      let _el = document.createElement("td");
      let resize_element = document.createElement("span");
      resize_element.classList.add("column-resize-handle");
      _el.setAttribute("data-grid-y", 0);
      _el.setAttribute("data-grid-x", idx + SPACER_COLS);
      _el.setAttribute("data-logical-x", idx);
      _el.setAttribute("data-header-cell", "");
      if (idx > 0) {
        let trailing_resize_element = document.createElement("span");
        trailing_resize_element.classList.add("column-resize-trailing-handle");
        //_el.appendChild(trailing_resize_element);
      }

      let _content = document.createElement("div");
      _content.classList.add("column-header");
      _content.innerText = header_elem["name"];
      _el.appendChild(_content);

      //_el.appendChild(document.createTextNode(header_elem["name"]));
      //_el.textContent = header_elem["name"];
      //_el.appendChild(resize_element);
      header_row.appendChild(_el);
      column_order.push(header_elem["name"]);
      let col = document.createElement("col");
      col.setAttribute("data-logical-x", idx);
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
      let index_cell = document.createElement("td");
      index_cell.setAttribute("data-grid-y", row_idx + SPACER_ROWS);
      index_cell.setAttribute("data-logical-y", row_idx);
      index_cell.setAttribute("data-grid-x", 0);
      index_cell.setAttribute("data-index-cell", "");
      if (row_idx > 0) {
        let trailing_row_resize_handle = document.createElement("div");
        trailing_row_resize_handle.classList.add("row-resize-trailing-handle");
        //index_cell.appendChild(trailing_row_resize_handle);
      }

      let index_cell_content = document.createElement("div");
      index_cell_content.textContent = row_idx.toString();
      index_cell.appendChild(index_cell_content);

      let row_resize_handle = document.createElement("div");
      row_resize_handle.classList.add("row-resize-handle");
      //index_cell.appendChild(row_resize_handle);

      new_row.appendChild(index_cell);

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

    /*
    const all_cells = table.querySelectorAll("td");
    for (const cell of all_cells) {
      //cell.addEventListener("mousedown", (e) => this.selection_manager.onTableCellMouseDown(e));
      cell.addEventListener("mousedown", (e) => this.event_manager.onTableCellMouseDown(e));
      cell.addEventListener("mouseenter", (e) => this.selection_manager.onTableCellMouseEnter(e));
      //cell.addEventListener("mouseleave", (e) => this.selection_manager.onTableCellMouseLeave(e));
      cell.addEventListener("mouseup", (e) => this.selection_manager.onTableCellMouseUp(e));
      cell.addEventListener("mousemove", (e) => this.event_manager.onTableCellMouseMove(e));
      cell.setAttribute("data-logical-state", "neutral");
    }
    */
    const all_cells = table.querySelectorAll("td");
    for (const cell of all_cells) {
      cell.setAttribute("data-logical-state", "neutral");
    }

    table.setAttribute("data-logical-max-x", column_order.length);
    table.setAttribute("data-logical-max-y", this.data.length);
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
  table_element: HTMLTableElement;
  selection_manager: SelectionManager;
  scroll_manager: ScrollManager;
  resize_enabled_focus_cell: HTMLTableCellElement;
  resize_mode: "current" | "trailing" | null;

  constructor(table_element, selection_manager, scroll_manager) {
    this.table_element = table_element;
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
    this._bindTableCellEvents();
  }

  _bindTableCellEvents() {
    const all_cells = this.table_element.querySelectorAll("td");
    for (const cell of all_cells) {
      //cell.addEventListener("mousedown", (e) => this.selection_manager.onTableCellMouseDown(e));
      cell.addEventListener("mousedown", (e) => this.onTableCellMouseDown(e));
      cell.addEventListener("mouseenter", (e) => this.selection_manager.onTableCellMouseEnter(e));
      //cell.addEventListener("mouseleave", (e) => this.selection_manager.onTableCellMouseLeave(e));
      cell.addEventListener("mouseup", (e) => this.selection_manager.onTableCellMouseUp(e));
      cell.addEventListener("mousemove", (e) => this.onTableCellMouseMove(e));
      cell.addEventListener("dblclick", (e) => this.onTableCellDoubleClick(e));
    }
  }

  onTableCellMouseMove(e: MouseEvent) {
    const table_cell = findParentTableCell(e.target);
    if (table_cell == null) return;
    if (table_cell.hasAttribute("data-header-cell")) {
      const { left, right } = table_cell.getBoundingClientRect();
      let _resize_mode: "current" | "trailing" | null;
      if (e.clientX >= left && e.clientX < left + 5) {
        _resize_mode = "trailing";
      } else if (e.clientX <= right && e.clientX > right - 5) {
        _resize_mode = "current";
      } else {
        _resize_mode = null;
      }

      if (_resize_mode != null) {
        if (
          this.resize_enabled_focus_cell != null &&
          this.resize_enabled_focus_cell != table_cell
        ) {
          this.resize_enabled_focus_cell.classList.remove("col-resize-enabled");
          this.resize_enabled_focus_cell.classList.remove("row-resize-enabled");
        }
        table_cell.classList.add("col-resize-enabled");
        this.resize_enabled_focus_cell = table_cell as HTMLTableCellElement;
        this.resize_mode = _resize_mode;
        return;
      }
    } else if (table_cell.hasAttribute("data-index-cell")) {
      const { top, bottom } = table_cell.getBoundingClientRect();
      let _resize_mode: "current" | "trailing" | null;
      if (e.clientY >= top && e.clientY < top + 5) {
        _resize_mode = "trailing";
      } else if (e.clientY <= bottom && e.clientY > bottom - 5) {
        _resize_mode = "current";
      } else {
        _resize_mode = null;
      }

      if (_resize_mode != null) {
        if (
          this.resize_enabled_focus_cell != null &&
          this.resize_enabled_focus_cell != table_cell
        ) {
          this.resize_enabled_focus_cell.classList.remove("col-resize-enabled");
          this.resize_enabled_focus_cell.classList.remove("row-resize-enabled");
        }
        table_cell.classList.add("row-resize-enabled");
        this.resize_enabled_focus_cell = table_cell as HTMLTableCellElement;
        this.resize_mode = _resize_mode;
        return;
      }
    }
    if (this.resize_enabled_focus_cell != null) {
      this.resize_enabled_focus_cell.classList.remove("col-resize-enabled");
      this.resize_enabled_focus_cell.classList.remove("row-resize-enabled");
      this.resize_enabled_focus_cell = null;
      this.resize_mode = null;
    }
  }

  onTableCellDoubleClick(e: MouseEvent) {
    if (e.target instanceof Element) {
      const table_cell = findParentTableCell(e.target);
      if (table_cell.hasAttribute("data-header-cell")) {
        const grid_x = getGridX(table_cell);
        const cells = getGridCol(this.table_element, grid_x);
        console.log(Math.max(...cells.map((c) => c.scrollWidth)));
      }
      if (isCellWidthOverflow(table_cell)) {
        console.log(table_cell);
      }
    }
  }

  onTableCellMouseDown(e: MouseEvent) {
    if (e.target instanceof Element) {
      const table_cell = findParentTableCell(e.target);
      if (this.resize_enabled_focus_cell && this.resize_enabled_focus_cell == table_cell) {
        if (this.resize_enabled_focus_cell.hasAttribute("data-header-cell")) {
          if (this.resize_mode == "current") {
            this.scroll_manager.initializeColumnResize(getGridX(table_cell));
            return;
          } else if (this.resize_mode == "trailing") {
            this.scroll_manager.initializeColumnResize(getGridX(table_cell) - 1);
            return;
          }
        } else if (this.resize_enabled_focus_cell.hasAttribute("data-index-cell")) {
          if (this.resize_mode == "current") {
            this.scroll_manager.initializeRowResize(getGridY(table_cell));
            return;
          } else if (this.resize_mode == "trailing") {
            this.scroll_manager.initializeRowResize(getGridY(table_cell) - 1);
            return;
          }
        }
      }
      this.selection_manager.onTableCellMouseDown(e);
    }
  }
}

export { Grid };
