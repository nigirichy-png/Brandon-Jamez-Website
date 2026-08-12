import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseBrandonColumn,
  createBoard,
  dropPiece,
  getWinningCells,
  type BoardState,
  type Player,
} from "../src/components/games/connect-four/game.ts";

function play(columns: number[], players: Player[]): BoardState {
  let board = createBoard();
  columns.forEach((column, index) => {
    const move = dropPiece(board, column, players[index]);
    assert.ok(move);
    board = move.board;
  });
  return board;
}

test("detects horizontal, vertical, and both diagonal wins", () => {
  const horizontal = play([0, 1, 2, 3], ["player", "player", "player", "player"]);
  assert.equal(getWinningCells(horizontal, "player").length, 4);

  const vertical = play([2, 2, 2, 2], ["brandon", "brandon", "brandon", "brandon"]);
  assert.equal(getWinningCells(vertical, "brandon").length, 4);

  const rising = play(
    [0, 1, 1, 2, 2, 3, 2, 3, 3, 3],
    ["player", "brandon", "player", "brandon", "brandon", "player", "player", "brandon", "brandon", "player"],
  );
  assert.equal(getWinningCells(rising, "player").length, 4);

  const falling = play(
    [3, 2, 2, 1, 1, 0, 1, 0, 0, 0],
    ["player", "brandon", "player", "brandon", "brandon", "player", "player", "brandon", "brandon", "player"],
  );
  assert.equal(getWinningCells(falling, "player").length, 4);
});

test("Brandon takes a win before blocking the player", () => {
  const board = play(
    [0, 1, 2, 6, 6, 6],
    ["player", "player", "player", "brandon", "brandon", "brandon"],
  );
  assert.equal(chooseBrandonColumn(board), 6);
});

test("Brandon blocks an immediate player win", () => {
  const board = play([0, 1, 2], ["player", "player", "player"]);
  assert.equal(chooseBrandonColumn(board), 3);
});

test("Brandon prefers the center on an empty board", () => {
  assert.equal(chooseBrandonColumn(createBoard()), 3);
});

test("Rookie can miss a block that Rival and Champion always see", () => {
  const board = play([0, 1, 2], ["player", "player", "player"]);
  assert.equal(chooseBrandonColumn(board, "rookie", () => 0.99), 6);
  assert.equal(chooseBrandonColumn(board, "rival"), 3);
  assert.equal(chooseBrandonColumn(board, "champion"), 3);
});

function playerCanForceWinInTwo(board: BoardState): boolean {
  for (const playerColumn of [0, 1, 2, 3, 4, 5, 6]) {
    const playerMove = dropPiece(board, playerColumn, "player");
    if (!playerMove) continue;
    if (getWinningCells(playerMove.board, "player").length > 0) return true;

    let everyReplyLoses = true;
    for (const brandonColumn of [0, 1, 2, 3, 4, 5, 6]) {
      const brandonMove = dropPiece(playerMove.board, brandonColumn, "brandon");
      if (!brandonMove) continue;
      if (getWinningCells(brandonMove.board, "brandon").length > 0) {
        everyReplyLoses = false;
        break;
      }

      const playerHasWin = [0, 1, 2, 3, 4, 5, 6].some((column) => {
        const reply = dropPiece(brandonMove.board, column, "player");
        return reply ? getWinningCells(reply.board, "player").length > 0 : false;
      });
      if (!playerHasWin) {
        everyReplyLoses = false;
        break;
      }
    }
    if (everyReplyLoses) return true;
  }
  return false;
}

test("Champion sees and prevents a two-turn trap that Rival overlooks", () => {
  const board = play(
    [3, 5, 2, 5, 2, 2, 3],
    ["player", "brandon", "player", "brandon", "player", "brandon", "player"],
  );
  const rivalColumn = chooseBrandonColumn(board, "rival");
  const championColumn = chooseBrandonColumn(board, "champion");
  assert.equal(rivalColumn, 3);
  assert.equal(championColumn, 1);

  const rivalMove = dropPiece(board, rivalColumn, "brandon");
  const championMove = dropPiece(board, championColumn, "brandon");
  assert.ok(rivalMove);
  assert.ok(championMove);
  assert.equal(playerCanForceWinInTwo(rivalMove.board), true);
  assert.equal(playerCanForceWinInTwo(championMove.board), false);
});
