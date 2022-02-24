type MouseDragOffGridEvent = {
  mouseX: number;
  mouseY: number;
  aligned_column_index: number;
  aligned_row_index: number;
  x_direction: "left" | "right" | "middle";
  y_direction: "above" | "below" | "middle";
};

export { MouseDragOffGridEvent };
