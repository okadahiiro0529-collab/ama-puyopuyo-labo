class PuyoImage {
  static initialize() {
    this.nowLoadingImage = document.getElementById("nowLoading");
    this.pauseImage = document.getElementById("pause");
    this.puyoImages = [];

    // helper: safe loader that uses Game.loadImg if available, otherwise sets src directly
    const safeLoadImg = (src, imgElement, onload = () => {}) => {
      if (typeof Game !== 'undefined' && typeof Game.loadImg === 'function') {
        try {
          Game.loadImg(src, imgElement, onload);
          return;
        } catch (e) {
          console.warn("safeLoadImg: Game.loadImg failed, falling back:", e);
        }
      }
      // fallback: attach onload then set src
      imgElement.addEventListener('load', () => { try { onload(); } catch (e) {} }, { once: true });
      imgElement.src = src;
      console.log(`Fallback Load Image: ${src}`);
    };

    for (let a = 0; a < 5; a++) {
      this.puyoImages.push(new Image());
      safeLoadImg(`img/puyo_${a + 1}.png`, this.puyoImages[a], () => {
        this.puyoImages[a].width = Config.puyoImgWidth;
        this.puyoImages[a].height = Config.puyoImgHeight;
        this.puyoImages[a].style.position = 'absolute';
      });
    }
    this.ojamaPuyoImage = new Image();
    safeLoadImg('img/ojamaPuyo.png', this.ojamaPuyoImage, () => {
      this.ojamaPuyoImage.width = Config.puyoImgWidth;
      this.ojamaPuyoImage.height = Config.puyoImgHeight;
      this.ojamaPuyoImage.style.position = 'absolute';
    });

    // Shuffle base images a bit (optional)
    for (let i = this.puyoImages.length - 1; i >= 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [this.puyoImages[i], this.puyoImages[j]] = [this.puyoImages[j], this.puyoImages[i]];
    }

    this.batankyuImage = new Image();
    safeLoadImg('img/batankyu.png', this.batankyuImage, () => {
      this.batankyuImage.width = Config.puyoImgWidth * 6;
      this.batankyuImage.style.position = 'absolute';
    });

    // nextPuyosSet stores only color pairs: { centerPuyo, movablePuyo }
    this.nextPuyosSet = this.nextPuyosSet || [];
  }

  static start() {
    // Ensure next queue is filled with color pairs (no DOM elements stored here)
    this.nextPuyosSet = this.nextPuyosSet || [];
    this.ensureNextAvailable();

    // ensure UI shows initial nexts if Stage.showNextPuyos exists
    try {
      if (typeof Stage !== 'undefined' && typeof Stage.showNextPuyos === 'function') {
        Stage.showNextPuyos();
      }
    } catch (e) {
      console.warn("PuyoImage.start: failed to call Stage.showNextPuyos", e);
    }
  }

  // Ensure there are always Config.nextPuyosSetCount color pairs available
  static ensureNextAvailable() {
    this.nextPuyosSet = this.nextPuyosSet || [];
    while (this.nextPuyosSet.length < Config.nextPuyosSetCount) {
      this.nextPuyosSet.push({
        movablePuyo: Math.floor(Math.random() * Config.puyoColors) + 1,
        centerPuyo: Math.floor(Math.random() * Config.puyoColors) + 1
      });
    }
  }

  // Return the next pair (shift) together with freshly created DOM elements
  // This function both removes the pair from queue and refills the queue.
  static getNextPuyos() {
    this.ensureNextAvailable();

    // DEBUG: before shifting
    console.log("BEFORE getNextPuyos shift:", this.nextPuyosSet.map(p => [p.centerPuyo, p.movablePuyo]));
    const pair = this.nextPuyosSet.shift();
    // Refill
    this.ensureNextAvailable();
    // DEBUG: after shifting
    console.log("AFTER getNextPuyos shift:", this.nextPuyosSet.map(p => [p.centerPuyo, p.movablePuyo]));

    // Update next display NOW that queue changed
    try {
      if (typeof Stage !== 'undefined' && typeof Stage.showNextPuyos === 'function') {
        Stage.showNextPuyos();
      }
    } catch (e) {
      console.warn("PuyoImage.getNextPuyos: failed to call Stage.showNextPuyos", e);
    }

    const centerEl = this.getPuyo(pair.centerPuyo);
    const movEl = this.getPuyo(pair.movablePuyo);

    return {
      centerPuyo: pair.centerPuyo,
      movablePuyo: pair.movablePuyo,
      centerPuyoElement: centerEl,
      movablePuyoElement: movEl
    };
  }

  // Helper to peek at queue (colors only) without removing
  static peekNextColors() {
    this.ensureNextAvailable();
    return this.nextPuyosSet.map(p => [p.centerPuyo, p.movablePuyo]);
  }

  // getPuyo creates a fresh image element (clone) for a given color index
  static getPuyo(index) {
    if (index > 0 && index <= Config.puyoColors) {
      return this.puyoImages[index - 1].cloneNode();
    }
    return this.ojamaPuyoImage.cloneNode();
  }

  static prepareBatankyu(frame) {
    this.gameOverFrame = frame;
    Stage.stageElement.appendChild(this.batankyuImage);
    this.batankyuImage.style.top = `-${this.batankyuImage.height}px`;
    this.batankyuImage.style.position = 'absolute';
    this.batankyuImage.style.zIndex = '1000';
  }

  static batankyu(frame) {
    let ratio = (frame - this.gameOverFrame) / Config.gameOverFrame;
    let x = Math.cos(Math.PI / 2 + ratio * Math.PI * 2 * 10) * Config.puyoImgWidth;
    let y = Math.cos(Math.PI + ratio * Math.PI * 2) * Config.puyoImgHeight * Config.stageRows / 4 + Config.puyoImgHeight * Config.stageRows / 2;
    this.batankyuImage.style.left = `${x}px`;
    this.batankyuImage.style.top = `${y}px`;
  }
}