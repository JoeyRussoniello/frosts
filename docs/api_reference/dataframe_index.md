---
title: The fr.DataFrame
nav_order: 4
has_children: true
---

---

<!-- Frosts Collapsible TOC Block -->
## Table of Contents

<details open markdown="block">
  <summary>
    Click to Expand/Collapse
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

---

## Overview

The `fr.DataFrame` is the core object of Frosts. `DataFrame`s hold tabular data structure designed for ExcelScript workflows, modeled after Python’s pandas library but optimized for scripting in Office environments. It supports typed column inference, filtering, aggregation, reshaping, and seamless integration with Excel worksheets.

- Rows are stored as [JavaScript-style objects](#row)
- Column types are auto-inferred as `"string"`, `"number"`, or `"boolean"`
- Utilities like `.print()`, `.query()`, `.groupBy()`, `.sortBy()`, and many more are built-in

---

## Creating a DataFrame from 2D Arrays

```ts
const data = [
  ["Name", "Age", "IsActive"],
  ["John", 25, true],
  ["Jane", 30, false],
  ["Alice", 22, true]
];

const df = new fr.DataFrame(data);
```

- The first row is used as headers.
- Each subsequent row becomes a typed `Row` object.
- Duplicated headers are automatically renamed.

> For easier ways to create DataFrames from existing content, see [Reading and Processing Data](other_functions.md)

---

## Type Inference

Frosts automatically parses column types using a hybrid strategy:

- For DataFrames with ≤ 100 rows, every row is checked.
- For larger frames, the first and last 50 rows are sampled.
- Supported types: `number`, `string`, `boolean`

This balances performance with accuracy: early and late values often capture edge cases like headers, totals, or blank filler rows.

You can adjust the detection sample size globally using:

```ts
fr.CHANGE_DETECTION_SAMPLE_SIZE(200); // Increase sampling window
```

{: .warning }
Be aware that larger values may slightly impact performance on huge sheets.

---

## Key Structures

### `CellValue`

A convenience alias used throughout Frosts to represent valid DataFrame cell values:

```ts
type CellValue = string | number | boolean;
```

This type ensures compatibility with ExcelScript data and simplifies custom function signatures, so you don’t need to repeatedly write out union types like string | number | boolean. Use `fr.CellValue` your own functions, and utilities for clean, readable code [See Example Here]().

### `Row`

A `Row` is simply a record with string keys and typed cell values,

```ts
interface Row {
  [key: string]: CellValue;
}
```

### `FrostRow`

Enhanced row object used by `.query()`, `.apply()`, and `.encode_headers()`:

It provides clear guarantees about types and eliminates repetitive casting logic in user-defined functions.

```ts
interface FrostRow {
  get(key: string): CellValue;
  get_number(key: string): number;
  get_string(key: string): string;
  get_boolean(key: string): boolean;
  keys(): string[];
  raw: Row;
}
```

#### Why Use `FrostRow`?
{: .no_toc }

- Throws helpful errors when a value is missing or of the wrong type
- Prevents silent bugs by forcing explicit intent (get_number vs get_string)
- Reduces manual type Annotations like `row["Column"].toString()` with type-safe methods

---

## DataFrame Properties

- `df.columns`: `string[]` — ordered list of column names
- `df.values`: `Row[]` — underlying rows
- `df.types`: `{ [key: string]: string }` — column type map
- `df.shape()`: `[rows, columns]` — returns tuple

---

## Why Types Matter

The `DataFrame` tracks column types not just for metadata, but for enforcing correctness across key operations:

- **Summing or averaging** columns via `.sum()`, `.mean()` requires `number` type
- **Descriptive stats** via `.describe()` only apply to numeric columns
- **Grouping** with `.groupBy()` automatically applies type-safe aggregation

If you try to run numeric operations on string columns, the DataFrame will throw clear, helpful errors to guide you.

---

## Example: Inspecting the DataFrame

```ts
console.log(df.columns); 
// ["Name", "Age", "IsActive"]

console.log(df.values[0]); 
// { Name: "John", Age: 25, IsActive: true }

console.log(df.values[0]["IsActive"]); 
// true

df.values[0]["IsActive"] = false; // Mutates in place

console.log(df.types);
// { Name: "string", Age: "number", IsActive: "boolean" }
```

---

## Reserved Separator Warning

{: .warning }
Frosts uses an internal **separator string** for grouping, reshaping, and joins. If a column name includes this separator, it will cause downstream errors.

- Default value: `~~~`
- Set a new value with:

```ts
fr.set_separator("::");
```

- Check the current separator using:

```ts
fr.get_separator();
```

This is a low-level safeguard, but critical to ensuring stability when pivoting, melting, or grouping by multiple columns.

---

## Error Handling

Duplicate headers are renamed with suffixes:

```ts
const data = [
  ["Name", "Name", "IsActive"],
  ["John", 25, true]
];

const df = new fr.DataFrame(data);
// Headers become ["Name", "Name_1", "IsActive"]
```

Use `.rename()` to manually fix column names post-loading.

---

### Writing Custom Functions with Frost Data Types

Below are advanced, real-world patterns that demonstrate how `fr.DataFrame`, `fr.FrostRow`, and `fr.CellValue` work together to streamline column creation, condition filtering, and numeric mapping.

#### Example 1: Generating a Numeric Column with `.apply()`

```ts
function calcOverages(df: fr.DataFrame, limit: number): fr.DataFrame {
    let overage_col = df.apply(row => row.get_number("Usage (GB)") - limit);
    return df.set_column("Overage (GB)", overage_col);
}
```

This takes a usage column and computes overages above a specified limit, returning a new DataFrame with an "Overage (GB)" column.

#### Example 2: Returning a CellValue[] Per Row

You can also return arrays of values, useful for deconstructing rows or generating wide output.

```ts
function extractUserInfo(row: fr.FrostRow): fr.CellValue[] {
    return [
        row.get_string("Name").toUpperCase(),
        row.get_number("Age") >= 18 ? "Adult" : "Minor"
    ];
}

function main(workbook: ExcelScript.Workbook) {
    const sheet = workbook.getWorksheet("Users");
    let df = fr.read_sheet(sheet);

    // Generate new columns from array return
    const parsed = df.apply(extractUserInfo);
    df = df
        .set_column("Name (Upper)", parsed.map(v => v[0]))
        .set_column("Status", parsed.map(v => v[1]));

    df.print();
}
```

This demonstrates how to extract multiple values from a row in a single pass and add them to a DataFrame.

See more complete examples and real world applications in the [examples section](https://github.com/JoeyRussoniello/frosts/tree/main/examples)

---

## Learn More

Explore the full API:

- [Basic Operations](df_methods/basic_operations.md)
- [Filtering](df_methods/filtering.md)
- [Aggregations](df_methods/aggregation.md)
- [Merging](df_methods/merging.md)
- [Export/Import](df_methods/outputs.md)
