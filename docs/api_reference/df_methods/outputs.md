---
title: 📤 Exporting and Output Options
nav_order: 5
parent: The fr.DataFrame
---

Once your data is prepared and processed, you'll often want to save it for later use or share it with other systems. Frosts makes it easy to export your DataFrames to common formats like Excel, CSV, and JSON, and just as simple to load them back in.

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

## to_worksheet(worksheet:ExcelScript.Worksheet, method: ("o"|"a") = "o")

Writes the DataFrame directly into an Excel worksheet.

- `worksheet`: The target `ExcelScript.Worksheet` object.
- `method`: `"o"` (overwrite) or `"a"` (append).
  - `"o"` clears and replaces the worksheet contents starting at cell A1.
  - `"a"` appends the data below the last filled row in the sheet.

✅ Use When:
You're working output/save results directly into Excel, incredibly useful for PowerBI tools and automation.

Example:

```ts
df.to_worksheet(workbook.getWorksheet("Results"), "o");
```

This will overwrite the "Results" sheet with the DataFrame.

---

## `to_table(table: ExcelScript.Table, method: ("o" | "a") = "o")`

Writes the DataFrame directly into an Excel **Table** object.

- **`table`**: The target `ExcelScript.Table` object.
- **`method`**: `"o"` (overwrite) or `"a"` (append).
  - `"o"` clears excess rows and columns, then overwrites the table from the top left.
  - `"a"` appends rows to the end of the table, aligning data by column name.

✅ **Use When**  

You're working with **structured tables** in Excel and want to preserve table formatting, filters, and styles. Ideal for automated report generation and PowerBI-connected tables.

🧠 **Column Matching Logic for Appends**

- Extra DataFrame columns (not found in the table) are **dropped**.
- Table columns not present in the DataFrame are **filled with `null`**.

> Note: This logic is not currently applied to overwrites by design, and all DataFrame values are always overwritten in the new table, possibly causing increases/decreases in table size.

```ts
df.to_table(workbook.getTable("SalesTable"), "a");
```

This will append the DataFrame’s rows to the bottom of "SalesTable", matching on column names.

---

## to_json(headers:boolean = true):string

Exports the DataFrame as a JSON string.

- `headers`: (default = `true`) Whether to include headers in the output (when `item = "values"`).

✅ Use When:

- You need a string-based format for APIs, logs, serialization or **passing to PowerAutomate workflow**
- You want to store or transmit your DataFrame structure and content.

```ts
console.log(df.to_json());
//Output: [["Name","Score"],["Alice",95],["Bob",87]]
```

Or without headers

```ts
console.log(df.to_json(false));
//Output: [["Alice",95],["Bob",87]]
```

---

## to_csv(headers:boolean = true, separator:string = ","):string

Converts the DataFrame to a CSV-formatted string.

- `headers`: (default `true`) Whether to include the column headers in the output.
- `separator`: Delimiter between columns (defaults to comma).

✅ Use When:

- You need to save or export data in a simple, universal tabular format.
- You want to copy data to another system (e.g., Google Sheets, Python, SQL, etc.).

Example:

```ts
const csv = df.to_csv(true, ",");
```

Example Output:

| Name  | Score |
|-------|-------|
| Alice |  95   |
| Bob   |  87   |

This method can also be used to convert to TSV or any other separator

```ts
df.to_csv(true,"\t");
```

---

## to_array(headers: boolean = true): (string | number | boolean)[][]

Returns the DataFrame as a 2D array (array of rows), optionally including headers.

- `headers`: Whether to include the data headers in the export (default true)

✅ Use When:

- You want to manipulate the data as a raw JavaScript array.
- You're passing the values to another function or external library.

Example:

```ts
const data = df.to_array();
```

Sample Output

```ts
[
  ["Name", "Score"],
  ["Alice", 95],
  ["Bob", 87]
]
```

You can also choose to omit headers

```ts
const data_no_headers = df.to_array(false);
```

You've now mastered everything `frosts`, and you're ready to start building PowerAutomate pipelines and Javascript workflows!

[Return to API Reference](/frosts)
