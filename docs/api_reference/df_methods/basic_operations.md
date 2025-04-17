# 🔄 Essential Operations

## Table of Contents

1. ⚙️ [`DataFrame` Utilities](#️-dataframe-utilities)
    1. [`.copy()`](#copy)
    2. [`.shape()`](#shape-number-number)
    3. [`.sortBy()`](#sortbycolumns-string-ascending-boolean---dataframe)
    4. [`.drop_rows()`](#drop_rowsrows-number-dataframe)
    5. [`.head()`](#headn_rows-number--10-dataframe)
    6. [`.tail()`](#tailn_rows-number--10-dataframe)
    7. [`.print()`](#printn_rows-number--5-void)
2. [🗂️ Column Management](#️-column-management)
    1. [`.add_column()`](#add_columncolumnname-string-values-stringnumberbooleandataframe)
    2. [`.drop()`](#dropkeysstringdataframe)
    3. [`.add_formula_column()`](#add_formula_columncolumnnamestring-formulastringdataframe)
    4. [`.get_columns()`](#get_columnskeysstringdataframe)
    5. [`.get_column()`](#get_columnkeystringstringnumberboolean)
    6. [`.set_column()`](#set_columncolumnnamestring-valuesstringnumberbooleandataframe)
    7. [`.rename()`](#renamemapping--oldkey-string-string--dataframe)
    8. [`.fillna()`](#fill_nacolumnname-string-method-prev--next--value-value-string--number--booleandataframe)
    9. [`.melt()`](#meltnewcolumnname-string-newvaluenamestring-columnsstring-dataframe)
    10. [`.melt_except()`](#melt_exceptnewcolumnnamestring-newvaluenamestring-columnsstring-dataframe)
3. [➕ Basic Row-Wise Operations](#-basic-row-wise-operations)
    1. [`.operateColumns()`](#operatecolumnsoperator---------col1-string-col2-string-number)
    2. [`.iterrows()`](#iterrows)
    3. [`.apply()`]

## ⚙️ DataFrame Utilities

### `.copy()`

Returns a deep copy of the DataFrame, any modifications made on the new `DataFrame` will not affect the original

```ts
const original = new frosts.DataFrame([
  ["Name", "Age"],
  ["Alice", 28],
  ["Bob", 32]
]);

const copied = original.copy();

// Modify the copy
const updated = copied.add_column("Active", [true, false]);

console.log(original.columns);
// Output: ["Name", "Age"]

console.log(updated.columns);
// Output: ["Name", "Age", "Active"]
```

### `.shape(): [number, number]`

Returns the size of the dataframe's *values* as `[num_rows, num_columns]`

```ts
const df = new frosts.DataFrame([
  ["Name", "Age"],
  ["Alice", 28],
  ["Bob", 32],
  ["Charlie", 24]
]);

console.log(df.shape());
// Output: [3, 2]  // 3 rows, 2 columns
```

### `.sortBy(columns: string[], ascending: boolean[] = []): DataFrame`

Returns a new DataFrame sorted by one or more columns.

- `columns`: An array of column names by which to sort.
- `ascending`: An optional array of booleans indicating the sort order for each corresponding column
  - `true` for ascending order.
  - `false` for descending order.
- If the `ascending` array is not provided. Sorts will default to descending order.

```ts
const df = new frosts.DataFrame([
  ["Department", "Salary"],
  ["HR", 50000],
  ["Engineering", 70000],
  ["Engineering", 65000],
  ["HR", 60000]
]);

const sorted = df.sortBy(["Department", "Salary"], [true, false]);

console.log(sorted.values);
/*
[
  { Department: "Engineering", Salary: 70000 },
  { Department: "Engineering", Salary: 65000 },
  { Department: "HR", Salary: 60000 },
  { Department: "HR", Salary: 50000 }
]
*/
```

### `drop_rows(...rows: number[]): DataFrame`

Removes specific rows by index from the DataFrame.

- `...rows[]`: One or more row indices to drop
  - Supports negative indices (e.g., -1 drops the last row)
- Throws `RangeError` if an index exceeds the number of rows

Returns a new DataFrame without the specified rows.

```ts
const df = new frosts.DataFrame([
  ["Name", "Score"],
  ["Alice", 90],
  ["Bob", 78],
  ["Charlie", 85]
]);

// Drop the second row (index 1)
const trimmed = df.drop_rows(1);
console.log(trimmed.to_array());
/*
Output:
[
  ["Name", "Score"],
  ["Alice", 90],
  ["Charlie", 85]
]
*/

// Drop the last row using negative index
const shorter = df.drop_rows(-1);
console.log(shorter.to_array());
/*
Output:
[
  ["Name", "Score"],
  ["Alice", 90],
  ["Bob", 78]
]
*/
```

### `head(n_rows: number = 10): DataFrame`

Returns the first n_rows of the DataFrame.

- `n_rows`: Number of rows to keep from the top (default is 10)
- If `n_rows` is greater than the total number of rows, returns the full DataFrame

```ts
const df = new frosts.DataFrame([
  ["Name", "Score"],
  ["Alice", 90],
  ["Bob", 78],
  ["Charlie", 85]
]);

const top2 = df.head(2);
console.log(top2.to_array());
/*
Output:
[
  ["Name", "Score"],
  ["Alice", 90],
  ["Bob", 78]
]
*/
```

### `tail(n_rows: number = 10): DataFrame`

Returns the last n_rows of the DataFrame.

- `n_rows`: Number of rows to keep from the bottom (default is 10)
- If `n_rows` is greater than the total number of rows, returns the full DataFrame

```ts
const df = new frosts.DataFrame([
  ["Name", "Score"],
  ["Alice", 90],
  ["Bob", 78],
  ["Charlie", 85]
]);

const last2 = df.tail(2);
console.log(last2.to_array());
/*
Output:
[
  ["Name", "Score"],
  ["Bob", 78],
  ["Charlie", 85]
]
*/
```

### `print(n_rows: number = 5): void`

Prints a formatted preview of the `DataFrame` to the console.

- `n_rows`: Number of rows to display from the top and bottom (default is 5)
- If the total number of rows exceeds 2 * n_rows, the middle rows are replaced with "..."
- Output is aligned in a clean table format

```ts
const df = new frosts.DataFrame([
  ["Name", "Score"],
  ["Alice", 90],
  ["Bob", 78],
  ["Charlie", 85],
  ["Dana", 92],
  ["Eli", 88],
  ["Fay", 76],
  ["Gina", 81]
]);

// Print first and last 2 rows
df.print(2);
/*
| Name   | Score |
|--------|-------|
| Alice  | 90    |
| Bob    | 78    |
| ...    | ...   |
| Fay    | 76    |
| Gina   | 81    |
*/
```

## 🗂️ Column Management

### `.add_column(columnName: string, values: (string|number|boolean)[]):DataFrame`

Returns a new DataFrame with the specified column and values appended. The new column must have the same number of values as there are rows in the DataFrame. For example:

```ts
const data = [
  ["Name", "Age"],
  ["Alice", 28],
  ["Bob", 32],
  ["Charlie", 24]
];

const df = new frosts.DataFrame(data);

const updatedDf = df.add_column("IsActive", [true, false, true]);

console.log(updatedDf.columns);
// Output: ["Name", "Age", "IsActive"]

console.log(updatedDf.values);
/*
[
  { Name: "Alice", Age: 28, IsActive: true },
  { Name: "Bob", Age: 32, IsActive: false },
  { Name: "Charlie", Age: 24, IsActive: true }
]
*/
```

However, when given an input array with a less values than rows in the DataFrame, an error will be raised:

```ts
// This will throw an error because the number of values doesn't match the number of rows
df.add_column("InvalidCol", [1, 2]); // Only 2 values for 3 rows
/*
Error: Length Mismatch
Size of InvalidCol: 2
Size of df: 3
}
*/
```

### `.drop(...keys:string[]):DataFrame`

Returns a new `DataFrame` *without* the specified columns.

Throws a `RangeError` when given a key not in `df.columns`
This method can either be passed a single string input:

```ts
const data = [
  ["Name", "Age", "City"],
  ["Alice", 28, "NYC"],
  ["Bob", 32, "LA"],
  ["Charlie", 24, "Chicago"]
];

const df = new frosts.DataFrame(data);

const dfWithoutAge = df.drop("Age");

console.log(dfWithoutAge.columns);
// Output: ["Name", "City"]

console.log(dfWithoutAge.values);
/*
[
  { Name: "Alice", City: "NYC" },
  { Name: "Bob", City: "LA" },
  { Name: "Charlie", City: "Chicago" }
]
*/
```

Or it can be given several string inputs

```ts
const dfMinimal = df.drop("Age", "City");

console.log(dfMinimal.columns);
// Output: ["Name"]

console.log(dfMinimal.values);
/*
[
  { Name: "Alice" },
  { Name: "Bob" },
  { Name: "Charlie" }
]
*/
```

### `.add_formula_column(columnName:string, formula:string):DataFrame`

Returns a new DataFrame with an Excel table formula column

- Add an Excel table-style formula to your df, will be evaluated on writing the dataframe.
  - Formulas can also be evaluated on command using the `frosts.hardcode_formulas()` command. See more in the [Excel Integration Functions](../other_functions.md) section.
- Useful for complicated mathematical/logical operations that are hard to replicate with `operate_columns()`

```ts
const df = new frosts.DataFrame([
  ["name", "height_cm", "weight_kg"],
  ["Alice", 160, 55],
  ["Bob", 175, 85],
  ["Charlie", 180, 77],
  ["Diana", 150, 45]
]);
let df = new DataFrame(data);
//Divide weight by height square, then round to 1 decimal point
let w_bmi = df.add_formula_column("BMI","ROUND([@weight_kg]/([@height_cm] * [@height_cm]),1)")
```

> It is planned to add a .apply() method in a further update that will allow this level of data modification without writing to Excel for those with a deeper understanding of TypeScript mechanics and predicate functions.

If you want to perfrom aggregation functions, sorting, or otherwise calculate the results of these formulas, you can do so with `hardcode_formulas(workbook: ExcelScript.Workbook)`

```ts
let w_bmi = df.add_formula_column("BMI","ROUND([@weight_kg]/([@height_cm] * [@height_cm]),1)")
let w_bmi_values = df.hardcode_values(workbook) //Plug in the workbook from the Office Scripts environment
let sorted_by_bmi = w_bmi_values.sortBy(["BMI"]);
```

### `.get_columns(...keys:string[]):DataFrame`

Returns a new `DataFrame` containing only the specified columns, in the order given.

Throws an error if any of the keys do not exist.

Similarly to `.drop()`, this function be passed a sequence of key values

```ts
const df = new frosts.DataFrame([
  ["Name", "Age", "City"],
  ["Alice", 28, "NYC"],
  ["Bob", 32, "LA"],
  ["Charlie", 24, "Chicago"]
]);

const selected = df.get_columns("Name", "City");

console.log(selected.columns);
// Output: ["Name", "City"]

console.log(selected.values);
/*
[
  { Name: "Alice", City: "NYC" },
  { Name: "Bob", City: "LA" },
  { Name: "Charlie", City: "Chicago" }
]
*/
```

### `.get_column(key:string):(string|number|boolean)[]`

Returns the array corresponding the values in the `key` column.

Throws an error if the key does not exist

```ts
const df = new frosts.DataFrame([
  ["Name", "Age", "City"],
  ["Alice", 28, "NYC"],
  ["Bob", 32, "LA"],
  ["Charlie", 24, "Chicago"]
]);

const selected = df.get_column("Name");

console.log(selected);
// Output: ["Alice","Bob","Charlie"]
```

### `.set_column(columnName:string, values:string|number|boolean[]):DataFrame`

Creates a new DataFrame replacing the column at `columnanme` with the input `values`

> Notes:
> Will throw an Error if values doesn't have the same number of rows as the `DataFrame`
> If columnName exists in the DataFrame, it will overwrite that column, other wise it will add a new column.

```ts
const fr = frosts;
const df = new fr.DataFrame([
  ["Name", "Balance"],
  ["Alice", "$90"],
  ["Bob", "$85"]
]);

// Strip the "$" and convert balances to numbers
const dollars = fr.to_numeric(
  df.get_column("Balance").map(row => row.toString().slice(1))
);

// Replace the "Balance" column with numeric values
const updated = df.set_column("Balance", dollars);
console.log(updated.to_array());
/*
Output:
[
  ["Name", "Balance"],
  ["Alice", 90],
  ["Bob", 85]
]
*/
```

### `.rename(mapping: { [oldKey: string]: string }): DataFrame`

Returns a new `DataFrame` with renamed columns based on the provided mapping.

- All keys in `mapping` must exist in the current column names
- If a duplicate name would result an error is thrown

```ts
const df = new frosts.DataFrame([
  ["FirstName", "YearsOld"],
  ["Alice", 28],
  ["Bob", 32]
]);

const renamed = df.rename({ "FirstName": "Name", "YearsOld": "Age" });

console.log(renamed.columns);
// Output: ["Name", "Age"]

console.log(renamed.values);
/*
[
  { Name: "Alice", Age: 28 },
  { Name: "Bob", Age: 32 }
]
*/
```

### `.fill_na(columnName: string, method: "prev" | "next" | "value", value?: string | number | boolean):DataFrame`

Fills missing (null or "") values in a column using one of three strategies:

- `"prev"`: Fill with the previous non-null value (forward fill)
- `"next"`: Fill with the next non-null value (backward fill)
- `"value"`: Fill with a specified constant

Returns a new `DataFrame` with the null values filled

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

### `melt(newColumnName: string, newValueName:string, ...columns:string[]): DataFrame`

Converts multiple columns into a long format by stacking their values into rows. Each selected column becomes a row with:

- `newColumnName`: The name of a new column that will store the original column names
- `newValueName`: The name of a new column that will store the corresponding values
- `...columns[]`: One or more columns to unpivot (melt) into long format

Returns a new `DataFrame` with the melted structure

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

### `melt_except(newColumnName:string, newValueName:string, ...columns:string[]): DataFrame`

Converts all columns except the specified ones into long format. The excluded columns are kept as identifiers, while all other columns are stacked into rows.

- `newColumnName`: Name for the column storing original column names
- `newValueName`: Name for the column storing corresponding values
- `...except[]`: One or more columns to exclude from melting (used as identifier columns)

Returns a new `DataFrame` in melted (long) format.

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

## ➕ Basic Row-Wise Operations

### `.operateColumns(operator: "* | + | - | /", col1: string, col2: string): number[]`

Applies a basic arithmetic operation element-wise between two numeric columns.

Returns an array of numbers (one per row).

- Both columns must contain only numeric values.
- The columns must be the same length.
- Division by zero will yield `null` values

```ts
const df = new frosts.DataFrame([
  ["Price", "Quantity"],
  [10, 2],
  [5, 4],
  [8, 1]
]);

//Multiply Price * Quantity for each roow
const totals = df.operateColumns("*", "Price", "Quantity");

console.log(totals);
// Output: [20, 20, 8]
```

This method can be chained with the `.add_column()` method to create a new `DataFrame` with the results of the calculation

```ts
const dfWithTotal = df.add_column("Total", totals);

console.log(dfWithTotal.columns);
// Output: ["Price", "Quantity", "Total"]

console.log(dfWithTotal.values);
/*
[
  { Price: 10, Quantity: 2, Total: 20 },
  { Price: 5, Quantity: 4, Total: 20 },
  { Price: 8, Quantity: 1, Total: 8 }
]
*/
```

### `.iterrows()`

Returns an array of tuples, where each tuple contains the row index and the corresponding Row object.

Mimics the behavior of `.map()`, but returns a plain array instead of a generator (for compatibility with Office Script's compiler).

- Used to perform iteration manually for row-wise operations, or index-based calculations.

```ts
const df = new frosts.DataFrame([
  ["Name", "Age"],
  ["Alice", 28],
  ["Bob", 32]
]);

for (const [i, row] of df.iterrows()) {
  console.log(`Row ${i}:  ${row}`);
}
/*
Output:
Row 0: { Name: "Alice", Age: 28 }
Row 1: { Name: "Bob", Age: 32 }
*/
```

Now that you've learned how to manipulate and manage your data with basic operations like adding, renaming, and sorting columns, it's time to explore how to filter your DataFrame to focus on specific rows or subsets of data.

In the next section, you'll discover how to apply conditions and criteria to select only the data you need, enabling more powerful data analysis and transformation.

[Explore Filtering](filtering.md)

[Return to API Reference](/frosts)
