# ⚙️ Installation Instructions

Implementing frosts in your office scripts is incredibly easy! Either:

- Download `frosts.osts`, and move into your Office Scripts directory (likely: `"~/OneDrive/Documents/Office Scripts"' or similar)
- Copy and paste the contents of `frosts.ts` into an empty Office Scripts file

> *Unfortunately the current Office Scripts engine does not support imports, so a frost_template file will have to be copied for each project until this feature gets added*

## 🚀 Getting Started

Create a `DataFrame` by using one of the frost helper functions

```ts
const selectedSheeet = workbook.getActiveWorksheet();
// Create a df from the entire used range in selectedSheet
let df_from_sheet = frosts.df_from_sheet(selectedSheet);

//Create a df from a specified range;
let df_from_range = frosts.df_from_range(selectedSheet.getRange("A1:D100"));
```

Or by passing in a 2D array where the **first row is the header**:

```ts
const data = [
  ["Name", "Age", "Score"],
  ["Alice", 25, 88],
  ["Bob", 30, 92],
  ["Charlie", 28, 79],
];

const df = new frosts.DataFrame(data);
```

Now that you've started a .osts file, and know the basics of initializing a DataFrame, we can [start processesing data](api.md)
