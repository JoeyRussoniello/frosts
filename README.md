# Frosts - An incredibly convenient pandas-inspired data science framework in Excel Office Scripts

![Frost Logo](docs/images/frosts_logo.svg)

An OfficeScript-native basic data science library designed to streamline Power Automate Excel automation, and increase the ease of use for aggregating, merging, and describing datasets entirely in Excel.

## ⚙️ Installation Instructions

Implementing frosts in your office scripts is incredibly easy! Either:

- Download `frosts.osts`, and move into your Office Scripts directory (likely: `"~/OneDrive/Documents/Office Scripts"' or similar)
- Copy and paste the contents of `frosts.ts` into an empty Office Scripts file

>*Unfortunately the current Office Scripts engine does not support imports, so a frost_template file will have to be copied for each project until this feature gets added*

## 📖 Documentation

To learn more about the specifics of frosts syntax and performance see the [Complete Namespace Guide](https://joeyrussoniello.github.io/frosts/)

## 🧊 Permafrost Compiler (Optional Frosts Minimizer)

In most cases, a deployed script won’t use every method in the `frosts` namespace — and all that extra code and documentation can unnecessarily bloat the file. This is especially important when deploying production scripts via Automate, where compactness and clarity matter.

**Permafrost** is a lightweight executable tool that strips away all unused `fr.`/`DataFrame` methods and internal JSDoc comments from your final `.osts` script. It’s useful when you want to:

- **Minimize file size** for easier pasting into Excel's Office Scripts editor  
- **Avoid clutter** by only including the methods your script actually uses  
- **Copy and share** condensed, production-ready versions of Frosts scripts

---

### 📥 Download

1. Visit the [Releases page](https://github.com/JoeyRussoniello/frosts/releases)
2. Download the correct archive for your system:

   | OS      | File                                                              |
   |---------|-------------------------------------------------------------------|
   | Windows | `permafrost-1.0.0-x86_64-pc-windows-gnu.zip`                      |
   | macOS   | `permafrost-1.0.0-x86_64-apple-darwin.tar.gz`                    |

3. Extract the file if necessary (e.g., right-click → “Extract All” on Windows)

> Note: Linux Architecture is not yet supported, but is planned for a future update
---

### Run the Tool

1. **Double-click the executable** (e.g., `permafrost.exe` on Windows)
2. You’ll see:

   ```bash
   ❄️ Welcome to Permafrost!
   What frosts file would you like to condense?
   (We'll search in Documents, Downloads, and this directory)
   ```

3. **Type the name of your `.osts` file** (e.g. `frosts.osts`). *Note: File Name Inputs are handled case-sensitively and require the .osts file extension by design*
4. The cleaned script will be:
   - ✅ Truncated to only the used methods
   - ✅ Copied to your clipboard for easy pasting into Office Scripts

The `permafrost` compiler is still in Beta, so if you fact **any accuracy issues** please submit an issue with the content of your main function (NO FR NAMESPACE). We'll work on patching any compiler bugs as quickly as possible.

---

## 🛠️ Contributions

Contributions are welcome and appreciated! If you have suggestions for improvements, bug fixes, or new features, please follow these steps:

1. **Fork** the repository.
2. **Create a branch** for your feature or bug fix.
3. **Commit** your changes with clear messages.
4. **Push** to your fork.
5. **Open a Pull Request** and describe what you’ve done.

### Guidelines

- Follow the project's code style and conventions.
- Keep your changes focused and minimal.
- Write clear, descriptive commit messages.
- If applicable, update documentation or add tests.

### Need Help?

If you're new to open source or need guidance, feel free to [open an issue](https://github.com/JoeyRussoniello/frosts/issues) or ask questions in the discussion area.

Thank you for helping make this project better! 🙌
