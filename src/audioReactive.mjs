const EMPTY_SPECTRUM = Object.freeze({ bass: 0, mid: 0, treble: 0, pulse: 0 });
const DEMO_TRACK_PATTERN = Object.freeze({
  id: 'neon-matsuri-rush',
  title: 'Neon Matsuri Rush',
  bpm: 150,
  steps: 32,
  bass: Object.freeze([45, 45, 57, 45, 52, 45, 57, 64, 45, 45, 60, 57, 52, 45, 43, 40, 45, 45, 57, 45, 52, 57, 64, 69, 45, 52, 57, 60, 64, 57, 52, 45]),
  lead: Object.freeze([81, 0, 84, 86, 88, 0, 86, 84, 81, 0, 88, 91, 93, 91, 88, 86, 84, 0, 86, 88, 91, 0, 93, 96, 98, 96, 93, 91, 88, 86, 84, 81]),
  kicks: Object.freeze([0, 4, 8, 12, 16, 20, 24, 28, 30]),
  snares: Object.freeze([8, 16, 24]),
  hats: Object.freeze([2, 6, 10, 14, 18, 22, 26, 30])
});

export function createDemoTrackPattern() {
  return {
    id: DEMO_TRACK_PATTERN.id,
    title: DEMO_TRACK_PATTERN.title,
    bpm: DEMO_TRACK_PATTERN.bpm,
    steps: DEMO_TRACK_PATTERN.steps,
    bass: [...DEMO_TRACK_PATTERN.bass],
    lead: [...DEMO_TRACK_PATTERN.lead],
    kicks: [...DEMO_TRACK_PATTERN.kicks],
    snares: [...DEMO_TRACK_PATTERN.snares],
    hats: [...DEMO_TRACK_PATTERN.hats]
  };
}

export function calculatePulseFromFrequencyData(frequencyData) {
  if (!frequencyData || frequencyData.length === 0) {
    return 0;
  }

  let total = 0;
  for (const value of frequencyData) {
    total += Math.max(0, Math.min(255, Number(value) || 0));
  }

  return roundToTwoDecimals(total / frequencyData.length / 255);
}

export function calculateSpectrumFromFrequencyData(frequencyData) {
  if (!frequencyData || frequencyData.length === 0) {
    return { ...EMPTY_SPECTRUM };
  }

  const bandSize = Math.max(1, Math.floor(frequencyData.length / 3));
  const bass = getBandAverage(frequencyData, 0, bandSize);
  const mid = getBandAverage(frequencyData, bandSize, bandSize * 2);
  const treble = getBandAverage(frequencyData, bandSize * 2, frequencyData.length);
  const pulse = roundToTwoDecimals(bass * 0.5 + mid * 0.32 + treble * 0.18);

  return { bass, mid, treble, pulse };
}

export function smoothPulse(previousPulse, nextPulse, smoothing = 0.18) {
  const previous = clamp01(previousPulse);
  const next = clamp01(nextPulse);
  const factor = clamp01(smoothing);

  return roundToTwoDecimals(previous + (next - previous) * factor);
}

export function smoothSpectrum(previousSpectrum, nextSpectrum, options = {}) {
  const rise = Number.isFinite(Number(options.rise)) ? Number(options.rise) : 0.36;
  const fall = Number.isFinite(Number(options.fall)) ? Number(options.fall) : 0.14;

  return {
    bass: smoothBand(previousSpectrum?.bass, nextSpectrum?.bass, rise, fall),
    mid: smoothBand(previousSpectrum?.mid, nextSpectrum?.mid, rise, fall),
    treble: smoothBand(previousSpectrum?.treble, nextSpectrum?.treble, rise, fall),
    pulse: smoothBand(previousSpectrum?.pulse, nextSpectrum?.pulse, rise, fall)
  };
}

export async function createLocalAudioAnalyser(file, audioElement) {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not available in this browser.');
  }
  if (!file || !audioElement) {
    throw new Error('A local audio file and audio element are required.');
  }

  const objectUrl = URL.createObjectURL(file);
  audioElement.src = objectUrl;
  audioElement.loop = true;

  const audioContext = new AudioContextClass();
  const source = audioContext.createMediaElementSource(audioElement);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.72;
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);

  return {
    audioContext,
    analyser,
    frequencyData,
    objectUrl,
    async play() {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      await audioElement.play();
    },
    getPulse() {
      analyser.getByteFrequencyData(frequencyData);
      return calculatePulseFromFrequencyData(frequencyData);
    },
    getSpectrum() {
      analyser.getByteFrequencyData(frequencyData);
      return calculateSpectrumFromFrequencyData(frequencyData);
    },
    dispose() {
      audioElement.pause();
      audioElement.removeAttribute('src');
      URL.revokeObjectURL(objectUrl);
      audioContext.close();
    }
  };
}

