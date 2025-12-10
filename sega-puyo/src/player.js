// Player class with AI input queue support
class Player {
  // add an AI input queue (commands come as strings: 'LEFT','RIGHT','ROTATE','ROTATE_CCW','DROP','HARD_DROP')
  static _aiInputQueue = [];

  static initialize () {
    this.keyStatus = {right: false, left: false, up: false, down: false, space: false, esc: false, s: false, x: false, z: false};
    document.addEventListener('keydown', this.keyDownEvent);
    document.addEventListener('keyup', this.keyUpEvent);
    this.touchPoint = {sx: 0, sy: 0, ex: 0, ey: 0, dx: 0, dy: 0, absdx: 0, absdy: 0};
    document.addEventListener('touchstart', this.touchStartEvent);
    document.addEventListener('touchmove', this.touchMoveEvent);
    document.addEventListener('touchend', this.touchEndEvent);
  }

  static enqueueAIInputs(inputs) {
    if (!Array.isArray(inputs)) return;
    for (let cmd of inputs) {
      // normalize
      Player._aiInputQueue.push(String(cmd).toUpperCase());
    }
    if (Game && Game.debugVerbose) console.log('Player.enqueueAIInputs ->', Player._aiInputQueue);
  }

  static _popAICommand() {
    if (Player._aiInputQueue.length === 0) return null;
    return Player._aiInputQueue.shift();
  }

  // existing input handlers...
  static keyDownEvent(e) { /* unchanged - copy from original */ 
    e.preventDefault();
    if (e.code == 'ArrowLeft') {
      Player.keyStatus.left = true;
    } else if (e.code == "ArrowUp") {
      Player.keyStatus.up = true;
    } else if (e.code == "ArrowRight") {
      Player.keyStatus.right = true;
    } else if (e.code == "ArrowDown") {
      Player.keyStatus.down = true;
    } else if (e.code == "Space") {
      Player.keyStatus.space = true;
    } else if (e.code == "Escape") {
      Player.keyStatus.esc = true;
    } else if (e.code == "KeyS") {
      Player.keyStatus.s = true;
    } else if (e.code == "KeyX") {
      Player.keyStatus.x = true;
    } else if (e.code == "KeyZ") {
      Player.keyStatus.z = true;
    }
    return false;
  }
  static keyUpEvent(e) { /* unchanged */ 
    e.preventDefault();
    if (e.code == "ArrowLeft") {
      Player.keyStatus.left = false;
    } else if (e.code == "ArrowUp") {
      Player.keyStatus.up = false;
    } else if (e.code == "ArrowRight") {
      Player.keyStatus.right = false;
    } else if (e.code == "ArrowDown") {
      Player.keyStatus.down = false;
    } else if (e.code == "Space") {
      Player.keyStatus.space = false;
    } else if (e.code == "Escape") {
      Player.keyStatus.esc = false;
    } else if (e.code == "KeyS") {
      Player.keyStatus.s = false;
    } else if (e.code == "KeyX") {
      Player.keyStatus.x = false;
    } else if (e.code == "KeyZ") {
      Player.keyStatus.z = false;
    }
    return false;
  }

