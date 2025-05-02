# 📘Reading and Cleaning Data

This section documents the `fr` namespace — a collection of **import helpers** and **utility functions** designed to make data ingestion and lightweight transformation easy in `frosts`.

The functions in this section allow frosts to read from Excel, CSV, and JSON documents, as well as perform optimized mathematical operations with minimal code.

---

📚 Table of Contents

- [`🔢 read_range()`](#frread_rangerange-excelscriptrange-dataframe)
- [`📄 read_sheet()`](#frread_sheetsheet-excelscriptworksheet-dataframe)
- [`⏭️ read_after()`](#frread_aftersheet-excelscriptworksheet-n_rows-number-n_cols-number-dataframe)
- [`🧾 read_json()`](#frread_jsonjsonstringdataframe)
- [`📑 read_csv()`](#frread_csvinput_text-string-errors-raise--coerce--raisestart_index-number0-line_separatorstring--n-dataframe)
- [🧮 Numeric Utility Functions](#-fr-namespace-numeric-utility-functions)
  - [`sum()`](#frsumvalues-number-number)
  - [`mean()`](#frmeanvalues-number-number)
  - [`min()`](#frminvalues-number-number)
  - [`max()`](#frmaxvalues-number-number)
  - [`range()`](#frrangevalues-number-number)
  - [`product()`](#frproductvalues-number-number)
  - [`count()`](#frcountvalues-number-number)
  - [`to_numeric()`](#frto_numericvaluesstringnumberbooleannumber)

--- 

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

---

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

---

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

---

## fr.read_json(json:string):DataFrame

Reads a JSON string and parses it into a DataFrame.

✅ Use When:

- You're loading data from an API, file, or serialized string.
- You’ve previously used `df.to_json()` to export data.

---

## fr.read_csv(input_text: string, errors: ("raise" | "coerce") = "raise",start_index: number=0, line_separator:string = "\n"): DataFrame

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

---

## 🔢 fr Namespace: Numeric Utility Functions

The `fr` namespace provides standard numeric reducers that can be used with `.map_cols_numeric()` and other operations that expect `(values: number[]) => number`.

### [`fr.sum(values: number[]): number`](#frsumvalues-number-number)

Returns the total sum of the values.

```ts
fr.sum([1, 2, 3]); // 6
```

---

### [`fr.mean(values: number[]): number`](#frmeanvalues-number-number)

Returns the arithmetic average of the values.

```ts
fr.mean([2, 4, 6]); // 4
```

---

### [`fr.min(values: number[]): number`](#frminvalues-number-number)

Returns the smallest number in the array.

```ts
fr.min([8, 3, 5]); // 3
```

---

### [`fr.max(values: number[]): number`](#frmaxvalues-number-number)

Returns the largest number in the array.

```ts
fr.max([8, 3, 5]); // 8
```

---

### [`fr.range(values: number[]): number`](#frrangevalues-number-number)

Returns the range (max - min) of the values.

```ts
fr.range([3, 6, 9]); // 6
```

---

### [`fr.product(values: number[]): number`](#frproductvalues-number-number)

Returns the product of all numbers in the array.

```ts
fr.product([2, 3, 4]); // 24
```

---

### [`fr.count(values: number[]): number`](#frcountvalues-number-number)

Returns the number of elements in the array.

```ts
fr.count([1, 5, 9]); // 3
```

---

### fr.to_numeric(values:(string|number|boolean)[]):number[]

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
