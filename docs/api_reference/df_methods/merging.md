# 🔗 Merging

Now that you’ve learned how to aggregate and summarize data within a DataFrame, you may often need to combine multiple DataFrames to enrich your analysis. Whether you are combining datasets based on shared keys, appending rows, or joining columns, the ability to merge DataFrames is essential in data processing.

frosts provides two powerful methods for combining DataFrames: `.merge()` for key-based joins, and `.concat()` for stacking data row-wise.

## Table of Contents

1. [`.merge()`](#mergeother-dataframe-on-string-how-inner--left--outer--inner)
    1. [Inner Join](#inner-join)
    2. [Left Join](#left-join)
    3. [Outer Join](#outer-join)
2. [`.validate_keys()`](#validate_keykey-dataframe-on-string-string--string-errors-raise--return--raise)
3. [`.concat()`](#concatotherdataframe-columnselection-innerouterleft--outer)
    1. [Outer Concatenation](#outer-concatenation-default)
    2. [Inner Concatenation](#inner-concatenation)
    3. [Left Concatenation](#left-concatenation)
4. [`fr.combine_dfs()]

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

---

### `.validate_key(key: DataFrame, on: [string, string] | string, errors: "raise" | "return" = "raise")`

Checks whether all join key values in the current DataFrame exist in the corresponding column of another DataFrame.

#### Parameters

- `key`: A reference DataFrame (typically the lookup table or foreign key source).
- `on`: Column(s) to match.
  - If a `string`, the same column name is used in both DataFrames.
  - If a tuple `[leftCol, rightCol]`, matches `this[leftCol]` to `key[rightCol]`.
- errors: What to do if mismatches are found.
  - "raise" (default): Throws an error with all unmatched values.
  - "return": Returns an array of unmatched values (allows for graceful handling).

#### Returns

- If `errors = "return"`: An array of missing values.
- If `errors = "raise"`: Throws an error and stops execution if mismatches are found.
- If all keys are valid: Returns `void`.

✅ Use When:

- You're about to perform a .merge() and want to verify key consistency, especially in automated workflow where dropping/null values aren't acceptable.
- You're validating referential integrity between two datasets.
- You need to detect and handle unexpected join mismatches (e.g., early fail or alert system).

#### Examples

1) Checking keys with the same column names

```ts
df.check_key(referenceTable, "ProjectID");
```

Validates that all `ProjectIDs` in `df` exist in `referenceTable`.

2) Checking keys with different column names

```ts
df.check_key(referenceTable, ["UserID", "StaffID"]);
```

Checks if every `UserID` in `df` has a match in the `StaffID` column of `referenceTable`.

3) Failing fast on missing keys

```ts
df.check_key(referenceTable, "ProjectID", "raise");
```

If any `ProjectID` is not found, would throw

```yaml
KeyIncompleteError: The following values were not found in the selected key
[1234, 4567, 8910]
```

4) Graceful fallback

```ts
const missing = df.check_key(referenceTable, "ProjectID", "return");
if (missing?.length) {
  // Return here instead of crashing main
  // possibly send to PowerAutomate/logic app
  return JSON.stringify(missing)  
  //Output: "[1234,4567,8910]"
}
```

---

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

### `fr.combine_dfs(dfs: DataFrame[], columnSelection: ("inner" | "outer" | "left") = "outer"): DataFrame`

Combines an array of DataFrames into a single DataFrame by vertically concatenating them, while aligning columns according to the specified strategy.

- **`dfs`**: An array of one or more `DataFrame` objects to combine.
- **`columnSelection`** *(default = `"outer"`)*:
  - `"outer"`: Includes **all columns** found in any DataFrame (union).
  - `"inner"`: Includes only columns **common to all** DataFrames (intersection).
  - `"left"`: Uses only the columns from the **first (base) DataFrame**.

🔍 **Behavior**  
- If no DataFrames are provided, it throws a `RangeError`.
- If a single DataFrame is provided, it returns that DataFrame unchanged.
- Otherwise, it takes the first DataFrame as the base, concatenates the remaining DataFrames onto it (using the same column alignment logic as `concat()`), and returns the modified base DataFrame.

✅ **Use When**  
Use `combine_dfs()` when you have multiple DataFrames with potentially different columns that you need to merge into one, and you want a more streamlined syntax compared to manually calling `concat_all()`.

### Example

#### Input DataFrames

**df1**

| Name  | Age |
|-------|-----|
| Alice | 30  |
| Bob   | 28  |

**df2**

| Name  | Salary |
|-------|--------|
| Carol | 60000  |
| Dave  | 52000  |

#### Code Example

```ts
const combined = combine_dfs([df1, df2], "outer");
combined.print();
```

Output:

| Name  | Age  | Salary |
|-------|------|--------|
| Alice | 30   | null   |
| Bob   | 28   | null   |
| Carol | null | 60000  |
| Dave  | null | 52000  |

---

>✅ With your datasets successfully combined, the final step is often saving or sharing your results—let’s look at how to export DataFrames using Excel, CSV, and JSON.

[Continue to Input/Output](outputs.md)

[Return to API Reference](/frosts)
