class Score {
  static initialize() {
    this.rensaBonus = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512, 544, 576, 608, 640, 672];
    this.pieceBonus = [0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 10, 10];
    this.colorBonus = [0, 0, 3, 6, 12, 24];
    this.fontTemplateList = [];

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

    for (let a = 0; a < 10; a++) {
      this.fontTemplateList.push(new Image());
      safeLoadImg(`img/${a}.png`, this.fontTemplateList[a], () => {
        // Some images may not have width yet until loaded, so guard
        try {
          this.fontTemplateList[a].height = Config.fontHeight;
          if (this.fontTemplateList[a].naturalHeight > 0) {
            this.fontTemplateList[a].width = this.fontTemplateList[a].naturalWidth / this.fontTemplateList[a].naturalHeight * Config.fontHeight;
          }
        } catch (e) {
          console.warn("Score.initialize: font img load callback error", e);
        }
      });
    }
  }
  static start() {
    // guard: if fonts not loaded yet, wait a tick (best-effort)
    if (!this.fontTemplateList || !this.fontTemplateList[0] || this.fontTemplateList[0].width === 0) {
      setTimeout(() => this.start(), 50);
      return;
    }
    this.fontLength = Math.floor(Config.stageCols * Config.puyoImgWidth / Score.fontTemplateList[0].width);
    this.score = 0;
    this.showScore();
  }
  static showScore() {
    let score = this.score;
    while (Stage.scoreElement.firstChild) {
      Stage.scoreElement.removeChild(Stage.scoreElement.firstChild);
    }
    for (let a = 0; a < this.fontLength; a++) {
      let number = score % 10;
      Stage.scoreElement.insertBefore(this.fontTemplateList[number].cloneNode(true), Stage.scoreElement.firstChild);
      score = Math.floor(score / 10);
    }
  }
  static calculateScore(rensa, piece, color) {
    rensa = Math.min(rensa, Score.rensaBonus.length - 1);
    piece = Math.min(piece, Score.pieceBonus.length - 1);
    color = Math.min(color, Score.colorBonus.length - 1);
    let scale = Score.rensaBonus[rensa] + Score.pieceBonus[piece];
    if (scale === 0) {
      scale = 1;
    }
    this.addScore(scale * piece * 10);
  }
  static addScore (score) {
    this.score = this.score + score;
    this.showScore();
  }
};