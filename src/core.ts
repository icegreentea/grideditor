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
  checkTextWidth,
  getGridRow,
  getCellType,
  checkTextHeight,
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

class TextView {
  input_value: any;
  display_value: string;
  value: string;
  parent_cell: HTMLTableCellElement;
  fragment: DocumentFragment;
  constructor(value, parent_cell: HTMLTableCellElement) {
    this.input_value = value;
    if (value == null) {
      this.display_value = "";
    } else if (typeof value == "string") {
      this.display_value = value;
    } else {
      this.display_value = `${value}`;
    }
    this.parent_cell = parent_cell;
    this.render();
  }

  contentWidth() {
    return Math.max(
      ...checkTextWidth(
        this.display_value,
        window.getComputedStyle(this.parent_cell, null).getPropertyValue("font")
      )
    );
  }

  contentHeight() {
    return checkTextHeight(
      this.display_value,
      window.getComputedStyle(this.parent_cell, null).getPropertyValue("font")
    );
  }

  lines() {
    return this.display_value.split(/\r?\n/).length;
  }

  getFragment() {
    return this.fragment;
  }

  render(): DocumentFragment {
    const frag = new DocumentFragment();
    this.display_value.split(/\r?\n/).forEach((line) => {
      const span = document.createElement("span");
      span.innerText = line;
      frag.appendChild(span);
      frag.appendChild(document.createElement("br"));
    });
    this.fragment = frag;
    return frag;
  }
}