  // touch & gamepad handlers unchanged (copy from original)...
  static touchStartEvent(e) { /* copy original */ 
    Player.touchPoint.sx = e.touches[0].clientX;
    Player.touchPoint.sy = e.touches[0].clientY;
    Player.touchPoint.ex = -1;
    Player.touchPoint.ey = -1;
    Player.keyStatus = {right: false, left: false, up: false, down: false, space: false, esc: true, s: false, x: false, z: false};
  }
  static touchMoveEvent(e) { /* copy original */ 
    Player.touchPoint.dx = e.touches[0].clientX - Player.touchPoint.sx;
    Player.touchPoint.dy = e.touches[0].clientY - Player.touchPoint.sy;
    Player.touchPoint.absdx = Math.abs(Player.touchPoint.dx);
    Player.touchPoint.absdy = Math.abs(Player.touchPoint.dy);
    if (Player.touchPoint.absdx > 20 || Player.touchPoint.absdy > 20) {
      Player.touchPoint.ex = e.touches[0].clientX
      Player.touchPoint.ey = e.touches[0].clientY
      let horizonDirection = Player.touchPoint.ex - Player.touchPoint.sx;
      let verticalDirection = Player.touchPoint.ey - Player.touchPoint.sy;
      if (Math.abs(horizonDirection) < Math.abs(verticalDirection)) {
        if (verticalDirection < 0) {
          Player.keyStatus = {right: false, left: false, up: true, down: false, space: false, esc: false, s: false, x: false, z: false};
        } else {
          Player.keyStatus = {right: false, left: false, up: false, down: true, space: false, esc: false, s: false, x: false, z: false};
        }
      } else {
        if (horizonDirection < 0) {
          Player.keyStatus = {right: false, left: true, up: false, down: false, space: false, esc: false, s: false, x: false, z: false};
        } else {
          Player.keyStatus = {right: true, left: false, up: false, down: false, space: false, esc: false, s: false, x: false, z: false};
        }
      }
      Player.touchPoint.sx = Player.touchPoint.ex;
      Player.touchPoint.sy = Player.touchPoint.ey;
    }
  }
  static touchEndEvent(e) { /* copy original */ 
    if (Player.touchPoint.ex < 0 && Player.touchPoint.ey < 0) {
      Player.keyStatus = {right: false, left: false, up: false, down: false, space: true, esc: false, s: false, x: false, z: false};
    } else {
      Player.keyStatus = {right: false, left: false, up: false, down: false, space: false, esc: false, s: false, x: false, z: false};
    }
  }
  static gamepadEvent(e=null) { /* copy original */ 
    let gamepads = navigator.getGamepads();
    for (let a = 0; a < gamepads.length; a++) {
      if (gamepads[a]) {
        if (gamepads[a].axes[Config.gamepad.leftStick.x] > 0.8) {
          Player.keyStatus.right = true;
          Player.keyStatus.left = false;
        } else if (gamepads[a].axes[Config.gamepad.leftStick.x] < -0.8) {
          Player.keyStatus.right = false;
          Player.keyStatus.left = true;
        } else if (gamepads[a].buttons[Config.gamepad.buttonLeft].pressed) {
          Player.keyStatus.left = true;
          Player.keyStatus.right = false;
        } else if (gamepads[a].buttons[Config.gamepad.buttonRight].pressed) {
          Player.keyStatus.left = false;
          Player.keyStatus.right = true;
        } else {
          Player.keyStatus.right = false;
          Player.keyStatus.left = false;
        }
        if (gamepads[a].axes[Config.gamepad.leftStick.y] > 0.8) {
          Player.keyStatus.up = false;
          Player.keyStatus.down = true;
        } else if (gamepads[a].axes[Config.gamepad.leftStick.y] < -0.8) {
          Player.keyStatus.up = true;
          Player.keyStatus.down = false;
        } else if (gamepads[a].buttons[Config.gamepad.buttonUp].pressed) {
          Player.keyStatus.up = true;
          Player.keyStatus.down = false;
        } else if (gamepads[a].buttons[Config.gamepad.buttonDown].pressed) {
          Player.keyStatus.up = false;
          Player.keyStatus.down = true;
        } else {
          Player.keyStatus.up = false;
          Player.keyStatus.down = false;
        }
        if (gamepads[a].buttons[Config.gamepad.buttonA].pressed) {
          Player.keyStatus.x = true;
          Player.keyStatus.space = true;
        } else if (gamepads[a].buttons[Config.gamepad.buttonX].pressed) {
          Player.keyStatus.x = true;
          Player.keyStatus.space = false;
        } else {
          Player.keyStatus.x = false;
          Player.keyStatus.space = false;
        }
        if (gamepads[a].buttons[Config.gamepad.buttonB].pressed) {
          Player.keyStatus.z = true;
        } else if (gamepads[a].buttons[Config.gamepad.buttonY].pressed) {
          Player.keyStatus.z = true;
        } else {
          Player.keyStatus.z = false;
        }
        if (gamepads[a].buttons[Config.gamepad.buttonSelect].pressed) {
          Player.keyStatus.s = true;
        } else {
          Player.keyStatus.s = false;
        }
        if (gamepads[a].buttons[Config.gamepad.buttonStart].pressed) {
          Player.keyStatus.esc = true;
        } else {
          Player.keyStatus.esc = false;
        }
      }
    }
  }

