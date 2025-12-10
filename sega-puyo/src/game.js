(function(){
  // AIAdapter: call window.AMA.decide(snapshot) if present
  window.AIAdapter = {
    // preferBrowser:true => try window.AMA first
    async getMove(snapshot, opts={preferBrowser:true}) {
      if (opts.preferBrowser && typeof window.AMA !== 'undefined' && typeof window.AMA.decide === 'function') {
        try {
          const res = await Promise.resolve(window.AMA.decide(snapshot));
          console.log("AIAdapter: from browser AMA", res);
          return res;
        } catch (e) {
          console.warn("AIAdapter: browser AMA failed", e);
        }
      }
      if (typeof window.AMA_FALLBACK === 'function') {
        try {
          const res = await Promise.resolve(window.AMA_FALLBACK(snapshot));
          console.log("AIAdapter: from fallback AMA", res);
          return res;
        } catch (e) {
          console.warn("AIAdapter: fallback AMA failed", e);
        }
      }
      throw new Error("AIAdapter: no AMA available");
    }
  };
})();

class Game {

  // When false (default) verbose per-frame logs are silenced.
  static debugVerbose = false;

  static loadImg(src, element, onload = ()=>{}) {
    try {
      // prefer an internal queue if present
      if (this.imgQueue && this.imgQueueActive !== undefined) {
        // use existing queuing mechanism if available
        if (!this.imgQueue) this.imgQueue = [];
        if (typeof this.imgQueueActive === 'undefined') this.imgQueueActive = false;
        if (src != null && element != null) {
          this.imgQueue.push({src: src, element: element, onload: onload});
        }
        if (this.imgQueueActive === false) {
          let data = this.imgQueue.shift();
          if (data) {
            this.imgQueueActive = true;
            data.element.addEventListener('load', () => {
              this.imgQueueActive = false;
              try { data.onload(); } catch(e){}
            }, { once: true });
            data.element.src = data.src;
            // Guard verbose image-load logs behind debugVerbose
            if (Game.debugVerbose) console.log(`Load Image (queued): ${data.src}`);
          }
        }
        // schedule next if queue remains
        if (this.imgQueue && this.imgQueue.length > 0) {
          setTimeout(() => this.loadImg(null, null), Config.loadImgInterval || 30);
        }
        return;
      }
    } catch (e) {
      // fall through to direct loader
    }

    // fallback direct loader
    try {
      element.addEventListener('load', () => { try { onload(); } catch(e){} }, { once: true });
      element.src = src;
      if (Game.debugVerbose) console.log(`Load Image (fallback): ${src}`);
    } catch (e) {
      if (Game.debugVerbose) console.warn("Game.loadImg fallback failed", e);
      try { element.src = src; } catch (e2) {}
      try { onload(); } catch(e3) {}
    }
  }


  static initialize() {
    this.mode = 'start';
    // (rest of initialize unchanged)
    // ensure this.imgQueue / imgQueueActive exist for the loader above
    this.imgQueue = this.imgQueue || [];
    this.imgQueueActive = this.imgQueueActive || false;

    // then PuyoImage.initialize() etc.
    PuyoImage.initialize();
    Stage.initialize();
    this.serverURL = '/sega-puyo/server.php';
    this.userName = 'PuyoPuyo Master';
    this.userCode = '';
    this.onlineBattle = false;
    this.waitingServerResponse = false;
    this.frame = 0;
    this.attack = 0;
    this.beforeAttack = 0;
    this.beforeFetchAttack = 0;
    this.damage = 0;
    this.damageNext = 0;
    this.absorbedDamage = 0;
    this.beforeFetchDamage = 0;
    this.penalty = 0;
    this.combinationCount = 0;

    this.pendingOjama = this.pendingOjama || 0;

    PuyoImage.initialize();
    Stage.initialize();

    // 自動AIモードのフラグ（true にすると自動でAIが打ち続けます）
    this.autoPlay = true;            // ← ここを false にすれば手動動作に戻る
    this.autoPlayDelay = 80;         // ms、ぷよが表示されてからAIを呼ぶ遅延（調整可能）

    // In Game.initialize(), add the puyo counter and lastMode tracking:
    this.placementCount = 0;
    this.commitEventCount = 0;
    this._puyoCounter = 0;      // unique ID generator for spawned pairs
    this._lastMode = null;      // track changes for logging

    // AIボタンがあるなら非表示にする（UIから取り除く）
    const aiBtn = document.getElementById("aiMoveBtn");
    if (aiBtn) {
      aiBtn.style.display = 'none';
      // 以前はクリックでAIを呼んでいたが、自動化するので削除（必要なら残す）
      try { aiBtn.removeEventListener("click", () => { this.requestAIMove(); }); } catch(e){}
    }

    Stage.rivalBoardElement.style.display = "none";
    Stage.serverConnectionElement.addEventListener("click", () => this.serverConnection());
    Player.initialize();
    Score.initialize();
    this.youWinImageElement = document.getElementById("youWin");
    this.ojamaNoticeElement = document.getElementById("ojamaNotice");
    if (this.ojamaNoticeElement) {
      this.ojamaNoticeElement.style.display = 'none';
    }

    this.nextOjamaInterval = Math.floor(Math.random() * 3) + 3;
    this.nextOjamaCount = Math.floor(Math.random() * 3) + 1;

    this.loop();
  }

