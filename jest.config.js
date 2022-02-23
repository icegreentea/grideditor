/*
I don't want to deal with ts-node (whatever that is right now) so I'm just using a javascript
config for jest (as opposed to the typescript one).

See here:

https://jestjs.io/docs/configuration

Added a transformer `esbuild-jest` so that uh... stuff builds.
*/
const config = {
  verbose: true,
  transform: {
    "^.+\\.tsx?$": "esbuild-jest",
  },
};

module.exports = config;
