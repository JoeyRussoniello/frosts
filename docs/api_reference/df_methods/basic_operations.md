# 🔄 Essential Operations

## Table of Contents

1. ⚙️ [`DataFrame` Utilities](#️-dataframe-utilities)
    1. [`.copy()`](#copy)
    2. [`.shape()`](#shape-number-number)
    3. [`.sortBy()`](#sortbycolumns-string-ascending-boolean---dataframe)
2. [🗂️ Column Management](#️-column-management)
    1. [`.add_column()`](#add_columncolumnname-string-values-stringnumberbooleandataframe)
    2. [`.drop()`](#dropkeysstringdataframe)
    3. [`.add_formula_column()`](#add_formula_columncolumnnamestring-formulastringdataframe)
    4. [`.get_columns()`](#get_columnskeysstringdataframe)
    5. [`.rename()`](#renamemapping--oldkey-string-string--dataframe)
3. [➕ Basic Row-Wise Operations](#-basic-row-wise-operations)
    1. [`.operateColumns()`](#operatecolumnsoperator---------col1-string-col2-string-number)
    2. [`.iterrows()`](#iterrows)

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
