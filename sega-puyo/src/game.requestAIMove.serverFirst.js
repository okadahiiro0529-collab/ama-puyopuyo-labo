static async requestAIMove() {
  // build snapshot array first, then compose payload object
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

  try {
    if (typeof PuyoImage !== 'undefined' && Array.isArray(PuyoImage.nextPuyosSet)) {
      snapshot.self.queue = PuyoImage.nextPuyosSet.map(e => [e.centerPuyo, e.movablePuyo]);
    }
  } catch (e) {
    console.warn("requestAIMove: cannot read nextPuyosSet", e);
    snapshot.self.queue = [];
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

  // 1) Try server ai.php first
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

    let pair = Array.isArray(data.pair) && data.pair.length >= 2 ? [Number(data.pair[0]), Number(data.pair[1])] : null;
    let used = data.used || null;
    const inputs = Array.isArray(data.inputs) ? data.inputs : [];

    try {
      const playerHasCurrent = (typeof Player !== 'undefined' && Player.centerPuyo != null && Player.movablePuyo != null);
      if ((!pair || pair.length < 2) && used && used.type === 'next' && Array.isArray(snapshot.self.queue) && snapshot.self.queue.length > 0) {
        pair = [Number(snapshot.self.queue[0][0]), Number(snapshot.self.queue[0][1])];
      }
      if ((!pair || pair.length < 2) && used && used.type === 'current' && playerHasCurrent) {
        pair = [Number(Player.centerPuyo), Number(Player.movablePuyo)];
      }
    } catch(e){ console.warn("requestAIMove: pair fill error", e); }

    Game.animateAIPlacement(data.placement, pair, used, inputs);
    return;
  } catch (err) {
    console.warn('requestAIMove: server AI failed or timed out:', err);
  }

  // 2) AIAdapter fallback (no browser stub)
  try {
    if (typeof AIAdapter !== 'undefined' && typeof AIAdapter.getMove === 'function') {
      const data = await withTimeout(AIAdapter.getMove(snapshot, { preferBrowser: false }), 5000, 'AIAdapter timeout');
      if (this.debugVerbose) console.log("requestAIMove: AIAdapter response:", data);
      let pair = Array.isArray(data.pair) && data.pair.length >= 2 ? data.pair : null;
      let used = data.used || null;
      const inputs = Array.isArray(data.inputs) ? data.inputs : [];
      Game.animateAIPlacement(data.placement || null, pair, used, inputs);
      return;
    }
  } catch (e) {
    console.warn("requestAIMove: AIAdapter fallback failed", e);
  }

  // 3) Last resort
  console.warn("requestAIMove: using local fallback stub");
  Game.animateAIPlacement(fallbackResponse.placement, fallbackResponse.pair, fallbackResponse.used, fallbackResponse.inputs);
}