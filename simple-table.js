class SimpleTable {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container "${containerId}" not found`);

    this.data = options.data || [];
    this.columns = options.columns || [];
    this.selectable = options.selectable || false;
    this.responsive = options.responsive ?? true;
    this.containerHeight = options.height || '100%';
	this.options = options;

    this.filteredData = [...this.data];
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.selectedRows = new Set();
    this.lastSelected = null;
    this.currentFilters = {};
    this.filterTimeouts = {};
    this.pageSize = options.pageSize || null;
    this.currentPage = 1;

    this.table = null;
    this.tbody = null;
    this.colgroup = null;

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onResize = this.onResize.bind(this);

    this.init();
  }

  init() {
    this.container.innerHTML = '';
    this.container.className = 'simple-table-container';
    this.container.style.height = this.responsive ? this.containerHeight : '';

    this.createTable();
    this.render();

    if (this.responsive) {
      if (typeof ResizeObserver !== 'undefined') {
        this._resizeObserver = new ResizeObserver(this.onResize);
        this._resizeObserver.observe(this.container);
      } else {
        window.addEventListener('resize', this.onResize);
      }
    }
  }

  createTable() {
    this.table = document.createElement('table');
    this.table.className = 'simple-table';
    
    this.colgroup = document.createElement('colgroup');
    const defaultWidth = 100 / Math.max(1, this.columns.length);
    this.columns.forEach(col => {
      const colEl = document.createElement('col');
      colEl.style.width = col.width || `${defaultWidth}%`;
      this.colgroup.appendChild(colEl);
    });
    this.table.appendChild(this.colgroup);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const filterRow = document.createElement('tr');

    this.columns.forEach((col, index) => {
      headerRow.appendChild(this.createHeaderCell(col, index));
      filterRow.appendChild(this.createFilterCell(col));
    });

    thead.appendChild(headerRow);
    thead.appendChild(filterRow);
    this.table.appendChild(thead);

    this.tbody = document.createElement('tbody');
    this.table.appendChild(this.tbody);

    this.tableWrapper = document.createElement('div');
    this.tableWrapper.className = 'simple-table-wrapper';
    this.tableWrapper.appendChild(this.table);
    this.container.appendChild(this.tableWrapper);

    if (this.pageSize) {
      this.paginationBar = this._createPaginationBar();
      this.container.appendChild(this.paginationBar);
    }
  }

  createHeaderCell(col, index) {
    const th = document.createElement('th');
    th.innerHTML = `<span>${col.title || col.field}</span><span class="sort-indicator">↕</span>`;
    
    th.addEventListener('click', (e) => {
      if (!e.target.classList.contains('resizer')) this.sort(col.field);
    });

    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    resizer.addEventListener('mousedown', (e) => this.startResize(e, index));
    th.appendChild(resizer);

    return th;
  }

  createFilterCell(col) {
    const th = document.createElement('th');
    th.className = 'filter-cell';
    
    const isNumeric = col.type === 'number' || this.data.some(r => typeof r[col.field] === 'number');
    
    const inputContainer = isNumeric ? this.createRangeFilter(col.field) : this.createTextFilter(col.field);
    th.appendChild(inputContainer);
    return th;
  }

  createTextFilter(field) {
    const input = document.createElement('input');
    input.placeholder = 'Filter...';
    input.style.width = '100%';
    input.dataset.field = field;
    input.dataset.type = 'text';

    input.addEventListener('input', (e) => {
      clearTimeout(this.filterTimeouts[field]);
      this.filterTimeouts[field] = setTimeout(() => {
        this.currentFilters[field] = { type: 'text', value: e.target.value.toLowerCase() };
        this.applyFilters();
      }, 300);
    });
    return input;
  }

  createRangeFilter(field) {
    const div = document.createElement('div');
    div.style.display = 'flex';
    const createInp = (p) => {
      const i = document.createElement('input');
      i.type = 'number';
      i.placeholder = p;
      i.style.width = '50%';
      i.dataset.field = field;
      return i;
    };
    const min = createInp('Min'), max = createInp('Max');

    const onRangeInput = () => {
      clearTimeout(this.filterTimeouts[field]);
      this.filterTimeouts[field] = setTimeout(() => {
        this.currentFilters[field] = { type: 'range', min: min.value, max: max.value };
        this.applyFilters();
      }, 300);
    };

    min.addEventListener('input', onRangeInput);
    max.addEventListener('input', onRangeInput);
    div.append(min, max);
    return div;
  }

  applyFilters() {
    this.filteredData = this.data.filter(row => {
      return Object.entries(this.currentFilters).every(([field, filter]) => {
        const val = row[field];
        if (filter.type === 'text' && filter.value) {
          return String(val ?? '').toLowerCase().includes(filter.value);
        }
        if (filter.type === 'range') {
          const n = Number(val);
          const min = filter.min !== '' ? Number(filter.min) : -Infinity;
          const max = filter.max !== '' ? Number(filter.max) : Infinity;
          return n >= min && n <= max;
        }
        return true;
      });
    });

    this.currentPage = 1;
    if (this.sortColumn) this.sort(this.sortColumn, true, true);
    this.render();
  }

  sort(field, skipRender = false, preserveDirection = false) {
    if (!preserveDirection) {
      if (this.sortColumn === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumn = field;
        this.sortDirection = 'asc';
      }
      this.currentPage = 1;
    }

    this.filteredData.sort((a, b) => {
      let va = a[field], vb = b[field];
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      const res = (va < vb) ? -1 : 1;
      return this.sortDirection === 'asc' ? res : -res;
    });

    if (!skipRender) this.render();
    this.updateSortIndicators();
  }

  updateSortIndicators() {
    const indicators = this.table.querySelectorAll('.sort-indicator');
    this.columns.forEach((col, i) => {
      if (this.sortColumn === col.field) {
        indicators[i].textContent = this.sortDirection === 'asc' ? '↑' : '↓';
      } else {
        indicators[i].textContent = '↕';
      }
    });
  }

  render() {
    if (!this.tbody) return;
    this.tbody.innerHTML = '';

    if (this.filteredData.length === 0) {
      this.tbody.innerHTML = `<tr><td colspan="${this.columns.length}" style="text-align:center;padding:20px">No data</td></tr>`;
      if (this.pageSize) this._updatePagination();
      return;
    }

    const pageData = this.pageSize
      ? this.filteredData.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize)
      : this.filteredData;

    const fragment = document.createDocumentFragment();
    pageData.forEach((row) => {
      const tr = document.createElement('tr');
      if (this.selectedRows.has(row)) tr.className = 'selected';
      if (this.selectable) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => this.handleRowClick(e, row, tr));
      }

      this.columns.forEach(col => {
        const td = document.createElement('td');
        td.textContent = row[col.field] ?? '';
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });
    this.tbody.appendChild(fragment);
    if (this.pageSize) this._updatePagination();
  }

  handleRowClick(e, row, tr) {
    if (e.ctrlKey || e.metaKey) {
      this.selectedRows.has(row) ? this.selectedRows.delete(row) : this.selectedRows.add(row);
    } else if (e.shiftKey && this.lastSelected) {
      this.selectedRows.clear();
      this.selectRange(this.lastSelected, row);
    } else {
      this.selectedRows.clear();
      this.selectedRows.add(row);
    }
    this.lastSelected = row;
    
    const rows = Array.from(this.tbody.children);
    this.filteredData.forEach((r, i) => {
      if (rows[i]) rows[i].classList.toggle('selected', this.selectedRows.has(r));
    });
	
	if (typeof this.options.onRowSelect === 'function')
	  this.options.onRowSelect(Array.from(this.selectedRows));
  }

  selectRange(startRow, endRow) {
    const start = this.filteredData.indexOf(startRow);
    const end = this.filteredData.indexOf(endRow);
    if (start === -1 || end === -1) return;
    const [low, high] = [Math.min(start, end), Math.max(start, end)];
    for (let i = low; i <= high; i++) this.selectedRows.add(this.filteredData[i]);
  }

  startResize(e, index) {
    e.preventDefault();
    this.resizingIdx = index;
    this.startX = e.clientX;
    this.startWidth = this.table.querySelectorAll('thead tr:first-child th')[index].offsetWidth;
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove(e) {
    const delta = e.clientX - this.startX;
    const newWidth = Math.max(50, this.startWidth + delta);
    this.colgroup.children[this.resizingIdx].style.width = `${newWidth}px`;
  }

  onMouseUp() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.syncPercentages();
  }

  syncPercentages() {
    const tableWidth = this.table.offsetWidth;
    Array.from(this.colgroup.children).forEach((col, i) => {
      const w = (col.offsetWidth / tableWidth) * 100;
      col.style.width = `${w}%`;
      this.columns[i].width = `${w}%`;
    });
  }

  onResize() {
    if (this.table) this.table.style.width = '100%';
  }

  _createPaginationBar() {
    const bar = document.createElement('div');
    bar.className = 'simple-table-pagination';

    this._pagePrev = document.createElement('button');
    this._pagePrev.className = 'st-page-btn';
    this._pagePrev.innerHTML = '&#8249;';
    this._pagePrev.addEventListener('click', () => this._goToPage(this.currentPage - 1));

    this._pageNext = document.createElement('button');
    this._pageNext.className = 'st-page-btn';
    this._pageNext.innerHTML = '&#8250;';
    this._pageNext.addEventListener('click', () => this._goToPage(this.currentPage + 1));

    this._pageNumbers = document.createElement('span');
    this._pageNumbers.className = 'st-page-numbers';

    this._pageInfo = document.createElement('span');
    this._pageInfo.className = 'st-page-info';

    bar.appendChild(this._pagePrev);
    bar.appendChild(this._pageNumbers);
    bar.appendChild(this._pageNext);
    bar.appendChild(this._pageInfo);
    return bar;
  }

  _updatePagination() {
    const total = this.filteredData.length;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    this._pagePrev.disabled = this.currentPage <= 1;
    this._pageNext.disabled = this.currentPage >= totalPages;

    this._pageNumbers.innerHTML = '';
    this._getPageRange(this.currentPage, totalPages).forEach(p => {
      if (p === '…') {
        const span = document.createElement('span');
        span.className = 'st-page-ellipsis';
        span.textContent = '…';
        this._pageNumbers.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.textContent = p;
        btn.className = 'st-page-btn' + (p === this.currentPage ? ' active' : '');
        btn.addEventListener('click', () => this._goToPage(p));
        this._pageNumbers.appendChild(btn);
      }
    });

    const start = total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, total);
    this._pageInfo.textContent = total === 0 ? 'No results' : `${start}–${end} of ${total}`;
  }

  _getPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
  }

  _goToPage(page) {
    const totalPages = Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
    this.currentPage = Math.max(1, Math.min(page, totalPages));
    this.render();
  }

  destroy() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('resize', this.onResize);
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this.container.innerHTML = '';
  }
}