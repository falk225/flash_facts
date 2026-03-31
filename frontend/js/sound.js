const Sound = (() => {
  let audioCtx = null;
  const buffers = {};

  async function load() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const files = {
        correct: '/assets/sounds/correct.wav',
        wrong:   '/assets/sounds/wrong.wav'
      };
      await Promise.all(Object.entries(files).map(async ([name, url]) => {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        buffers[name] = await audioCtx.decodeAudioData(arrayBuf);
      }));
    } catch (e) {
      console.warn('[sound] Could not load sounds:', e);
    }
  }

  function play(name) {
    if (!audioCtx || !buffers[name]) return;
    audioCtx.resume().then(() => {
      const src = audioCtx.createBufferSource();
      src.buffer = buffers[name];
      src.connect(audioCtx.destination);
      src.start(0);
    });
  }

  return { load, play };
})();