   static createNewPuyo () {
    if (Stage.board[0][2]) {
      return false;
    }

    // Ensure queue is filled
    if (typeof PuyoImage !== 'undefined' && typeof PuyoImage.ensureNextAvailable === 'function') {
      PuyoImage.ensureNextAvailable();
    }

    // If Player already has current colors (may have been set by AI helper), ensure DOM elements exist and are appended.
    if (typeof Player !== 'undefined' && Player.centerPuyo != null && Player.movablePuyo != null) {
      // Ensure puyoId exists (keeps previous behavior)
      try {
        if (typeof Game !== 'undefined') {
          if (!this._puyoId) {
            Game._puyoCounter = (Game._puyoCounter || 0) + 1;
            this._puyoId = Game._puyoCounter;
            console.log("createNewPuyo: assigned puyoId for existing current:", this._puyoId);
          }
        }
      } catch (e) {}

      // Ensure DOM elements exist
      if (!Player.centerPuyoElement) {
        try {
          Player.centerPuyoElement = PuyoImage.getPuyo(Player.centerPuyo);
          Player.centerPuyoElement.width = Config.puyoImgWidth;
          Player.centerPuyoElement.height = Config.puyoImgHeight;
          Player.centerPuyoElement.style.position = 'absolute';
        } catch (e) {
          console.warn("createNewPuyo: failed to create centerPuyoElement:", e);
          Player.centerPuyoElement = null;
        }
      }
      if (!Player.movablePuyoElement) {
        try {
          Player.movablePuyoElement = PuyoImage.getPuyo(Player.movablePuyo);
          Player.movablePuyoElement.width = Config.puyoImgWidth;
          Player.movablePuyoElement.height = Config.puyoImgHeight;
          Player.movablePuyoElement.style.position = 'absolute';
        } catch (e) {
          console.warn("createNewPuyo: failed to create movablePuyoElement:", e);
          Player.movablePuyoElement = null;
        }
      }

      // Append elements to stage if not already
      try {
        if (Player.centerPuyoElement && Player.centerPuyoElement.parentNode !== Stage.stageElement) {
          Stage.stageElement.appendChild(Player.centerPuyoElement);
        }
        if (Player.movablePuyoElement && Player.movablePuyoElement.parentNode !== Stage.stageElement) {
          Stage.stageElement.appendChild(Player.movablePuyoElement);
        }
      } catch (e) {
        console.warn("createNewPuyo: append error:", e);
      }

      this.puyoStatus = this.puyoStatus || {x:2,y:-1,left:2*Config.puyoImgWidth,top:-1*Config.puyoImgHeight,dx:0,dy:-1,rotation:90};
      this.setPuyoPosition();
      this.groundFrame = 0;
      // Show next queue (nothing changed here, but safe)
      try { if (typeof Stage !== 'undefined' && typeof Stage.showNextPuyos === 'function') Stage.showNextPuyos(); } catch(e){}
      console.log("createNewPuyo: reused existing current (puyoId=" + this._puyoId + ")");
      return true;
    }

    // Normal path: consume next queue to set current
    let nextPuyosSet = PuyoImage.getNextPuyos();

    this.centerPuyo = nextPuyosSet.centerPuyo;
    this.centerPuyoElement = nextPuyosSet.centerPuyoElement;
    if (this.centerPuyoElement) {
      this.centerPuyoElement.width = Config.puyoImgWidth;
      this.centerPuyoElement.height = Config.puyoImgHeight;
      this.centerPuyoElement.style.position = 'absolute';
      Stage.stageElement.appendChild(this.centerPuyoElement);
    } else {
      try {
        this.centerPuyoElement = PuyoImage.getPuyo(this.centerPuyo);
        this.centerPuyoElement.width = Config.puyoImgWidth;
        this.centerPuyoElement.height = Config.puyoImgHeight;
        this.centerPuyoElement.style.position = 'absolute';
        Stage.stageElement.appendChild(this.centerPuyoElement);
      } catch (e) { console.warn("createNewPuyo: failed to create fallback center element", e); }
    }

    this.movablePuyo = nextPuyosSet.movablePuyo;
    this.movablePuyoElement = nextPuyosSet.movablePuyoElement;
    if (this.movablePuyoElement) {
      this.movablePuyoElement.width = Config.puyoImgWidth;
      this.movablePuyoElement.height = Config.puyoImgHeight;
      this.movablePuyoElement.style.position = 'absolute';
      Stage.stageElement.appendChild(this.movablePuyoElement);
    } else {
      try {
        this.movablePuyoElement = PuyoImage.getPuyo(this.movablePuyo);
        this.movablePuyoElement.width = Config.puyoImgWidth;
        this.movablePuyoElement.height = Config.puyoImgHeight;
        this.movablePuyoElement.style.position = 'absolute';
        Stage.stageElement.appendChild(this.movablePuyoElement);
      } catch (e) { console.warn("createNewPuyo: failed to create fallback movable element", e); }
    }

    // assign unique puyoId to this pair so fix can count once for this pair
    try {
      if (typeof Game !== 'undefined') {
        Game._puyoCounter = (Game._puyoCounter || 0) + 1;
        this._puyoId = Game._puyoCounter;
        console.log("createNewPuyo: created new puyoId", this._puyoId, "colors:", [this.centerPuyo,this.movablePuyo]);
      }
    } catch (e) {}

    // At the end of Player.createNewPuyo, after you consumed getNextPuyos and appended DOMs, add:
    try {
      if (typeof Stage !== 'undefined' && typeof Stage.showNextPuyos === 'function') {
        Stage.showNextPuyos();
      }
    } catch (e) {}

    this.puyoStatus = {x: 2, y: -1, left: 2 * Config.puyoImgWidth, top: -1 * Config.puyoImgHeight, dx: 0, dy: -1, rotation: 90};
    this.groundFrame = 0;
    this.setPuyoPosition();

    return true;
  }