  static loop() {
    // Only log mode changes when debugVerbose is true
    if (this._lastMode !== this.mode) {
      if (this.debugVerbose) console.log(`Game.mode -> ${this.mode} (frame: ${this.frame})`);
      this._lastMode = this.mode;
    }

    // debug: show when entering setOjama (guarded by flag to avoid flooding console)
    if (this.debugVerbose) {
      console.log("ENTER setOjama:", { pendingOjama: this.pendingOjama, penalty: this.penalty, damage: this.damage, damageNext: this.damageNext, frame: this.frame });
    }

    // 毎フレーム、予告表示（ojamaNotice）の状態を更新して安定表示させる
    if (this.ojamaNoticeElement) {
      // 優先: 保留中のおじゃま (pendingOjama)
      if (typeof this.pendingOjama !== 'undefined' && this.pendingOjama > 0) {
        this.ojamaNoticeElement.style.display = 'block';
        this.ojamaNoticeElement.innerText = `保留: ${this.pendingOjama}個のおじゃまぷよがあります`;
      } else if (typeof this.nextOjamaInterval !== 'undefined' && typeof this.nextOjamaCount !== 'undefined') {
        // 次の予告がある場合はそれを表示
        this.ojamaNoticeElement.style.display = 'block';
        // 明示的に整数で表示する
        const nInterval = Math.floor(Number(this.nextOjamaInterval) || 0);
        const nCount = Math.floor(Number(this.nextOjamaCount) || 0);
        this.ojamaNoticeElement.innerText = `予告: ${nInterval}手後に ${nCount}個のおじゃまぷよが降ります`;
      } else {
        this.ojamaNoticeElement.style.display = 'none';
      }
    }
    Player.gamepadEvent();
    if (!this.onlineBattle && Player.keyStatus.esc) {
      PuyoImage.pauseImage.style.display = "block";
      requestAnimationFrame(() => this.loop());
      return false;
    } else {
      PuyoImage.pauseImage.style.display = "none";
    }
    if (!this.onlineBattle && Player.keyStatus.s) {
      this.serverConnection('start', false);
    }
    if (this.onlineBattle) {
      this.fetchClientData();
      if (!this.rivalReady) {
        PuyoImage.nowLoadingImage.style.display = "block";
        requestAnimationFrame(() => this.loop());
        return false;
      } else if (this.rivalBatankyu) {
        if (!Player.keyStatus.space) {
          this.youWinImageElement.style.display = "block";
          requestAnimationFrame(() => this.loop());
          return false;
        } else {
          this.serverConnection();
        }
      } else {
        PuyoImage.nowLoadingImage.style.display = "none";
      }
    }
    if (this.mode == 'start') {
      if (this.imgQueue.length > 0) {
        PuyoImage.nowLoadingImage.style.display = "block";
      } else if (this.onlineBattle == false || this.rivalReady == true) {
        PuyoImage.nowLoadingImage.style.display = "none";
        this.puyosCount = 0;
        this.attack = 0;
        this.beforeAttack = 0;
        this.beforeFetchAttack = 0;
        this.damage = 0;
        this.damageNext = 0;
        this.absorbedDamage = 0;
        this.beforeFetchDamage = 0;
        this.penalty = 0;
        this.combinationCount = 0;
        this.mode = 'checkFall';
        PuyoImage.start();
        Stage.start();
        Score.start();
        if (this.ojamaNoticeElement) {
            this.ojamaNoticeElement.style.display = 'none'; // ゲーム開始時は非表示
        }
      }
      this.youWinImageElement.style.display = "none";
    } else if (this.mode == 'checkFall') {
      if (Stage.checkFall()) {
        this.mode = 'fall'
      } else {
        this.mode = 'checkErase';
      }
    } else if (this.mode == 'fall') {
      if (!Stage.fall()) {
        this.mode = 'checkErase';
      }
    } else if (this.mode == 'checkErase') {
      let eraseInfo = Stage.checkErase(this.frame);
      if (eraseInfo) {
        this.mode = 'erasing';
        Score.beforeAttack = Score.score;
        this.combinationCount = this.combinationCount + 1;
        Score.calculateScore(this.combinationCount, eraseInfo.piece, eraseInfo.color);
        Stage.hideZenkeshi();
      } else {
        if (Stage.puyoCount === 0 && this.combinationCount > 0) {
          Stage.showZenkeshi();
          Score.addScore(Config.zenkeshiScore);
        }
        this.addAttack = Math.floor((Score.score - this.beforeAttack) / Config.penaltyUnit);
        this.beforeAttack = Score.score;
        if (this.addAttack > this.penalty) {
          this.addAttack = this.addAttack - this.penalty;
          this.penalty = 0;
        } else {
          this.penalty = this.penalty - this.addAttack;
          this.addAttack = 0;
        }
        this.attack = this.attack + this.addAttack;
        this.combinationCount = 0;
        // 連鎖が終了したらまずおじゃまぷよを「設定」するモードへ
        this.mode = 'setOjama'; // 新しいモードを追加
      }
    } else if(this.mode == 'erasing') {
      if (!Stage.erasing(this.frame)) {
        this.mode = 'checkFall';
      }
    } else if (this.mode == 'newPuyo') {
        if (!Player.createNewPuyo()) {
          this.mode = 'gameOver';
        } else {
          // 新しいぷよを作成 -> プレイ中に遷移
          this.mode = 'playing';
          this.puyosCount = this.puyosCount + 1;

          // 自動AIが有効なら、少し遅延してAIを呼ぶ（PlayerのDOM生成や表示が安定するため）
          if (this.autoPlay) {
            if (this.debugVerbose) console.log("Game.loop: autoPlay true — scheduling AI move (frame:", this.frame, ")");
            setTimeout(() => {
              try {
                // Safety: don't call if mode changed meanwhile
                if (this.mode === 'playing') {
                  if (this.debugVerbose) console.log("Game.loop: invoking requestAIMove (frame:", this.frame, ")");
                  this.requestAIMove();
                } else {
                  if (this.debugVerbose) console.log("Game.loop: skipped AI request because mode changed to", this.mode, "frame:", this.frame);
                }
              } catch (e) {
                if (this.debugVerbose) console.warn("autoPlay requestAIMove failed:", e);
              }
            }, this.autoPlayDelay);
          }
        }
    } else if (this.mode == 'playing') {
      this.mode = Player.playing(this.frame);
    } else if (this.mode == 'moving') {
      if (!Player.moving(this.frame)) {
        this.mode = 'playing';
      }
    } else if (this.mode == 'rotating') {
      if (!Player.rotating(this.frame)) {
        this.mode = 'playing';
      }
    } else if (this.mode == 'fix') {
      Player.fix();
      this.mode = 'checkFall';
    }
    // 新しいモード 'setOjama' を追加
    else if (this.mode == 'setOjama') {
      // 保留おじゃまを現在のダメージに加算// まず、保留中のおじゃま (Player.fix が積んだもの) を先に降らせる
      let pendingDropped = 0;
      if (this.pendingOjama && this.pendingOjama > 0) {
        Stage.dropOjamaPuyo(this.pendingOjama);
        pendingDropped = this.pendingOjama;
        this.pendingOjama = 0;
        if (this.ojamaNoticeElement) {
          this.ojamaNoticeElement.style.display = 'block';
          this.ojamaNoticeElement.innerText = `保留: ${pendingDropped}個のおじゃまぷよが降りました`;
        }
      }

      let currentPenalty = (this.damageNext - this.damage) * 30; // 1ダメージあたりのおじゃまぷよ数
      this.penalty = this.penalty + currentPenalty;
      this.damage = this.damageNext; // 処理したのでdamageを更新

      if (this.penalty > 0) {
      // おじゃまぷよを実際にボードに設定（改善版: 各列の収容能力に基づいて重複ありで割り当て）
      let ojamaSetCount = 0;

      // 予告表示を更新
      if (this.ojamaNoticeElement) {
        this.ojamaNoticeElement.style.display = 'block';
        this.ojamaNoticeElement.innerText = `おじゃまぷよ: ${this.penalty}個降ります`;
      }

      // 各列の現在の「埋まり具合」を計算する（board上に埋まっているセル数 + hiddenBoardのスタック長）
      const capacities = new Array(Config.stageCols).fill(0);
      let totalCapacity = 0;
      for (let x = 0; x < Config.stageCols; x++) {
        // count how many board cells are occupied in this column
        let occupied = 0;
        for (let y = 0; y < Config.stageRows; y++) {
          if (Stage.board[y] && Stage.board[y][x]) occupied++;
        }
        const hiddenLen = (Stage.hiddenBoard && Stage.hiddenBoard[x]) ? Stage.hiddenBoard[x].length : 0;
        // remaining capacity: how many more hidden can we stack above before exceeding stageRows
        const cap = Math.max(0, Config.stageRows - occupied - hiddenLen);
        capacities[x] = cap;
        totalCapacity += cap;
      }

      if (totalCapacity <= 0) {
        // どの列にも置けない（盤面が満杯に近い） -> 置けないまま次に回す
        if (this.debugVerbose) console.log("setOjama: no capacity to drop ojama this turn; penalty remains:", this.penalty);
        if (pendingDropped > 0) {
          this.mode = 'checkFall';
        } else {
          this.mode = 'newPuyo';
        }
      } else {
        // capacity がある限り、重複あり（1列に複数）でランダムに割り当てる。
        // 実装: capacities[x] が0でない列を候補にし、毎回ランダムに1列を選んで1個置く。
        // 選択時にその列の capacity をデクリメントし、totalCapacity もデクリメント。
        const candidateCols = [];
        for (let x = 0; x < Config.stageCols; x++) {
          if (capacities[x] > 0) candidateCols.push(x);
        }

        while (this.penalty > 0 && totalCapacity > 0 && candidateCols.length > 0) {
          const idx = Math.floor(Math.random() * candidateCols.length);
          const col = candidateCols[idx];

          Stage.setHiddenPuyo(col, -1);
          this.penalty--;
          ojamaSetCount++;

          capacities[col]--;
          totalCapacity--;

          if (capacities[col] <= 0) {
            for (let i = candidateCols.length - 1; i >= 0; i--) {
              if (candidateCols[i] === col) candidateCols.splice(i, 1);
            }
          }
        }

        if (this.debugVerbose) console.log("setOjama: dropped ojama count this turn:", ojamaSetCount, "penalty remaining:", this.penalty);

        if (ojamaSetCount > 0) {
          this.mode = 'checkFall';
        } else {
          if (pendingDropped > 0) {
            this.mode = 'checkFall';
          } else {
            this.mode = 'newPuyo';
          }
        }
      }
      } else {
        if (this.ojamaNoticeElement) {
            this.ojamaNoticeElement.style.display = 'none'; // おじゃまぷよがない場合は非表示
        }
        // ただし、保留おじゃまがあればそれは既に降らせているはずなので落下を待つ
        if (pendingDropped > 0) {
          this.mode = 'checkFall';
        } else {
          this.mode = 'newPuyo'; // 落とすべきおじゃまぷよがないので、新しいぷよへ
        }
      }
    }
    else if (this.mode == 'gameOver') {
      PuyoImage.prepareBatankyu(this.frame);
      this.mode = 'batankyu';
      if (this.ojamaNoticeElement) {
          this.ojamaNoticeElement.style.display = 'none'; // ゲームオーバー時は非表示
      }
    } else if (this.mode == 'batankyu') {
      if (this.onlineBattle) {
        this.serverConnection('batankyu');
      }
      PuyoImage.batankyu(this.frame);
      if (Player.keyStatus.space) {
        this.mode = "start";
      }
    }
    this.frame = this.frame + 1;
    requestAnimationFrame(() => this.loop());
  }

