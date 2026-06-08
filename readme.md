# SimpleTable

A lightweight, vanilla JavaScript library for creating interactive data tables with sorting, filtering, resizable columns, row selection, and responsive behavior.

## Features

- **Sortable columns** – click column headers to sort ascending/descending.
- **Column filtering** – text filters for strings, range filters (min/max) for numbers.
- **Resizable columns** – drag the right edge of any header cell.
- **Row selection** – single click, Ctrl/Cmd+click for multiple, Shift+click for range selection.
- **Responsive** – adapts to container width (ResizeObserver fallback).
- **Sticky headers** – filter row stays visible when scrolling.
- **Zero dependencies** – pure JavaScript + CSS.
- **Customizable** – control data, column definitions, selection callbacks.

## Installation

Include the CSS and JavaScript files in your HTML:

```html
<link rel="stylesheet" href="simple-table.css">
<script src="simple-table.js"></script>
```

Or copy the class directly into your project.

## Basic Usage

```html
<div id="myTable"></div>

<script>
  const data = [
    { id: 1, name: 'Alice', age: 28 },
    { id: 2, name: 'Bob', age: 34 },
    { id: 3, name: 'Charlie', age: 25 }
  ];

  const columns = [
    { field: 'id', title: 'ID', type: 'number' },
    { field: 'name', title: 'Name' },
    { field: 'age', title: 'Age', type: 'number' }
  ];

  const table = new SimpleTable('myTable', {
    data: data,
    columns: columns,
    selectable: true,
    height: '400px',
    onRowSelect: (selectedRows) => console.log(selectedRows)
  });
</script>
```

## Constructor Options

| Option        | Type       | Default     | Description |
|---------------|------------|-------------|-------------|
| `data`        | `Array`    | `[]`        | Array of row objects. |
| `columns`     | `Array`    | `[]`        | Column definitions – each item can have `field` (key), `title` (display name, defaults to `field`), `width` (CSS width, e.g. `'20%'`), `type` (`'number'` to enable range filter). |
| `selectable`  | `boolean`  | `false`     | Enable row selection (click, Ctrl+click, Shift+click). |
| `responsive`  | `boolean`  | `true`      | Automatically adjust layout when container resizes. |
| `height`      | `string`   | `'100%'`    | CSS height of the table container (e.g., `'300px'`, `'50vh'`). |
| `onRowSelect` | `Function` | `undefined` | Callback fired when selection changes. Receives array of selected row objects. |

## Methods

| Method                   | Description |
|--------------------------|-------------|
| `sort(field, skipRender)`| Sorts the table by the given column `field`. `skipRender` (optional) prevents re-rendering if `true`. |
| `destroy()`              | Removes the table and cleans up event listeners. |
| `applyFilters()`         | (Internal) reapplies filters. Called automatically on filter input. |
| `render()`               | Re-renders the table body. Called automatically after data/filter/sort changes. |

## CSS Customization

The table uses class names that you can override:

- `.simple-table-container` – outer wrapper with border and overflow.
- `.simple-table` – the `<table>` element.
- `.simple-table th`, `.simple-table td` – header and data cells.
- `.resizer` – column resize handle.
- `.sort-indicator` – arrow displayed in the header.
- `.selected` – applied to selected rows.

## Browser Support

Works in all modern browsers (Chrome, Firefox, Edge, Safari) and IE11 with some minor polyfills for `ResizeObserver`.

## License

MIT