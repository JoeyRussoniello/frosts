# 📤 Exporting and Output Options

Once your data is prepared and processed, you'll often want to save it for later use or share it with other systems. Frosts makes it easy to export your DataFrames to common formats like Excel, CSV, and JSON, and just as simple to load them back in.

## Table of Contents

1. [`to_worksheet()`](#to_worksheetworksheetexcelscriptworksheet-method-oa--o)
2. [`to_json()`](#to_jsonheadersboolean--truestring)
3. [`to_csv()`](#to_csvheadersboolean--true-separatorstring--string)
4. [`to_array()`](#to_arrayheaders-boolean--true-string--number--boolean)

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

### PROVIDE AN OUTPUT HERE

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

Example Output **change to table**

| Name  | Score |
|-------|-------|
| Alice |  95   |
| Bob   |  87   |

This method can also be used to convert to TSV or any other separator

```ts
df.to_csv(true,"\t");
```

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

[Return to API Reference](/docs/index.md)