  static setPuyoPosition() {
    // Safely update DOM positions if elements exist. Do not emit noisy warnings when elements are temporarily missing.
    try {
      if (this.centerPuyoElement) {
        this.centerPuyoElement.style.left = `${this.puyoStatus.left}px`;
        this.centerPuyoElement.style.top = `${this.puyoStatus.top}px`;
      }
    } catch (e) {
      // swallow errors to avoid breaking the loop; log only in debug if needed
      if (console && console.debug) console.debug("setPuyoPosition: center update failed", e);
    }

    try {
      if (this.movablePuyoElement) {
        // compute movable element offset based on rotation; guard against NaN
        let rotationRad = (this.puyoStatus.rotation || 0) * Math.PI / 180;
        let x = this.puyoStatus.left + Math.cos(rotationRad) * Config.puyoImgWidth;
        let y = this.puyoStatus.top - Math.sin(rotationRad) * Config.puyoImgHeight;
        this.movablePuyoElement.style.left = `${x}px`;
        this.movablePuyoElement.style.top = `${y}px`;
      }
    } catch (e) {
      if (console && console.debug) console.debug("setPuyoPosition: movable update failed", e);
    }
  }

  static falling(isDownPressed) {
    let isBlocked = false;
    let x = this.puyoStatus.x;
    let y = this.puyoStatus.y;
    let dx = this.puyoStatus.dx;
    let dy = this.puyoStatus.dy;
    if (y + 1 < 0 || y + 1 >= Config.stageRows) {
      isBlocked = true;
    } else if (Stage.board[y + 1][x]) {
      isBlocked = true;
    } else if (y + dy + 1 >= 0 && (y + dy + 1 >= Config.stageRows || Stage.board[y + dy + 1][x + dx])) {
      isBlocked = true;
    }
    if (!isBlocked) {
      this.puyoStatus.top += Config.playerFallingSpeed;
      if (isDownPressed) {
        this.puyoStatus.top += Config.playerDownSpeed;
      }
      if (Math.floor(this.puyoStatus.top / Config.puyoImgHeight) != y) {
        if (isDownPressed) {
          Score.addScore(1);
        }
        y = this.puyoStatus.y = y + 1;
        if (y + 1 < 0 || y + 1 >= Config.stageRows) {
          isBlocked = true;
        } else if (Stage.board[y + 1][x]) {
          isBlocked = true;
        } else if (y + dy + 1 >= 0 && (y + dy + 1 >= Config.stageRows || Stage.board[y + dy + 1][x + dx])) {
          isBlocked = true;
        }
        if (!isBlocked) {
          this.groundFrame = 0;
        } else {
          this.puyoStatus.top = y * Config.puyoImgHeight;
          this.groundFrame = 1;
        }
      } else {
        this.groundFrame = 0;
      }
      return false;
    }
    if (this.groundFrame == 0) {
      this.groundFrame = 1;
    } else {
      this.groundFrame = this.groundFrame + 1;
      if (this.groundFrame > Config.playerGroundFrame) {
        return true;
      }
    }
    return false;
  }

