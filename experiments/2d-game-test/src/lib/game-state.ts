export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  paddle: {
    pos: Position;
    width: number;
    height: number;
  };
  ball: {
    pos: Position;
    velocity: Position;
    radius: number;
  };
  bricks: Array<{
    pos: Position;
    width: number;
    height: number;
    active: boolean;
  }>;
  score: number;
  isGameOver: boolean;
  isWin: boolean;
}

export const INITIAL_STATE: GameState = {
  paddle: { pos: { x: 400, y: 550 }, width: 100, height: 200 },
  ball: { pos: { x: 400, y: 540 }, velocity: { x: 4, y: -4 }, radius: 8 },
  bricks: [],
  score: 0,
  isGameOver: false,
  isWin: false,
};
