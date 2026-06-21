function computeSnakeLayout(
  count: number,
  containerPx: number
): { positions: PieceLayout[]; layoutW: number; layoutH: number } {
  const padding = 16;

  const verticalW = PH;
  const verticalH = PW;

  const available = containerPx - padding * 2;

  const piecesPerColumn = Math.max(3, Math.floor(available / verticalH));

  const colW = verticalW * 1.35;
  const rowGap = verticalH * 0.45;

  const layoutW = Math.ceil(count / piecesPerColumn) * colW;
  const layoutH = piecesPerColumn * rowGap + verticalH;

  const positions: PieceLayout[] = [];

  let col = 0;
  let row = 0;
  let direction = 1;

  for (let i = 0; i < count; i++) {
    const visualRow = direction === 1 ? row : piecesPerColumn - 1 - row;

    positions.push({
      x: col * colW,
      y: visualRow * rowGap,
      isVertical: true,
      reversed: direction === -1,
    });

    row++;

    if (row >= piecesPerColumn) {
      row = 0;
      col++;
      direction *= -1;
    }
  }

  return { positions, layoutW, layoutH };
}
