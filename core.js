class Grid {
    #focused_cell = null;
    table_element = null;

    constructor(element, header_data, data) {
        this.element = element;
        this.header_data = header_data;
        this.data = data;

        this._createTable();
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
    
        for (const [idx, header_elem] of this.header_data.entries()) {
            let _el = document.createElement("td");
            _el.setAttribute("data-grid-y", 0);
            _el.setAttribute("data-grid-x", idx+SPACER_COLS);
            _el.setAttribute("data-logical-x", idx);
            _el.textContent = header_elem["name"];
            header_row.appendChild(_el);
            column_order.push(header_elem["name"]);
        }
        
        let body = document.createElement("tbody");
        table.appendChild(body);
        for (const [row_idx, data_row] of this.data.entries())
        {
            let new_row = document.createElement("tr");
            new_row.setAttribute("data-grid-y", row_idx+SPACER_ROWS);
            new_row.setAttribute("data-logical-y", row_idx);
            
            let spacer_cell = document.createElement("td");
            spacer_cell.setAttribute("data-grid-y", row_idx+SPACER_ROWS);
            spacer_cell.setAttribute("data-logical-y", row_idx);
            spacer_cell.setAttribute("data-grid-x", 0);
            spacer_cell.textContent = row_idx;
            new_row.appendChild(spacer_cell);
    
            for (const [col_idx, column_name] of column_order.entries())
            {
                let new_cell = document.createElement("td");
                new_cell.setAttribute("data-grid-y", row_idx+SPACER_ROWS);
                new_cell.setAttribute("data-logical-y", row_idx);    
                new_cell.setAttribute("data-grid-x", col_idx+SPACER_COLS);
                new_cell.setAttribute("data-logical-x", col_idx);   
                new_cell.setAttribute("data-cell-type", "data");
                new_cell.textContent = data_row[column_name];
                new_row.appendChild(new_cell); 
            }
            body.appendChild(new_row);
        }
    
        const all_cells = table.querySelectorAll("td");
        for (const cell of all_cells)
        {
            cell.addEventListener("click", (e) => this.tableCellOnClick(e))
            cell.setAttribute("data-logical-state", "neutral");
        }
    }

    set focusedCell(cell_element) {
        this.#focused_cell = cell_element;
        const all_cells = this.table_element.querySelectorAll("td");
        for (const cell of all_cells)
        {
            cell.setAttribute("data-logical-state", "neutral");
        }
        this.#focused_cell.setAttribute("data-logical-state", "focus");
    }

    get focusedCell() {

    }

    tableCellOnClick(e) {
        //const parent_table = e.target.closest("table");
        this.focusedCell = e.target;

    }
}

/*
function createTable(el, header, data) {
    el.classList.add("coresheet_container");
    let inner_el = document.createElement("div");
    inner_el.classList.add("coresheet_content");
    el.appendChild(inner_el);

    let table = document.createElement("table");
    table.classList.add("coresheet");
    table.setAttribute("unselectable", "yes");
    table.setAttribute("cellspacing", 0);
    table.setAttribute("cellpadding", 0);
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

    for (const [idx, header_elem] of header.entries()) {
        let _el = document.createElement("td");
        _el.setAttribute("data-grid-y", 0);
        _el.setAttribute("data-grid-x", idx+SPACER_COLS);
        _el.setAttribute("data-logical-x", idx);
        _el.textContent = header_elem["name"];
        header_row.appendChild(_el);
        column_order.push(header_elem["name"]);
    }
    
    let body = document.createElement("tbody");
    table.appendChild(body);
    for (const [row_idx, data_row] of data.entries())
    {
        let new_row = document.createElement("tr");
        new_row.setAttribute("data-grid-y", row_idx+SPACER_ROWS);
        new_row.setAttribute("data-logical-y", row_idx);
        
        let spacer_cell = document.createElement("td");
        spacer_cell.setAttribute("data-grid-y", row_idx+SPACER_ROWS);
        spacer_cell.setAttribute("data-logical-y", row_idx);
        spacer_cell.setAttribute("data-grid-x", 0);
        spacer_cell.textContent = row_idx;
        new_row.appendChild(spacer_cell);

        for (const [col_idx, column_name] of column_order.entries())
        {
            let new_cell = document.createElement("td");
            new_cell.setAttribute("data-grid-y", row_idx+SPACER_ROWS);
            new_cell.setAttribute("data-logical-y", row_idx);    
            new_cell.setAttribute("data-grid-x", col_idx+SPACER_COLS);
            new_cell.setAttribute("data-logical-x", col_idx);   
            new_cell.setAttribute("data-cell-type", "data");
            new_cell.textContent = data_row[column_name];
            new_row.appendChild(new_cell); 
        }
        body.appendChild(new_row);
    }

    const all_cells = table.querySelectorAll("td");
    for (const cell of all_cells)
    {
        cell.addEventListener("click", tableCellOnClick)
        cell.setAttribute("data-logical-state", "neutral");
    }

}

function tableCellOnClick(e) {
    const parent_table = e.target.closest("table");
    const all_cells = parent_table.querySelectorAll("td");
    for (const cell of all_cells)
    {
        cell.setAttribute("data-logical-state", "neutral");
    }
    e.target.setAttribute("data-logical-state", "focus");
    if (e.target.getAttribute("data-cell-type") === "data") 
    {

    }
}
*/