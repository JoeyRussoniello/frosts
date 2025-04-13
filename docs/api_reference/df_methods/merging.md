# 🔗 Merging

Now that you’ve learned how to aggregate and summarize data within a DataFrame, you may often need to combine multiple DataFrames to enrich your analysis. Whether you are combining datasets based on shared keys, appending rows, or joining columns, the ability to merge DataFrames is essential in data processing.

frosts provides two powerful methods for combining DataFrames: `.merge()` for key-based joins, and `.concat()` for stacking data row-wise.

## Table of Contents

1. [`.merge()`](#mergeother-dataframe-on-string-how-inner--left--outer--inner)
    1. [Inner Join](#inner-join)
    2. [Left Join](#left-join)
    3. [Outer Join](#outer-join)
2. [`.concat()`](#concatotherdataframe-columnselection-innerouterleft--outer)
    1. [Outer Concatenation](#outer-concatenation-default)
    2. [Inner Concatenation](#inner-concatenation)
    3. [Left Concatenation](#left-concatenation)

### `.merge(other: DataFrame, on: string[], how: "inner" | "left" | "outer" = "inner")`

Merges the current DataFrame with another one based on key columns, similar to SQL joins.

#### Parameters

- `other`: Another `DataFrame` to merge with
- `on`: Column name(s) used as the join key(s).
- `how`: Type of join to perform.
  - `"inner"` (default): Only keeps rows with matches in both DataFrames.
  - `"left"`: Keeps all rows from the current DataFrame, matching where possible from other.
  - `"outer"`: Keeps all rows from both DataFrames, filling in null for missing values.

#### Examples

Let's say we have two DataFrames

`employees`

| EmployeeID | Name    | Department  |
|------------|---------|-------------|
| 1          | Alice   | HR          |
| 2          | Bob     | Engineering |
| 3          | Charlie | Marketing   |
| 4          | Diana   | Sales       |

`salaries`

| EmployeeID | Salary |
|------------|--------|
| 2          | 90000  |
| 3          | 75000  |
| 4          | 68000  |
| 5          | 72000  |

##### Inner Join

```ts
employees.merge(salaries,["Employee ID"],"inner");
```

| EmployeeID | Name    | Department  | Salary |
|------------|---------|-------------|--------|
| 2          | Bob     | Engineering | 90000  |
| 3          | Charlie | Marketing   | 75000  |
| 4          | Diana   | Sales       | 68000  |

Only rows where `EmployeeID` exists in both DataFrames will appear.

#### Left Join

```ts
employees.merge(salaries,["Employee ID"], "left");
```

| EmployeeID | Name    | Department  | Salary |
|------------|---------|-------------|--------|
| 1          | Alice   | HR          | null   |
| 2          | Bob     | Engineering | 90000  |
| 3          | Charlie | Marketing   | 75000  |
| 4          | Diana   | Sales       | 68000  |

Keeps all rows from `employees`, adds data from `salaries` when possible

#### Outer Join

| EmployeeID | Name    | Department  | Salary |
|------------|---------|-------------|--------|
| 1          | Alice   | HR          | null   |
| 2          | Bob     | Engineering | 90000  |
| 3          | Charlie | Marketing   | 75000  |
| 4          | Diana   | Sales       | 68000  |
| 5          | null    | null        | 72000  |

Keep all rows from **both** DataFrames, filling missing values with `null`.

#### Joining with Multiple Columns

You can also join on multiple shared keys, for example the following join

```ts
const df1 = new DataFrame([
  ["EmployeeID", "Date",     "HoursWorked"],
  [101,          "2024-01-01", 8],
  [101,          "2024-01-02", 7],
  [102,          "2024-01-01", 6]
]);

const df2 = new DataFrame([
  ["EmployeeID", "Date",     "Project"],
  [101,          "2024-01-01", "Alpha"],
  [101,          "2024-01-02", "Beta"],
  [103,          "2024-01-01", "Gamma"]
]);

const result = df1.merge(df2, ["EmployeeID", "Date"], "inner");
```

Would result in this table

| EmployeeID | Date       | HoursWorked | Project |
|------------|------------|-------------|---------|
| 101        | 2024-01-01 | 8           | Alpha   |
| 101        | 2024-01-02 | 7           | Beta    |

This type of join is especially useful when working with time series data or logs and need to match both an ID and a timestamp, as shown here.

### `.concat(other:DataFrame, columnSelection: ("inner"|"outer"|"left") = "outer")`

The `.concat()` method appends the rows of the `other` DataFrame to the current one. It aligns columns based on the columnSelection mode

- `"outer"` includes **all columns** from both DataFrames, filling empties with `null` (default)
- `"inner"` includes only **shared columns**
- `'left'` includes all columns from the first `DataFrame`, filling missing values in the second with `null`

#### Concatenation Exampels

For the inputs tables

`df1`

| Name   | Age | Department |
|--------|-----|------------|
| Alice  | 30  | Sales      |
| Bob    | 25  | Marketing  |

`df2`

| Name   | Age | Location   |
|--------|-----|------------|
| Carol  | 28  | New York   |
| Dave   | 35  | Chicago    |

#### Outer Concatenation (default)

```ts
df1.concat(df2)
```

| Name   | Age | Department | Location  |
|--------|-----|------------|-----------|
| Alice  | 30  | Sales      | null      |
| Bob    | 25  | Marketing  | null      |
| Carol  | 28  | null       | New York  |
| Dave   | 35  | null       | Chicago   |

#### Inner Concatenation

```ts
df1.concat(df2, "inner");
```

| Name   | Age |
|--------|-----|
| Alice  | 30  |
| Bob    | 25  |
| Carol  | 28  |
| Dave   | 35  |

#### Left Concatenation

```ts
df1.concat(df2, "left");
```

| Name   | Age | Department |
|--------|-----|------------|
| Alice  | 30  | Sales      |
| Bob    | 25  | Marketing  |
| Carol  | 28  | null       |
| Dave   | 35  | null       |

---

>✅ With your datasets successfully combined, the final step is often saving or sharing your results—let’s look at how to export and import DataFrames using Excel, CSV, and JSON.

[Continue to Input/Output](outputs.md)

[Return to API Reference](/docs/index.md)