export async function createGeneratedDemoAnalyser() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not available in this browser.');
  }

  const audioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  const masterGain = audioContext.createGain();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.7;
  masterGain.gain.value = 0.42;
  masterGain.connect(analyser);
  analyser.connect(audioContext.destination);

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const pattern = createDemoTrackPattern();
  const stepSeconds = 60 / pattern.bpm / 4;
  const loopSeconds = stepSeconds * pattern.steps;
  let intervalId = null;
  let nextLoopAt = 0;

  function scheduleLoop(startAt) {
    const noiseBuffer = createNoiseBuffer(audioContext, 0.22);
    for (let step = 0; step < pattern.steps; step += 1) {
      const time = startAt + step * stepSeconds;
      if (pattern.kicks.includes(step)) {
        scheduleKick(audioContext, masterGain, time);
      }
      if (pattern.snares.includes(step)) {
        scheduleSnare(audioContext, masterGain, noiseBuffer, time);
      }
      if (pattern.hats.includes(step)) {
        scheduleHat(audioContext, masterGain, noiseBuffer, time);
      }
      scheduleBass(audioContext, masterGain, midiToFrequency(pattern.bass[step]), time, stepSeconds * 0.88);
      if (pattern.lead[step] > 0) {
        scheduleLead(audioContext, masterGain, midiToFrequency(pattern.lead[step]), time, stepSeconds * 0.72);
      }
    }
  }

  return {
    audioContext,
    analyser,
    frequencyData,
    title: pattern.title,
    async play() {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      nextLoopAt = audioContext.currentTime + 0.05;
      scheduleLoop(nextLoopAt);
      intervalId = setInterval(() => {
        const safetyWindow = audioContext.currentTime + loopSeconds * 0.7;
        while (nextLoopAt < safetyWindow) {
          nextLoopAt += loopSeconds;
          scheduleLoop(nextLoopAt);
        }
      }, Math.max(200, loopSeconds * 250));
    },
    getSpectrum() {
      analyser.getByteFrequencyData(frequencyData);
      return calculateSpectrumFromFrequencyData(frequencyData);
    },
    dispose() {
      if (intervalId) {
        clearInterval(intervalId);
      }
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.04);
      globalThis.setTimeout(() => audioContext.close(), 120);
    }
  };
}

function scheduleKick(audioContext, destination, time) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(105, time);
  oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.16);
  gain.gain.setValueAtTime(0.95, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(time);
  oscillator.stop(time + 0.22);
}

function scheduleSnare(audioContext, destination, noiseBuffer, time) {
  const noise = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  noise.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.value = 1700;
  gain.gain.setValueAtTime(0.42, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  noise.start(time);
  noise.stop(time + 0.16);
}

function scheduleHat(audioContext, destination, noiseBuffer, time) {
  const noise = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  noise.buffer = noiseBuffer;
  filter.type = 'highpass';
  filter.frequency.value = 6200;
  gain.gain.setValueAtTime(0.18, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  noise.start(time);
  noise.stop(time + 0.06);
}

function scheduleBass(audioContext, destination, frequency, time, duration) {
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.value = frequency;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(720, time);
  filter.frequency.exponentialRampToValueAtTime(160, time + duration);
  gain.gain.setValueAtTime(0.16, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.02);
}

function scheduleLead(audioContext, destination, frequency, time, duration) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'square';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.055, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.02);
}

function createNoiseBuffer(audioContext, durationSeconds) {
  const sampleCount = Math.floor(audioContext.sampleRate * durationSeconds);
  const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function getBandAverage(frequencyData, startIndex, endIndex) {
  let total = 0;
  let count = 0;
  for (let index = startIndex; index < endIndex; index += 1) {
    total += Math.max(0, Math.min(255, Number(frequencyData[index]) || 0));
    count += 1;
  }

  if (count === 0) {
    return 0;
  }

  return roundToTwoDecimals(total / count / 255);
}

function smoothBand(previousValue, nextValue, rise, fall) {
  const previous = clamp01(previousValue);
  const next = clamp01(nextValue);
  const factor = next > previous ? clamp01(rise) : clamp01(fall);
  return roundToTwoDecimals(previous + (next - previous) * factor);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}
