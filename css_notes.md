# Flex

Set `display: flex` or `display: flex-inline` on a container to make it work in flex.
In flex box, you layout items along and primary (main) and secondary (cross) axis

## Container Properties

* `flex-direction`
    * Decide if primary direction is row or column
* `flex-wrap`
    * Decides wrapping behavior when items max out primary direction dimensions
* `justify-content`
    * Decides how items are laid out along primary direction
* `align-items`
    * Decides how items are laid out along secondary direction
* `flex-flow`
    * Combination of `flex-direction` and `flex-wrap`
* `align-content`
    * Decides how multiple lines (caused by wrapping) are spaced along the secondary direction
* `gap` (and `row-gap` and `column-gap`)
    * Sets the gap (spacing) betweeen rows and columns


## Item Properties

* `order` (number)
    * Applied to items within container to force order
* `align-self`
    * Change the alignment on secondary direction for single item

Push an element (and subsequent element) to end of container with something like `margin-left: auto`
    * "Auto margins will take up all of the space that they can in their axis — it is how centering a block with margin auto left and right works"

## Links

* https://flexboxfroggy.com/
* https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Flexbox
* https://css-tricks.com/snippets/css/a-guide-to-flexbox/

# Units

https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units

## Lengths

### Absolute

### Relative

* `em`
* `ex`
* `ch`
* `rem`
* `lh` - line height of element
* `vw` - 1% of viewport width
* `vh` - 1% of viewport height
* `vmin` - 1% of viewports smaller dimension
* `vmax` - 1% of viewports larger dimension
