---
title: 🔽 Filtering
nav_order: 2
parent: The fr.DataFrame
--- 

Frosts DataFrames offer various filtering methods, each designed for specific use cases to filter data on a given condition.

---

<!-- Frosts Collapsible TOC Block -->
## Table of Contents

<details open markdown="block">
  <summary>
    Click to Expand/Collapse
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

---

## Filter Functions

### `🔍.filter(key: string, predicate: (value) => boolean, inplace:boolean = false): DataFrame`

Filters the DataFrame to only include rows where the given column value passes the provided predicate function.

- `key` the column name to filter by
- `predicate` a function or predicate that returns a boolean that determines whether a row should be include
- `inplace (optional)`: If true, modifies the current DataFrame directly. Otherwise, only returns a new one. Default is `false`.

#### When to Use `.filter()`

Use `.filter()` for simple column-based conditions like comparisons `(>, <, =, etc.)` on individual columns.

`.filter()` can be used easily with a predicate

```ts
const adults = df.filter("Age", age => age > 18);
console.log(adults.values);
/*
[
  { Name: "Alice", Age: 28 },
  { Name: "Bob", Age: 32 },
  { Name: "Charlie", Age: 24 }
]
*/
```

with any function that takes one value as an input

```ts
const data = [
    ["Num"],
    [1],
    [2],
    [3],
    [4]
];
let df = new frosts.DataFrame(data);

function is_even(n: number){
    return n % 2 == 0;
} 

console.log(df.filter("Num", is_even));
/*
[
{Num: 2},
{Num: 4}
]
*/
```

Or with any of the built-in frosts predicates for filtering (Read More in the [Data Cleaning Section](../cleaning_data.md))

```ts
const alices = df.filter("Name",fr.predicates.equal("Alice"))
```

---

### `💬.query(condition: (row: FrostRow) => boolean): DataFrame`

Filters the DataFrame using a custom condition that is applied to each row. The condition can reference multiple columns and use logical operators for complex row-level filtering.

- `condition`:  A function that receives a `FrostRow` object and returns `true` for rows to keep, or `false` to discard.

#### When to Use `.query()`

- You need to **filter by multiple columns at once.**
- You want to use typed getters like `get_number()` or `get_string()` for clarity and safety.
- You’re chaining methods like `.encode_headers()` or `.groupBy()` and want expressive logic without messy index access.

```ts
const highEarners = df.query(row =>
  row.get_number("Salary") > 100000 && row.get_number("Age") < 50
);

console.log(highEarners.values);
/*
[
  { Name: "Alice", Age: 28, Salary: 120000 },
  { Name: "Bob", Age: 32, Salary: 150000 }
]
*/

const youngTechies = df.query(row =>
  row.get_number("Age") < 30 && row.get_string("Department") === "Engineering"
);

console.log(youngTechies.values);
/*
[
  { Name: "Alice", Age: 28, Department: "Engineering" },
  { Name: "Charlie", Age: 24, Department: "Engineering" }
]
*/
```

> Tip: You can always fall back to `row => row.raw["Column"]` if needed, but it's best to use `get_string()`, `get_number()`, and `get_boolean()` for safer logic.

---

### `✅.isin(column: string, values: Set<string | number | boolean>): DataFrame`

Filters the DataFrame to include only rows where the value in the specified column is found in the provided set.

- `columns`: The names of the column to filter by
- `values`: values a **set** containing the values to match against. The set can contain strings, numbers, or booleans.

#### When to use `.isin()`

Use `.isin()` for checking if column values are in a predefined set (e.g., filtering by categories or multiple specific values)

```ts
const cities = new Set(["NYC", "LA"]);
const coastal = df.isin("City", cities);
console.log(coastal.values);
/*
[
  { Name: "Alice", City: "NYC" },
  { Name: "Bob", City: "LA" }
]
*/
```

---

## Recap - When to Use to Each Filtering Method

- `.filter()`: Use when you need simple comparisons on a single column `(e.g., Age > 30, Salary < 50000)`.
- `.query()`: Use for complex logic involving multiple columns, logical operators `(&&, ||)`, or custom conditions `(e.g., Age > 30 && Department === 'HR')`.
- `.isin()`: Use for set membership checks, such as filtering for specific categories, states, or multiple values (e.g., State in ['CA', 'NY'], City in ['NYC', 'LA']).

---

Now that we've covered how to filter your data to focus on specific rows and columns, we can move on to [data aggregation](aggregation.md).

[Return to API Reference](/frosts)
