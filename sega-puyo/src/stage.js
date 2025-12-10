class Stage {
  static initialize() {
    this.stageElement = document.getElementById("stage");
    this.stageElementWidth = Config.puyoImgWidth * Config.stageCols;
    this.stageElementSideMargin = (window.innerWidth - this.stageElementWidth) / 2.0;
    this.stageElementHeight = Config.puyoImgHeight * Config.stageRows;
    this.stageElement.style.width = `${this.stageElementWidth}px`;
    this.stageElement.style.height = `${this.stageElementHeight}px`;
    this.stageElement.style.left = `${this.stageElementSideMargin}px`;

    // safe loader: use Game.loadImg if available, otherwise set src directly
    const safeLoadImg = (src, imgElement, onload = () => {}) => {
      if (typeof Game !== 'undefined' && typeof Game.loadImg === 'function') {
        try {
          Game.loadImg(src, imgElement, onload);
          return;
        } catch (e) {
          console.warn("safeLoadImg: Game.loadImg failed, falling back:", e);
        }
      }
      imgElement.addEventListener('load', () => { try { onload(); } catch (e) {} }, { once: true });
      imgElement.src = src;
      console.log(`Fallback Load Image: ${src}`);
    };

    this.zenkeshiImage = new Image();
    safeLoadImg('img/zenkeshi.png', this.zenkeshiImage, () => {
      this.zenkeshiImage.width = Config.puyoImgWidth * 6;
      this.zenkeshiImage.style.position = 'absolute';
      this.zenkeshiImage.style.display = 'none';
    });
    this.stageElement.appendChild(Stage.zenkeshiImage);

    this.scoreElement = document.getElementById("score");
    this.scoreElement.style.width = `${this.stageElementWidth}px`;
    this.scoreElement.style.top = `${this.stageElementHeight}px`;
    this.scoreElement.style.left = `${this.stageElementSideMargin}px`;
    this.scoreElement.style.height = `${Config.fontHeight}px`;

    this.nextPuyosElement = document.getElementById("nextPuyos");
    this.nextPuyosElement.style.position = 'absolute';
    this.nextPuyosElement.style.top = '0px';
    this.nextPuyosElement.style.left = `${(window.innerWidth + this.stageElementWidth) / 2.0}px`;
    if (this.stageElementSideMargin > Config.puyoImgWidth) {
      this.nextPuyosWidth = Config.puyoImgWidth;
      this.nextPuyosHeight = Config.puyoImgHeight;
    } else {
      this.nextPuyosWidth = this.stageElementSideMargin;
      this.nextPuyosHeight = (this.nextPuyosWidth / Config.puyoImgWidth) * Config.puyoImgHeight;
    }

    this.serverConnectionElement = document.getElementById("serverConnection");
    this.serverConnectionElement.src = "img/connectServer.jpg";
    this.serverConnectionElementWidth = Config.puyoImgWidth * 3;
    if (this.serverConnectionElementWidth > this.stageElementSideMargin) {
      this.serverConnectionElementWidth = this.stageElementSideMargin;
    }
    this.serverConnectionElementSideMargin = this.stageElementSideMargin - this.serverConnectionElementWidth;
    this.serverConnectionElement.style.width = `${this.serverConnectionElementWidth}px`;
    this.serverConnectionElement.style.position = "absolute";
    this.serverConnectionElement.style.top = "0px";
    this.serverConnectionElement.style.left = `${this.serverConnectionElementSideMargin}px`;
    this.rivalPuyoWidth = this.serverConnectionElementWidth / Config.stageCols;
    this.rivalPuyoHeight = (this.rivalPuyoWidth / Config.puyoImgWidth) * Config.puyoImgHeight;
    this.rivalBoardElement = document.getElementById("rivalBoard");
    this.rivalBoardElementWidth = this.serverConnectionElementWidth;
    this.rivalBoardElementHeight = this.rivalPuyoHeight * Config.stageRows;
    this.rivalBoardElementSideMargin = this.serverConnectionElementSideMargin;
    this.rivalBoardElement.style.position = "absolute";
    this.rivalBoardElement.style.top = `${this.serverConnectionElement.clientHeight}px`;
    this.rivalBoardElement.style.left = `${this.rivalBoardElementSideMargin}px`;
    this.rivalBoardElement.style.width = `${this.rivalBoardElementWidth}px`;
    this.rivalBoardElement.style.height = `${this.rivalBoardElementHeight}px`;
  }

  static start() {
    this.board = [];
    this.hiddenBoard = [];
    this.fallingPuyoList = [];
    this.erasingPuyoInfoList = [];
    this.puyoCount = 0;
    for (let y = 0; y < Config.stageRows; y++) {
      this.board.push([]);
      for (let x = 0; x < Config.stageCols; x++) {
        this.board[y].push(null);
      }
    }
    for (let x = 0; x < Config.stageCols; x++) {
      this.hiddenBoard.push([]);
    }
    while (this.stageElement.firstChild) {
      this.stageElement.removeChild(Stage.stageElement.firstChild);
    }
    while (this.rivalBoardElement.firstChild) {
      this.rivalBoardElement.removeChild(this.rivalBoardElement.firstChild);
    }
    if (Game.onlineBattle) {
      this.rivalBoardElement.style.display = "block";
      this.rivalBoardElement.style.position = "absolute";
      this.rivalBoardElement.style.top = `${this.serverConnectionElement.clientHeight}px`;
      this.rivalBoardElement.style.left = `${this.stageElementSideMargin - this.rivalBoardElementWidth}px`;
    }
  }

  static showOpponentUserBoard(board) {
    while (this.rivalBoardElement.firstChild) {
      this.rivalBoardElement.removeChild(this.rivalBoardElement.firstChild);
    }
    let rivalNameElement = document.createElement("p");
    rivalNameElement.innerHTML = Game.rivalName;
    rivalNameElement.style.position = 'absolute';
    rivalNameElement.style.top = '0px';
    rivalNameElement.style.left = '0px';
    this.rivalBoardElement.appendChild(rivalNameElement);
    for (let y = 0; y < Config.stageRows; y++) {
      for (let x = 0; x < Config.stageCols; x++) {
        if (board[y * Config.stageCols + x] != 0) {
          let puyo = PuyoImage.getPuyo(parseInt(board[y * Config.stageCols + x]));
          puyo.style.position = 'absolute';
          puyo.style.top = `${y * this.rivalPuyoHeight}px`;
          puyo.style.left = `${x * this.rivalPuyoWidth}px`;
          puyo.style.width = `${this.rivalPuyoWidth}px`;
          puyo.style.height = `${this.rivalPuyoHeight}px`;
          this.rivalBoardElement.appendChild(puyo);
        }
      }
    }
  }

  static showNextPuyos() {
    while (this.nextPuyosElement.firstChild) {
      this.nextPuyosElement.removeChild(this.nextPuyosElement.firstChild);
    }
    PuyoImage.ensureNextAvailable();
    for (let a = 0; a < Config.nextPuyosSetCount; a++) {
      const pair = PuyoImage.nextPuyosSet[a];
      const movableEl = PuyoImage.getPuyo(pair.movablePuyo);
      movableEl.width = this.nextPuyosWidth;
      movableEl.height = this.nextPuyosHeight;
      movableEl.style.position = 'sticky';
      movableEl.style.top = `${(a * 2.5 + 0.5) * this.nextPuyosHeight}px`;
      this.nextPuyosElement.appendChild(movableEl);

      const centerEl = PuyoImage.getPuyo(pair.centerPuyo);
      centerEl.width = this.nextPuyosWidth;
      centerEl.height = this.nextPuyosHeight;
      centerEl.style.position = 'sticky';
      centerEl.style.top = `${(a * 2.5 + 1.5) * this.nextPuyosHeight}px`;
      this.nextPuyosElement.appendChild(centerEl);
    }
    this.nextPuyosElement.style.width = `${this.nextPuyosWidth}px`;
    this.nextPuyosElement.style.height = `${this.nextPuyosHeight * 5.5}px`;
  }

  static setPuyo(x, y, puyo) {
    let puyoImage = PuyoImage.getPuyo(puyo);
    puyoImage.style.left = `${x * Config.puyoImgWidth}px`;
    puyoImage.style.top = `${y * Config.puyoImgHeight}px`;
    puyoImage.width = Config.puyoImgWidth;
    puyoImage.height = Config.puyoImgHeight;
    puyoImage.style.position = 'absolute';
    puyoImage.style.zIndex = String(10 + y);
    this.stageElement.appendChild(puyoImage);
    this.board[y][x] = {puyo: puyo, element: puyoImage};
    this.puyoCount = this.puyoCount + 1;
    try {
      if (typeof Game !== 'undefined') Game.placementCount = (Game.placementCount || 0) + 1;
    } catch (e) {}
  }

  static setHiddenPuyo(x, puyo) {
    let puyoImage = PuyoImage.getPuyo(puyo);
    let stack = this.hiddenBoard[x];
    let n = stack ? stack.length : 0;
    puyoImage.style.left = `${x * Config.puyoImgWidth}px`;
    puyoImage.style.top = `${-(n + 1) * Config.puyoImgHeight}px`;
    puyoImage.style.zIndex = 10 + n;
    puyoImage.width = Config.puyoImgWidth;
    puyoImage.height = Config.puyoImgHeight;
    puyoImage.style.position = 'absolute';
    this.stageElement.appendChild(puyoImage);
    if (!this.hiddenBoard[x]) this.hiddenBoard[x] = [];
    this.hiddenBoard[x].push({puyo: puyo, element: puyoImage});
    this.puyoCount = this.puyoCount + 1;
    try {
      if (typeof Game !== 'undefined') Game.placementCount = (Game.placementCount || 0) + 1;
    } catch (e) {}
  }

  // Replace the existing Stage.checkFall method with this implementation.

  static checkFall() {
    this.fallingPuyoList.length = 0;
    let isFalling = false;

    // 既存の board 上の落下（上から下へ移動する通常の落下）はそのまま行う
    for (let y = Config.stageRows - 2; y >= 0; y--) {
      for (let x = 0; x < Config.stageCols; x++) {
        if (!this.board[y][x]) {
          continue;
        }
        if (!this.board[y + 1][x]) {
          let cell = this.board[y][x];
          this.board[y][x] = null;
          let dst = y;
          while (dst + 1 < Config.stageRows && this.board[dst + 1][x] == null) {
            dst = dst + 1;
          }
          this.board[dst][x] = cell;
          this.fallingPuyoList.push({
            element: cell.element,
            position: y * Config.puyoImgHeight,
            destination: dst * Config.puyoImgHeight,
            falling: true
          });
          isFalling = true;
        }
      }
    }

    // hiddenBoard -> board の移行を改善：各列ごとに移動可能な分（列の空き）だけ
    // 一度にまとめて移す（shift を複数回行い、それぞれの要素の現在の top を開始位置に使う）
    for (let x = 0; x < Config.stageCols; x++) {
      let stack = this.hiddenBoard[x];
      if (!stack || stack.length === 0) continue;

      // その列で board 上にいくつ空きがあるかを調べる（dst は最初に occupied が見つかる行）
      let dst = 0;
      while (dst < Config.stageRows && !this.board[dst][x]) {
        dst = dst + 1;
      }

      // dst が 0 の場合は board に置ける場所がない（トップが埋まっている） -> 次へ
      if (dst === 0) continue;

      // この列に移動可能なセル数 = dst （インデックス 0..dst-1 が空）
      // hiddenBoard からは先頭から順に（画面上では下から順に）shift して落とす
      const moveCount = Math.min(stack.length, dst);

      // 先に移動する要素群をコピー（element の現在の top を読み取るため）
      const itemsToMove = stack.slice(0, moveCount);

      // shift 実行（stack.length が変化するので shift を moveCount 回）
      for (let i = 0; i < moveCount; i++) {
        const item = this.hiddenBoard[x].shift(); // queue の先頭（最も下にある hidden）を取る
        // destination は下から順に埋める -> 最初の移動は dst-1、次は dst-2 ...
        const destIndex = dst - 1 - i;
        this.board[destIndex][x] = item;

        // compute start position: use current element.style.top if available,
        // else approximate based on current hiddenBoard size before shift (itemsToMove saved above)
        let startPos = null;
        try {
          const topStr = (itemsToMove[i] && itemsToMove[i].element && itemsToMove[i].element.style.top) ? itemsToMove[i].element.style.top : null;
          if (topStr && typeof topStr === 'string' && topStr.endsWith('px')) {
            startPos = parseInt(topStr.replace('px', ''), 10);
          }
        } catch (e) {
          startPos = null;
        }
        if (startPos === null) {
          // fallback: put it offscreen above (preserve previous approach)
          startPos = - ( (stack.length + i + 1) * Config.puyoImgHeight );
        }

        this.fallingPuyoList.push({
          element: item.element,
          position: startPos,
          destination: destIndex * Config.puyoImgHeight,
          falling: true
        });

        isFalling = true;
      }

      // hiddenBoard の残り要素の表示位置を更新（上に詰めたので top 位置を再計算）
      for (let i = 0; i < this.hiddenBoard[x].length; i++) {
        let e = this.hiddenBoard[x][i].element;
        if (e) {
          e.style.top = `${-(i + 1) * Config.puyoImgHeight}px`;
          e.style.zIndex = 10 + i;
        }
      }
    }

    return isFalling;
  }

  static fall() {
    let isFalling = false;
    for (let fallingPuyo of this.fallingPuyoList) {
      if (!fallingPuyo.falling) {
        continue;
      }
      let position = fallingPuyo.position + Config.freeFallingSpeed;
      if (position >= fallingPuyo.destination) {
        position = fallingPuyo.destination;
        fallingPuyo.falling = false;
      } else {
        isFalling = true;
      }
      fallingPuyo.position = position;
      fallingPuyo.element.style.top = `${position}px`;
    }
    return isFalling;
  }

  static dropOjamaPuyo(count) {
    if (!this.hiddenBoard) return;
    for (let i = 0; i < count; i++) {
      const col = Math.floor(Math.random() * Config.stageCols);
      this.setHiddenPuyo(col, -1);
    }
  }

  static checkErase(startFrame) {
    this.eraseStartFrame = startFrame;
    this.erasingPuyoInfoList.length = 0;
    let erasedPuyoColor = {};
    let sequencePuyoInfoList = [];
    let sequenceOjamaPuyoInfoList = [];
    let isSequenceOjamaPuyo = true;
    let existingPuyoInfoList = [];

    let checkSequentialPuyo = (x, y) => {
      if (!this.board[y][x] || this.board[y][x].puyo < 0) {
        return false;
      }
      let puyo = this.board[y][x].puyo;
      sequencePuyoInfoList.push({x: x, y: y, cell: this.board[y][x]});
      this.board[y][x] = null;
      let direction = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      for (let a = 0; a < direction.length; a++) {
        let dx = x + direction[a][0];
        let dy = y + direction[a][1];
        if (dx < 0 || dy < 0 || dx >= Config.stageCols || dy >= Config.stageRows) {
          continue;
        }
        if (!this.board[dy][dx]) {
          continue;
        } else if (this.board[dy][dx].puyo < 0) {
          isSequenceOjamaPuyo = true;
          for (let b = 0; b < sequenceOjamaPuyoInfoList.length; b++) {
            if (sequenceOjamaPuyoInfoList[b].x == dx && sequenceOjamaPuyoInfoList[b].y == dy) {
              isSequenceOjamaPuyo = false;
              break;
            }
          }
          if (isSequenceOjamaPuyo) {
            sequenceOjamaPuyoInfoList.push({x: dx, y: dy, cell: this.board[dy][dx]});
          }
          continue;
        } else if (this.board[dy][dx].puyo !== puyo) {
          continue;
        }
        checkSequentialPuyo(dx, dy);
      };
    };

    for (let y = 0; y < Config.stageRows; y++) {
      for (let x = 0; x < Config.stageCols; x++) {
        if (!this.board[y][x] || this.board[y][x].puyo < 0) {
          continue;
        }
        sequencePuyoInfoList.length = 0;
        sequenceOjamaPuyoInfoList.length = 0;
        let puyoColor = this.board[y][x] && this.board[y][x].puyo;
        checkSequentialPuyo(x, y);
        if (sequencePuyoInfoList.length < Config.erasePuyoCount) {
          if (sequencePuyoInfoList.length) {
            existingPuyoInfoList.push(...sequencePuyoInfoList);
          }
        } else {
          this.erasingPuyoInfoList.push(...sequencePuyoInfoList);
          for (let info of sequenceOjamaPuyoInfoList) {
            this.board[info.y][info.x] = null;
            this.erasingPuyoInfoList.push(info);
          }
          erasedPuyoColor[puyoColor] = true;
        }
      }
    }
    this.puyoCount = this.puyoCount - this.erasingPuyoInfoList.length;
    for (let info of existingPuyoInfoList) {
      this.board[info.y][info.x] = info.cell;
    }
    if (this.erasingPuyoInfoList.length) {
      return {piece: this.erasingPuyoInfoList.length, color: Object.keys(erasedPuyoColor).length};
    }
    return null;
  }

  static erasing(frame) {
    let elapsedFrame = frame - this.eraseStartFrame;
    let ratio = elapsedFrame / Config.eraseAnimationDuration;
    if (ratio > 1) {
      for (let info of this.erasingPuyoInfoList) {
        let element = info.cell.element;
        this.stageElement.removeChild(element);
      }
      return false;
    } else if (ratio > 0.75) {
      for (let info of this.erasingPuyoInfoList) {
        let element = info.cell.element;
        element.style.display = 'block';
      }
      return true;
    } else if (ratio > 0.50) {
      for (let info of this.erasingPuyoInfoList) {
        let element = info.cell.element;
        element.style.display = 'none';
      }
      return true;
    } else if (ratio > 0.25) {
      for (let info of this.erasingPuyoInfoList) {
        let element = info.cell.element;
        element.style.display = 'block';
      }
      return true;
    } else {
      for (let info of this.erasingPuyoInfoList) {
        let element = info.cell.element;
        element.style.display = 'none';
      }
      return true;
    }
  }

  static showZenkeshi() {
    this.zenkeshiImage.style.display = 'block';
    this.zenkeshiImage.style.opacity = '1';
    let startTime = Date.now();
    let startTop = Config.puyoImgHeight * Config.stageRows;
    let endTop = Config.puyoImgHeight * Config.stageRows / 3;
    let animation = () => {
      let ratio = Math.min((Date.now() - startTime) / Config.zenkeshiDuration, 1);
      this.zenkeshiImage.style.top = `${(endTop - startTop) * ratio + startTop}px`;
      if (ratio !== 1) {
        requestAnimationFrame(animation);
      }
    };
    animation();
  }

  static hideZenkeshi() {
    let startTime = Date.now();
    let animation = () => {
      let ratio = Math.min((Date.now() - startTime) / Config.zenkeshiDuration, 1);
      this.zenkeshiImage.style.opacity = String(1 - ratio);
      if (ratio !== 1) {
        requestAnimationFrame(animation);
      } else {
        this.zenkeshiImage.style.display = 'none';
      }
    };
    animation();
  }

  // NOTE: この関数は class Stage { ... } の中に static メソッドとして貼ってください。
  // 例: stage.js の setHiddenPuyo の直後あたりに追加すると分かりやすいです。
  static applyAIMove(placement, pairColors, used) {
    try {
      // defaults
      placement = placement || { x: 2, r: 1 };
      const x = Number(placement.x);
      const r = (typeof placement.r !== 'undefined') ? Number(placement.r) % 4 : 1;
      const rmap = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
      const dx = rmap[r].dx;

      // helper: first occupied row in column -> returns y of first occupied (or Config.stageRows)
      const firstOccupied = (col) => {
        for (let y = 0; y < Config.stageRows; y++) {
          if (Stage.board[y] && Stage.board[y][col]) return y;
        }
        return Config.stageRows;
      };

      const targetCenterCol = x;
      const targetMovCol = x + dx;

      const fc_center = firstOccupied(targetCenterCol);
      const y_center = fc_center - 1;

      let fc_mov = Config.stageRows;
      let y_mov = Config.stageRows - 1;
      if (targetMovCol >= 0 && targetMovCol < Config.stageCols) {
        fc_mov = firstOccupied(targetMovCol);
        y_mov = fc_mov - 1;
      } else {
        // out-of-bounds movable - mark as off-board
        y_mov = -2;
      }

      // used pair colors (fall back to [1,1] if missing)
      let colors = [1, 1];
      if (Array.isArray(pairColors) && pairColors.length >= 2) {
        colors = [Number(pairColors[0]) || 1, Number(pairColors[1]) || 1];
      } else {
        // If used.type === 'current', we might read Player.* (best-effort)
        try {
          if (used && used.type === 'current' && typeof Player !== 'undefined' && Player.centerPuyo != null && Player.movablePuyo != null) {
            colors = [Number(Player.centerPuyo) || 1, Number(Player.movablePuyo) || 1];
          }
        } catch (e) {}
      }

      // Place center
      if (y_center >= 0) {
        Stage.setPuyo(targetCenterCol, y_center, colors[0]);
      } else {
        Stage.setHiddenPuyo(targetCenterCol, colors[0]);
      }

      // Place movable
      if (targetMovCol >= 0 && targetMovCol < Config.stageCols && y_mov >= 0) {
        Stage.setPuyo(targetMovCol, y_mov, colors[1]);
      } else if (targetMovCol >= 0 && targetMovCol < Config.stageCols) {
        Stage.setHiddenPuyo(targetMovCol, colors[1]);
      } else {
        // out-of-bounds movable: ignore safely
        if (Game && Game.debugVerbose) console.warn("Stage.applyAIMove: movable column out of bounds", targetMovCol);
      }

      // Notify that AI placed (Player.fix を経由して後処理したい場合に使われるフラグ)
      Stage._aiPlaced = true;

      if (Game && Game.debugVerbose) {
        console.log("Stage.applyAIMove: placed", { placement, colors, used, y_center, y_mov });
      }
    } catch (e) {
      console.warn("Stage.applyAIMove failed", e);
    }
  }
}
