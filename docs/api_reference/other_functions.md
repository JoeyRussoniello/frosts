# Reading Data

Frosts provides a simple and flexible API for importing data from a variety of sources — Excel sheets, ranges, JSON, or raw CSV text. These functions return a `DataFrame` you can immediately work with.

📚 Table of Contents

- `🔢 read_range()`
- `📄 read_sheet()`
- `🧾 read_json()`
- `📑 read_csv()`

## fr.read_range(range: ExcelScript.Range): DataFrame

Reads a specific Excel range and returns it as a DataFrame.

- Automatically detects headers from the first row.
- Converts numeric, string, and boolean values automatically.

✅ Use When:

- You want to extract a portion of a worksheet (e.g. A1:E10).
- You already have a defined ExcelScript.Range object.

Example:

```ts
const sheet = workbook.getActiveWorksheet();
const df = fr.read_range(workbook.getRange("A1:C6"));
```

## fr.read_sheet(Sheet: ExcelScript.Worksheet): DataFrame

Reads the *entire* used range of a worksheet and returns it as a `DataFrame`.

- Automatically pulls from the used area of the input sheet.
- Expects the first row to contain headers.

✅ Use When:

- You want to grab a whole worksheet without manually selecting a range.
- The sheet is formatted like a table (headers in the first row).

```ts
const sheet = workbook.getActiveWorksheet();
const df = fr.read_sheet(sheet);
```

> Note: This function has the same behavior as running

```ts
const sheet = workbook.getActiveWorksheet();
const df = fr.read_range(sheet.getUsedRange());
```

## fr.read_json(json:string, item: ("values"|"DataFrame") = 'values'):DataFrame

Reads a JSON string and parses it into a DataFrame.

- If `item = "values"` (default): expects a raw 2D array (with headers).
- If `item = "DataFrame"`: expects an object with "columns" and "values".

✅ Use When:

- You're loading data from an API, file, or serialized string.
- You’ve previously used `df.to_json()` to export data.

## read_csv(input_text: string, errors: ("raise" | "coerce") = "raise",start_index: number=0, line_separator:string = "\n"): DataFrame

Reads a raw CSV string and returns a DataFrame.

- `errors = "raise"` (default): throws if rows have inconsistent lengths (default).
- `errors = "coerce"`: pads shorter rows with null.
- `start_index`: which line contains the headers (default = 0).
- `line_separator`: newline character, can be \n or \r\n.

✅ Use When:

- You’re pasting in raw CSV or reading from a text file.
- You need to quickly parse data into a usable table.

Example:

```ts
    const csv = "Name,Score\nAlice,88\nBob,90";
    const df = fr.read_csv(csv);
```

Or skipping the first row:

```ts
    const csv = "Report From 4/1/2024\nName,Score\nAlice,88\nBob,90";
    const df = fr.read_csv(csv,"coerce",1);
```

Frost's flexible and intuitive design makes reading and writing data a breeze — whether you're pulling from Excel sheets, parsing raw CSV, or working with JSON APIs. With just a few lines of code, you can go from messy inputs to clean, structured DataFrames ready for transformation, analysis, and export.

- Importing is simple, no matter the source.
- Exporting gives you full control over format, structure, and target.
- Everything integrates seamlessly with ExcelScript, Power Automate, and the broader JavaScript ecosystem.

Now that you’ve mastered data I/O, you’re ready to build powerful data pipelines, automate reports, and deliver clean insights with confidence.
