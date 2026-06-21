function computeSnakeLayout(
  count: number,
  containerPx: number
): { positions: PieceLayout[]; layoutW: number; layoutH: number } {
  const horizontalW = PW; // 84
  const horizontalH = PH; // 42
  const verticalW = PH; // 42

  // Formato sanfona vertical
  const legPieces = 4;

  // Passo de meia peça para dar o visual igual ao modelo
  const rowStep = 42;

  // Distância entre colunas
  const colStep = 72;

  const positions: PieceLayout[] = [];

  for (let i = 0; i < count; i++) {
    const blockSize = legPieces + 1;
    const block = Math.floor(i / blockSize);
    const index = i % blockSize;

    const goingDown = block % 2 === 0;
    const baseX = block * colStep;

    if (index === 0) {
      // Peças horizontais de ligação no topo/base
      positions.push({
        x: baseX,
        y: goingDown ? 0 : horizontalH + legPieces * rowStep,
        isVertical: false,
        reversed: false,
      });
    } else {
      // Peças verticais da coluna
      const step = index - 1;
      const visualStep = goingDown ? step : legPieces - 1 - step;

      positions.push({
        x: baseX + horizontalW - verticalW,
        y: horizontalH + visualStep * rowStep,
        isVertical: true,
        reversed: false,
      });
    }
  }

  const totalBlocks = Math.ceil(count / (legPieces + 1));
  const layoutW = totalBlocks * colStep + horizontalW;
  const layoutH = horizontalH + legPieces * rowStep + horizontalH + 20;

  return { positions, layoutW, layoutH };
}
