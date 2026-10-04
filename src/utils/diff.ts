export function characterDiff(expected: string, actual: string) {
  // # Levenshtein alignment exposes insertions, deletions and substitutions.
  const a = Array.from(actual),
    b = Array.from(expected);
  const rows = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
  const actualParts: { char: string; different: boolean }[] = [],
    expectedParts: { char: string; different: boolean }[] = [];
  let i = a.length,
    j = b.length;
  while (i || j) {
    if (
      i &&
      j &&
      rows[i][j] === rows[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1])
    ) {
      const different = a[i - 1] !== b[j - 1];
      actualParts.unshift({ char: a[--i], different });
      expectedParts.unshift({ char: b[--j], different });
    } else if (i && rows[i][j] === rows[i - 1][j] + 1)
      actualParts.unshift({ char: a[--i], different: true });
    else expectedParts.unshift({ char: b[--j], different: true });
  }
  return { actual: actualParts, expected: expectedParts };
}
