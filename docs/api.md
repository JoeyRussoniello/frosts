# 📚 API Reference

## 🔹 Constructor

```ts
new frosts.DataFrame(data: (string | number | boolean)[][]): DataFrame
```

- First row is treated as the header.
- All other rows become Row objects `({ [key: string]: string | number | boolean })`.
- Duplicated headers throw an error.
- Infers column types as either "number", "string", or "boolean".

---

### 🔹 Properties

- `df.columns: string[]` - List of column names.
- `df.values: Row[]` - Array of Rows Objects (one per observation).
- `df.types: {[key:string]: string}` - Hashmap of data types of each column.

---

### 🔧 Methods

#### `.copy()` - Returns a deep copy of the DataFrame

```ts
const newDf = df.copy()
```

#### `.add_column(columnName: string, values: (string|number|boolean)[])` - Returns a new Dataframe with the input column

```ts
const df2 = df.add_column("Passed",[true,false,true]);
```

#### `.add_formula_column(columnName:string, formula:string)` - Returns a new DataFrame with a table formula column

- Add an Excel table-style formula to your df, will be evaluated on writing the dataframe.
  - Formulas can also be evaluated on command using the [`frosts.hardcode_formulas()`](#-hardcode_formulasdfdataframe-workbookexcelscriptworkbook) command.
- Useful for complicated mathematical/logical operations

```ts
const df = new DataFrame([
  ["name", "height_cm", "weight_kg"],
  ["Alice", 160, 55],
  ["Bob", 175, 85],
  ["Charlie", 180, 77],
  ["Diana", 150, 45]
]);
let df = new DataFrame(data);
//Perform a complicated mathematical column operation using tabular formulas
let w_bmi = df.add_formula_column("BMI","ROUND([@weight_kg]/([@height_cm] * [@height_cm]),1)")
```

#### `.get_numericColumns(): string[]` - Returns an array of the columns with numeric data

```ts
const numeric = df.get_numericColumns()
```

#### `.describe()` - Returns a transposed summary table with aggregations of each numerical column

```ts
const summary = df.describe()
```

#### `.iterrows()` - Returns a generator that yields `[row, index]` pairs

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

#### `.groupBy(group_keys, valueCols, aggFuncs)` - Groups the DataFrame by one or more key columns and applies specified aggregation functions to numeric columns

##### **Parameters**

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

> **🔹 Note:**  
> The behavior of `groupby()` depends on the internal separator defined in the `frosts` namespace.  
> By default, the separator is `'~~~'`, but this can be changed using `frosts.set_separator(newSeparator: string)` if any column headers
> contain that value.  

#### `.filter(key: string, predicate: (value) => boolean)`

Returns a new DataFrame including only rows where the given column value passes the predicate function.

```ts
const adults = df.filter("Age", age => age > 18);
```

#### `.query(condition: (row: Row) => boolean)` - Filters the DataFrame using a custom condition applied to each row

```ts
const highEarners = df.query(row => row["Salary"] > 100000);
```

#### `isin(column: string, values: Set<string | number | boolean>):` Returns a new DataFrame with rows where `column`  value is found in the provided set

Great for filtering categorical matches

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

#### `sortBy(columns: string[], ascending: boolean[] = [])` - Returns a new DataFrame sorted by one or more columns

- Provide ascending[i] = true or false for each corresponding column.
- If ascending is not provided, all sorts default to ascending order.

```ts
df.sortBy(["Department", "Salary"], [true, false]);
```

#### `merge(other: DataFrame, on: string[], how: "inner" | "left" | "outer" = "inner)` - Merges the current DataFrame with another one based on key columns, similar to SQL joins

- `on`: list of column(s) to join on
- `how`: join type (`"inner"`, `"left"`, or `"outer"`).

```ts
const joined = df.merge(otherDf, ["EmployeeID"], "left");
```

### `concat(other:DataFrame, columnSelection: ("inner"|"outer"|"left") = "outer")` - Append two DataFrames by concatenating their rows

- `columnSelection = "outer"`: Default Behavior, Resulting DataFrame will have all columns from both DataFrames (filling missing values with null)
- `columnSelection = "inner"`: Resulting DataFrame will only have columns with the same name
- `columnSelection = "left"`: Resulting DataFrame will have all columns of this DataFrame, filling the other dataframe's missing values with null

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

---

### Other Functions

These utility functions help seamlessly read/write data to and from Excel Workbooks, or configure the frosts namespace

#### 🔹 `df_from_range(range: ExcelScript.Range): DataFrame` - Converts an Excel range (including headers) into a `DataFrame`

```ts
const worksheet = workbook.getActiveWorksheet();
const range = worksheet.getRange("A1:D10");
const df = frosts.df_from_range(range);
```

#### 🔹 `df_from_sheet(sheet: ExcelScript.Worksheet): DataFrame` - Grabs the entire used range of a worksheet and converts it into a `DataFrame`

```ts
const df = frosts.df_from_sheet(workbook.getWorksheet("Sheet1"));
```

#### 🔹 `write_df_to_sheet(df: DataFrame, workbook: ExcelScript.Workbook, sheet_name?: string, reset_sheet?: boolean, to_table?: boolean, start_cell?: string)`

Writes a `DataFrame` to a worksheet in the workbook. Optionally clears the sheet, converts to an Excel table, and chooses the starting cell.

- `df`: The DataFrame to write.
- `workbook`: The workbook from the OSTS engine.
- `sheet_name` *(optional)*: Name of the target sheet (default: "DataFrame").
- `reset_sheet` *(optional)*: Whether to clear the sheet before writing (default: true).
- `to_table (optional)` *(optional)*: Whether to convert the output range into a table (default: true).
- `start_cell (optional)` *(optional)*: Cell address to begin writing at (default: "A1").

```ts
const df = frosts.df_from_sheet(workbook.getActiveWorksheet());
//Add a worksheet called summary statistics and place the Dataframe
//description in it
frosts.write_df_to_sheet(df.describe(),workbook,"Summary Statistics")
```

#### 🔹 `hardcode_formulas(df:DataFrame, workbook:ExcelScript.Workbook)`

Evaluates all formulas in a `DataFrame`, creating a backend worksheet called `"___DEV_SHEET_NULL"`, evaluating all formulas, then  delete the backend worksheet. **Assigns formula values in place**. Used to get outputs of formulas for further calculation

```ts
const df = frosts.df_from_sheet(workbook.getActiveWorksheet());
//Add a custom table formula for complicated manipulation
let w_formulas = frosts.add_formula_column("Adjusted Occ","IFERROR([@Occupied/([@Available]-[@Out_of_service]),0)");
//Get numerical values, so we can evaluate further statistics using its values
frosts.hardcode_formulas(frosts, workbook);
//Leverage the numerical values to include "Adjusted Occ" in .describe()
console.log(frosts.describe());
```

#### 🔹 `get_separator()`

Returns the current string used as the `separator` in internal frosts operations. (Default: `"~~~"`)

#### 🔹 `set_separator(separator:string)`

Modifies the current string used as the `separator` in internal frosts operations

- Useful when `"~~~"` happens to be included in a column name/value.
