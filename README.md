# Building

## Build Command

`npm run build`

## Format

The output of this project is a single file bundle appropiate for browser use.
It will be usable in the browser with something like:

```
<script src="dist/core.js"></script>
<script>
    var grid = new lib.Grid()
</script>
```

The output format is IIFE exporting out the following classes:

* `Grid`

Through use of global-name `lib`.

# Notes

https://javascript.plainenglish.io/esbuild-library-6ec5fdb26e2c

# Tests

```
npm install -D jest
// not sure how much I need these two...
npm install -D @types/jest ts-jest
// need this to build stuff properly for our tests...
npm install --save-dev esbuild-jest
// replace `test` script in package.json with `jest`
```

## Run only single test:

```
npx jest -t "Test step size and clamping together"
```

Based on stuff from:

* https://stackoverflow.com/questions/42827054/how-do-i-run-a-single-test-using-jest
* https://jestjs.io/docs/cli#--testnamepatternregex

## Debugging

* https://jestjs.io/docs/troubleshooting
    * Note that there are instructions here on attaching using vscode, but I haven't figure that out yet
* https://nodejs.org/en/docs/guides/debugging-getting-started/

1. Find the test you (or code) you want to debug and add `debugger` inline
2. Run isolated test with something like:
```
npx --node-options="--inspect-brk" jest -t "Test step size and clamping together" -i
```
* `--node-options="--inspect-brk"`
    * Start inspector, and start automatic breakpoint
    * You can do `--inspect` to do without the automatic breakpoint
* `-t "Test step size and clamping together"`
    * Regex/select the specific test to run
* `-i` Same as `--runInBand`. Runs the inline (instead of using worker pool). Makes it easier to debug.
3. Attach using a chromium based browser (can't use FF because its gecko based). Go to `edge://inspect` or `chrome://inspect` and click on `Open dedicated DevTools for Node`

# Typescript and HTML Stuff

* https://freshman.tech/snippets/typescript/fix-value-not-exist-eventtarget/

# Resizeable Column Note:

https://webdevtrick.com/resizable-table-columns/