  // playing(frame): 先頭で AI キューを 1 コマンドだけ処理してから既存ロジックへ
  static playing(frame) {
    // Process one AI command per frame if available
    try {
      const cmd = Player._popAICommand();
      if (cmd) {
        if (Game && Game.debugVerbose) console.log("Player.playing: processing AI cmd:", cmd);
        // Map commands to actions similar to player input handling
        const c = String(cmd).toUpperCase();
        if (c === 'LEFT' || c === 'RIGHT') {
          // emulate a directional press: attempt immediate move
          let cx = (c === 'RIGHT') ? 1 : -1;
          let x = this.puyoStatus.x;
          let y = this.puyoStatus.y;
          let mx = x + this.puyoStatus.dx;
          let my = y + this.puyoStatus.dy;
          let canMove = true;
          if (y >= 0 && (x + cx < 0 || x + cx >= Config.stageCols || Stage.board[y][x + cx])) {
            canMove = false;
          }
          if (my >= 0 && (mx + cx < 0 || mx + cx >= Config.stageCols || Stage.board[my][mx + cx])) {
            canMove = false;
          }
          if (this.groundFrame === 0) {
            if (y + 1 >= 0 && (x + cx < 0 || x + cx >= Config.stageCols || Stage.board[y + 1][x + cx])) {
              canMove = false;
            }
            if (my + 1 >= 0 && (mx + cx < 0 || mx + cx >= Config.stageCols || Stage.board[my + 1][mx + cx])) {
              canMove = false;
            }
          }
          if (canMove) {
            this.actionStartFrame = frame;
            this.moveSource = x * Config.puyoImgWidth;
            this.moveDestination = (x + cx) * Config.puyoImgWidth;
            this.puyoStatus.x = this.puyoStatus.x + cx;
            // perform movement animation in next frames by returning 'moving'
            return 'moving';
          }
        } else if (c === 'ROTATE' || c === 'X' || c === 'UP' || c === 'ROTATE_CW') {
          // emulate rotation clockwise
          let dx = 1;
          // reuse existing rotation logic but triggered by AI
          let x = this.puyoStatus.x;
          let y = this.puyoStatus.y;
          let mx = this.puyoStatus.x + this.puyoStatus.dx;
          let my = this.puyoStatus.y + this.puyoStatus.dy;
          let rotation = this.puyoStatus.rotation;
          let canRotate = true;
          let canSwap = false;
          let cx = 0;
          let cy = 0;
          if (rotation === 0) {
            if (y + 2 >= Config.stageRows || Stage.board[y + 2][x]) {
              cy = -1;
            } else if (y + 2 >= Config.stageRows || x - dx < 0 || x - dx >= Config.stageCols || Stage.board[y + 2][x - dx]) {
              cy = -1;
            }
          } else if (rotation === 90) {
            if (x - dx < 0 || x - dx >= Config.stageCols || y + 1 < 0 || y + 1 >= Config.stageRows || Stage.board[y + 1][x - dx]) {
              if (y + 1 < 0 || y + 1 >= Config.stageRows || x + dx < 0 || x + dx >= Config.stageCols || Stage.board[y + 1][x + dx]) {
                canRotate = false;
              } else {
                cx = dx;
              }
            }
            canSwap = true;
          } else if (rotation === 180) {
            if (y + 2 >= Config.stageRows || Stage.board[y + 2][x]) {
              cy = -1;
            } else if (y + 2 >= Config.stageRows || x - dx < 0 || x - dx >= Config.stageCols || Stage.board[y + 2][x - dx]) {
              cy = -1;
            }
          } else if (rotation === 270) {
            if (x + dx < 0 || x + dx >= Config.stageCols || y + 1 < 0 || y + 1 >= Config.stageRows || Stage.board[y + 1][x + dx]) {
              if (x - dx < 0 || x - dx >= Config.stageCols || y + 1 < 0 || y + 1 >= Config.stageRows || Stage.board[y + 1][x - dx]) {
                canRotate = false;
              } else {
                cx = -dx;
              }
            }
            canSwap = true;
          }
          if (canRotate) {
            if (cy === -1) {
              if (this.groundFrame > 0) {
                this.puyoStatus.y = this.puyoStatus.y - 1;
                this.groundFrame = 0;
              }
              this.puyoStatus.top = this.puyoStatus.y * Config.puyoImgHeight;
            }
            this.actionStartFrame = frame;
            this.rotateDegree = 90.0 * dx;
            this.rotateBeforeLeft = x * Config.puyoImgWidth;
            this.rotateAfterLeft = (x + cx) * Config.puyoImgWidth;
            this.rotateFromRotation = this.puyoStatus.rotation;
            this.puyoStatus.x = this.puyoStatus.x + cx;
            let distRotation = (this.puyoStatus.rotation + this.rotateDegree + 360) % 360;
            let dCombi = [[1, 0], [0, -1], [-1, 0], [0, 1]][Math.floor(distRotation / 90)];
            this.puyoStatus.dx = dCombi[0];
            this.puyoStatus.dy = dCombi[1];
            return 'rotating';
          } else if (canSwap) {
            if (this.groundFrame > 0) {
              this.puyoStatus.y = this.puyoStatus.y - 1;
              this.groundFrame = 0;
            }
            this.puyoStatus.top = this.puyoStatus.y * Config.puyoImgHeight;
            this.actionStartFrame = frame;
            this.rotateDegree = 180;
            this.rotateBeforeLeft = x * Config.puyoImgWidth;
            this.rotateAfterLeft = x * Config.puyoImgWidth;
            this.rotateFromRotation = this.puyoStatus.rotation;
            this.puyoStatus.dx = 0;
            if (this.rotateFromRotation == 90) {
              this.puyoStatus.dy = 1;
            } else {
              this.puyoStatus.dy = -1;
            }
            return 'rotating';
          }
        } else if (c === 'DROP' || c === 'HARD_DROP') {
          // Hard drop: find landing y for center & movable and force fix
          const firstOccupied = (col) => {
            for (let y = 0; y < Config.stageRows; y++) {
              if (Stage.board[y][col]) return y;
            }
            return Config.stageRows;
          };
          // compute current rotation dx/dy
          const rotation = this.puyoStatus.rotation || 0;
          const rmap = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
          const rIndex = Math.floor(((rotation % 360) + 360) % 360 / 90);
          const dx = rmap[rIndex].dx;
          const centerCol = this.puyoStatus.x;
          const movCol = centerCol + dx;
          const fc_center = firstOccupied(centerCol);
          const y_center = fc_center - 1;
          let fc_mov = Config.stageRows;
          let y_mov = Config.stageRows - 1;
          if (movCol >= 0 && movCol < Config.stageCols) {
            fc_mov = firstOccupied(movCol);
            y_mov = fc_mov - 1;
          }
          // set positions directly to landing
          this.puyoStatus.y = y_center;
          this.puyoStatus.top = y_center * Config.puyoImgHeight;
          // ensure movable also set (hiddenBoard logic handled at fix)
          // trigger immediate nextMode 'fix'
          return 'fix';
        }
      }
    } catch (e) {
      if (Game && Game.debugVerbose) console.warn("Player.playing: AI command processing failed", e);
    }

    // If no AI cmd or cmd didn't cause immediate transition, continue with normal playing logic
    // Original playing implementation follows (copy unchanged from your source)
    if (!this.centerPuyo && !this.centerPuyoElement) {
      return 'checkFall';
    }

    let nextMode = 'playing';
    if (this.falling(this.keyStatus.down)) {
      this.setPuyoPosition();
      nextMode = 'fix';
    }
    this.setPuyoPosition();
    if (this.keyStatus.right || this.keyStatus.left) {
      let cx = (this.keyStatus.right) ? 1 : -1;
      let x = this.puyoStatus.x;
      let y = this.puyoStatus.y;
      let mx = x + this.puyoStatus.dx;
      let my = y + this.puyoStatus.dy;
      let canMove = true;
      if (y >= 0 && (x + cx < 0 || x + cx >= Config.stageCols || Stage.board[y][x + cx])) {
        canMove = false;
      }
      if (my >= 0 && (mx + cx < 0 || mx + cx >= Config.stageCols || Stage.board[my][mx + cx])) {
        canMove = false;
      }
      if (this.groundFrame === 0) {
        if (y + 1 >= 0 && (x + cx < 0 || x + cx >= Config.stageCols || Stage.board[y + 1][x + cx])) {
          canMove = false;
        }
        if (my + 1 >= 0 && (mx + cx < 0 || mx + cx >= Config.stageCols || Stage.board[my + 1][mx + cx])) {
          canMove = false;
        }
      }
      if (canMove) {
        this.actionStartFrame = frame;
        this.moveSource = x * Config.puyoImgWidth;
        this.moveDestination = (x + cx) * Config.puyoImgWidth;
        this.puyoStatus.x = this.puyoStatus.x + cx;
        nextMode = 'moving';
      }
    }
    if (this.keyStatus.up || this.keyStatus.x || this.keyStatus.z) {
      // rotation handling (copy original)
      let dx = (this.keyStatus.up)? 1 : (this.keyStatus.x)? -1 : (this.keyStatus.z)? 1 : -1;
      let x = this.puyoStatus.x;
      let y = this.puyoStatus.y;
      let mx = this.puyoStatus.x + this.puyoStatus.dx;
      let my = this.puyoStatus.y + this.puyoStatus.dy;
      let rotation = this.puyoStatus.rotation;
      let canRotate = true
      let canSwap = false;
      let cx = 0;
      let cy = 0;
      if (rotation === 0) {
        if (y + 2 >= Config.stageRows || Stage.board[y + 2][x]) {
          cy = -1;
        } else if (y + 2 >= Config.stageRows || x - dx < 0 || x - dx >= Config.stageCols || Stage.board[y + 2][x - dx]) {
          cy = -1;
        }
      } else if (rotation === 90) {
        if (x - dx < 0 || x - dx >= Config.stageCols || y + 1 < 0 || y + 1 >= Config.stageRows || Stage.board[y + 1][x - dx]) {
          if (y + 1 < 0 || y + 1 >= Config.stageRows || x + dx < 0 || x + dx >= Config.stageCols || Stage.board[y + 1][x + dx]) {
            canRotate = false;
          } else {
            cx = dx;
          }
        }
        canSwap = true;
      } else if (rotation === 180) {
        if (y + 2 >= Config.stageRows || Stage.board[y + 2][x]) {
          cy = -1;
        } else if (y + 2 >= Config.stageRows || x - dx < 0 || x - dx >= Config.stageCols || Stage.board[y + 2][x - dx]) {
          cy = -1;
        }
      } else if (rotation === 270) {
        if (x + dx < 0 || x + dx >= Config.stageCols || y + 1 < 0 || y + 1 >= Config.stageRows || Stage.board[y + 1][x + dx]) {
          if (x - dx < 0 || x - dx >= Config.stageCols || y + 1 < 0 || y + 1 >= Config.stageRows || Stage.board[y + 1][x - dx]) {
            canRotate = false;
          } else {
            cx = -dx;
          }
        }
        canSwap = true;
      }
      if (canRotate) {
        if (cy === -1) {
          if (this.groundFrame > 0) {
            this.puyoStatus.y = this.puyoStatus.y - 1;
            this.groundFrame = 0;
          }
          this.puyoStatus.top = this.puyoStatus.y * Config.puyoImgHeight;
        }
        this.actionStartFrame = frame;
        this.rotateDegree = 90.0 * dx;
        this.rotateBeforeLeft = x * Config.puyoImgWidth;
        this.rotateAfterLeft = (x + cx) * Config.puyoImgWidth;
        this.rotateFromRotation = this.puyoStatus.rotation;
        this.puyoStatus.x = this.puyoStatus.x + cx;
        let distRotation = (this.puyoStatus.rotation + this.rotateDegree + 360) % 360;
        let dCombi = [[1, 0], [0, -1], [-1, 0], [0, 1]][Math.floor(distRotation / 90)];
        this.puyoStatus.dx = dCombi[0];
        this.puyoStatus.dy = dCombi[1];
        nextMode = 'rotating';
      } else if (canSwap) {
        if (this.groundFrame > 0) {
          this.puyoStatus.y = this.puyoStatus.y - 1;
          this.groundFrame = 0;
        }
        this.puyoStatus.top = this.puyoStatus.y * Config.puyoImgHeight;
        this.actionStartFrame = frame;
        this.rotateDegree = 180;
        this.rotateBeforeLeft = x * Config.puyoImgWidth;
        this.rotateAfterLeft = x * Config.puyoImgWidth;
        this.rotateFromRotation = this.puyoStatus.rotation;
        this.puyoStatus.dx = 0;
        if (this.rotateFromRotation == 90) {
          this.puyoStatus.dy = 1;
        } else {
          this.puyoStatus.dy = -1;
        }
        nextMode = 'rotating';
      }
    }
    return nextMode;
  }

