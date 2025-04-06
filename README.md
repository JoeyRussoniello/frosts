# frosts

## Description
An OfficeScript-native basic data science library designed streamline Power Automate Excel automation, and increase the ease of use for aggregating, merging, and describing datasets entirely in Excel with no dependencies.

# 📖 Table of Contents

1. [📘 Description](#description)  
2. [🧮 frosts.DataFrame](#-frostsdataframe)  
3. [🚀 Getting Started](#-getting-started)  
4. [📚 API Reference](#-api-reference)  
   - [Constructor](#-constructor)  
   - [Properties](#-properties)  
   - [Methods](#-methods)  
     - [.copy()](#copy---returns-a-deep-copy-of-the-dataframe)  
     - [.add_columns()](#add_columnscolumnname-string-values-stringnumberboolean---returns-a-new-dataframe-with-the-input-column)  
     - [.get_numericColumns()](#get_numericcolumns-string---returns-an-array-of-the-columns-with-numeric-data)  
     - [.describe()](#describe---returns-a-transposed-summary-table-with-aggregations-of-each-numerical-column)  
     - [.iterrows()](#iterrows---returns-a-generator-that-yields-row-index-pairs)  
     - [.shape()](#shape-number-number---returns-the-shape-of-the-dataframe-as-rows-columns)  
     - [.get_columns()](#get_columnsspread-keysstring---returns-a-new-dataframe-with-only-the-selected-columns)  
     - [.drop()](#dropspread-keysstring---returns-a-new-dataframe-without-the-selected-columns)  
     - [.groupBy()](#groupbygroup_keys-valuecols-aggfuncs---groups-the-dataframe-by-one-or-more-key-columns-and-applies-specified-aggregation-functions)
     - [.filter()](#filterkey-string-predicate-value--boolean---returns-a-new-dataframe-including-only-rows-where-the-column-value-passes-the-predicate)
     - [.query()](#querycondition-row-row--boolean---filters-the-dataframe-using-a-custom-condition-applied-to-each-row)  
     - [.isin()](#isincolumn-string-values-setstring--number--boolean---returns-a-new-dataframe-with-rows-where-column-value-is-in-the-set)  
     - [.operateColumns()](#operatecolumnsoperator-----col1-string-col2-stringnumber---performs-element-wise-math-between-two-columns)  
     - [.sortBy()](#sortbycolumns-string-ascending-boolean--returns-a-new-dataframe-sorted-by-the-columns)  
     - [.merge()](#mergeother-dataframe-on-string-how-inner--left--outer--inner---merges-two-dataframes-on-a-key-similar-to-sql-joins)  
     - [.to_array()](#to_arrayheaders-boolean--true---converts-the-entire-dataframe-into-a-2d-array)  
     - [.to_json()](#to_jsonheaders-boolean--true---converts-the-dataframe-into-a-json-string)  
   - [Supported Column Aggregation Methods](#supported-column-aggregation-methods)  
5. [📊 Excel Integration Functions](#excel-integration-functions)  
   - [`df_from_range()`](#-df_from_rangerange-excelscriptrange-dataframe---converts-an-excel-range-including-headers-into-a-dataframe)  
   - [`df_from_sheet()`](#-df_from_sheetsheet-excelscriptworksheet-dataframe---grabs-the-entire-used-range-of-a-worksheet-and-converts-it-into-a-dataframe)  
   - [`write_df_to_sheet()`](#-write_df_to_sheetdf-dataframe-workbook-excelscriptworkbook-sheet_name-string-reset_sheet-boolean-to_table-boolean-start_cell-string)


# 🧮 frosts.DataFrame

A lightweight `DataFrame` class inspired by pandas, designed for tabular data manipulation, exploration, and transformation.

---

## 🚀 Getting Started

Create a `DataFrame` by passing in a 2D array where the **first row is the header**:

```ts
const data = [
  ["Name", "Age", "Score"],
  ["Alice", 25, 88],
  ["Bob", 30, 92],
  ["Charlie", 28, 79],
];

const df = new frosts.DataFrame(data);
```
---
## 📚 API Reference
### 🔹 Constructor
```ts
new frosts.DataFrame(data: (string | number | boolean)[][]): DataFrame
```
- First row is treated as the header.
- All other rows become Row objects `({ [key: string]: string | number | boolean })`.
- Duplicated headers throw an error.
- Infers column types ("number", "string", "boolean").
---
### 🔹 Properties
- `df.columns: string[]` - List of column names.
- `df.values: Row[]` - Array of Rows Objects (one per observation).
- `df.types: {[key:string]: string}` - Hashmap of data types of each column.
---
## 🔧 Methods

#### `.copy()` - Returns a deep copy of the DataFrame
```ts
const newDf = df.copy()
```
#### `.add_columns(columnName: string, values: (string|number|boolean)[])` - Returns a new Dataframe with the input column
```ts
const df2 = df.add_columns("Passed",[true,false,true]);
```
#### `.get_numericColumns(): string[]` - Returns an array of the columns with numeric data
```ts
const numeric = df.get_numericColumns()
```
#### `.describe()` - Returns a transposed summary table with aggregations of each numerical column
```ts
const summary = df.describe()
```
#### `.iterrows()` - Returns a generator that yields `[row, index]` pairs.
```ts
for (let [row, index] of df.iterrows()){
    // Print the index and "Name" attribute of each row in the dataframe to the console
    console.log(index, row['Name'])
}
```
#### `.shape(): [number, number]` - Returns the shape of the dataframe as `[rows, columns]`
#### `.get_columns(...keys:string[])` - Returns a new DataFrame with only the selected columns
```ts
const shortDf = df.get_columns("Name","Sales")
```
#### `.drop(...keys:string[])` - Returns a new DataFrame without the selected columns
```ts
const trimmedDf = df.drop("Address","Email")
```
#### `.groupBy(group_keys, valueCols, aggFuncs)` - Groups the DataFrame by one or more key columns and applies specified aggregation functions to numeric columns.
**Parameters**
- `group_key: (string | string[])` Column(s) to group by.
- `valueCols (string[] | "all")`   List of columns to aggregate. Use `"all"` to automatically select all numeric columns (excluding the group keys).
- `aggFuncs (string | string[])` Aggregation function(s) to apply. Can be a single function for all columns or a list (must match the length of valueCols).
    - [See supported aggregation functions](#supported-column-aggregation-methods)
```ts
// Group by "Department", calculate the sum and mean for "Salary" and "Bonus"
df.groupBy("Department", ["Salary", "Bonus"], ["sum", "mean"]);
```
This would return a DataFrame with:
- One row per department
- Columns like Salary_sum, Bonus_mean, etc.
#### `.filter(key: string, predicate: (value) => boolean)`:
Returns a new DataFrame including only rows where the given column value passes the predicate function.
```ts
const adults = df.filter("Age", age => age > 18);
```
#### `.query(condition: (row: Row) => boolean)` - Filters the DataFrame using a custom condition applied to each row.
```ts
const highEarners = df.query(row => row["Salary"] > 100000);
```
#### `isin(column: string, values: Set<string | number | boolean>):` Returns a new DataFrame with rows where `column`  value is found in the provided set. 
- Great for filtering categorical matches
```ts
const cities = new Set(["NYC", "LA"]);
const coastal = df.isin("City", cities);
```

> 🔍 **When to use:** Use `.filter()` for simple column comparisons (e.g. `Age > 30`), `.isin()` for checking set membership (e.g. `State in ['CA', 'NY']`), and `.query()` for complex, multi-column or row-based logic.

#### `.operateColumns(operator: "* | + | - | /", col1: string, col2: string): number[]`
Performs a mathematical operation between two numeric columns element-wise and returns a new array of results.
- Operator must be one of either `"*"`, `"+"`, `"-"`, `"/"`
```ts
const result = df.operateColumns("+", "Sales", "Tax");
```
#### `sortBy(columns: string[], ascending: boolean[] = [])` - Returns a new DataFrame sorted by one or more columns.
- Provide ascending[i] = true or false for each corresponding column.
- If ascending is not provided, all sorts default to ascending order.
```ts
df.sortBy(["Department", "Salary"], [true, false]);
```
#### `merge(other: DataFrame, on: string[], how: "inner" | "left" | "outer" = "inner)` - Merges the current DataFrame with another one based on key columns, similar to SQL joins.
- `on`: list of column(s) to join on
- `how`: join type (`"inner"`, `"left"`, or `"outer"`).
```ts
const joined = df.merge(otherDf, ["EmployeeID"], "left");
```
#### `.to_array(headers: boolean = true)` - Converts the entire DataFrame (with headers, by default) into a 2D string|number|boolean array
#### `.to_json(headers: boolean = true)` - Converts the entire DataFrame (with headers, by defualt) into a JSON formatted string
### Supported Column Aggregation Methods
- `.mean(column:string):number`
- `.std_dev(column:string):number`
- `.min(column: string):number`
- `.max(column: string):number`
- `.median(column: string):number`
- `.quantile(column:string, q:number):number`: Returns a specified quantile (Ex: 25, 50, 75)
- `.count(column: string):number`
###

## Excel Integration Functions
These utility functions help seamlessly convert between Excel ranges/sheets and your custom `DataFrame` class, making it easy to work with Excel data in Office Scripts.
---
#### 🔹 `df_from_range(range: ExcelScript.Range): DataFrame` - Converts an Excel range (including headers) into a `DataFrame`.
```ts
const worksheet = workbook.getActiveWorksheet();
const range = worksheet.getRange("A1:D10");
const df = frosts.df_from_range(range);
```
---
#### 🔹 `df_from_sheet(sheet: ExcelScript.Worksheet): DataFrame` - Grabs the entire used range of a worksheet and converts it into a `DataFrame`
```ts
const df = df_from_sheet(workbook.getWorksheet("Sheet1"));
```
---
#### 🔹 `write_df_to_sheet(df: DataFrame, workbook: ExcelScript.Workbook, sheet_name?: string, reset_sheet?: boolean, to_table?: boolean, start_cell?: string)`
Writes a `DataFrame` to a worksheet in the workbook. Optionally clears the sheet, converts to an Excel table, and chooses the starting cell.
- `df`: The DataFrame to write.
- `workbook`: The workbook from the OSTS engine.
- `sheet_name` *(optional)*: Name of the target sheet (default: "DataFrame").
- `reset_sheet` *(optional)*: Whether to clear the sheet before writing (default: true).
- `to_table (optional)` *(optional)*: Whether to convert the output range into a table (default: true).
- `start_cell (optional)` *(optional)*: Cell address to begin writing at (default: "A1").
