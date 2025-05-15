namespace fr {
    let SEPARATOR = "~~~";
    export let TYPE_DETECTION_SAMPLE_SIZE = 100;
    const DEV_SHEET_NAME = "___DEV_SHEET_NULL#859132";

    /**
     * Returns a current column separator string used internally by the framework
     * for operations like joins and reshaping.
     *
     * @returns {string} The current column separator.
     */
    export function get_separator(): string {
        return SEPARATOR;
    }

    /**
     * Sets a new internal column separator string to be used in operations such as joins
     * and reshaping. Avoid using characters that might conflict with actual column names.
     *
     * @param {string} separator - The string to use as the new column separator.
     */
    export function set_separator(separator: string) {
        SEPARATOR = separator;
    }

    /**
     * Sets a new internal sample size for DataFrame type detection. Increasing sample size
     * increases probability of accuracy, but may decrease performance
     *
     * @param {number} new_size - The number to use as the new sample size.
     */
    export function set_type_detection_sample_size(new_size: number) {
        TYPE_DETECTION_SAMPLE_SIZE = new_size;
    }

    //Helper function for DataFrame Initialization
    function column_violates_separator(key: string) {
        if (key.includes(get_separator())) {
            throw new Error(`Input key: ${key} contains the interal frost separator ${get_separator()}, this may cause unintended behavior. \n Please modify the column name using df.rename(), or change the separator value using the fr.set_separator()`);
        }
    }

    function detectTypeFromString(s: string): ("string" | "number" | "boolean") {
        if (!s) {
            s = "";
        }
        s = s.toString();
        if (/^-?\d+(\.\d+)?$/.test(s) || s == "") {
            return "number";
        }
        if (['true', 'false'].includes(s.toLocaleLowerCase())) {
            return "boolean"
        }
        else {
            return "string"
        }
    }

    //Detect the type of a column from the first and last TYPE_DETECTION_SAMPLE_SIZE/2 entries
    function detectColumn(col: string[]): ("string" | "number" | "boolean") {
        let sample: string[];

        if (col.length <= TYPE_DETECTION_SAMPLE_SIZE) {
            sample = col;
        } else {
            const half = TYPE_DETECTION_SAMPLE_SIZE / 2;
            sample = col.slice(0, half).concat(col.slice(-half));
        }

        const types = sample.map(v => detectTypeFromString(v));
        const uniqueTypes = Array.from(new Set(types));

        //If the number of types spotted ins't 1, just coerce values to string
        return uniqueTypes.length === 1 ? uniqueTypes[0] : "string";
    }
    function parseValue(input: CellValue, parse_method: ("string" | "number" | "boolean")): CellValue {
        switch (parse_method) {
            case "string": return input.toString();
            case "boolean": return input.toString() == "true";
            case "number": return parseFloat(input.toString());
            default: throw SyntaxError("Error parsing value: parsing method must be either 'string','boolean',or 'number'");
        }
    }
    /**
     * Creates a new `DataFrame` from an ExcelScript range object.
     * The first row of the range is interpreted as column headers.
     *
     * @param {ExcelScript.Range} range - The Excel range containing the table data.
     * @returns {DataFrame} A new `DataFrame` initialized with the range values.
     */
    export function read_range(range: ExcelScript.Range): DataFrame {
        return new DataFrame(range.getValues());
    }
    /**
     * Creates a `DataFrame` from the used range of a worksheet.
     * The first row of the range is treated as the column headers.
     *
     * @param {ExcelScript.Worksheet} Sheet - The worksheet to read from.
     * @returns {DataFrame} A new `DataFrame` containing the sheet's used range.
     * @throws Will throw an error if the worksheet is empty.
     */
    export function read_sheet(Sheet: ExcelScript.Worksheet): DataFrame {
        let rng = Sheet.getUsedRange();
        if (!rng) {
            throw new Error(`Input Sheet "${Sheet.getName()}" is empty, unable to create DataFrame`);
        }
        return read_range(rng);
    }
    /**
     * Parses a JSON string and returns a new `DataFrame`.
     * The JSON must represent a 2D array with the first row as column headers.
     *
     * @param {string} json - A stringified JSON array of arrays representing tabular data.
     * @returns {DataFrame} A new `DataFrame` initialized from the parsed JSON data.
     * @throws Will throw an error if the JSON is invalid or not in expected format.
     */
    export function read_json(json: string): DataFrame {
        /* Parse an input JSON-coded string to create a DataFrame*/
        return new DataFrame(JSON.parse(json))
    }
    /**
     * Creates a `DataFrame` from a worksheet range that begins after skipping a specified
     * number of rows and columns. The first row of the resulting range is treated as headers.
     *
     * @param {ExcelScript.Worksheet} Sheet - The worksheet to read from.
     * @param {number} n_rows - Number of rows to skip from the top.
     * @param {number} n_cols - Number of columns to skip from the left.
     * @returns {DataFrame} A new `DataFrame` starting at the specified offset.
     */
    export function read_after(Sheet: ExcelScript.Worksheet, n_rows: number, n_cols: number) {
        let rng = Sheet.getUsedRange();
        let new_rng = rng.getOffsetRange(n_rows, n_cols).getUsedRange();
        return read_range(new_rng);
    }
    //Helper function for CSV parsing Fixes occurences like "1,024"
    function remove_chars_within_quotes(longtext: string): string {
        //Removes line breaks and commas within quotes using a stack, runs in O(n) space and memory
        let stklen = 0;
        let newstring = ""
        for (let i = 0; i < longtext.length; i++) {
            let char = longtext[i];
            //Stack counter to determine whether we are inside double quotes
            if (char == '"') {
                if (stklen == 0) {
                    stklen = 1;
                }
                else {
                    stklen = 0;
                }
                newstring += ""
            }
            //If we are in quotes, these are problem characters.
            else if (stklen == 1 && (char == "\n" || char == ",")) {
                if (char == ",") {
                    newstring += ""
                }
                if (char == "\n") {
                    newstring += " "
                }
            }
            else {
                newstring += char
            }
        }
        return newstring
    }
    /**
     * Parses a raw CSV-formatted string and returns a new `DataFrame`.
     * Allows optional error handling and slicing from a specific starting row.
     *
     * @param {string} input_text - The CSV text to parse. Fields are expected to be comma-separated.
     * @param {"raise" | "coerce"} [errors="raise"] - Determines how to handle inconsistent row lengths:
     *   - `"raise"` throws an error if rows have unequal columns.
     *   - `"coerce"` fills shorter rows with empty strings.
     * @param {number} [start_index=0] - Row index to begin parsing from (useful to skip metadata).
     * @param {string} [line_separator="\n"] - Line delimiter to split rows (defaults to newline).
     * @returns {DataFrame} A new `DataFrame` created from the parsed CSV content.
     * @throws Will throw a `TypeError` if row lengths are inconsistent and `errors` is set to `"raise"`.
     */
    export function read_csv(input_text: string, errors: ("raise" | "coerce") = "raise", start_index: number = 0, line_separator: string = "\n"): DataFrame {
        let cleaned_text = remove_chars_within_quotes(input_text);
        let line_split_arr: string[] = [];
        //Determine splitting method, then split
        if (cleaned_text.includes(line_separator)) {
            line_split_arr = cleaned_text.split(line_separator);
            // Remove last line if it's empty or whitespace
            if (line_split_arr.length > 0 && line_split_arr[line_split_arr.length - 1].trim() === "") {
                line_split_arr.pop();
            }
        }
        else {
            console.log(`No split marker in ${cleaned_text}`);
        }

        let output: string[][] = line_split_arr.map(row => row.split(","))

        //Find sizes and reshape array to ensure that the input is square and importable

        const maxLength = output.reduce((max, row) => Math.max(max, row.length), 0);
        output.forEach(row => {
            if (row.length != maxLength) {
                if (errors == "raise") {
                    throw new TypeError("Error in CSV parsing. Rows are not all the same size. This may cause unintended behavior\nIf this is intentional, use errors='coerce'");
                }
                else {
                    while (row.length < maxLength) {
                        row.push("");
                    }
                }
            }
        });
        return new DataFrame(output.slice(start_index));
    }
    /**
     * Converts an array of cell values to an array of numbers using `parseFloat`.
     * Non-numeric or null values are converted to `NaN`.
     *
     * @param {CellValue[]} column - An array of values (strings, numbers, or nulls) to convert.
     * @returns {number[]} A numeric array with each value parsed as a float, or `NaN` if conversion fails.
     */
    export function to_numeric(column: CellValue[]): number[] {
        return column.map(row => {
            if (row == null) {
                return NaN
            }
            return parseFloat(row.toString())
        });
    }
    /**
     * Converts a JavaScript `Date` object into an Excel serial date number.
     * Optionally includes the time portion as a fractional day.
     *
     * @param {Date} jsDate - The JavaScript date to convert.
     * @param {boolean} [include_time=true] - Whether to include the time portion as a fraction.
     * @returns {number} The Excel serial date corresponding to the given `Date`.
     */
    export function toExcelDate(jsDate: Date, include_time: boolean = true): number {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel's "zero" date
        const diffInMs = jsDate.getTime() - excelEpoch.getTime();
        const excelSerialDate = diffInMs / (1000 * 60 * 60 * 24);

        if (include_time) {
            return excelSerialDate
        }
        else {
            return Math.floor(excelSerialDate);
        }
    }

    /**
     * Converts an Excel serial date number into a JavaScript `Date` object.
     * Handles both whole dates and fractional time components.
     *
     * @param {number} excelSerial - The Excel serial date number to convert.
     * @returns {Date} A JavaScript `Date` object representing the Excel date.
     */
    export function toJsDate(excelSerial: number): Date {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel's "zero" date
        const msPerDay = 24 * 60 * 60 * 1000;
        return new Date(excelEpoch.getTime() + excelSerial * msPerDay);
    }

    /**
     * The current date as an Excel serial number, excluding the time component.
     * Equivalent to `=TODAY()` in Excel.
     *
     * @constant
     * @type {number}
     */
    export const today = toExcelDate(new Date(), false);

    /**
     * Combines multiple `DataFrame` objects into a single `DataFrame`, aligning columns
     * based on the selected strategy.
     *
     * @param {DataFrame[]} dfs - An array of `DataFrame` instances to concatenate.
     * @param {"inner" | "outer" | "left"} [columnSelection="outer"] - Column alignment strategy:
     *   - `"inner"`: Keep only columns common to all DataFrames.
     *   - `"outer"`: Include all columns across all DataFrames (default).
     *   - `"left"`: Use only columns from the first DataFrame.
     * @returns {DataFrame} A new `DataFrame` resulting from the concatenation.
     * @throws {RangeError} If the input array is empty.
     */
    export function combine_dfs(dfs: DataFrame[], columnSelection: ("inner" | "outer" | "left") = "outer"): DataFrame {
        if (dfs.length == 0) {
            throw RangeError("Please input at least 1 DataFrame to use combine_dfs()")
        }
        else if (dfs.length == 1) {
            return dfs[0];
        }

        let base_df = dfs[0];
        return base_df.concat_all(columnSelection, ...dfs.slice(1));
    }

    //FROST HELPER CALLBACKS TO REDUCE REPETITIVE CODE
    export function sum(nums: number[]): number {
        return nums.reduce((acc, x) => acc + x, 0);
    }
    export function count(nums: number[]): number {
        return nums.filter(x => !isNaN(x)).length;
    }
    export function mean(nums: number[]): number {
        return sum(nums) / nums.length;
    }
    export function min(nums: number[]): number {
        return Math.min(...nums);
    }
    export function max(nums: number[]): number {
        return Math.max(...nums);
    }
    export function range(nums: number[]): number {
        return max(nums) - min(nums);
    }
    export function product(nums: number[]): number {
        return nums.reduce((acc, x) => acc * x, 1);
    }

    type BooleanPredicate = (v: CellValue) => boolean;


    export const predicates = {
        is_blank: (v: CellValue) => v == "",
        is_nan: (v: CellValue) => isNaN(Number(v)),
        /**
         * Returns a predicate that checks if a value is equal to the given target.
         * @param {CellValue} target - The value to compare against.
         * @returns {(v: CellValue) => boolean}
         */
        equal: (target: CellValue): BooleanPredicate => (v) => v == target,
        /**
         * Returns a predicate that checks if a stringified value includes a given substring.
         * @param {string} substring - The substring to search for.
         * @returns {(v: CellValue) => boolean}
         */
        includes: (substring: string): BooleanPredicate => (v) => v.toString().includes(substring),
        starts_with: (target: string): BooleanPredicate => (v) => {
            let value = v != null ? v.toString() : "";
            if (value.length < target.length) { return false }
            return value.slice(0, target.length) == target;
        },
        ends_with: (target: string): BooleanPredicate => (v) => {
            let value = v != null ? v.toString() : "";
            if (value.length < target.length) { return false }
            return value.slice(value.length - target.length) == target;
        }
    };

    /**
     * Returns the logical negation of a given predicate function.
     * Useful for inverting filter conditions.
     *
     * @param {BooleanPredicate} predicate - The predicate to negate.
     * @returns {BooleanPredicate} A new predicate that returns `true` when the original returns `false`.
     */
    export const not = (predicate: BooleanPredicate): BooleanPredicate => (v) => !predicate(v);


    export function row_to_array(row: Row): CellValue[] {
        return Object.values(row);
    }

    /**
     * Represents a single cell value in the DataFrame.
     * Can be a string, number, or boolean.
     */
    export type CellValue = string | number | boolean;

    /**
     * A loose representation of a row in the DataFrame,
     * where each key corresponds to a column name and each value is a cell.
     */
    export type Row = { [key: string]: CellValue };
    export type Operation = ("sum" | "mean" | "count" | "min" | "max" | "std_dev");

    /**
     * Represents a single row with type-safe accessors for values by column name.
     * Provides convenience methods for retrieving typed values and accessing raw data.
     */
    export interface FrostRow {
        get(key: string): CellValue;
        get_number(key: string): number;
        get_string(key: string): string;
        get_boolean(key: string): boolean;
        keys(): string[];
        raw: Row; // in case user wants to fallback
    }

    //Wrap a Row as a FrostRow. Used Internally
    function toFrostRow(row: Row): FrostRow {
        return {
            get: (key) => row[key],
            get_number: (key) => {
                const val = row[key];
                const n = Number(val);
                if (isNaN(n)) throw new TypeError(`Value for "${key}" is not a number: ${val}`);
                return n;
            },
            get_string: (key) => {
                const val = row[key];
                if (val == null) return "";
                return String(val);
            },
            get_boolean: (key) => {
                const val = row[key];
                if (typeof val === "boolean") return val;
                if (typeof val === "string") return val.toLowerCase() === "true";
                if (typeof val === "number") return val !== 0;
                return false;
            },
            keys: () => Object.keys(row),
            raw: row
        };
    }

    /**
     * A lightweight tabular data structure inspired by pandas, designed for ExcelScript.
     * Stores rows as objects with column-based access, along with metadata for structure and types.
     */

    export class DataFrame {
        columns: string[]
        __headers: Set<string>
        dtypes: { [key: string]: ("string" | "number" | "boolean") }
        values: Row[];

        /**
         * Creates a new `DataFrame` from a 2D array of values.
         * The first row is interpreted as column headers (which will be trimmed and deduplicated if necessary).
         * Remaining rows are parsed as data entries with automatic type inference per column.
         *
         * @param {CellValue[][]} data - A 2D array where the first row contains headers, and remaining rows are data.
         * @throws Will throw if input is malformed.
         */
        constructor(data: CellValue[][]) {
            let str_data = data as string[][];
            let headers = str_data[0].map(s => s.trim()); //Trim all headers
            str_data = str_data.slice(1);
            this.dtypes = {};

            //Fix duplicate headers by adding extra labels
            let times_seen = {};
            headers.forEach((header, i) => {
                if (header in times_seen) {
                    headers[i] = header + "_" + times_seen[header]
                    times_seen[header] = times_seen[header] + 1;
                }
                times_seen[header] = 1;
            })

            this.columns = headers;
            this.__headers = new Set(this.columns);
            this.values = []
            for (let row of str_data) {
                let row_values: Row = {};
                headers.forEach((header, i) => row_values[header] = row[i]);
                this.values.push(row_values);
            }

            //Enforce type security. Can check all vals in column, but this may slow down other methods
            headers.forEach((header, col_idx) => {
                this.dtypes[header] = detectColumn(str_data.map(row => row[col_idx]))
                if (this.dtypes[header] != "string" && this.values.length > 0 && typeof (this.values[0][header]) == "string") {
                    //console.log("Attempting to correct dtypes");
                    this.values.map(row => row[header] = parseValue(row[header], this.dtypes[header]));
                }
            });
        }

        is_empty(): boolean { return this.values.length == 0 }
        private __assign_inplace(other: DataFrame, inplace: boolean) {
            if (inplace) {
                this.__assign_properties(...other.__extract_properties());
            }
        };

        /**
         * Adds or replaces a column in the `DataFrame` with the provided values.
         *
         * @param {string} columnName - The name of the column to add or overwrite.
         * @param {CellValue[]} values - An array of values to assign to the column. Must match the number of rows.
         * @param {boolean} [inplace=false] - Whether to update the DataFrame in place.
         * @returns {DataFrame} A new `DataFrame` with the updated column, or the modified instance if `inplace` is `true`.
         * @throws {RangeError} If the number of input values does not match the number of rows in the DataFrame.
         */
        set_column(columnName: string, values: CellValue[], inplace: boolean = false): DataFrame {
            if (this.values.length != values.length) {
                throw new RangeError(`DataFrame and Input Dimensions Don't Match\nDataFrame has ${this.values.length} rows, while input values have ${values.length}`);
            }
            let dtype = detectColumn(values.map(row => row.toString()));
            let output = this.copy()

            if (!output.columns.includes(columnName)) {
                output.columns.push(columnName);
                output.__headers.add(columnName);
            }

            output.dtypes[columnName] = dtype;
            for (let [row, index] of output.iterrows()) {
                row[columnName] = values[index];
            }

            this.__assign_inplace(output, inplace);
            return output;
        };

        /**
         * Replaces the values of an existing column using a transformation function.
         *
         * @param {string} columnName - The name of the column to update.
         * @param {(value: CellValue, index?: number) => CellValue} fn - A function that maps each cell to a new value.
         * @param {boolean} [inplace=false] - Whether to modify the `DataFrame` in place.
         * @returns {DataFrame} A new `DataFrame` with the transformed column, or the modified instance if `inplace` is `true`.
         * @throws {Error} If the specified column does not exist.
         */
        replace_column(columnName: string, fn: (value: CellValue, index?: number) => CellValue, inplace: boolean = false): DataFrame {
            this.__check_membership(columnName);
            let corrected_vals = this.get_column(columnName).map((v, i) => fn(v, i))
            return this.set_column(columnName, corrected_vals, inplace);
        }

        /**
         * Checks if the column exists in the `DataFrame`.
         *
         * @param {string} columnName - The column to check.
         * @returns {boolean} `true` if the column exists, otherwise `false`.
         */
        has_column(columnName: string): boolean {
            return this.__headers.has(columnName);
        }

        /**
         * Converts the `DataFrame` to a 2D array of values.
         *
         * @param {boolean} [headers=true] - Whether to include the column headers as the first row.
         * @returns {CellValue[][]} The data as a 2D array.
         */
        to_array(headers: boolean = true): CellValue[][] {
            if (headers) {
                return [this.columns, ...this.values.map(row => Object.values(row))];
            }
            else {
                return this.values.map(row => Object.values(row))
            }
        }

        private __check_membership(key: string) {
            if (!(this.__headers.has(key))) {
                throw RangeError(`Key: "${key}" not found in df.\nDf Headers: ${this.columns}`);
            }
        }

        private __check_numeric(column: string): number[] {
            this.__check_membership(column);

            const dtype = this.dtypes[column];
            if (dtype !== "number") {
                throw new TypeError(`Column "${column}" is not numeric. Detected type: "${dtype}"`);
            }

            return this.values
                .map(row => row[column])
                .filter(val => typeof val === "number") as number[];
        }

        private __extract_properties(): [string[], { [key: string]: ("string" | "number" | "boolean") }, Row[]] {
            // Get all of the developer properties of the DataFrame
            return [this.columns, this.dtypes, this.values];
        }

        private __assign_properties(columns: string[], dtypes: { [key: string]: ("string" | "number" | "boolean") }, values: Row[]) {
            /* Manually overwrite all of the properties of the DataFrame */
            this.columns = columns;
            this.dtypes = dtypes;
            this.values = values;
            this.__headers = new Set(columns);
        }

        /**
         * Concatenates this `DataFrame` with another, aligning columns based on the selected strategy.
         *
         * @param {DataFrame} other - The DataFrame to append below the current one.
         * @param {"inner" | "outer" | "left"} [columnSelection="outer"] - Column alignment strategy:
         *   - `"inner"`: Use only columns common to both DataFrames.
         *   - `"outer"`: Include all columns from both DataFrames.
         *   - `"left"`: Use only columns from the current DataFrame.
         * @returns {DataFrame} A new `DataFrame` with the combined rows.
         */
        concat(other: DataFrame, columnSelection: ("inner" | "outer" | "left") = "outer"): DataFrame {
            let other_cols = other.columns;

            let columns: string[];
            switch (columnSelection) {
                case "inner":
                    //List of columns is all shared columns;
                    columns = this.columns.filter(col => other.__headers.has(col));
                    break;
                case "outer":
                    let a = this.columns;
                    let b = other.columns;

                    //List of columns is all from a, then all from b that aren't in a.
                    columns = a.concat(b.filter(col => !this.__headers.has(col)))
                    break;
                case "left":
                    //List of columns is simply the columns in this df
                    columns = this.columns;
                    break;
            }

            // Helper to align rows to the unified column set
            function alignRow(row: Row, columns: string[]): Row {
                const aligned: Row = {};
                for (const col of columns) {
                    aligned[col] = row[col] ?? null; // Fill missing with null
                }
                return aligned;
            }

            const newData: Row[] = [
                ...this.values.map(row => alignRow(row, columns)),
                ...other.values.map(row => alignRow(row, columns)),
            ];

            // Convert back to array-of-arrays for constructor: [columns, ...rows]
            const dataAsMatrix: (CellValue)[][] = [
                columns,
                ...newData.map(row => columns.map(col => row[col])),
            ];

            return new DataFrame(dataAsMatrix);
        }

        concat_all(columnSelection: "inner" | "outer" | "left" = "outer", ...others: DataFrame[]): DataFrame {
            const all_dfs = [this, ...others];
            let columnSet: string[];

            // Resolve unified column set based on strategy
            switch (columnSelection) {
                case "inner":
                    // Intersect headers across all DataFrames
                    const shared = all_dfs.map(df => df.__headers);
                    const intersection = shared.reduce((a, b) => {
                        return new Set(Array.from(a).filter(x => b.has(x)));
                    });

                    // Preserve order from this.columns
                    columnSet = this.columns.filter(col => intersection.has(col));
                    break;
                case "outer":
                    const outerSet = new Set<string>();
                    all_dfs.forEach(df => df.columns.forEach(col => outerSet.add(col)));
                    columnSet = Array.from(outerSet);
                    break;
                case "left":
                    columnSet = [...this.columns];
                    break;
            }

            // Align a single row to unified columns
            function alignRow(row: Row, columns: string[]): Row {
                const aligned: Row = {};
                for (const col of columns) {
                    aligned[col] = row[col] !== undefined ? row[col] : "";
                }
                return aligned;
            }

            const end_size = all_dfs.reduce((sum, df) => sum + df.values.length, 0);

            //Align all rows in the combined dfs
            let allRows: Row[] = new Array(end_size);

            let rowIndex = 0;
            for (const df of all_dfs) {
                for (const row of df.values) {
                    allRows[rowIndex++] = alignRow(row, columnSet);
                }
            }

            // Build array-of-arrays for DataFrame constructor
            const dataMatrix: (CellValue)[][] = [
                columnSet,
                ...allRows.map(row => columnSet.map(col => row[col]))
            ];

            return new DataFrame(dataMatrix);
        }

        /**
         * Returns a deep copy of the DataFrame.
         */
        copy(): DataFrame {
            // Use JSON to force a deep copy
            return new DataFrame(JSON.parse(JSON.stringify(this.to_array())));
        }

        /**
         * Returns the dimensions of the DataFrame as [rows, columns].
         */
        shape(): [number, number] {
            return [this.values.length, this.columns.length]
        }

        /**
         * Returns all values from the specified column.
         *
         * @param {string} key - The column name.
         */
        get_column(key: string): CellValue[] {
            this.__check_membership(key);
            return this.values.map(row => row[key]);
        }
        /**
         * Returns a new `DataFrame` containing only the specified columns.
         *
         * @param {...string[]} keys - Column names to extract.
         */
        get_columns(...keys: string[]): DataFrame {
            //Check that all keys are present in the df
            keys.forEach(key => this.__check_membership(key));

            let values = this.values.map(row => {
                return keys.map(key => row[key]);
            });

            return new DataFrame([keys, ...values]);
        }
        /**
         * Returns a new `DataFrame` without the specified columns.
         *
         * @param {...string[]} columnsToDrop - Columns to remove.
         */
        drop(...columnsToDrop: string[]): DataFrame {
            // Ensure all columns exist before proceeding
            columnsToDrop.forEach(col => this.__check_membership(col));

            // New columns excluding the dropped ones
            const newColumns = this.columns.filter(col => !columnsToDrop.includes(col));

            // New values excluding the dropped columns
            const newValues = this.values.map(row => {
                let newRow: Row = {};
                newColumns.forEach(col => newRow[col] = row[col]); // Keep only selected columns
                return newRow;
            });

            // Convert to DataFrame format
            const resultData = [newColumns, ...newValues.map(row => newColumns.map(col => row[col]))];


            return new DataFrame(resultData);
        }

        /**
         * Filters the `DataFrame` by applying a predicate function to a specific column.
         * Only rows where the predicate returns `true` are retained.
         *
         * @param {string} key - The column to apply the filter on.
         * @param {(value: CellValue) => boolean} predicate - A function that determines if a row should be kept.
         * @param {boolean} [inplace=false] - Whether to modify the current `DataFrame` in place.
         * @returns {DataFrame} A new `DataFrame` containing only the rows that match the condition,
         *                      or the modified instance if `inplace` is `true`.
         * @throws Will throw an error if the specified column does not exist.
         */
        filter(key: string, predicate: (value: CellValue) => boolean, inplace: boolean = false): DataFrame {
            // Check if the key exists in the dataframe
            this.__check_membership(key);

            // Filter rows based on the predicate function
            const filteredValues = this.values.filter(row => predicate(row[key]));

            // Create a new DataFrame with only the filtered rows
            let output = new DataFrame([this.columns, ...filteredValues.map(row => this.columns.map(col => row[col]))]);

            this.__assign_inplace(output, inplace);
            return output;
        }

        // 1. Count non-null values per column
        count(column: string): number {
            this.__check_membership(column);

            return this.values.filter(row => row[column] !== null && row[column] !== undefined && row[column] !== "").length;
        }

        // 2. Sum of numeric column values
        sum(column: string): number {
            const values = this.__check_numeric(column);
            return sum(values)
        }

        // 3. Mean (Average) of a numeric column
        mean(column: string): number {
            const values = this.__check_numeric(column);
            return mean(values)
        }

        // Alias for mean
        average(column: string): number {
            return this.mean(column);
        }

        // 4. Minimum value in a numeric column
        min(column: string): number {
            const values = this.__check_numeric(column);
            return min(values)
        }

        // 5. Maximum value in a numeric column
        max(column: string): number {
            const values = this.__check_numeric(column);
            return max(values)
        }

        // 6. Standard Deviation in a numeric columns
        std_dev(column: string, bessel: boolean = true): number {
            const values = this.__check_numeric(column);
            const n = values.length;
            if (n <= 1) return NaN;

            const mean = values.reduce((acc, val) => acc + val, 0) / n;
            const divisor = bessel ? n - 1 : n;

            return Math.sqrt(
                values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / divisor
            );
        }

        //7. Quantiles
        quantile(column: string, q: number): number {
            this.__check_numeric(column); // Ensure the column is numeric
            const values = this.__check_numeric(column).sort((a, b) => a - b); // Sort values
            const pos = (values.length - 1) * q / 100;
            const base = Math.floor(pos);
            const rest = pos - base;

            if (values[base + 1] !== undefined) {
                return values[base] + rest * (values[base + 1] - values[base]);
            } else {
                return values[base];
            }
        }

        //8. Median
        median(column: string): number {
            return this.quantile(column, 50);
        }

        /**
         * Returns a new `DataFrame` containing the unique combinations of values
         * from the specified columns, preserving order of first appearance.
         *
         * @param {...string[]} columns - Columns to use when identifying unique rows.
         * @returns {DataFrame} A new `DataFrame` with one row per unique value combination.
         * @throws Will throw an error if any specified column does not exist.
         */
        unique(...columns: string[]): DataFrame {
            columns.forEach(c => this.__check_membership(c));

            let combinations_seen = new Set();

            let output: CellValue[][] = [];
            for (let [row, index] of this.iterrows()) {
                const combo = columns.map(c => row[c]);

                let key = JSON.stringify(combo);

                if (!combinations_seen.has(key)) {
                    combinations_seen.add(key);
                    output.push(combo);
                }
            }

            return new DataFrame([columns, ...output]);
        }

        getNumericColumns(): string[] {
            return this.columns.filter(col => this.dtypes[col] === "number");
        }

        /**
         * Generates a statistical summary for the specified numeric columns.
         * If no columns are specified, all numeric columns in the `DataFrame` are used.
         *
         * Summary includes: Count, Mean, Standard Deviation, Min, 1st Quartile,
         * Median, 3rd Quartile, and Max.
         *
         * @param {...string[]} columns - Optional list of numeric columns to summarize.
         * @returns {DataFrame} A new `DataFrame` with one row per column and one column per summary statistic.
         */
        describe(...columns: string[]): DataFrame {
            const numericCols = columns.length > 0 ? columns : this.getNumericColumns();

            const stats = [
                "Count",
                "Mean",
                "Standard Deviation",
                "Minimum",
                "1st Quartile",
                "Median",
                "3rd Quartile",
                "Maximum"
            ];

            const summaryMap: { [col: string]: (string | number)[] } = {};

            for (let col of numericCols) {
                summaryMap[col] = [];

                for (let stat of stats) {
                    switch (stat) {
                        case "Count":
                            summaryMap[col].push(this.count(col));
                            break;
                        case "Mean":
                            summaryMap[col].push(this.mean(col));
                            break;
                        case "Standard Deviation":
                            summaryMap[col].push(this.std_dev(col));
                            break;
                        case "Minimum":
                            summaryMap[col].push(this.min(col));
                            break;
                        case "1st Quartile":
                            summaryMap[col].push(this.quantile(col, 25));
                            break;
                        case "Median":
                            summaryMap[col].push(this.median(col));
                            break;
                        case "3rd Quartile":
                            summaryMap[col].push(this.quantile(col, 75));
                            break;
                        case "Maximum":
                            summaryMap[col].push(this.max(col));
                            break;
                    }
                }
            }

            const summaryRows: (string | number)[][] = [];

            for (let col of numericCols) {
                summaryRows.push([col, ...summaryMap[col]]);
            }

            return new DataFrame([
                ["Column", ...stats],
                ...summaryRows
            ]);
        }

        /**
         * Groups the DataFrame by one or more key columns and applies aggregations to specified value columns.
         *
         * @param group_keys - Column(s) to group by.
         * @param aggregations - An object mapping each value column to one or more aggregation operations.
         *
         * Supported operations: "sum", "mean", "count", "min", "max", "std_dev"
         *
         * @returns A new DataFrame with aggregated results.
         */
        groupBy(
            group_keys: string[] | string,
            aggregations: { [col: string]: Operation | Operation[] }
        ): DataFrame {
            type Operation = "sum" | "mean" | "count" | "min" | "max" | "std_dev";

            const keys: string[] = typeof group_keys === "string" ? [group_keys] : group_keys;
            keys.forEach(key => this.__check_membership(key));
            keys.forEach(key => column_violates_separator(key));

            const valueColumns: string[] = [];
            const aggFunctions: Operation[] = [];

            for (const col in aggregations) {
                this.__check_membership(col);

                let operations = aggregations[col];
                let ops: Operation[];

                if (typeof (operations) == "string") {
                    ops = [operations]
                }
                else {
                    ops = operations;
                }

                for (const op of ops) {
                    valueColumns.push(col);
                    aggFunctions.push(op);
                }
            }

            const grouped: { [groupKey: string]: Row[] } = {};
            for (const row of this.values) {
                const groupKey = keys.map(k => row[k]).join(SEPARATOR);
                if (!grouped[groupKey]) grouped[groupKey] = [];
                grouped[groupKey].push(row);
            }

            const resultHeaders: string[] = [...keys];
            valueColumns.forEach((col, idx) => {
                resultHeaders.push(`${col}_${aggFunctions[idx]}`);
            });

            const resultRows: CellValue[][] = [];

            for (const groupKey in grouped) {
                const groupDF = new DataFrame([this.columns, ...grouped[groupKey].map(row => this.columns.map(col => row[col]))]);
                const keyParts = groupKey.split(SEPARATOR);
                const resultRow: CellValue[] = [...keyParts];

                valueColumns.forEach((col, idx) => {
                    const func = aggFunctions[idx];
                    let value: number;

                    switch (func) {
                        case "sum":
                            value = groupDF.sum(col);
                            break;
                        case "mean":
                            value = groupDF.mean(col);
                            break;
                        case "count":
                            value = groupDF.count(col);
                            break;
                        case "min":
                            value = groupDF.min(col);
                            break;
                        case "max":
                            value = groupDF.max(col);
                            break;
                        case "std_dev":
                            value = groupDF.std_dev(col);
                            break;
                        default:
                            throw new Error(`Unsupported operation: ${func}`);
                    }

                    resultRow.push(value);
                });

                resultRows.push(resultRow);
            }

            return new DataFrame([resultHeaders, ...resultRows]);
        }

        /**
         * Filters the `DataFrame` using a custom condition applied to each row.
         * Rows are passed to the condition as `FrostRow` objects for typed, column-based access.
         *
         * @param {(row: FrostRow) => boolean} condition - A function that returns `true` for rows to keep.
         * @returns {DataFrame} A new `DataFrame` with only the rows that satisfy the condition.
         */
        query(condition: (row: FrostRow) => boolean): DataFrame {
            // Filter rows based on the provided condition function
            const filteredValues = this.values.filter(row => condition(toFrostRow(row)));

            // Convert filtered values into the DataFrame format
            const resultData = [this.columns, ...filteredValues.map(row =>
                this.columns.map(col => row[col])
            )];

            return new DataFrame(resultData);
        }

        private __set_membership(column: string, values: Set<CellValue>, isin: boolean): DataFrame {
            this.__check_membership(column); // make sure column exists

            // Filter rows where the column's value is in the Set
            let filtered_rows: Row[] = [];
            if (isin) { filtered_rows = this.values.filter(row => values.has(row[column])); }
            else { filtered_rows = this.values.filter(row => !values.has(row[column])) }

            // Rebuild data array for new DataFrame
            const dataArray = [
                this.columns,
                ...filtered_rows.map(row => this.columns.map(col => row[col]))
            ];

            return new DataFrame(dataArray);
        }

        /**
         * Keeps rows where the column value is in the values set.
         */
        is_in(column: string, values: Set<CellValue>): DataFrame {
            return this.__set_membership(column, values, true);
        }

        /**
         * Keeps rows where the column value is not in the values set.
         */
        isnt_in(column: string, values: Set<CellValue>): DataFrame {
            return this.__set_membership(column, values, false);
        }

        /**
         * Sorts the `DataFrame` by one or more columns.
         *
         * @param {{ [column: string]: boolean }} sortSpec - Keys are column names; values indicate ascending (`true`) or descending (`false`).
         * @param {boolean} [inplace=false] - Whether to apply the sort in place.
         * @returns {DataFrame} A new sorted `DataFrame`, or the modified instance if `inplace` is `true`.
         * @throws Will throw if any specified column does not exist.
         */
        sortBy(sortSpec: { [column: string]: boolean }, inplace: boolean = false): DataFrame {
            const columns = Object.keys(sortSpec);
            const directions = columns.map(col => {
                this.__check_membership(col);
                return sortSpec[col] ? 1 : -1;
            });

            const sortedRows = [...this.values].sort((rowA, rowB) => {
                for (let i = 0; i < columns.length; i++) {
                    const col = columns[i];
                    const dir = directions[i];
                    if (rowA[col] < rowB[col]) return -dir;
                    if (rowA[col] > rowB[col]) return dir;
                }
                return 0;
            });

            const dataArray = [
                this.columns,
                ...sortedRows.map(row => this.columns.map(col => row[col]))
            ];

            const output = new DataFrame(dataArray);
            this.__assign_inplace(output, inplace);
            return output;
        }

        /**
         * Merges this `DataFrame` with another based on shared key columns.
         * Supports `inner`, `left`, and `outer` joins.
         *
         * @param {DataFrame} other - The DataFrame to join with.
         * @param {string[]} on - Columns to join on. Must exist in both DataFrames.
         * @param {"inner" | "left" | "outer"} [how="inner"] - Join type:
         *   - `"inner"`: Only rows with matching keys in both DataFrames.
         *   - `"left"`: All rows from this DataFrame, matched with the other.
         *   - `"outer"`: All rows from both DataFrames, matched where possible.
         * @returns {DataFrame} A new `DataFrame` containing the joined result.
         * @throws Will throw if any join column does not exist in either DataFrame.
         */
        merge(other: DataFrame, on: string[], how: "inner" | "left" | "outer" = "inner"): DataFrame {
            // Ensure columns to join on exist in both DataFrames
            on.forEach(col => {
                this.__check_membership(col);
                other.__check_membership(col);
            });

            // Join rows based on the selected `how` type
            let mergedRows: Row[] = [];

            switch (how) {
                case "inner":
                    // Perform an inner join (only matching rows)
                    mergedRows = this.values.filter(row =>
                        other.values.some(oRow => on.every(col => row[col] === oRow[col]))
                    ).map(row => {
                        const matchedRows = other.values.filter(oRow =>
                            on.every(col => row[col] === oRow[col])
                        );
                        return matchedRows.length > 0 ? { ...row, ...matchedRows[0] } : row;
                    });
                    break;

                case "left":
                    // Perform a left join (all rows from the left DataFrame and matching rows from the right)
                    mergedRows = this.values.map(row => {
                        const matchedRows = other.values.filter(oRow =>
                            on.every(col => row[col] === oRow[col])
                        );
                        return matchedRows.length > 0 ? { ...row, ...matchedRows[0] } : row;
                    });
                    break;

                case "outer":
                    // Perform an outer join (all rows from both DataFrames, matching where possible)
                    mergedRows = [
                        ...this.values.map(row => {
                            const matchedRows = other.values.filter(oRow =>
                                on.every(col => row[col] === oRow[col])
                            );
                            return matchedRows.length > 0 ? { ...row, ...matchedRows[0] } : row;
                        }),
                        ...other.values.filter(oRow =>
                            !this.values.some(row =>
                                on.every(col => row[col] === oRow[col])
                            )
                        )
                    ];
                    break;

                default:
                    throw new Error("Invalid join type. Use 'inner', 'left', or 'outer'.");
            }

            // Combine the columns of both DataFrames, keeping the 'on' columns intact
            const mergedColumns = [
                ...this.columns, // Keep the columns from the left DataFrame
                ...other.columns.filter(col => !on.includes(col)) // Exclude duplicate 'on' columns from the right DataFrame
            ];

            // Rebuild the data array for the new merged DataFrame
            const dataArray = [
                mergedColumns,
                ...mergedRows.map(row => mergedColumns.map(col => row[col] || "")) // Handle any missing values
            ];

            return new DataFrame(dataArray);
        }

        /**
         * Returns an array of `[row, index]` pairs for iteration.
         * Useful for applying logic row-by-row with access to the row's position.
         */
        iterrows(): [Row, number][] {
            return this.values.map((row, idx) => [row, idx]);
        }

        /**
         * Converts the DataFrame to a JSON string.
         * Includes headers as the first row if `headers` is true (default).
         */
        to_json(headers: boolean = true): string {
            return JSON.stringify(this.to_array(headers));
        }

        /**
         * Renames one or more columns in the `DataFrame` using a mapping of old to new names.
         *
         * @param {{ [oldName: string]: string }} columnsMap - A mapping from existing column names to new names.
         * @param {boolean} [inplace=false] - Whether to modify the DataFrame in place.
         * @returns {DataFrame} A new `DataFrame` with updated column names, or the modified instance if `inplace` is `true`.
         * @throws Will throw if any column in the map does not exist.
         */
        rename(columnsMap: { [oldName: string]: string }, inplace: boolean = false): DataFrame {
            // Make sure all keys in columnsMap exist in the DataFrame
            for (let oldCol in columnsMap) {
                this.__check_membership(oldCol);
            }

            // Create new columns array by replacing old column names with new ones
            const newColumns = this.columns.map(col => columnsMap[col] || col);

            // Rebuild the data array with updated headers

            let output = new DataFrame([newColumns, ...this.to_array(false)]);

            this.__assign_inplace(output, inplace)
            return output
        }


        fill_na(columnName: (string | string[] | "ALL"), method: ("prev" | "next" | "value"), value?: CellValue): DataFrame {
            if (typeof columnName != "string" || columnName == "ALL") {
                let columns: string[];
                if (columnName == "ALL") {
                    columns = this.columns;
                }
                else {
                    columns = columnName;
                }

                let df = this.copy()
                columns.forEach(c => df = df.fill_na(c, method, value));
                return df;
            }
            else {
                this.__check_membership(columnName);

                //Deep copy before
                let df = this.copy();

                let replace_value: CellValue;
                switch (method) {
                    case "prev":
                        let warnings: number[] = [];
                        for (let [row, index] of df.iterrows()) {
                            if (row[columnName] != "") {
                                replace_value = row[columnName];
                            }
                            else {
                                if (replace_value == null) {
                                    warnings.push(index);
                                }
                                row[columnName] = replace_value;
                            }
                        }

                        if (warnings.length > 0) {
                            console.log(`WARNING: not all values were replaced (no header value to assign)\nMissed values in rows: ${warnings}`);
                        }
                        break;
                    case "next":
                        let to_replace: number[] = [];
                        for (let [row, index] of df.iterrows()) {
                            if (row[columnName] == "") {
                                to_replace.push(index);
                            }
                            else {
                                replace_value = row[columnName];
                                while (to_replace.length > 0) {
                                    df.values[to_replace.pop()][columnName] = replace_value;
                                }
                            }
                        }

                        //If there are non-replaced values at the end of iteration log a warning
                        if (to_replace.length > 0) {
                            console.log(`WARNING: not all values were replaced (no bottom value to assign)\nMissed values in rows: ${to_replace}`);
                        }
                        break;
                    case "value":
                        if (value == null) {
                            throw new SyntaxError('If fillNa() method is "value" a value argument must be provided');
                        }
                        df.values.filter(row => row[columnName] == null).forEach(row => row[columnName] = value);
                        break;
                    default: throw new SyntaxError('fillNa() method must be "prev", "next", or "value"')
                }
                return df;
            }
        }
        /**
         * Adds a new column filled with the same Excel formula across all rows.
         * This is useful for injecting dynamic calculations like dates, text parsing, or math operations,
         * and is especially helpful when used before calling `.hardcode_formulas()` to evaluate them.
         *
         * **Important:** Formulas must use **structured table references** (e.g., `[@ColumnName]`),
         * not standard A1 cell references. For example:
         * 
         * - `=YEAR([@Date])`
         * - `=CONCATENATE([@First Name], " ", [@Last Name])`
         * - `=IF([@Bonus] > 1000, "Yes", "No")`
         *
         * @param columnName - Name of the new column to be added.
         * @param formula - Excel-style formula string (starting with `=`) using structured references.
         * @param inplace - If true, modifies the current DataFrame. Otherwise, returns a new one. Default is false.
         * 
         * @returns The updated DataFrame (new or modified in-place).
         */
        add_formula_column(columnName: string, formula: string, inplace: boolean = false): DataFrame {
            let formula_col: string[] = Array(this.shape()[0]).fill(formula);
            return this.set_column(columnName, formula_col, inplace);
        }


        to_worksheet(worksheet: ExcelScript.Worksheet, method: ("o" | "a") = "o") {
            //Include headers only when overwriting
            let export_array: CellValue[][] = this.to_array(method == "o");
            let export_range: ExcelScript.Range;
            let [n_rows, n_cols] = this.shape();

            //Overwrite logic
            if (method == "o") {
                //Overwrite the sheet
                worksheet.getUsedRange()?.setValue("");
                //Get entire export range
                export_range = worksheet.getRange("A1").getResizedRange(n_rows, n_cols - 1)
                //Import Just Headers for Property Table Initializations (with names)
                let header_range = worksheet.getRange("A1").getResizedRange(0, n_cols - 1);
                header_range.setValues([this.columns]);
                //Then try to set a table to the export range
                try {
                    worksheet.addTable(export_range, true);
                }
                catch {
                    console.log(`A table already exists at ${export_range.getAddressLocal()}, proceeding anyways.`);
                }
            }
            //Append logic
            else if (method == "a") {
                let used_rng = worksheet.getUsedRange();
                if (used_rng == null) {
                    //Recursively use overwrite logic if the appending sheet is empty
                    return this.to_worksheet(worksheet, "o");
                }
                //Last row of the existing worksheet
                let end_row = worksheet.getUsedRange().getLastRow()
                //First cell of the import area
                let start_rng = end_row.getOffsetRange(1, 0).getColumn(0);
                export_range = start_rng.getResizedRange(n_rows - 1, n_cols - 1);
            }
            else {
                throw new SyntaxError("Sheet export method must either be 'o' to overwrite or 'a' to append")
            }


            //Import all values (including the headers again);
            export_range.setValues(export_array);

            //Print a helpful message if this export wasn't done as a helper method
            if (worksheet.getName() != DEV_SHEET_NAME) {
                console.log(`Dataframe Written to ${export_range.getAddressLocal()}`);
            }
            //*/
        }

        hardcode_formulas(workbook: ExcelScript.Workbook, inplace: boolean = true): DataFrame {
            /*
              Calculate and Hardcode all formula results in the input df. 
              Used to aggregate formula based calculations
            */
            let ExportSheet = workbook.addWorksheet(DEV_SHEET_NAME);
            try {
                this.to_worksheet(ExportSheet, 'o');
            }
            catch {
                //Delete sheet after catching an error
                ExportSheet.delete();
                throw new SyntaxError("Error writing formulas to workbook. Likely incorrect formula syntax");
            }

            let calculated_df = fr.read_sheet(ExportSheet)
            ExportSheet.delete();

            this.__assign_inplace(calculated_df, inplace);
            return calculated_df
        }

        /**
         * Converts the DataFrame to a CSV string.
         * Optionally includes headers and custom separator.
         */
        to_csv(headers: boolean = true, separator: string = ","): string {
            return this.to_array(headers).map(row => row.join(separator)).join("\n");
        }

        /**
         * Converts columns into row entries for long-format reshaping.
         *
         * @param newColumnName - Name for the column holding former column names.
         * @param newValueName - Name for the column holding values.
         * @param columns - Columns to unpivot.
         */
        melt(newColumnName: string, newValueName: string, ...columns: string[]): DataFrame {
            columns.forEach(col => this.__check_membership(col));

            let cols_set = new Set(columns);
            let other_cols = Array.from(this.__headers).filter(col => !cols_set.has(col));
            let output_values: CellValue[][] = [[...other_cols, newColumnName, newValueName]];

            for (let row of this.values) {
                let other_vals = other_cols.map(col => row[col]);
                columns.forEach(col => {
                    let val = row[col]
                    output_values.push([...other_vals, col, val]);
                });
            }
            //console.log(output_values);
            return new DataFrame(output_values);
        }

        /**
         * Like `melt`, but unpivots all columns except the specified ones.
         *
         * @param newColumnName - Name for the column holding former column names.
         * @param newValueName - Name for the column holding values.
         * @param exceptColumns - Columns to exclude from melting.
         */
        melt_except(newColumnName: string, newValueName: string, ...exceptColumns: string[]): DataFrame {
            exceptColumns.forEach(col => this.__check_membership(col));

            let cols_set = new Set(exceptColumns);
            let melt_cols = Array.from(this.__headers).filter(col => !cols_set.has(col));
            return this.melt(newColumnName, newValueName, ...melt_cols);
        }

        /**
         * Applies a function to each row in the `DataFrame` and returns the results as an array.
         * Each row is passed as a `FrostRow` for structured access.
         *
         * @param fn - Function to apply to each row.
         * @returns An array of results from applying the function.
         */
        apply<T>(fn: (row: FrostRow) => T): T[] {
            return this.values.map(row => fn(toFrostRow(row)));
        }

        private __apply_typed<T>(
            fn: (row: { [key: string]: T }) => T,
            caster: (v: CellValue) => T
        ): T[] {
            return this.values.map(original_row => {
                const typed_row: { [key: string]: T } = {};
                Object.entries(original_row).forEach(([key, value]) => {
                    typed_row[key] = caster(value);
                });
                return fn(typed_row);
            });
        }

        /** Applies a numeric function to each row and returns the results. */
        apply_numeric(fn: (row: { [key: string]: number }) => number): number[] {
            return this.__apply_typed(fn, Number);
        }
        /** Applies a string function to each row and returns the results. */
        apply_string(fn: (row: { [key: string]: string }) => string): string[] {
            return this.__apply_typed(fn, String);
        }

        /** 
            * Applies a function to numeric values from the specified columns of each row.
            * Returns an array of results.
            *
            * @param fn - Function to apply to the selected numeric values.
            * @param columns - Columns to extract numeric values from.
            * @returns An array of computed results for each row.
            */
        map_cols_numeric(fn: (values: number[]) => number, ...columns: string[]): number[] {
            //Check that all columns are in the df, and that they're numeric
            columns.forEach(c => {
                this.__check_membership(c);
                this.__check_numeric(c);
            })

            return this.values.map(row => {
                const nums = columns.map(c => Number(row[c]));
                return fn(nums);
            })
        }


        /**
         * Removes rows at the specified indices and returns a new `DataFrame`.
         * Supports negative indices, which count from the end.
         *
         * @param {...number[]} rows - Row indices to drop. Negative values count from the end.
         * @returns {DataFrame} A new `DataFrame` without the specified rows.
         * @throws {RangeError} If an index exceeds the number of rows.
         */
        drop_rows(...rows: number[]): DataFrame {
            let df = this.copy();

            let to_avoid = new Set(rows.map(row => {
                if (row >= 0) { return row }
                else {
                    let adjusted = this.values.length + row;
                    if (adjusted < 0) {
                        throw new RangeError(`Not enough rows in DataFrame\nInput ${row}, while df has ${this.values.length} rows`);
                    }
                    return adjusted;
                }
            }));

            df.values = df.values.filter((_, index) => !to_avoid.has(index));
            return df;
        }


        /** Returns the first `n` rows as a new DataFrame. */
        head(n_rows: number = 10): DataFrame {
            if (this.values.length <= n_rows) { return this }
            let df = this.copy();
            df.values = this.values.slice(0, n_rows);
            return df;
        }

        /** Returns the last `n` rows as a new DataFrame. */
        tail(n_rows: number = 10): DataFrame {
            if (this.values.length <= n_rows) { return this }
            let df = this.copy();
            df.values = this.values.slice(this.values.length - n_rows);
            return df;
        }

        print(n_rows: number = 5) {
            const totalRows = this.values.length;
            const totalCols = this.columns.length;
            const headers = this.columns;

            const headRows = this.head(n_rows).values;
            const tailRows = this.tail(n_rows).values;
            const rowsToPrint = totalRows <= n_rows * 2 ? this.values : [...headRows, "...", ...tailRows];

            let displayColumns: string[];
            let colIndices: number[];

            if (totalCols <= 4) {
                displayColumns = [...headers];
                colIndices = displayColumns.map((_, i) => i);
            } else {
                // Truncate: first 2, ..., last 2
                displayColumns = [
                    ...headers.slice(0, 2),
                    "...",
                    ...headers.slice(-2)
                ];

                colIndices = [
                    ...[0, 1],
                    -1, // placeholder for ellipsis
                    ...[totalCols - 2, totalCols - 1]
                ];
            }

            // Prepare display rows
            const dataArray = rowsToPrint.map(row => {
                if (row === "...") return "...";

                return colIndices.map(idx => {
                    if (idx === -1) return "...";
                    const col = headers[idx];
                    return row[col] !== undefined ? String(row[col]) : "";
                });
            });

            // Compute column widths
            const colWidths = displayColumns.map((col, i) => {
                return Math.max(
                    col.length,
                    ...dataArray.map(row => row === "..." ? 3 : (row[i]?.length || 0))
                );
            });

            const pad = (text: string, width: number) => text.padEnd(width, " ");

            // Render header + divider
            const headerRow = "| " + displayColumns.map((h, i) => pad(h, colWidths[i])).join(" | ") + " |";
            const divider = "| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |";

            // Render each data row
            const dataRows = dataArray.map(row => {
                if (row === "...") {
                    return "| " + colWidths.map(w => pad("...", w)).join(" | ") + " |";
                }
                return "| " + row.map((val, i) => pad(val, colWidths[i])).join(" | ") + " |";
            });

            const [n_rows_df, n_cols_df] = this.shape();
            const size_statement = `(${n_rows_df} rows x ${n_cols_df} columns)`;

            console.log([headerRow, divider, ...dataRows, "", size_statement].join("\n"));
        }


        validate_key(key: DataFrame, on: [string, string] | string, errors: ("raise" | "return" | "warn") = "raise"): CellValue[] {
            let left_on: string;
            let right_on: string;

            if (typeof (on) == 'string') {
                [left_on, right_on] = [on, on];
            }
            else {
                [left_on, right_on] = on;
            }

            this.__check_membership(left_on);
            key.__check_membership(right_on);

            let left_values = this.get_column(left_on);
            let right_values = new Set(key.get_column(right_on));

            let not_in_key = left_values.filter(v => !right_values.has(v));

            if (not_in_key.length == 0) {
                if (errors == 'raise') {
                    throw new Error(`KeyIncompleteError: The following values were not found in the selected key\n[${not_in_key.join(',')}]`);
                }
                else if (errors == "warn") {
                    console.log(`⚠️  validate_key(): ${not_in_key.length} unmatched value(s) in column "${left_on}" that were not found in key column "${right_on}":\n` +
                        `   → ${not_in_key.slice(0, 10).join(", ")}${not_in_key.length > 10 ? ", ..." : ""}`);
                }
            }

            return not_in_key
        }


        private __overwrite_to_table(table: ExcelScript.Table) {
            let table_rng = table.getRange();
            let n_table_rows = Number(table_rng.getLastRow().getEntireRow().getAddress().split(":")[1]) - 1;
            let n_table_cols = table.getHeaderRowRange().getValues()[0].length;

            let [n_df_rows, n_df_cols] = this.shape();

            //Delete excess table columns
            if (n_table_cols > n_df_cols) {
                let diff = n_df_cols - n_table_cols + 1 //Add one for column resizing
                let last_col = table_rng.getLastColumn();

                let delete_rng = last_col.getResizedRange(0, diff);

                console.log(`Existing Table Has Too Many Columns. Deleting Range: ${delete_rng.getAddressLocal()}`);
                delete_rng.delete(ExcelScript.DeleteShiftDirection.left);
                table_rng = table.getRange();
            }
            //Delete excess table rows
            if (n_table_rows > n_df_rows) {
                let diff = n_df_rows - n_table_rows + 1;
                let last_row = table_rng.getLastRow();

                let delete_rng = last_row.getResizedRange(diff, 0);

                console.log(`Existing Table Has Too Many Rows. Deleting Range: ${delete_rng.getAddressLocal()}`);
                delete_rng.delete(ExcelScript.DeleteShiftDirection.up);
                table_rng = table.getRange();
            }

            //Get the starting point of the table
            let table_start = table_rng.getCell(0, 0);
            let overwrite_vals = this.to_array(true);

            table_start.getResizedRange(n_df_rows, n_df_cols - 1).setValues(overwrite_vals);
        }

        private __append_to_table(table: ExcelScript.Table) {
            let rng = table.getRange();

            let first_cell: ExcelScript.Range = rng.getLastRow().getCell(0, 0).getOffsetRange(1, 0);

            let vals = rng.getValues();
            let last_row = vals[vals.length - 1];
            if (rng.getValues().length == 2 && last_row.every(v => v == "")) {
                first_cell = first_cell.getOffsetRange(-1, 0);
            }

            //Mapping onto new table logic
            let headers = table.getHeaderRowRange().getValues()[0] as string[];
            let header_set = new Set(headers);

            let not_found_in_df = headers.filter(h => !(this.__headers.has(h)));
            let not_found_in_table = this.columns.filter(c => !(header_set.has(c)));

            if (not_found_in_df.length > 0) {
                console.log(`Table Headers not found in DataFrame: ${not_found_in_df}. Filling Values with null...`);
            }
            if (not_found_in_table.length > 0) {
                console.log(`Dataframe headers not found in table ${not_found_in_table}. Dropping values to append...`);
            }


            let new_values = this.values.map((row, idx) => {
                return headers.map(h => row[h]) //Map all of the headers onto the new DataFrame
            })

            first_cell.getResizedRange(new_values.length - 1, new_values[0].length - 1).setValues(new_values);
        }

        /**
         * Creates a pivot table from the `DataFrame`.
         * Groups data by `index` and `columns`, aggregating `values` using the specified function.
         *
         * @param {string} index - Column to use as the new table’s row index.
         * @param {string} columns - Column to pivot into new columns.
         * @param {string} values - Column to aggregate.
         * @param {Operation} [aggFunc="count"] - Aggregation function to apply (e.g., "sum", "mean").
         * @param {CellValue} [fillNa=null] - Value to use for missing entries in the pivot table.
         * @returns {DataFrame} A new `DataFrame` structured as a pivot table.
         * @throws Will throw if any of the specified columns do not exist.
         */
        pivot(index: string, columns: string, values: string, aggFunc: Operation = "count", fillNa: CellValue = null) {
            this.__check_membership(index);
            this.__check_membership(columns);
            this.__check_membership(values);

            let grouped = this.groupBy(
                [index, columns],
                { [values]: aggFunc }
            );

            //Get unique row and columns
            const rowKeys = grouped.unique(index).get_column(index);
            const colKeys = grouped.unique(columns).get_column(columns);

            //Read from the grouped table to a hashmap
            let lookup: { [key: string]: CellValue } = {};
            grouped.values.forEach(row => {
                let key = [row[index], row[columns]].join(SEPARATOR);
                let val = row[`${values}_${aggFunc}`];
                lookup[key] = val;
            });

            //Assemble into Matrix 
            const headers = [index, ...colKeys];
            let data = rowKeys.map(rowKey => {
                let colVals = colKeys.map(colKey => {
                    let key = [rowKey, colKey].join(SEPARATOR);
                    return lookup[key] ?? fillNa;
                });
                return [rowKey, ...colVals]
            });

            return new DataFrame([headers, ...data])
        };

        to_table(table: ExcelScript.Table, method: ('o' | 'a')) {
            switch (method) {
                case 'o': return this.__overwrite_to_table(table);
                case 'a': return this.__append_to_table(table);
                default: throw new SyntaxError("Table write method must either be 'o' (overwrite), or 'a' (append).")
            }
        }

        /**
         * Adds a new column with values extracted from header rows and propagated downward.
         * 
         * @param columnName - Name of the column to create
         * @param isHeaderRow - Function that detects if a row is a header
         * @param extractValue - Function that extracts the value from the header row
         * @param keepHeaders - Boolean on whether you'd like to keep the rows flagged as headers in the output DataFrame.
         * @returns A new DataFrame with the header values encoded in the new column
         */
        encode_headers(
            columnName: string,
            isHeaderRow: (row: FrostRow) => boolean,
            extractValue: (row: FrostRow) => CellValue,
            keepHeaders: boolean = false
        ): DataFrame {
            let current_header: CellValue = "";

            const series = this.apply(row => {
                if (isHeaderRow(row)) {
                    current_header = extractValue(row);
                }
                return current_header;
            });

            const output = this.set_column(columnName, series, false);

            return keepHeaders ? output : output.query(row => !isHeaderRow(row));
        }

        snapshot(label: string = ""): DataFrame {
            if (label) {
                console.log(`\n🔍 Snapshot: ${label}`);
            } else {
                console.log("\n🔍 Snapshot:");
            }

            this.print();
            return this;
        }
    }
}

function main(workbook: ExcelScript.Workbook) {
    // See full documentation at: https://joeyrussoniello.github.io/frosts/
    // YOUR CODE GOES HERE

}
