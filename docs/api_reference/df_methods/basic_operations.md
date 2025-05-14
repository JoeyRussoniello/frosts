---
title: 🔄 Essential Operations
nav_order: 1
parent: The fr.DataFrame
--- 

These are the core methods you’ll use to inspect, manipulate, and reshape your fr.DataFrame. From selecting rows and columns to adding formulas, sorting, and performing row-wise math — this page covers all the foundational tools you’ll need to start working with structured data in Frosts.

## Table of Contents

---

- Table of Contents
{:toc}

---

## ⚙️ DataFrame Utilities

## `.copy()`

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

---

## `.shape(): [number, number]`

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

---

## `.sortBy(columns: string[], ascending: boolean[] = [], inplace:boolean = False): DataFrame`

Returns a new DataFrame sorted by one or more columns.

- `columns`: An array of column names by which to sort.
- `ascending`: An optional array of booleans indicating the sort order for each corresponding column
  - `true` for ascending order.
  - `false` for descending order.
- If the `ascending` array is not provided. Sorts will default to descending order.
- `inplace (optional)`: If true, modifies the current DataFrame directly. Otherwise, only returns a new one. Default is `false`.

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

---

## `drop_rows(...rows: number[]): DataFrame`

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

---

## `head(n_rows: number = 10): DataFrame`

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

---

## `tail(n_rows: number = 10): DataFrame`

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

---

## `print(n_rows: number = 5): void`

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

---

## `snapshot(label?: string)`

Prints a labeled preview of the `DataFrame` and returns the DataFrame itself.

- `label`: *(optional)* A string label shown above the preview (e.g., `"Before Merge"`)
- Internally calls `.print()` to display the top and bottom rows
- Returns `this`, making it chainable for debugging during method chains

```ts
df
  .drop("SSN")
  .snapshot("After dropping SSN")
  .filter(row => row.get_number("Score") > 80); //Allows method chaining after calling .snapshot() NOT possible with .print()
```

**Output**:

```ts
🔍 Snapshot: After dropping SSN
| Name   | Score |
|--------|-------|
| Alice  | 90    |
| Bob    | 78    |
| ...    | ...   |
| Fay    | 76    |
| Gina   | 81    |
```

---

## `unique(...columns: string[]): DataFrame`

Returns a new DataFrame containing all **unique combinations** of values across the specified columns.

- **`columns`**: One or more column names to evaluate uniqueness on.

🔍 **Behavior**  
Scans the DataFrame and extracts each distinct row formed by the specified columns. The result is a new DataFrame containing only those unique combinations.

✅ **Use When**  
You want to identify all unique combinations of keys — such as `(Customer, Date)`, `(Region, Product)`, etc. — and work with the result as a standard DataFrame for further analysis or joins.

### Example

Given this dataset:

| Customer | Date       | Revenue |
|----------|------------|---------|
| Alice    | 2024-01-01 | 100     |
| Bob      | 2024-01-01 | 150     |
| Alice    | 2024-01-02 | 130     |
| Alice    | 2024-01-01 | 100     |

```ts
let result = df.unique("Customer", "Date");
result.print();
```

Output:

| Customer | Date       |
|----------|------------|
| Alice    | 2024-01-01 |
| Bob      | 2024-01-01 |
| Alice    | 2024-01-02 |

---

## .is_empty():boolean

Returns **true** if the DataFrame has no values, and **false** if there is a single `fr.Row` present in the dataframe.

Especially useful after filtering or before exporting a DataFrame to ensure that it is has values before continuing with data processing/aggregation.

---

## .has_column(columnName:string):boolean

**Checks whether `columnName` exists in the DataFrame. Useful for conditional logic before perfoming operaitons on columns.

```ts
let df = new fr.DataFrame([
  ["Name", "Age"],
  ["Alice", 25],
  ["Bob", 30]
]);

df.has_column("Age");      // true
df.has_column("Address");  // false
```

---

## 🗂️ Column Management

### `.add_column(columnName: string, values: (string|number|boolean)[], inplace:boolean = false):DataFrame`

Returns a new DataFrame with the specified column and values appended. The new column must have the same number of values as there are rows in the DataFrame.

`inplace (optional)`: If true, modifies the current DataFrame directly. Otherwise, only returns a new one. Default is `false`.

For example:

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

---

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

---

### `.add_formula_column(columnName:string, formula:string, inplace:boolean = false):DataFrame`

Returns a new DataFrame with an Excel table formula column

- Add an Excel table-style formula to your df, will be evaluated on writing the dataframe.
  - Formulas can also be evaluated on command using the `frosts.hardcode_formulas()` command. See more in the [Excel Integration Functions](../other_functions.md) section.
- Useful for complicated mathematical/logical operations that are hard to replicate with `operate_columns()`

`inplace (optional)`: If true, modifies the current DataFrame directly. Otherwise, only returns a new one. Default is `false`.

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

If you want to perfrom aggregation functions, sorting, or otherwise calculate the results of these formulas, you can do so with `hardcode_formulas(workbook: ExcelScript.Workbook, inplace:boolean = false)`

```ts
let w_bmi = df.add_formula_column("BMI","ROUND([@weight_kg]/([@height_cm] * [@height_cm]),1)")
let w_bmi_values = df.hardcode_values(workbook) //Plug in the workbook from the Office Scripts environment
let sorted_by_bmi = w_bmi_values.sortBy(["BMI"]);
```

---

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

---

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

---

### `.set_column(columnName:string, values:string|number|boolean[], inplace:boolean = false):DataFrame`

