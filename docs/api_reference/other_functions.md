# Reading and Cleaning Data

Frosts provides a simple and flexible API for importing data from a variety of sources — Excel sheets, ranges, JSON, or raw CSV text. These functions return a `DataFrame` you can immediately work with.

📚 Table of Contents

- [`🔢 read_range()`](#frread_rangerange-excelscriptrange-dataframe)
- [`📄 read_sheet()`](#frread_sheetsheet-excelscriptworksheet-dataframe)
- [`⏭️ read_after()`](#frread_aftersheet-excelscriptworksheet-n_rows-number-n_cols-number-dataframe)
- [`🧾 read_json()`](#frread_jsonjsonstringdataframe)
- [`📑 read_csv()`](#read_csvinput_text-string-errors-raise--coerce--raisestart_index-number0-line_separatorstring--n-dataframe)
- [`🔁 to_numeric()`](#frto_numericvaluesstringnumberbooleannumber)

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

## fr.read_after(Sheet: ExcelScript.Worksheet, n_rows: number, n_cols: number): DataFrame

Reads the used range after skipping a number of rows and columns, returning the remaining area as a DataFrame.

- Starts from the current sheet's used range.
- Applies an offset of `n_rows` down and `n_cols` to the right.
- Reads the used portion from that new position onward.

✅ Use When:

- You want to skip headers, metadata, or intro blocks at the top/left of a worksheet.
- The data table starts after a known number of rows and columns.

```ts
const sheet = workbook.getActiveWorksheet();
const df = fr.read_after(sheet, 3, 1); // skips 3 rows and 1 column
```

> Note: This is equivalent to:

```ts
const offset = sheet.getUsedRange().getOffsetRange(3, 1).getUsedRange();
const df = fr.read_range(offset);
```

## fr.read_json(json:string):DataFrame

Reads a JSON string and parses it into a DataFrame.

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

## fr.to_numeric(values:(string|number|boolean)[]):number[]

Converts an array of strings (or mixed values) to numbers.
Non-convertible values become `NaN`.

```ts
const raw = ["100", "200.5", "invalid", "", null];
const converted = fr.to_numeric(raw);
console.log(converted);
// Output: [100, 200.5, NaN, NaN, NaN]
```

---

Frost's flexible and intuitive design makes reading and writing data a breeze — whether you're pulling from Excel sheets, parsing raw CSV, or working with JSON APIs. With just a few lines of code, you can go from messy inputs to clean, structured DataFrames ready for transformation, analysis, and export.

- Importing is simple, no matter the source.
- Exporting gives you full control over format, structure, and target.
- Everything integrates seamlessly with ExcelScript, Power Automate, and the broader JavaScript ecosystem.

Now that you’ve mastered data input, you're ready to start processing data in the [DataFrame object](dataframe_index.md)!

[Return to API Reference](/frosts)
