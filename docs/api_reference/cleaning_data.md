# Cleaning Data

Many real-world Excel files contain messy, incomplete, or inconsistent values. To simplify cleaning tasks, `frosts` provides a **predicates** submodule for common checks like blank cells or matching values, as well as built in **DataFrame methods** for common cleaning patterns.

## Table Of Contents

1. [`Filtering with Predicates`](#the-predicates-submodule-boolean-predicates-and-filtering)
2. [`encode_headers()`](#encode_headers)
3. [`fill_na()`](#fill_nacolumnname-stringstringall-method-prev--next--value-value-string--number--booleandataframe)
4. [`melt() and melt_except()`](#meltnewcolumnname-string-newvaluenamestring-columnsstring-dataframe)

## The `predicates` submodule, Boolean Predicates, and filtering

To reduce repetitive code and overwhelming custom predicates for new programmers, frosts comes equipped with several out-of-box Boolean returning predicates that can easily be used with `df.filter()` for data cleaning. All predicates can be called with

```ts
fr.predicates.predicate_name        //For predicates without inputs like is_blank, and is_nan
fr.predicates.predicate_name(value) //For predicates with inputs like equals, and includes
```

All frosts given predicates can also be negated with `fr.not()`. For example, to filter out blanks in a column you could use

```ts
df.filter("Header",fr.not(fr.predicates.is_blank))
```

If these negation calls become too lengthy, consider *aliasing* fr.predicates() and fr.not() as follows

```ts
//Aliasing Commands
const pr = fr.predicates;
const not = fr.not;

//Simplified filter calls
df.filter("Header",not(pr.is_blank))
df.filter("Header",not(pr.includes("East Coast:")))
```

### `is_blank`

Returns `true` if the value is a blank string (`""`).

```ts
df.filter("Status", fr.predicates.is_blank)
```

> **Note:** this is a equality-like `==` check, not strict equality `===` so is_blank will also match 0s and nulls, but **NOT** with `NaNs` in numeric columns.

### `is_nan`

Returns `true` if the row value is `NaN`. Used instead of `is_blank` for numeric columns

```ts
df.filter("Sales", fr.predicates.is_nan)
```

---

### `equal(value: CellValue)`

Checks if row values equal the given `value`.

```ts
df.filter("Status", fr.predicates.equal("Active")) //Filters to only have rows with an "Active" Status.
```

---

### `includes(value: string)`

Check if row values include the `value` text

```ts
let east_coast = df.filter("Region - Property", fr.predicates.includes("East"))
```

Sicne the `.includes()` method only works on strings, the numeric/boolean values will be *coerced* to strings for this check.

---

### `starts_with(value: string)`

Checks if row values start with the `value` text

```ts
df.filter("Region", fr.predicates.starts_with("East"))
```

---

### `ends_with(value: string)`

Similarly, to `begins_with`, checks if row values end with the `value` text

> For custom predicates and advanced data filtering for data cleaning, read more in the [Filtering](df_methods/filtering.md) section

---

## `encode_headers()`

```ts
encode_headers(
  columnName: string,
  isHeaderRow: (row: Row) => boolean,
  extractValue: (row: Row) => CellValue
): DataFrame
```

Excel exports from property management systems, financial tools, or legacy systems often include "section headers" embedded in the rows — such as property names or account groupings — instead of having that value in a clean, dedicated column.

The `encode_headers()` method lets you **identify these headers**, **extract their values**, and **fill them down** into a new column, making your dataset tabular and analysis-ready.

---

## Parameters

| Parameter      | Type                          | Description |
|----------------|-------------------------------|-------------|
| `columnName`   | `string`                      | The name of the new column that will store the header values. |
| `isHeaderRow`  | `(row: Row) => boolean`       | A function that returns `true` if a given row is a header row. |
| `extractValue` | `(row: Row) => CellValue`     | A function that extracts the header value from a header row. |
| `keepHeaders`  | `boolean=false`               | Whether to keep the rows flagged as headers in the output (default `false`) |

---

## Returns

A new `DataFrame` with the extracted header values encoded in the specified column.

---

## Example

Suppose you have an Excel export of this form:

| A                                         | Sales       | Variance to Budget       |
|------------------------------------------|---------|---------|
| **Sales Region: West (W001)**            |         |         |
| Los Angeles                              | 5500.00 | 5.2%    |
| San Diego                                | 4200.00 | 4.8%    |
| **Sales Region: Central (C002)**         |         |         |
| Dallas                                   | 6100.00 | 5.5%    |
| Houston                                  | 5900.00 | 5.3%    |
| **Sales Region: East (E003)**            |         |         |
| New York                                 | 8000.00 | 6.1%    |
| Boston                                   | 7200.00 | 6.0%    |

You can propagate the property ID using:

```ts
df.encode_headers(
  "PropertyID",
  row => row["A"].toString().includes("Sales Region: "),
  row => row["A"]?.split("(")[1]?.split(")")[0] //Get the text in between the parentheses
)
```

With `keepHeaders = false` this would return:

| A                                         | Sales       | Variance to Budget     | RegionCode |
|------------------------------------------|---------|---------|------------|
| Los Angeles                              | 5500.00 | 5.2%    | W001       |
| San Diego                                | 4200.00 | 4.8%    | W001       |
| Dallas                                   | 6100.00 | 5.5%    | C002       |
| Houston                                  | 5900.00 | 5.3%    | C002       |
| New York                                 | 8000.00 | 6.1%    | E003       |
| Boston                                   | 7200.00 | 6.0%    | E003       |

And with `keepHeaders = true` this would return

| A                                         | B       | C       | RegionCode |
|------------------------------------------|---------|---------|------------|
| **Sales Region: West (W001)**            |         |         | W001       |
| Los Angeles                              | 5500.00 | 5.2%    | W001       |
| San Diego                                | 4200.00 | 4.8%    | W001       |
| **Sales Region: Central (C002)**         |         |         | C002       |
| Dallas                                   | 6100.00 | 5.5%    | C002       |
| Houston                                  | 5900.00 | 5.3%    | C002       |
| **Sales Region: East (E003)**            |         |         | E003       |
| New York                                 | 8000.00 | 6.1%    | E003       |
| Boston                                   | 7200.00 | 6.0%    | E003       |

---

## Tips

- Rows before the first header will receive an **empty string** in the new column.
- Can be chained with `.drop()` if you would to drop the original column

---

### `.fill_na(columnName: string|string[]|"ALL", method: "prev" | "next" | "value", value?: string | number | boolean):DataFrame`

Missing values (`null` or `""`) are common in real-world Excel datasets, especially those exported from forms, sensors, or user input. These gaps can break analysis, distort averages, or even cause charts to fail.

The `.fill_na()` method provides flexible ways to handle missing values without needing formulas or manual patching:

- 🔁 **Forward-fill (`"prev"`)** — Repeats the last known value down the column. Useful for time series, log files, or cumulative data.
- 🔄 **Backward-fill (`"next"`)** — Propagates the next known value up. Helpful when later values are known but earlier ones are missing.
- 🔢 **Constant fill (`"value"`)** — Replaces all missing entries with a custom value like `0`, `"N/A"`, or `false`.

This is essential for:

- Cleaning Messy Reports with non-standard headers
- Making statistical operations like `.mean()` or `.sum()` reliable
- Replacing blanks that occur after `encode_headers()` or merges

Use it when your dataset has blanks that you want to automatically and consistently handle.

---

## Parameters

| Parameter       | Type                          | Description |
|-----------------|-------------------------------|-------------|
| `columnName`    | `string \| string[] \| "ALL"` | The name of the column (or columns) to fill. Use `"ALL"` to apply to every column. |
| `method`        | `"prev" \| "next" \| "value"` | The strategy to use when filling missing values:<br>- `"prev"`: Fill with the previous non-null value<br>- `"next"`: Fill with the next non-null value<br>- `"value"`: Fill with a user-provided constant |
| `value`         | `string \| number \| boolean` | Required only if `method` is `"value"`.<br>The constant value to use when replacing missing cells. Ignored for `"prev"` and `"next"` strategies. |

---

```ts
const df = new frosts.DataFrame([
  ["Day", "Temperature"],
  ["Mon", 72],
  ["Tue", null],
  ["Wed", 75],
  ["Thu", null],
  ["Fri", 78]
]);

// Fill nulls using previous non-null value
const forwardFill = df.fill_na("Temperature", "prev");
console.log(forwardFill.get_column("Temperature"));
// Output: [72, 72, 75, 75, 78]

// Fill nulls using next non-null value
const backwardFill = df.fill_na("Temperature", "next");
console.log(backwardFill.get_column("Temperature"));
// Output: [72, 75, 75, 78, 78]

// Fill nulls using a constant value
const filledWithZero = df.fill_na("Temperature", "value", 0);
console.log(filledWithZero.get_column("Temperature"));
// Output: [72, 0, 75, 0, 78]
```

---

### `melt(newColumnName: string, newValueName:string, ...columns:string[]): DataFrame`

Many Excel datasets are structured in a **wide format**, where categories are stored as separate columns. This makes them difficult to analyze, chart, or summarize using group-by operations.

The `.melt()` method solves this by transforming your data into a **long format** (also called "tidy data"), where each row represents a single observation. This is essential for:

- 📊 **Pivot tables and charts** — Long format is easier to slice, aggregate, and visualize.
- 🧮 **Statistical summaries** — Grouping by a single column like `"Subject"` or `"Attribute"` becomes possible.
- 🔄 **Consistency** — Makes your data uniform and easier to work with in pipelines.

You can think of `melt()` as the opposite of a pivot: it "unspreads" your data and turns columns into rows.

## Parameters

| Parameter        | Type         | Description |
|------------------|--------------|-------------|
| `newColumnName`  | `string`     | The name of the new column that will contain the original column names (e.g. `"Subject"`). |
| `newValueName`   | `string`     | The name of the new column that will contain the values from the melted columns (e.g. `"Score"`). |
| `...columns`     | `string[]`   | One or more column names to be unpivoted into long format. These are the columns that will be "melted" into rows. |

---

>**Note**:  
>
> - All columns *not* listed in `...columns` will be treated as identifier columns and preserved in the output.
> - If the melted columns contain mixed types (e.g., numbers and booleans), their values will be automatically converted to strings for consistency.


```ts
const df = new frosts.DataFrame([
  ["Name", "Math", "English", "Science"],
  ["Alice", 90, 85, 95],
  ["Bob", 78, 82, 88]
]);

// Convert subject scores into rows
const melted = df.melt_columns("Subject", "Score", "Math", "English", "Science");
console.log(melted.to_array());
/*
Output:
[
  ["Name", "Subject", "Score"],
  ["Alice", "Math", 90],
  ["Alice", "English", 85],
  ["Alice", "Science", 95],
  ["Bob", "Math", 78],
  ["Bob", "English", 82],
  ["Bob", "Science", 88]
]
*/
```

If the selected columns have mixed types, all values are converted into strings

```ts
const df = new frosts.DataFrame([
  ["Name", "Age", "Score", "Enrolled"],
  ["Alice", 25, 90, true],
  ["Bob", 30, 78, false]
]);

// Melt the Age, Score, and Enrolled columns into rows
const melted = df.melt_columns("Attribute", "Value", "Age", "Score", "Enrolled");
console.log(melted.to_array());
/*
Output:
[
  ["Name", "Attribute", "Value"],
  ["Alice", "Age", "25"],
  ["Alice", "Score", "90"],
  ["Alice", "Enrolled", "true"],
  ["Bob", "Age", "30"],
  ["Bob", "Score", "78"],
  ["Bob", "Enrolled", "false"]
]
*/
```

---

### `melt_except(newColumnName: string, newValueName: string, ...except: string[]): DataFrame`

Like `melt()`, this method reshapes your data from wide to long format — but instead of specifying which columns to melt, you specify which ones to **exclude**. This is especially useful when most of your dataset should be unpivoted, and you want to preserve just a few key identifiers like `"Name"` or `"Date"`.

Use `melt_except()` when:

- You're working with datasets where the majority of columns represent measured variables.
- It's easier to list a few columns to keep than many to melt.

The excluded columns will remain untouched, and all others will be stacked into long format using the provided `newColumnName` and `newValueName`.

```ts
const df = new frosts.DataFrame([
  ["Name", "Math", "English", "Science"],
  ["Alice", 90, 85, 95],
  ["Bob", 78, 82, 88]
]);

// Melt all columns except "Name"
const melted = df.melt_except("Subject", "Score", "Name");
console.log(melted.to_array());
/*
Output:
[
  ["Name", "Subject", "Score"],
  ["Alice", "Math", 90],
  ["Alice", "English", 85],
  ["Alice", "Science", 95],
  ["Bob", "Math", 78],
  ["Bob", "English", 82],
  ["Bob", "Science", 88]
]
*/
```

---

## See Also

- [The fr.DataFrame](dataframe_index.md)
- [Reading Data](other_functions.md`)
- [Return to API Reference](/frosts)
