export let LineBreakType = /*#__PURE__*/function (LineBreakType) {
  LineBreakType[LineBreakType["SoftLineBreak"] = 0] = "SoftLineBreak";
  LineBreakType[LineBreakType["HardtLineBreak"] = 1] = "HardtLineBreak";
  return LineBreakType;
}({});
export let VerticalTextAlign = /*#__PURE__*/function (VerticalTextAlign) {
  VerticalTextAlign[VerticalTextAlign["Top"] = 0] = "Top";
  VerticalTextAlign[VerticalTextAlign["TopBaseline"] = 1] = "TopBaseline";
  // Skottie vertical alignment extensions
  // Visual alignement modes -- these are using tight visual bounds for the paragraph.
  VerticalTextAlign[VerticalTextAlign["VisualTop"] = 2] = "VisualTop";
  // visual top    -> text box top
  VerticalTextAlign[VerticalTextAlign["VisualCenter"] = 3] = "VisualCenter";
  // visual center -> text box center
  VerticalTextAlign[VerticalTextAlign["VisualBottom"] = 4] = "VisualBottom"; // visual bottom -> text box bottom
  return VerticalTextAlign;
}({});
export let ResizePolicy = /*#__PURE__*/function (ResizePolicy) {
  // Use the specified text size.
  ResizePolicy[ResizePolicy["None"] = 0] = "None";
  // Resize the text such that the extent box fits (snuggly) in the text box,
  // both horizontally and vertically.
  ResizePolicy[ResizePolicy["ScaleToFit"] = 1] = "ScaleToFit";
  // Same kScaleToFit if the text doesn't fit at the specified font size.
  // Otherwise, same as kNone.
  ResizePolicy[ResizePolicy["DownscaleToFit"] = 2] = "DownscaleToFit";
  return ResizePolicy;
}({});
export let InputState = /*#__PURE__*/function (InputState) {
  InputState[InputState["Down"] = 0] = "Down";
  InputState[InputState["Up"] = 1] = "Up";
  InputState[InputState["Move"] = 2] = "Move";
  InputState[InputState["Right"] = 3] = "Right";
  InputState[InputState["Left"] = 4] = "Left";
  return InputState;
}({});
export let ModifierKey = /*#__PURE__*/function (ModifierKey) {
  ModifierKey[ModifierKey["None"] = 0] = "None";
  ModifierKey[ModifierKey["Shift"] = 1] = "Shift";
  ModifierKey[ModifierKey["Control"] = 2] = "Control";
  ModifierKey[ModifierKey["Option"] = 3] = "Option";
  ModifierKey[ModifierKey["Command"] = 4] = "Command";
  ModifierKey[ModifierKey["FirstPress"] = 5] = "FirstPress";
  return ModifierKey;
}({});

/**
 * Named opacity property.
 */

/**
 * Text property value.
 */

/**
 * Named text property.
 */

/**
 * Transform property value. Maps to AE styled transform.
 */

/**
 * Named transform property for Skottie property observer.
 */

/**
 * Collection of slot IDs sorted by value type
 */

/**
 * Text property for ManagedAnimation's slot support
 */
//# sourceMappingURL=Skottie.js.map