  // Replace/patch Game.requestAIMove() (safe, timeout + fallback)
  //
  // Usage:
  // - Replace the existing Game.requestAIMove implementation in game.js with this function.
  // - This version wraps AIAdapter.getMove and the fallback fetch(ai.php) with timeouts,
  //   logs failures, and falls back to a local safe stub if AI fails.

  static async requestAIMove() {
    // build field array
    const fieldArray = (function() {
      const arr = [];
      for (let y = 0; y < Config.stageRows; y++) {
        for (let x = 0; x < Config.stageCols; x++) {
          arr.push(Stage.board[y] && Stage.board[y][x] ? Stage.board[y][x].puyo : 0);
        }
      }
      return arr;
    })();

    const snapshot = {
      mode: "think",
      self: {
        field: fieldArray,
        queue: []
      },
      options: { mode: "build" }
    };

    // include next queue
    try {
      if (typeof PuyoImage !== 'undefined' && Array.isArray(PuyoImage.nextPuyosSet)) {
        snapshot.self.queue = PuyoImage.nextPuyosSet.map(e => [e.centerPuyo, e.movablePuyo]);
      }
    } catch (e) {
      console.warn("requestAIMove: cannot read nextPuyosSet", e);
      snapshot.self.queue = [];
    }

    // CRITICAL: include current pair explicitly if available
    try {
      if (typeof Player !== 'undefined' && Player.centerPuyo != null && Player.movablePuyo != null) {
        snapshot.self.current = [Number(Player.centerPuyo), Number(Player.movablePuyo)];
      } else {
        snapshot.self.current = null;
      }
    } catch (e) {
      snapshot.self.current = null;
    }

    if (this.debugVerbose) console.log("DEBUG: AI SNAPSHOT", snapshot);

    const withTimeout = (promise, ms, fallbackErrMsg = 'timeout') => {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(fallbackErrMsg)), ms);
      });
      return Promise.race([promise.finally(()=>clearTimeout(timeoutId)), timeoutPromise]);
    };

    const fallbackResponse = {
      placement: null,
      pair: null,
      used: { type: 'current' },
      inputs: ['LEFT','DROP']
    };

    // try server ai.php
    try {
      const url = new URL('ai.php', window.location.href).toString();
      if (this.debugVerbose) console.log("AI request snapshot (server first):", snapshot, "url:", url);

      const fetchPromise = fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      }).then(async res => {
        if (!res.ok) {
          const text = await res.text().catch(()=>'<no body>');
          throw new Error(`AI server returned ${res.status}: ${text}`);
        }
        const text = await res.text();
        return JSON.parse(text);
      });

      const data = await withTimeout(fetchPromise, 20000, 'ai.php timeout');
      if (this.debugVerbose) console.log('requestAIMove: server response:', data);

      // normalize response
      let pair = Array.isArray(data.pair) && data.pair.length >= 2 ? [Number(data.pair[0]), Number(data.pair[1])] : null;
      let used = data.used || null;
      const inputs = Array.isArray(data.inputs) ? data.inputs : [];

      // Fill pair from snapshot according to used
      try {
        const playerHasCurrent = (typeof Player !== 'undefined' && Player.centerPuyo != null && Player.movablePuyo != null);

        if ((!pair || pair.length < 2) && used && used.type === 'next' && Array.isArray(snapshot.self.queue) && snapshot.self.queue.length > 0) {
          const idx = (typeof used.index === 'number') ? Math.max(0, Math.min(snapshot.self.queue.length - 1, used.index)) : 0;
          if (snapshot.self.queue[idx]) {
            pair = [Number(snapshot.self.queue[idx][0]), Number(snapshot.self.queue[idx][1])];
          }
        }

        if ((!pair || pair.length < 2) && used && used.type === 'current' && playerHasCurrent) {
          pair = [Number(Player.centerPuyo), Number(Player.movablePuyo)];
        }

        // If still no pair, try snapshot.self.current if present
        if ((!pair || pair.length < 2) && snapshot.self.current) {
          pair = [Number(snapshot.self.current[0]), Number(snapshot.self.current[1])];
          used = used || { type: 'current' };
        }
      } catch(e){ console.warn("requestAIMove: pair fill error", e); }

      Game.animateAIPlacement(data.placement, pair, used, inputs);
      return;
    } catch (err) {
      console.warn('requestAIMove: server AI failed or timed out:', err);
    }

    // AIAdapter fallback
    try {
      if (typeof AIAdapter !== 'undefined' && typeof AIAdapter.getMove === 'function') {
        const data = await withTimeout(AIAdapter.getMove(snapshot, { preferBrowser: false }), 5000, 'AIAdapter timeout');
        if (this.debugVerbose) console.log("requestAIMove: AIAdapter response:", data);

        let pair = Array.isArray(data.pair) && data.pair.length >= 2 ? data.pair : null;
        let used = data.used || null;
        const inputs = Array.isArray(data.inputs) ? data.inputs : [];

        try {
          const playerHasCurrent = (typeof Player !== 'undefined' && Player.centerPuyo != null && Player.movablePuyo != null);

          if ((!pair || pair.length < 2) && used && used.type === 'next' && Array.isArray(snapshot.self.queue) && snapshot.self.queue.length > 0) {
            const idx = (typeof used.index === 'number') ? Math.max(0, Math.min(snapshot.self.queue.length - 1, used.index)) : 0;
            if (snapshot.self.queue[idx]) {
              pair = [Number(snapshot.self.queue[idx][0]), Number(snapshot.self.queue[idx][1])];
            }
          }

          if ((!pair || pair.length < 2) && used && used.type === 'current' && playerHasCurrent) {
            pair = [Number(Player.centerPuyo), Number(Player.movablePuyo)];
          }

          if ((!pair || pair.length < 2) && snapshot.self.current) {
            pair = [Number(snapshot.self.current[0]), Number(snapshot.self.current[1])];
            used = used || { type: 'current' };
          }
        } catch(e){ console.warn("requestAIMove: pair fill error (adapter)", e); }

        Game.animateAIPlacement(data.placement || null, pair, used, inputs);
        return;
      }
    } catch (e) {
      console.warn("requestAIMove: AIAdapter fallback failed", e);
    }

    // Last resort
    console.warn("requestAIMove: using local fallback stub");
    Game.animateAIPlacement(fallbackResponse.placement, fallbackResponse.pair, fallbackResponse.used, fallbackResponse.inputs);
  }

  // animateAIPlacement: used.type==='current' のときは「Player に inputs を注入」して
  // 落下中のペアを AI が直接操作するルートにする（ネクスト操作は従来どおりアニメで即時配置）
  static animateAIPlacement(placement, pair, used, inputs = []) {
    // If AI intends to operate the current falling pair, enqueue inputs to Player
    try {
      if (used && used.type === 'current') {
        if (this.debugVerbose) console.log('animateAIPlacement: routing inputs to Player (current):', inputs, 'pair:', pair);
        try {
          if (typeof Player !== 'undefined' && typeof Player.enqueueAIInputs === 'function') {
            Player.enqueueAIInputs(inputs || []);
            // ensure Player center/movable colors are in sync (best-effort)
            if (Array.isArray(pair) && pair.length >= 2) {
              Player.centerPuyo = Player.centerPuyo || Number(pair[0]);
              Player.movablePuyo = Player.movablePuyo || Number(pair[1]);
            }
          } else {
            // fallback: if Player cannot accept inputs, place immediately (less ideal)
            if (this.debugVerbose) console.warn('animateAIPlacement: Player.enqueueAIInputs not available, falling back to Stage.applyAIMove');
            Stage.applyAIMove(placement || {x:2,r:1}, pair || [1,1], used);
          }
        } catch (e) {
          console.warn("animateAIPlacement: error while enqueuing inputs", e);
        }
        return;
      }
    } catch (e) {
      console.warn("animateAIPlacement: used check failed", e);
    }

    // Otherwise (default), keep existing animation + Stage.applyAIMove behavior for non-current (usually 'next')
    // (The remainder of the previous animateAIPlacement implementation follows here)
    const duration = 300;
    // compute placement from inputs as before for visual animation
    const finalPlacement = (Array.isArray(inputs) && inputs.length > 0) ? Game.computePlacementFromInputs(inputs) : placement;
    // determine usedPairColors (fallbacks)
    let usedPairColors = null;
    if (Array.isArray(pair) && pair.length >= 2) {
      usedPairColors = [Number(pair[0]), Number(pair[1])];
    } else {
      try {
        if (used && used.type === 'current' && typeof Player !== 'undefined' && Player.centerPuyo != null && Player.movablePuyo != null) {
          usedPairColors = [Number(Player.centerPuyo), Number(Player.movablePuyo)];
        }
      } catch (e) {}
    }
    if (!usedPairColors) usedPairColors = [1,1];

    // create temporary DOM elements for animation (same as before)
    const centerEl = PuyoImage.getPuyo(usedPairColors[0]);
    const movEl = PuyoImage.getPuyo(usedPairColors[1]);

    centerEl.width = Config.puyoImgWidth;
    centerEl.height = Config.puyoImgHeight;
    movEl.width = Config.puyoImgWidth;
    movEl.height = Config.puyoImgHeight;
    centerEl.style.position = 'absolute';
    movEl.style.position = 'absolute';
    centerEl.style.zIndex = '10000';
    movEl.style.zIndex = '10000';

    const startCenterLeft = 2 * Config.puyoImgWidth;
    const startCenterTop = -1 * Config.puyoImgHeight;
    centerEl.style.left = `${startCenterLeft}px`;
    centerEl.style.top = `${startCenterTop}px`;
    movEl.style.left = `${startCenterLeft + Config.puyoImgWidth}px`;
    movEl.style.top = `${startCenterTop}px`;

    Stage.stageElement.appendChild(centerEl);
    Stage.stageElement.appendChild(movEl);

    const x = (finalPlacement && typeof finalPlacement.x !== 'undefined') ? Number(finalPlacement.x) : 2;
    const r = (finalPlacement && typeof finalPlacement.r !== 'undefined') ? Number(finalPlacement.r) % 4 : 1;
    const rmap = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
    const dx = rmap[r].dx;

    const firstOccupied = (col) => {
      for (let y = 0; y < Config.stageRows; y++) {
        if (Stage.board[y][col]) return y;
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
      y_mov = -2;
    }

    const destCenterLeft = targetCenterCol * Config.puyoImgWidth;
    const destCenterTop = (y_center >= 0) ? (y_center * Config.puyoImgHeight) : (-Config.puyoImgHeight);
    const destMovLeft = targetMovCol * Config.puyoImgWidth;
    const destMovTop = (y_mov >= 0) ? (y_mov * Config.puyoImgHeight) : (-2 * Config.puyoImgHeight);

    centerEl.style.transition = `left ${duration}ms linear, top ${duration}ms linear, transform ${duration}ms linear`;
    movEl.style.transition = `left ${duration}ms linear, top ${duration}ms linear, transform ${duration}ms linear`;

    const rotationDeg = (r * 90) % 360;
    centerEl.style.transform = `rotate(0deg)`;
    movEl.style.transform = `rotate(${rotationDeg}deg)`;

    setTimeout(() => {
      centerEl.style.left = `${destCenterLeft}px`;
      centerEl.style.top = `${destCenterTop}px`;
      movEl.style.left = `${destMovLeft}px`;
      movEl.style.top = `${destMovTop}px`;
    }, 20);

    setTimeout(() => {
      try {
        if (centerEl.parentNode === Stage.stageElement) Stage.stageElement.removeChild(centerEl);
        if (movEl.parentNode === Stage.stageElement) Stage.stageElement.removeChild(movEl);
      } catch (e) {}

      Stage.applyAIMove({ x: targetCenterCol, r: r }, usedPairColors, used);

      try {
        if (typeof Game.applyAIAfterPlacementSideEffects === 'function') {
          Game.applyAIAfterPlacementSideEffects(used);
        }

        if (used && used.type === 'current') {
          try {
            if (Player && Player.centerPuyoElement && Player.centerPuyoElement.parentNode === Stage.stageElement) {
              Stage.stageElement.removeChild(Player.centerPuyoElement);
            }
            if (Player && Player.movablePuyoElement && Player.movablePuyoElement.parentNode === Stage.stageElement) {
              Stage.stageElement.removeChild(Player.movablePuyoElement);
            }
          } catch (e) {}
          try {
            if (Player) {
              Player.centerPuyoElement = null;
              Player.movablePuyoElement = null;
              Player.centerPuyo = null;
              Player.movablePuyo = null;
              Player._puyoId = null;
              Game.commitEventCount = (Game.commitEventCount || 0) + 1;
              if (this.debugVerbose) console.log("animateAIPlacement: incremented Game.commitEventCount for AI placement ->", Game.commitEventCount);
            }
          } catch (e) {
            console.warn("animateAIPlacement: failed to clear Player.current after AI placement", e);
          }
        }
      } catch (e) {
        console.warn("animateAIPlacement: post-placement cleanup failed", e);
      }
    }, duration + 40);
  }

  // Client-side simulation of inputs -> final placement (keeps behaviour consistent)
  static computePlacementFromInputs(inputs) {
    let x = 2;
    let r = 1;
    const rmap = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
    const tryInBounds = (col) => (col >= 0 && col < Config.stageCols);

    const firstOccupied = (col) => {
      for (let y = 0; y < Config.stageRows; y++) {
        if (Stage.board[y][col]) return y;
      }
      return Config.stageRows;
    };

    if (!Array.isArray(inputs)) inputs = [];

    for (let cmd of inputs) {
      const c = String(cmd).toUpperCase();
      if (c === 'LEFT') {
        const dx_cur = rmap[r].dx;
        const newCenter = x - 1;
        const newMov = newCenter + dx_cur;
        if (tryInBounds(newCenter) && tryInBounds(newMov)) {
          let ok = true;
          for (let y = 0; y < 2; y++) {
            if (Stage.board[y][newCenter] || Stage.board[y][newMov]) { ok = false; break; }
          }
          if (ok) x = newCenter;
        }
      } else if (c === 'RIGHT') {
        const dx_cur = rmap[r].dx;
        const newCenter = x + 1;
        const newMov = newCenter + dx_cur;
        if (tryInBounds(newCenter) && tryInBounds(newMov)) {
          let ok = true;
          for (let y = 0; y < 2; y++) {
            if (Stage.board[y][newCenter] || Stage.board[y][newMov]) { ok = false; break; }
          }
          if (ok) x = newCenter;
        }
      } else if (c === 'ROTATE' || c === 'ROTATE_CW' || c === 'X' || c === 'UP') {
        const newR = (r + 1) % 4;
        const attempts = [0, -1, 1];
        for (let shift of attempts) {
          const nx = x + shift;
          const dx_new = rmap[newR].dx;
          if (!tryInBounds(nx) || !tryInBounds(nx + dx_new)) continue;
          let ok = true;
          for (let y = 0; y < 2; y++) {
            if (Stage.board[y][nx] || Stage.board[y][nx + dx_new]) { ok = false; break; }
          }
          if (ok) { x = nx; r = newR; break; }
        }
      } else if (c === 'ROTATE_CCW' || c === 'Z') {
        const newR = (r + 3) % 4;
        const attempts = [0, -1, 1];
        for (let shift of attempts) {
          const nx = x + shift;
          const dx_new = rmap[newR].dx;
          if (!tryInBounds(nx) || !tryInBounds(nx + dx_new)) continue;
          let ok = true;
          for (let y = 0; y < 2; y++) {
            if (Stage.board[y][nx] || Stage.board[y][nx + dx_new]) { ok = false; break; }
          }
          if (ok) { x = nx; r = newR; break; }
        }
      } else if (c === 'DROP' || c === 'HARD_DROP') {
        break;
      }
    }

    return { x: x, r: r };
  }

  // Add to Game: a function to run the small side-effects that Player.fix used to do regarding next-ojama countdown,
  // but without duplicating the placement that Player.fix does.
  static applyAIAfterPlacementSideEffects(used) {
    // at the top of Game.applyAIAfterPlacementSideEffects
    console.log("applyAIAfterPlacementSideEffects called:", {
      used: used,
      nextOjamaIntervalBefore: Game.nextOjamaInterval,
      pendingOjamaBefore: Game.pendingOjama,
      frame: Game.frame,
      mode: Game.mode
    });


    // decrement prediction-counter (手操作時は Player.fix called this; for AI we do the same)
    if (!Game.nextOjamaInterval) Game.nextOjamaInterval = Math.floor(Math.random() * 3) + 3;
    if (!Game.nextOjamaCount) Game.nextOjamaCount = Math.floor(Math.random() * 3) + 1;
    Game.nextOjamaInterval = Game.nextOjamaInterval - 1;
    if (Game.nextOjamaInterval <= 0) {
      Game.pendingOjama = (Game.pendingOjama || 0) + Game.nextOjamaCount;
      Game.nextOjamaInterval = Math.floor(Math.random() * 3) + 3;
      Game.nextOjamaCount = Math.floor(Math.random() * 3) + 1;
    }
    // Update display
    if (Game.ojamaNoticeElement) {
      if (Game.pendingOjama && Game.pendingOjama > 0) {
        Game.ojamaNoticeElement.style.display = 'block';
        Game.ojamaNoticeElement.innerText = `保留: ${Game.pendingOjama}個のおじゃまぷよがあります`;
      } else {
        Game.ojamaNoticeElement.style.display = 'block';
        Game.ojamaNoticeElement.innerText = `予告: ${Game.nextOjamaInterval}手後に ${Game.nextOjamaCount}個のおじゃまぷよが降ります`;
      }
    }
  }
}