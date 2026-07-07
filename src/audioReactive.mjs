const EMPTY_SPECTRUM = Object.freeze({ bass: 0, mid: 0, treble: 0, pulse: 0 });

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