class TextEditor {
  initial_value: string;
  fragment: DocumentFragment;
  parent_cell: HTMLTableCellElement;
  #input;
  constructor(initial_value, parent_cell: HTMLTableCellElement) {
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

  getFragment() {
    return this.fragment;
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

type CellContent = TextEditor | TextView;

interface BoundHTMLTableCellElement extends HTMLTableCellElement {
  bound_content: CellContent;
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

class DataBase {
  data_rows: any[];
  data_defintion: DataDefinition[];

  constructor(data_defintion: DataDefinition[], data_rows: any[]) {
    this.data_rows = data_rows;
    this.data_defintion = data_defintion;
    const data_keys = new Set(this.data_defintion.map((def) => def.name));

    data_rows.forEach((data_row, idx) => {
      for (const [key, value] of Object.entries(data_row)) {
        if (data_keys.has(key)) {
        }
      }
    });
  }

  getValue(row_ref, column_ref) {
    return this.data_rows[row_ref][column_ref];
  }

  setValue(row_ref, column_ref, new_value) {
    this.data_rows[row_ref][column_ref] = new_value;
  }

  getDataReference(row_ref, column_ref): DataReference {
    return {
      getValue: () => {
        return this.getValue(row_ref, column_ref);
      },
      setValue: (new_value) => {
        this.setValue(row_ref, column_ref, new_value);
      },
    };
  }
}

type TableCellMode = "view" | "edit";

interface DataReference {
  getValue(): string;
  setValue(v: string): void;
}

class TableCell {
  table_element: HTMLTableElement;
  cell_element: HTMLTableCellElement;
  cell_content: CellContent;
  mode: TableCellMode;
  data_ref: DataReference;

  constructor(table_element, cell_element, data_reference: DataReference) {
    this.table_element = table_element;
    this.cell_element = cell_element;
    this.mode = "view";
    this.data_ref = data_reference;
    this.cell_content = new TextView(this.data_ref.getValue(), cell_element);
  }

  enableEdit(focus = true) {
    if (this.mode == "edit") return;
    this.mode = "edit";
    this.cell_content = new TextEditor(this.data_ref.getValue(), this.cell_element);
    this.cell_element.innerHTML = null;
    this.cell_element.appendChild(this.cell_content.getFragment());
    if (focus) {
      this.cell_content.focus();
    }
  }

  disableEdit(save_changes = true) {
    if (this.mode == "view") return;
    this.mode = "view";
    if (save_changes) {
      const new_value = (this.cell_content as TextEditor).getEditorValue();
      this.data_ref.setValue(new_value);
    }
    this.cell_content = new TextView(this.data_ref.getValue(), this.cell_element);
    this.cell_element.innerHTML = null;
    this.cell_element.append(this.cell_content.getFragment());
  }
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
  data_base: DataBase;
  #grid_mode: GridMode = "view";
  table_cells: TableCell[][];

  constructor(element: HTMLDivElement, header_data: DataDefinition[], data: object[]) {
    this.target_element = element;
    this.data_definition = header_data;
    this.data = data;

    this.data_base = new DataBase(header_data, data);

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
    cell.cell_obj.enableEdit();

    //const original_content = cell.textContent;
    //const editor = new TextEditor(this.getUnderlyingData(cell), cell);
    //this.active_editor = editor;
    //const editor = document.createElement("textarea");
    //editor.value = `${this.getUnderlyingData(cell)}`;
    //this.bindCellContent(cell, editor);
    //cell.innerHTML = null;
    //cell.appendChild(editor.fragment);
    //editor.focus();
  }

  disableEdit(logical_x, logical_y) {
    const cell = getLogicalCell(this.table_element, logical_x, logical_y);

    //const cell = this.active_editor.parent_cell;
    cell.classList.remove("cell-editor-enabled");
    cell.cell_obj.disableEdit();
    //this.updateUnderlyingData(cell, this.active_editor.getEditorValue());
    //const view = new TextView(this.active_editor.getEditorValue(), cell);
    //this.bindCellContent(cell, view);
    //cell.innerHTML = null;
    //cell.appendChild(view.getFragment());
    //cell.innerHTML = this.active_editor.getEditorValue();
    //cell.classList.remove("cell-editor-enabled");
    //this.active_editor = null;
  }

  bindCellContent(cell_element: HTMLTableCellElement, content: TextView | TextEditor) {
    cell_element.innerHTML = null;
    cell_element.appendChild(content.getFragment());
    // @ts-ignore
    cell_element.bound_content = content;
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
      col.setAttribute("data-grid-x", idx + SPACER_COLS);
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
        const cell_obj = new TableCell(
          this.table_element,
          new_cell,
          this.data_base.getDataReference(row_idx, column_name)
        );

        //
        new_cell.cell_obj = cell_obj;

        new_cell.setAttribute("data-grid-y", row_idx + SPACER_ROWS);
        new_cell.setAttribute("data-logical-y", row_idx);
        new_cell.setAttribute("data-grid-x", col_idx + SPACER_COLS);
        new_cell.setAttribute("data-logical-x", col_idx);
        new_cell.setAttribute("data-cell-type", "data");
        //new_cell.textContent = data_row[column_name];
        const view = new TextView(data_row[column_name], new_cell);
        //new_cell.innerHTML = null;
        //new_cell.appendChild(view.getFragment());
        this.bindCellContent(new_cell, view);
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

  checkColumnResizeMode(e: MouseEvent, table_cell: HTMLTableCellElement) {
    if (table_cell == null) return null;
    if (getCellType(table_cell) == CellType.HEADER) {
      const { left, right } = table_cell.getBoundingClientRect();
      if (e.clientX >= left && e.clientX < left + 5) {
        return "trailing";
      } else if (e.clientX <= right && e.clientX > right - 5) {
        return "current";
      } else {
        return null;
      }
    }
    return null;
  }

  checkRowResizeMode(e: MouseEvent, table_cell: HTMLTableCellElement) {
    if (table_cell == null) return null;
    if (getCellType(table_cell) == CellType.INDEX) {
      const { top, bottom } = table_cell.getBoundingClientRect();
      if (e.clientY >= top && e.clientY < top + 5) {
        return "trailing";
      } else if (e.clientY <= bottom && e.clientY > bottom - 5) {
        return "current";
      } else {
        return null;
      }
    }
    return null;
  }
  onTableCellMouseMove(e: MouseEvent) {
    const table_cell = findParentTableCell(e.target);
    if (table_cell == null) return;
    if (table_cell.hasAttribute("data-header-cell")) {
      const _resize_mode = this.checkColumnResizeMode(e, table_cell as HTMLTableCellElement);
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
      const _resize_mode = this.checkRowResizeMode(e, table_cell as HTMLTableCellElement);
      console.log(_resize_mode);
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
        const _resize_mode = this.checkColumnResizeMode(e, table_cell as HTMLTableCellElement);
        if (_resize_mode != null) {
          let grid_x;
          if (_resize_mode == "current") {
            grid_x = getGridX(table_cell);
          } else if (_resize_mode == "trailing") {
            grid_x = getGridX(table_cell) - 1;
          }
          const cells = getGridCol(this.table_element, grid_x);
          const cell_text_widths = cells.map((cell) => {
            return checkTextWidth(
              cell.innerText,
              window.getComputedStyle(cell, null).getPropertyValue("font")
            );
          });
          const max_width = Math.max(...cell_text_widths);
          //const max_width = Math.max(...cells.map((c) => c.scrollWidth));
          const col: HTMLTableColElement = this.table_element.querySelector(
            `col[data-grid-x="${grid_x}"]`
          );
          col.style.width = `${max_width + 8}px`;
        }
      }
      if (table_cell.hasAttribute("data-index-cell")) {
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

declare global {
  interface HTMLTableCellElement {
    cell_obj: TableCell;
  }
}

export { Grid };
