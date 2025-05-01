# ⚙️ Installation Instructions

Implementing frosts in your office scripts is incredibly easy! Either:

- Download `frosts.osts`, and move into your Office Scripts directory (likely: `"~/OneDrive/Documents/Office Scripts"' or similar)
- Copy and paste the contents of `frosts.ts` into an empty Office Scripts file

> *Unfortunately the current Office Scripts engine does not support imports, so a frost_template file will have to be copied for each project until this feature gets added*

## 🚀 Getting Started

Create a `DataFrame` by passing in a 2D array where the **first row is the header**:

```ts
const data = [
  ["Name", "Age", "Score"],
  ["Alice", 25, 88],
  ["Bob", 30, 92],
  ["Charlie", 28, 79],
];

const df = new fr.DataFrame(data);
```

Or by using one of the frost helper functions (more details on this later)

```ts
const selectedSheeet = workbook.getActiveWorksheet();
// Create a df from the entire used range in selectedSheet
let df_from_sheet = fr.read_sheet(selectedSheet);

//Create a df from a specified range;
let df_from_range = fr.read_range(selectedSheet.getRange("A1:D100"));

//Create a df from a JSON-encoded array
let df_from_json = fr.read_json(json_string);

//Create a df from Comma Separated Values
let df_from_csv = fr.read_csv(csv_string);
```

Now that you've configured your Office Script, and know the basics of initializing a DataFrame, we can start by [reading data from a source](api_reference/other_functions.md)

[Return to API Reference](/frosts)
