---
title: Welcome to Frosts
nav_order: 1
hide_footer_buttons: true
---

![Frosts Logo](images/frosts_logo.svg)

**Frosts** is a lightweight, Pandas-inspired data automation framework built for [Office Scripts](https://learn.microsoft.com/en-us/javascript/api/overview/excel) in Excel. It helps you clean, reshape, analyze, and export data — all inside Excel Online or Power Automate — using code that's easy to read and powerful to run.

---

## ❄️ What is Frosts?

Think of Frosts as **pandas for spreadsheets** — designed specifically for Excel scripting, with:

- A familiar, readable API (`df.filter()`, `df.groupBy()`, `df.pivot()`, etc.)
- Excel-aware features (formula columns, worksheet-to-JSON export, etc.)
- No external tools, libraries, or installs required

> ✨ It brings the **power of scripting** to **people who already know Excel**, and it keeps the syntax simple enough for first-timers.

---

## What Can You Do with It?

Here’s a quick guide to what the Frosts module offers:

| Feature Area         | Methods & Tools                            | What It Helps With                            |
|----------------------|---------------------------------------------|-----------------------------------------------|
| **Reading Data**     | `read_sheet`, `read_csv`, `from_table`     | Load data from worksheets or flat files       |
| **Inspecting Data**  | `print`, `head`, `shape`, `dtypes`         | Understand your dataset at a glance           |
| **Cleaning**         | `drop`, `fill_na`, `rename`, `replace_column` | Fix and format messy input                    |
| **Filtering**        | `filter`, `query`, `predicates.*`          | Focus on relevant rows or values              |
| **Aggregating**      | `groupBy`, `pivot`, `agg`                  | Summarize data by group or category           |
| **Merging & Joining**| `merge`, `concat`, `concat_all`            | Combine multiple tables                       |
| **Exporting**        | `to_json`, `to_sheet`, `to_csv`, `to_table`| Save results or connect to Power Automate     |

---

## Quickstart

If you're new to coding or Excel scripts, don’t worry — the [15-Minute Quickstart Guide](quickstart.md) will walk you through everything from setup to export.

```text
📂 Employees.xlsx
⇨ Load data
⇨ Filter and group
⇨ Save back to Excel
⇨ Or export to Power Automate
```

---

## Browse the Docs

- [Quickstart Guide](quickstart.md) – a friendly intro
- [Reading and Processing Data](api_reference/other_functions.md)
- [The fr.DataFrame](api_reference/dataframe_index.md)
  - [Essential Operations](api_reference/df_methods/basic_operations.md)
  - [Filtering](api_reference/df_methods/filtering.md)
  - [Aggregating](api_reference/df_methods/aggregation.md)
  - [Merging](api_reference/df_methods/merging.md)
  - [Exporting](api_reference/df_methods/outputs.md)

---

## Why Use Frosts?

- ✅ Easier to read than vanilla Office Scripts
- ✅ Safer and less error-prone than raw Excel logic
- ✅ Faster to debug and reuse
- ✅ Ideal for working with messy or structured tabular data

Whether you’re automating reporting pipelines, cleaning up exported spreadsheets, or integrating Excel into your Power Automate flows — Frosts keeps things readable, composable, and Excel-native.

---

Made with ❤️ by [Joey Russoniello](https://github.com/JoeyRussoniello)
