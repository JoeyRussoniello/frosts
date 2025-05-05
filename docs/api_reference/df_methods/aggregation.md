# 🔢 Aggregation

Aggregation methods allow you to summarize and combine your data in meaningful ways, providing insights like sums, averages, counts, and more. Whether you're interested in grouping data by categories or calculating overall statistics, aggregation gives you the tools to analyze data at a higher level.

## Table of Contents

1. [`.pivot()`](#pivotindex-columns-values-aggfunc--count-fillna--null)
2. [`.groupby()`](#groupbygroup_keys-valuecols-aggfuncs)
3. [`.describe()`](#describe)
4. [Column Aggregation Methods](#column-aggregation-functions)

## Aggregation Functions

### `.pivot(index, columns, values, aggFunc = "count", fillNa = null)`

The `.pivot()` method reshapes a DataFrame by turning unique values from one column into new columns, using another column for row labels and a third for filling in the data. It performs an aggregation (like `sum`, `mean`, `count`, etc.) on the data values in case of duplicates. This is useful for generating cross-tab summaries or Excel-style pivot tables.

#### Parameters

- `index`: `string`  
  The column whose unique values will become the rows of the output table.
- `columns`: `string`  
  The column whose unique values will become the new columns in the output table.
- `values`: `string`  
  The column containing the values to aggregate and place in the matrix.
- `aggFunc`: `string` (default: `"count"`)  
  The aggregation function to apply to the values column in case multiple entries exist for the same row/column combination. Supported functions include:
  - `'sum'`: Sum of values
  - `'mean'`: Average of values
  - `'min'`: Minimum value
  - `'max'`: Maximum value
  - `'count'`: Number of entries
  - `'std_dev'`: Sample standard deviation

- `fillNa`: `CellValue` (default: `null`)  
  Value to use for empty cells where no matching data exists.

#### Returns

A new DataFrame where:

- Each row corresponds to a unique value from the `index` column.
- Each column corresponds to a unique value from the `columns` column.
- Cell values are computed by applying the aggregation function to the `values` column.

---

#### Pivoting on Department and City

```ts
// Pivot the average salary by City and Department
const result = df.pivot("City", "Department", "Salary", "mean");
console.log(result.values);
/*
Returns:
[
  { City: "Chicago", Engineering: 98000, HR: 91000, ... },
  { City: "New York", Engineering: 112000, HR: 92000, ... },
  ...
]
*/
```

In this example:

- `"City"` becomes the index (row labels)
- `"Department"` values become column headers
- `"Salary"` is the value being aggregated
- `"mean"` computes the average salary for each `(City, Department)` pair

If a city-department combination does not exist in the data, the corresponding cell will be `null` unless a `fillNa` value is specified.

---

### `.groupBy(group_keys, valueCols, aggFuncs)`

The `.groupBy()` method allows you to group data by one or more key columns and then apply aggregation functions to other columns within each group. This is useful for performing statistical summaries or analysis on data, such as calculating sums, averages, or other aggregate measures for each group.

#### Parameters

- group_keys: (string | string[])
    Column(s) by which to group the data. This can be a single column name or an array of column names.
- valueCols: (string[] | "all")
    The columns to aggregate. This can be a list of column names (e.g., ["Salary", "Bonus"]) or the string "all", which will automatically select all numeric columns excluding the group keys.
- aggFuncs: (string | string[])
    Aggregation function(s) to apply to the valueCols. This can be a single function that applies to all columns or a list of functions (the length of the list must match the length of valueCols). Supported aggregation functions include:
  - 'sum': Sum of values.
  - 'mean': Average of values.
  - 'min': Minimum value.
  - 'max': Maximum value.
  - 'count': Count of non-null values.
  - 'median': Median of values.
  - 'std_dev': Sample standard deviation of values

#### Returns

A new DataFrame where each row represents a unique combination of the group keys, and each column is the result of applying the specified aggregation functions to the selected value columns

##### Grouping by a Single Column

```ts
// Group by "Department" and calculate the sum and mean for "Salary" and "Bonus"
const result = df.groupBy("Department", ["Salary", "Bonus"], ["sum", "mean"]);
console.log(result.values);
/*
Returns:
[
  { Department: "Engineering", Salary_sum: 500000, Bonus_mean: 10000 },
  { Department: "Sales", Salary_sum: 300000, Bonus_mean: 8000 },
  ...
]
*/
```

In this example, the DataFrame is grouped by the "Department" column. The aggregation functions applied are:

- `'sum'` for "Salary" which gives the total salary for each department
- `'mean'` for "Bonus" which gives the average bonus for each department

##### Grouping by Multiple Columns

```ts
// Group by both "Department" and "Region" and calculate the sum for "Salary" and "Bonus"
const result = df.groupBy(["Department", "Region"], ["Salary", "Bonus"], ["sum", "sum"]);
console.log(result.values);
/*
Returns:
[
  { Department: "Engineering", Region: "West", Salary_sum: 250000, Bonus_sum: 5000 },
  { Department: "Sales", Region: "East", Salary_sum: 150000, Bonus_sum: 3000 },
  ...
]
*/
```

Here, the data is grouped by both "Department" and "Region". The aggregation function `'sum'` is applied to both the "Salary" and "Bonus" columns.

##### Use "all" to Group All Numeric Columns

```ts
// Group by "Department" and aggregate all numeric columns using the sum function
const result = df.groupBy("Department", "all", "sum");
console.log(result.values);
/*
Returns:
[
  { Department: "Engineering", Salary_sum: 500000, Bonus_sum: 100000 },
  { Department: "Sales", Salary_sum: 300000, Bonus_sum: 50000 },
  ...
]
*/
```

In this example, by using `"all"` for valueCols, all numeric columns (other than "Department") are aggregated using the `"sum"` function. This allows for more flexible aggregation when you don’t want to specify each column individually.

##### Grouping using Different Aggregation Functions for the Same Column

```ts
// Group by "Department" and apply different aggregation functions to "Salary" and "Bonus"
const result = df.groupBy("Department", ["Salary", "Salary"], ["mean", "sum"]);
console.log(result.values);
/*
Returns:
[
  { Department: "Engineering", Salary_mean: 50000, Salary_sum: 100000 },
  { Department: "Sales", Salary_mean: 30000, Salary_sum: 120000 },
  ...
]
*/
```

#### Note on the `frosts.SEPARATOR`

>The behavior of groupBy() depends on the internal separator defined in the frosts namespace.
> By default, the separator is '~~~', but this can be changed using `frosts.set_separator(newSeparator: string)` if any column headers contain that value.

This separator is used when performing the hashing operation on multiple columns, and an error will be raised if the separator is in any of the column names.

---

### `.describe()`

Generates a summary of statistical measures for all numeric columns in the DataFrame. The summary includes the following statistics for each column:

- Count: The number of non-null entries in the column.
- Mean: The average value of the column.
- Standard Deviation: A measure of the spread of the values in the column.
- Minimum: The smallest value in the column.
- 1st Quartile (25%): The value below which 25% of the data falls.
- Median (50%): The middle value of the column when sorted.
- 3rd Quartile (75%): The value below which 75% of the data falls.
- Maximum: The largest value in the column.

**The following table is an example result of `df.describe()`**

| Column        | Count | Mean   | Standard Deviation | Minimum | 1st Quartile | Median | 3rd Quartile | Maximum |
|---------------|-------|--------|--------------------|---------|--------------|--------|--------------|---------|
| Age           | 50    | 30.2   | 8.5                | 18      | 25           | 30     | 35           | 50      |
| Salary        | 50    | 70000  | 12000              | 30000   | 50000        | 70000  | 85000        | 120000  |
| Bonus         | 50    | 5000   | 1500               | 1000    | 3000         | 5000   | 7000         | 10000   |

---

## Column Aggregation Functions

These aggregation functions allow you to compute various statistics on individual columns of your DataFrame. They can be called directly on the DataFrame (e.g., df.mean('Salary')).

- `.mean(column: string): number`
Returns the average (mean) of the values in the specified column.
- `.std_dev(column: string): number`
Returns the standard deviation of the values in the specified column, indicating how spread out the values are.
- `.min(column: string): number`
Returns the minimum value in the specified column.
- `.max(column: string): number`
Returns the maximum value in the specified column.
- `.median(column: string): number`
Returns the median of the values in the specified column, which is the middle value when the data is sorted.
- `.quantile(column: string, q: number): number`
Returns the q-th quantile (e.g., 25th, 50th, 75th percentile) of the values in the specified column.
- `.count(column: string): number`
Returns the count of non-null values in the specified column.

```ts
// Calculate the average "Salary" and count of "Employee ID" across the entire DataFrame
const salaryMean = df.mean("Salary");
const employeeCount = df.count("Employee ID");
// Get the minimum and maximum values for "Salary" across the entire DataFrame
const salaryMin = df.min("Salary");
const salaryMax = df.max("Salary");
// Calculate the 25th and 75th percentiles for "Salary"
const salaryQ25 = df.quantile("Salary", 0.25);
const salaryQ75 = df.quantile("Salary", 0.75);
```

---

Now that we’ve covered how to summarize and aggregate data, let’s explore how to combine DataFrames with different merging techniques. Whether you’re looking to join on common columns or add rows, merging is a powerful tool for building a complete dataset.

Learn about merging DataFrames [here](merging.md).

[Return to API Reference](/frosts)