Creates a new DataFrame replacing the column at `columnanme` with the input `values`. 

`inplace (optional)`: If true, modifies the current DataFrame directly. Otherwise, only returns a new one. Default is `false`.

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

---

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

---

## ➕ Row-Wise Operations

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

---

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

---

### `.apply<T>(fn: (row: Row) => T): T[]`

Applies a **custom function** to each row of the DataFrame using typed access.
This method allows you to iterate over all rows and return a list of computed values.

It uses the `FrostRow` interface to provide type-safe access to cell values.

Arguments

- `fn ((row: FrostRow) => T)` — A function that receives each row as a FrostRow object and returns a transformed value of any type T.

The FrostRow API includes:

- `.get(key)` — Return the raw value without type Coercion.
- `.get_number(key)` — Return a number (throws if conversion fails)
- `.get_string(key)` — Return a string
- `.get_boolean(key)` — Return a boolean
- `.keys()` — Return the list of column names
- `.raw` — Access the full underlying row as a plain object

### Example 1: Basic Calculation

```ts
let df = fr.read([
  ["Region", "Sales"],
  ["North", 1000],
  ["South", 1500]
]);

let doubled = df.apply(row => row.get_number("Sales") * 2);
console.log(doubled); // [2000, 3000]
```

### Example 2: Custom String Labeling

```ts
let tags = df.apply(row => {
  const region = row.get_string("Region");
  const sales = row.get_number("Sales");
  return `${region}: $${sales}`;
});
console.log(tags); // ["North: $1000", "South: $1500"]
```

---

### `df.apply_numeric(fn: (row) => number): number[]`

Applies a function to each row after **coercing all values to numbers**, without the need for explicit typecasting.

- Non-numeric values will become `NaN`.
- No error is thrown for non-numeric columns.

```ts
df.apply_numeric(row => row["Revenue"] - row["Cost"]);
```

✅ Use when you want fast numeric row ops without manual casting.

This is functionally equivalent to calling

```ts
df.apply(row => Number(row["Revenue"]) - Number(row["Cost"]));
```

without the tedious manual type casting.

**This method may be slow for large datasets, as all values in the DataFrame are forced to numbers (even those not called by `fn`). For faster calculations on large datasets use [`df.map_cols_numeric()`](#dfmap_cols_numericfn-values--number-columns-number) and an [optimized frost operation](../other_functions.md)**

---

### `df.apply_string(fn: (row) => string):string[]

Similarly to `.apply_numeric`, applies a function to each row after **coercing all values to strings** without the need for typecasting.

```ts
let full_name = df.apply_string(row => row["Last Name"]+", "+row["First Name"]); 
```

### `df.map_cols_numeric(fn: (values) => number, ...columns): number[]`

Efficiently maps a numeric function over selected columns **row-wise**.

- Validates that all selected columns are numeric using `. __check_numeric()`.
- Only coerces the specified columns.
- Returns an array of results, one per row.

```ts
df.map_cols_numeric(fr.mean, "January Income", "February Income", "March Income"); //Calculate average Q1 income per month
```

✅ Use when you're performing a numeric reduction over known columns — faster and safer than `.apply_numeric()` or `.apply()`.

🧠 Function Flexibility

You can pass in, any  function that takes a list of numbers and returns a number, or use one of the built-in utility functions in the `fr` namespace, such as `fr.sum`, `fr.mean`, `fr.max`, etc. *See a full list of provided numerical utility functions [here](../other_functions.md)*

```ts
//Example: Creating your own function 
function weighted_grade(nums:number[]):number{ //Takes a number array and returns a number
  //Unpack values, assuming we'll just use this for this purpose
  let [assignments, assessments, final] = nums; 

  //Return weighted grade
  return assignments * 0.4 + assessments * 0.4 + final * 0.2 
}

let weighted_grades = df.map_cols_numeric(weighted_grade,"Assignments","Assessments","Final")
let with_weighted = df.set_column("Weighted Grade",weighted_grades); //Add this list of values to our DataFrame
```

---

## `replace_column(columnName: string, fn: (value: CellValue, index?: number) => CellValue, inplace: boolean = false): DataFrame`

**Applies a transformation function to a column and replaces its values.**
Each value in the specified column is passed through the provided function. The transformed column is returned as a new DataFrame unless inplace is set to true.

### Arguments

- `columnName:string` - The name of the column to replace
- `fn` - The predicate function to apply to the values in columnNamn (optionally using its index)
- `inplace`: Default false - If true, replaces the DataFrame in place, if false returns a new df.

Why to Use:

Often these `.apply()` and `.set_column` patterns can get tedious. If you would like to peform an operation all at once, consider using .`replace_columns()` instead.

### Example

```ts
let df = new fr.DataFrame([
  ["Item", "Price"],
  ["Apple", 1.5],
  ["Banana", 2.0]
]);

let updated = df.replace_column("Price", v => Number(v) * 2);
updated.print();

```

### Output

┌────────┬──────┐
│ Item   │ Price│
├────────┼──────┤
│ Apple  │ 3    │
│ Banana │ 4    │
└────────┴──────┘

---

Now that you've learned how to manipulate and manage your data with basic operations like adding, renaming, and sorting columns, it's time to explore how to filter your DataFrame to focus on specific rows or subsets.

In the next section, you'll discover how to apply conditions and criteria to select only the data you need, enabling more powerful data analysis and transformation.

[Explore Filtering](filtering.md)

[Return to API Reference](/frosts)