  static moving(frame) {
    this.falling();
    let ratio = Math.min(1, (frame - this.actionStartFrame) / Config.playerMoveFrame);
    this.puyoStatus.left = ratio * (this.moveDestination - this.moveSource) + this.moveSource;
    this.setPuyoPosition();
    if (ratio === 1) {
      return false;
    }
    return true;
  }

  static rotating(frame) {
    this.falling();
    let ratio = Math.min(1, (frame - this.actionStartFrame) / Config.playerRotateFrame);
    this.puyoStatus.left = (this.rotateAfterLeft - this.rotateBeforeLeft) * ratio + this.rotateBeforeLeft;
    this.puyoStatus.rotation = this.rotateFromRotation + ratio * this.rotateDegree;
    this.setPuyoPosition();
    if (ratio === 1) {
      this.puyoStatus.rotation = (this.rotateFromRotation + this.rotateDegree + 360) % 360;
      return false;
    }
    return true;
  }

  static fix() {
    // original fix implementation (copy as-is)
    if (this.puyoStatus.y >= 0) {
      Stage.setPuyo(this.puyoStatus.x, this.puyoStatus.y, this.centerPuyo);
    } else {
      Stage.setHiddenPuyo(this.puyoStatus.x, this.centerPuyo);
    }
    if (this.puyoStatus.y + this.puyoStatus.dy >= 0) {
      Stage.setPuyo(this.puyoStatus.x + this.puyoStatus.dx, this.puyoStatus.y + this.puyoStatus.dy, this.movablePuyo);
    } else {
      Stage.setHiddenPuyo(this.puyoStatus.x + this.puyoStatus.dx, this.movablePuyo);
    }

    // --- Commit event: increment once per puyoId only ---
    try {
      if (typeof Game !== 'undefined') {
        if (this._puyoId && this._puyoId !== this._lastHandledPuyoId) {
          Game.commitEventCount = (Game.commitEventCount || 0) + 1;
          this._lastHandledPuyoId = this._puyoId;
          console.log("Player.fix: incremented commitEventCount:", Game.commitEventCount, "for puyoId:", this._puyoId);
        } else {
          console.log("Player.fix: skipping commit increment - puyoId already handled or missing:", this._puyoId);
        }
      }
    } catch (e) {
      console.warn("Player.fix: failed to increment commitEventCount", e);
    }

    // --- Guarded ojama countdown processing based on commitEventCount ---
    try {
      if (typeof Game.nextOjamaInterval === 'undefined') Game.nextOjamaInterval = Math.floor(Math.random() * 3) + 3;
      if (typeof Game.nextOjamaCount === 'undefined') Game.nextOjamaCount = Math.floor(Math.random() * 3) + 1;
      if (typeof Game.commitEventCount === 'undefined') Game.commitEventCount = 0;
      if (typeof this._handledCommitEventCount === 'undefined') this._handledCommitEventCount = 0;

      if (Game.commitEventCount > this._handledCommitEventCount) {
        console.log("Player.fix: handling commit-event-based ojama countdown. commitEventCount:", Game.commitEventCount, "lastHandled:", this._handledCommitEventCount);
        Game.nextOjamaInterval = Game.nextOjamaInterval - 1;
        if (Game.nextOjamaInterval <= 0) {
          Game.pendingOjama = (Game.pendingOjama || 0) + Game.nextOjamaCount;
          Game.nextOjamaInterval = Math.floor(Math.random() * 3) + 3;
          Game.nextOjamaCount = Math.floor(Math.random() * 3) + 1;
        }
        const noticeEl = (Game && Game.ojamaNoticeElement) ? Game.ojamaNoticeElement : document.getElementById('ojamaNotice');
        if (noticeEl) {
          noticeEl.style.display = 'block';
          noticeEl.innerText = `予告: ${Game.nextOjamaInterval}手後に ${Game.nextOjamaCount}個のおじゃまぷよが降ります`;
        }
        this._handledCommitEventCount = Game.commitEventCount;
      } else {
        console.log("Player.fix: no new commit event since last handled -> skipping ojama countdown");
      }
    } catch (e) {
      console.warn("Player.fix: error in guarded ojama handling", e);
    }

    // cleanup player DOM
    if (this.centerPuyoElement && this.centerPuyoElement.parentNode === Stage.stageElement) {
      Stage.stageElement.removeChild(this.centerPuyoElement);
    }
    if (this.movablePuyoElement && this.movablePuyoElement.parentNode === Stage.stageElement) {
      Stage.stageElement.removeChild(this.movablePuyoElement);
    }

    // CLEAR color/DOM references and puyoId so next createNewPuyo will fetch a new pair
    this.centerPuyoElement = null;
    this.movablePuyoElement = null;
    this.centerPuyo = null;        // <- important: allow createNewPuyo to consume next
    this.movablePuyo = null;       // <- important
    this._puyoId = null;           // <- allow new puyoId assignment on next createNewPuyo

    // If an AI placement was deferred earlier, process its erase/ojama now by moving to checkErase
    try {
      if (Stage._aiPlaced) {
        Stage._aiPlaced = false;
        console.log("Player.fix: processing deferred AI placement -> setting mode to checkErase");
        Game.mode = 'checkErase';
      }
    } catch (e) {
      console.warn("Player.fix: failed to process deferred AI placement", e);
    }
  }
}