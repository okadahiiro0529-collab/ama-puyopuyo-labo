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
      // If no browser AMA, fallback to simple built-in heuristic if present
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