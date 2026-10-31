export const BUILDINGS = {
  A1: 40, A2: 40, A3: 40, A4: 40, A5: 40, A6: 40,
  B1: 22, B2: 40, B3: 40, B4: 40,
  C1: 40, C2: 40, C3: 40,
};

export const ALL_UNITS = Object.entries(BUILDINGS).flatMap(([building, count]) =>
  Array.from({ length: count }, (_, index) => `${building}-${index + 1}`)
);