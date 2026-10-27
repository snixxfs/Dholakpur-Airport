/** Imperative camera API used by the floating map buttons and keyboard controls. */
export const cameraApi: {
  zoomIn: () => void;
  zoomOut: () => void;
  rotate: (dir: 1 | -1) => void;
  reset: () => void;
  focus: (x: number, z: number) => void;
  panForward: (dist?: number) => void;
  panBackward: (dist?: number) => void;
  panLeft: (dist?: number) => void;
  panRight: (dist?: number) => void;
  panUp: (dist?: number) => void;
  panDown: (dist?: number) => void;
} = {
  zoomIn: () => {},
  zoomOut: () => {},
  rotate: () => {},
  reset: () => {},
  focus: () => {},
  panForward: () => {},
  panBackward: () => {},
  panLeft: () => {},
  panRight: () => {},
  panUp: () => {},
  panDown: () => {},
};
