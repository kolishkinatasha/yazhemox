// Adjustments are fractions of the projected guide, along it and perpendicular to it.
// Previous pixel offsets identify the browser edits already incorporated here.
export const workshopLetteringLayout = {
  'wide-overview': {
    hyperline: { edge: [0.1277, 0.0072], previous: [21.354, 3.333] },
    printer: { edge: [0.3149382449961441, -0.064700353444119], previous: [90.688, -28.667] },
    engineering: { edge: [0.112, 0.0022], previous: [23.354, -1.333] },
    board: { edge: [-0.5515, 0.0018], previous: [-122.646, 4.667] },
    pendant: { edge: [0.4308, -0.0893], previous: [-2.646, -18] },
    shelf: { edge: [0.0666, 0.0024], previous: [1.354, -11.333] },
    desk: { edge: [-0.1625, 0.0008], previous: [-77.313, 15.333] },
    projects: { edge: [0.078, 0.0229], previous: [4.729, 0.667] },
  },
  'wide-desk': {
    engineering: { edge: [0.122, -0.0013], previous: [66.688, 0] },
    printer: { edge: [0, 0], previous: [152.688, -28.667] },
    projects: { edge: [-0.1749, 0.0319], previous: [-29.313, 12] },
  },
  'narrow-desk': {
    printer: { edge: [0, 0], previous: [78.688, -16] },
    engineering: { edge: [0.1447, -0.0042], previous: [28.688, 0] },
    pendant: { edge: [0.5545, -0.1474], previous: [-2.646, -21.333] },
    board: { edge: [0.2244, 0.0229], previous: [49.354, 4.667] },
    hyperline: { edge: [0.0029, 0.0236], previous: [0.021, 2.667] },
    projects: { edge: [-0.0195, -0.0097], previous: [-1.292, -0.667] },
  },
};
