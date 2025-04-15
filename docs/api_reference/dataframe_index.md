# frosts.DataFrame

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

### Example 1: Creating  DataFrame and Accessing Properties

```ts
// Example data for creating a DataFrame
const data = [
  ["Name", "Age", "IsActive"],
  ["John", 25, true],
  ["Jane", 30, false],
  ["Alice", 22, true]
];

// Create a DataFrame instance
const df = new frosts.DataFrame(data);

// Access the columns
console.log(df.columns); 
// Output: ["Name", "Age", "IsActive"]

// Access the values (rows)
console.log(df.values);
// Output: [
//   { Name: "John", Age: 25, IsActive: true },
//   { Name: "Jane", Age: 30, IsActive: false },
//   { Name: "Alice", Age: 22, IsActive: true }
// ]

// Access the types
console.log(df.types); 
// Output: { Name: "string", Age: "number", IsActive: "boolean" }

// Access all information about the df
console.log(df);
/* Output: 
{
    columns: df.columns, 
    __headers: set from df.columns,
    values: df.values,
    dtypes: df.dtypes
}
```

### Example 2: Handling Duplicate Headers

```ts
// Example with duplicated headers
const invalidData = [
  ["Name", "Name", "IsActive"], // Duplicated "Name" column
  ["John", 25, true],
  ["Jane", 30, false],
  ["Alice", 22, true],
  ["Bob", 35, false]  
];

const invalidDf = new fr.DataFrame(invalidData);
// Output: Error: Duplicate headers found
```

### Example 3: Accessing Specific Rows and Their Values

```ts
// Accessing a specific row (e.g., first row)
const firstRow = df.values[0];
console.log(firstRow); 
// Output: { Name: "John", Age: 25, IsActive: true }
console.log(firstRow['Age']);
// Output: 25

//Set John's Activity status to false
df.values[0]["IsActive"] = false;
```

## Methods

The methods of the `fr.DataFrame` class are organized into five main categories, each with its own dedicated page for detailed documentation:

- [Basic Operations](df_methods/basic_operations.md): Methods for accessing and modifying the DataFrame.
- [Filtering](df_methods/filtering.md): Methods for selecting and filtering rows based on conditions.
- [Aggregations](df_methods/aggregation.md): Methods for summarizing and calculating statistics on data.
- [Merging](df_methods/merging.md): Methods for combining DataFrames.
- [Imports/Exports](df_methods/outputs.md): Ways to import separated values to DataFrames, and export results for PowerAutomate/further scripting

Please refer to the corresponding pages for detailed information and examples for each category.

[Return to API Reference](/frosts)
