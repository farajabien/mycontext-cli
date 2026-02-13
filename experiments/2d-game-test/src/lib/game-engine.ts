import { GameState, Position } from './game-state';

export class GameEngine {
  static update(state: GameState, canvasWidth: number, canvasHeight: number): GameState {
    if (state.isGameOver || state.isWin) return state;

    const nextState = { ...state };
    const { ball, paddle, bricks } = nextState;

    // 1. Update Ball Position
    ball.pos.x += ball.velocity.x;
    ball.pos.y += ball.velocity.y;

    // 2. Wall Collisions
    if (ball.pos.x + ball.radius > canvasWidth || ball.pos.x - ball.radius < 0) {
      ball.velocity.x *= -1;
    }
    if (ball.pos.y - ball.radius < 0) {
      ball.velocity.y *= -1;
    }

    // 3. Paddle Collision
    if (
      ball.pos.y + ball.radius > paddle.pos.y &&
      ball.pos.x > paddle.pos.x &&
      ball.pos.x < paddle.pos.x + paddle.width
    ) {
      ball.velocity.y *= -1;
      // Add slight angle shift based on hit position
      const hitPoint = (ball.pos.x - (paddle.pos.x + paddle.width / 2)) / (paddle.width / 2);
      ball.velocity.x = hitPoint * 8;
    }

    // 4. Brick Collision
    for (let brick of bricks) {
      if (brick.active) {
        if (
          ball.pos.x > brick.pos.x &&
          ball.pos.x < brick.pos.x + brick.width &&
          ball.pos.y > brick.pos.y &&
          ball.pos.y < brick.pos.y + brick.height
        ) {
          brick.active = false;
          ball.velocity.y *= -1;
          nextState.score += 10;
          break;
        }
      }
    }

    // 5. Game Over / Win Check
    if (ball.pos.y + ball.radius > canvasHeight) {
      nextState.isGameOver = true;
    }
    if (bricks.every(b => !b.active)) {
      nextState.isWin = true;
    }

    return nextState;
  }
}
