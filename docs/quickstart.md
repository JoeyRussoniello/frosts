---
title: 15-Minute Quickstart Guide
nav_order: 2
---

Welcome to **frosts**, a beginner-friendly data analysis toolkit for Excel using Office Scripts. This guide walks you through the basics of working with data using Frosts, even if you've never written a line of code before. If you can use Excel, you can use Frosts.

We’ll use a sample file called [Employees.xlsx](https://github.com/JoeyRussoniello/frosts/blob/main/examples/Introduction/Employees.xlsx?raw=true) to show how to load data, inspect it, clean it, analyze it, and **save your results back to Excel** or send to **Power Automate** using *JSON*.

---

* Table of Contents
{:toc}

---

## ⏰ Setup and Installation

To follow along, download and open [Employees.xlsx](https://github.com/JoeyRussoniello/frosts/blob/main/examples/Introduction/Employees.xlsx?raw=true). Then open the **Automate** tab and copy the [frosts.ts code](https://github.com/JoeyRussoniello/frosts/blob/main/frosts.ts) into the coding pane.

You should then have a coding pane that looks something like this

```ts
namespace fr{
  //THE CONTENTS OF THE FROSTS LIBRARY
  ...
}

function main(workbook: ExcelScript.Workbook) {
    // See full documentation at: https://joeyrussoniello.github.io/frosts/
    // YOUR CODE GOES HERE
    
}
```

Once this is set up, you're ready to start using frosts. Congratulations on completing your first step!

Now that you've set up frosts. We'll start by loading the workbook contents into a frosts **DataFrame**, the core data type used by `frosts` to process and handle data. You can do that by pasting the following code into `main`

```ts
// Get the worksheet named "Employees"
const sheet = workbook.getWorksheet("Employees");

// Read the worksheet into a Frosts DataFrame
let df = fr.read_sheet(sheet);

// Print the first few rows to inspect your data
df.print();
```

You should now have a main function that looks like this

```ts
function main(workbook: ExcelScript.Workbook){
  // Get the worksheet named "Employees"
  const sheet = workbook.getWorksheet("Employees");

  // Read the worksheet into a Frosts DataFrame
  let df = fr.read_sheet(sheet);

  // Print the first few rows to inspect your data
  df.print();
}
```

>**Note for Beginners:**
>Every Excel Script starts with a special function called `main()` — this is the part of the script that runs when you press the "Run" button. You don't need to write this yourself; it's added automatically.
>From this point on, we'll show only the lines of code that go *inside* the `main()` function. So whenever you see example code, just imagine it's being placed inside `function main(workbook: ExcelScript.Workbook) { ... }`.

Now pressing the **"Run"** button should return

```md
| EmployeeID | Name            | ... | SSN         | Address           |
| ---------- | --------------- | --- | ----------- | ----------------- |
| 1001       | Alice Smith     | ... | 123-45-6789 | 123 5th Ave       |
| 1002       | Bob Johnson     | ... | 987-65-4321 | 456 Sunset Blvd   |
| 1003       | Carol Lee       | ... | 567-89-1234 | 789 Madison St    |
| 1004       | David Kim       | ... | 234-56-7890 | 101 Lake Shore Dr |
| 1005       | Eva Brown       | ... | 345-67-8901 | 234 7th Ave       |
| ...        | ...             | ... | ...         | ...               |
| 1016       | Quinn Hernandez | ... | 321-98-7654 | 135 Lexington Ave |
| 1017       | Rachel Perez    | ... | 210-87-6543 | 678 Castro St     |
| 1018       | Sam Roberts     | ... | 109-76-5432 | 321 Monroe St     |
| 1019       | Tina Evans      | ... | 098-65-4321 | 555 Fairfax Ave   |
| 1020       | Uma Nelson      | ... | 087-54-3210 | 109 Van Ness Ave  |

(20 rows x 9 columns)
```

---

The `print()` method used above is a helpful tool for **quickly checking the contents of your DataFrame**. Use it often to confirm that your data looks the way you expect, especially after filtering, sorting, or transforming it.

## 📋 Viewing Data

Before doing any analysis, it's important to get a quick sense of what your data looks like. This can be done using `.print()` like above, or in any of the following ways

```ts
//Print the first and last 5 rows of the table
df.print();

// Print the first 3 rows of the table
df.head(3).print();

// Print the last 2 rows
df.tail(2).print();

//Log ALL information about the DataFrame (NOT SUGGESTED FOR LARGE DATSETS)
console.log(df)

// Get the shape (rows, columns) of the data
let [rows, cols] = df.shape();
//For Employees.xlsx, the table has 20 rows and 9 columns.
console.log(`This table has ${rows} rows and ${cols} columns.`); 
```

---

## 🔍 Selecting and Inspecting Data

Want to get a feel for what’s in your table? You can list the column names, check what types of values they hold, and zoom in on just the columns you care about.

```ts
// Print the column names
console.log("Column names:\n", df.columns);

// Print the detected data types
console.log("Column Data Types:\n", df.dtypes);

// Select only specific columns to view
let cols = df.get_columns("Name", "Department", "Salary");
cols.print(2); //Print only the first and last 2 rows
```

Expected Output:

```text
Column Names:
(9) ["EmployeeID", "Name", "Department", "City", "Age", "Salary", "Income", "SSN", "Address"]

Column Data Types:
{EmployeeID: "number", Name: "string", Department: "string", City: "string", Age: "number"…}

| Name        | Department  | Salary |
| ----------- | ----------- | ------ |
| Alice Smith | Engineering | 120000 |
| Bob Johnson | HR          | 85000  |
| ...         | ...         | ...    |
| Tina Evans  | Engineering | 115000 |
| Uma Nelson  | HR          | 86000  |
```

---

## ✨ Filtering Rows

Need to focus on just part of your data? *Filtering* lets you pull out rows that match specific conditions, like location or salary range.

```ts
// Keep only rows where City is New York
let nyc = df.filter("City", fr.predicates.equal("New York"));
nyc.print();

// Keep only rows with Salary above 90,000
let high_earners = df.filter("Salary", v => Number(v) > 90000);
high_earners.print();

// Combine both conditions using .query()
let both_filters = df.query(row => row["City"] === "New York" && Number(row["Salary"]) > 90000);
filtered.print();
```

> As shown here, you’ll sometimes have to use type `Number(row["Salary"])` or `v => Number(v) > 90000` in filter logic. These are just ways to make sure a value is treated as a number so we can compare it correctly.
>The  `v =>` part is called an *arrow function* — it means **“for each value v, do something.”** In this case, it's checking if the number is greater than 90,000. .

Like `.equal()`, shown above, more predicates can be used with `.filter()`, including:

* `fr.predicates.is_blank`: Checks if a **string** value is blank
* `fr.predicates.is_nan`: Checks is a **numeric** value is `NaN`
* `fr.predicates.includes(substring)`: Checks if a column's text includes a substring (Ex: "Region: North" includes "Region")
* `fr.predicates.starts_with(substring)`: Checks if a column's text starts with a substring.
* `fr.predicates.ends_with(substring)`: Checks if a column's text ends with a substring

---

## ↕️ Sorting

Sorting lets you reorder your data based on the values in one or more columns. You can sort alphabetically, by number, or even by multiple columns at once — like sorting departments A–Z, then highest salary first.

```ts
// Sort by Age in ascending order
let by_age = df.sortBy("Age", "asc");
by_age.print();

// Sort by Department A-Z, then Salary high-to-low
let sorted = df.sortBy(["Department", "Salary"], [true, false]);
sorted.print();
```

---

## 📊 Calculating Statistics

If you’re curious about averages, maximums, or just want a quick summary of your numbers, these built-in stats functions give you exactly that. Great for sanity checks or getting a feel for your dataset.

```ts
// Summary of specific columns
df.describe("Age","Salary");

// Summary of all numeric columns
df.describe().print();

// Individual stats
console.log("Average salary:", df.mean("Salary"));
console.log("Max income:", df.max("Income"));
```

Example Output:

```text
| Column     | Count | ... | 3rd Quartile | Maximum |
| ---------- | ----- | --- | ------------ | ------- |
| EmployeeID | 20    | ... | 1015.25      | 1020    |
| Age        | 20    | ... | 41.25        | 50      |
| Salary     | 20    | ... | 95750        | 120000  |
| Income     | 20    | ... | 92750        | 110000  |

(4 rows x 9 columns)
Average salary:
87600
Max income:
110000
```

---

## 🧠 Creating New Columns

Sometimes you’ll want to create new values based on existing data — like calculating profit from income and salary. This shows how to add a new column using simple math across each row.

When you're transforming data step by step, it can be useful to take labeled “snapshots” along the way. Unlike `.print()`, snapshots won’t break your method chain — so you can track what’s happening without interrupting your flow.

```ts
// Add a new column "Net" = Income - Salary

df
  .snapshot("Before Modifications")
  .set_column("Net", df.apply(row => row.get_number("Income") - row.get_number("Salary")))
  .snapshot("After Adding Net Column")
  .get_columns("Name", "Salary", "Income", "Net")
  .snapshot("Final Output")
```

Example Output:

```text
🔍 Snapshot: Before Modifications
| EmployeeID | Name            | ... | SSN         | Address           |
| ---------- | --------------- | --- | ----------- | ----------------- |
| 1001       | Alice Smith     | ... | 123-45-6789 | 123 5th Ave       |
| 1002       | Bob Johnson     | ... | 987-65-4321 | 456 Sunset Blvd   |
| 1003       | Carol Lee       | ... | 567-89-1234 | 789 Madison St    |
| 1004       | David Kim       | ... | 234-56-7890 | 101 Lake Shore Dr |
| 1005       | Eva Brown       | ... | 345-67-8901 | 234 7th Ave       |
| ...        | ...             | ... | ...         | ...               |
| 1016       | Quinn Hernandez | ... | 321-98-7654 | 135 Lexington Ave |
| 1017       | Rachel Perez    | ... | 210-87-6543 | 678 Castro St     |
| 1018       | Sam Roberts     | ... | 109-76-5432 | 321 Monroe St     |
| 1019       | Tina Evans      | ... | 098-65-4321 | 555 Fairfax Ave   |
| 1020       | Uma Nelson      | ... | 087-54-3210 | 109 Van Ness Ave  |

(20 rows x 9 columns)

🔍 Snapshot: After Adding Net Column
| EmployeeID | Name            | ... | Address           | Net    |
| ---------- | --------------- | --- | ----------------- | ------ |
| 1001       | Alice Smith     | ... | 123 5th Ave       | -10000 |
| 1002       | Bob Johnson     | ... | 456 Sunset Blvd   | -5000  |
| 1003       | Carol Lee       | ... | 789 Madison St    | -3000  |
| 1004       | David Kim       | ... | 101 Lake Shore Dr | -2000  |
| 1005       | Eva Brown       | ... | 234 7th Ave       | -3000  |
| ...        | ...             | ... | ...               | ...    |
| 1016       | Quinn Hernandez | ... | 135 Lexington Ave | -4000  |
| 1017       | Rachel Perez    | ... | 678 Castro St     | -4000  |
| 1018       | Sam Roberts     | ... | 321 Monroe St     | -4000  |
| 1019       | Tina Evans      | ... | 555 Fairfax Ave   | -7000  |
| 1020       | Uma Nelson      | ... | 109 Van Ness Ave  | -4000  |

(20 rows x 10 columns)

🔍 Snapshot: Final Output
| Name            | Salary | Income | Net    |
| --------------- | ------ | ------ | ------ |
| Alice Smith     | 120000 | 110000 | -10000 |
| Bob Johnson     | 85000  | 80000  | -5000  |
| Carol Lee       | 95000  | 92000  | -3000  |
| David Kim       | 72000  | 70000  | -2000  |
| Eva Brown       | 67000  | 64000  | -3000  |
| ...             | ...    | ...    | ...    |
| Quinn Hernandez | 92000  | 88000  | -4000  |
| Rachel Perez    | 88000  | 84000  | -4000  |
| Sam Roberts     | 68000  | 64000  | -4000  |
| Tina Evans      | 115000 | 108000 | -7000  |
| Uma Nelson      | 86000  | 82000  | -4000  |

(20 rows x 4 columns)
```

---

## 🧹 Cleaning Up

Cleaning your data often means removing columns you don’t need or renaming ones that are too long or unclear. These quick fixes make your table easier to work with and safer to share.

```ts
// Drop sensitive columns like SSN and Address
let safe = df.drop("SSN", "Address");
safe.print();

// Rename some columns
let renamed = df.rename({ "EmployeeID": "ID", "Salary": "Pay" });
renamed.print();
```

---

## 🧮 Aggregation and Reshaping

If you want to **summarize** your data or **restructure** it to better compare values, Frosts has tools to group and pivot your table with just a few lines of code.

### 📊 Grouping with .groupBy()

Here’s how to get the total salary by department:

```ts
//Group By Departmnet and get the total salary
df
  .groupBy(
      "Department",
      {"Salary":"sum"}
  )
  .snapshot("By Department");

  //Group by City, and then by department, calculating average salary, total salary, and average age
  df
    .groupBy(
        ["City","Department"],
        {
            "Salary":["mean","sum"],
            "Age": "mean"
        }
    )
    .snapshot("By City and Department")
```

Expected Output:

```text
🔍 Snapshot: By Department
| Department  | Salary_sum |
| ----------- | ---------- |
| Engineering | 643000     |
| HR          | 441000     |
| Marketing   | 311000     |
| Sales       | 357000     |

(4 rows x 2 columns)

🔍 Snapshot: By City and Department
| City          | Department  | ... | Salary_sum | Age_mean |
| ------------- | ----------- | --- | ---------- | -------- |
| New York      | Engineering | ... | 215000     | 31.5     |
| Los Angeles   | HR          | ... | 85000      | 45       |
| Chicago       | Marketing   | ... | 72000      | 38       |
| New York      | Sales       | ... | 150000     | 38       |
| San Francisco | Sales       | ... | 69000      | 41       |
| ...           | ...         | ... | ...        | ...      |
| Los Angeles   | Sales       | ... | 70000      | 28       |
| New York      | HR          | ... | 92000      | 39       |
| San Francisco | Marketing   | ... | 88000      | 44       |
| Chicago       | Sales       | ... | 68000      | 35       |
| Los Angeles   | Engineering | ... | 115000     | 32       |

(16 rows x 5 columns)
```

> Indenting longer functions like `.groupBy()` is **not necessary**, but helps to make your code a lot **easier to read and work with**

### 🔄 Aggregating with .pivot()

If you want a quick summary table, `.pivot()` lets you group by one column and spread another across the top. It’s great for analysis and comparison, though **less ideal for building repeatable data pipelines**.

```ts
//Aggregate by City (Row), and Department (Column), calculate average Salary

// row_field: "City", column_field: "Department", value_field: "Salary", aggregation: "mean"
df.pivot("City","Department","Salary","mean").print();
```

Expected Output:

```text
| City          | Engineering | ... | Marketing | Sales |
| ------------- | ----------- | --- | --------- | ----- |
| New York      | 107500      | ... | 75000     | 75000 |
| Los Angeles   | 115000      | ... | 76000     | 70000 |
| Chicago       | 104000      | ... | 72000     | 68000 |
| San Francisco | 105000      | ... | 88000     | 69000 |
```

For both `.groupBy()` and `.pivot()` you can use any of the supported `fr.Operations`: `sum`, `min`, `max`, `count`, `mean`, `std_dev`

## 💾 Saving Your Work

Once you're done transforming your data, you can write it back to Excel by saving it to a new sheet.

```ts
// Save the cleaned data to a new sheet
const cleaned = workbook.addWorksheet("Cleaned Data");
output.to_worksheet(cleaned);
```

### Exporting to Power Automate

If you're using this script inside a *Power Automate flow*, you can return your final table as a stringified JSON object. **Note the required modification to the `main` function**. Here you tell PowerAutomate that your script returns a `string`.

> Let’s say you've done all your data processing, and have stored the result in a variable called `output`.

```ts
function main(workbook: ExcelScript.Workbook): string{
  ... //All Data Processing
  return output.to_json()
}
```

DataFrames can also be exported:

* `to_array`: Exports as a 2D array for those comfortable with base TypeScript/Office Scripting
* `to_worksheet(worksheet, "a")`: Appends onto `worksheet` instead of overwriting it.
* `to_csv`: Exports content as *csv*, *tsv*, or any separated-value format
* `to_table(table, "o")`: Overwrites an existing table's values, matching its headers
* `to_table(table, "a")`: Appends ontto an existing table, matching its headers

---

## 🚀 Next Steps

* Read More of the [API Methods](api_reference/df_methods/basic_operations.md) section to get details on how each method works
* Check out [more examples](https://github.com/JoeyRussoniello/frosts/tree/main/examples) to see real workflows, clever tricks, and progressively harder problems
  * **Statistical analysis** to determine if a company's departments have a statistically significant gender pay gap using confidence intervals
  * **Automatic cleanup** of messy, non-tabular, or legacy-formatted data (embedded headers, noisy columns, etc.)
  * **Full ETL pipelines** entirely within Excel; Extract, transform, and load structured outputs from raw input sheets, csv or json, connecting to PowerAutomate for **FREE**
* Try Frosts on your own spreadsheets and experiment — the best way to learn is by doing!

You're now ready to start your data analysis and automation journey with Frosts!
