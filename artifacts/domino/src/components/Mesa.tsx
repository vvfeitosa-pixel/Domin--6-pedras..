function computeSnakeLayout(
  count: number,
  containerPx: number
): { positions: PieceLayout[]; layoutW: number; layoutH: number } {
  const padding = 16;

  const horizontalW = PW; // 84
  const horizontalH = PH; // 42
  const verticalW = PH; // 42
  const verticalH = PW; // 84

  const legPieces = 4;

  const rowStep = 42; // sem buraco entre as peças
  const colStep = 88; // distância entre colunas

  const positions: PieceLayout[] = [];

  for (let i = 0; i < count; i++) {
    const groupSize = legPieces + 1;
    const group = Math.floor(i / groupSize);
    const index = i % groupSize;

    const goingDown = group % 2 === 0;
    const baseX = group * colStep;

    const bottomY =
      horizontalH + (legPieces - 1) * rowStep + verticalH - horizontalH;

    if (index === 0) {
      positions.push({
        x: baseX,
        y: goingDown ? 0 : bottomY,
        isVertical: false,
        reversed: false,
      });
    } else {
      const legIndex = index - 1;
      const visualIndex = goingDown ? legIndex : legPieces - 1 - legIndex;

      positions.push({
        x: baseX + horizontalW - verticalW,
        y: horizontalH + visualIndex * rowStep,
        isVertical: true,
        reversed: false,
      });
    }
  }

  const totalGroups = Math.ceil(count / (legPieces + 1));
  const layoutW = totalGroups * colStep + horizontalW;
  const layoutH = horizontalH + legPieces * rowStep + verticalH;

  return { positions, layoutW, layoutH };
}
