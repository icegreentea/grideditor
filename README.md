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