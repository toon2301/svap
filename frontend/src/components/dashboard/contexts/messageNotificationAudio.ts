'use client';

const MESSAGE_NOTIFICATION_SOUND_SRC =
  '/sounds/universfield-new-notification-040-493469.mp3';
const MESSAGE_NOTIFICATION_VOLUME = 0.45;

type GlobalScopeWithAudio = typeof globalThis & {
  __SWAPLY_MSG_AUDIO_CTX__?: AudioContext;
  __SWAPLY_MSG_AUDIO__?: HTMLAudioElement;
  __SWAPLY_MSG_AUDIO_BUFFER__?: AudioBuffer | null;
  __SWAPLY_MSG_AUDIO_BUFFER_PROMISE__?: Promise<AudioBuffer | null> | null;
  __SWAPLY_MSG_AUDIO_PRIMER_INSTALLED__?: boolean;
};

function getAudioContextCtor():
  | typeof AudioContext
  | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

function getAudioContext(): AudioContext | null {
  const AudioCtor = getAudioContextCtor();
  if (!AudioCtor) {
    return null;
  }

  const globalScope = globalThis as GlobalScopeWithAudio;
  if (!globalScope.__SWAPLY_MSG_AUDIO_CTX__) {
    globalScope.__SWAPLY_MSG_AUDIO_CTX__ = new AudioCtor();
  }

  return globalScope.__SWAPLY_MSG_AUDIO_CTX__ ?? null;
}

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return null;
  }

  const globalScope = globalThis as GlobalScopeWithAudio;
  if (!globalScope.__SWAPLY_MSG_AUDIO__) {
    const audio = new Audio(MESSAGE_NOTIFICATION_SOUND_SRC);
    audio.preload = 'auto';
    audio.volume = MESSAGE_NOTIFICATION_VOLUME;
    globalScope.__SWAPLY_MSG_AUDIO__ = audio;
  }

  return globalScope.__SWAPLY_MSG_AUDIO__ ?? null;
}

async function decodeAudioBuffer(
  audioContext: AudioContext,
  bytes: ArrayBuffer,
): Promise<AudioBuffer> {
  return audioContext.decodeAudioData(bytes.slice(0));
}

async function getDecodedNotificationBuffer(): Promise<AudioBuffer | null> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return null;
  }

  const audioContext = getAudioContext();
  if (!audioContext) {
    return null;
  }

  const globalScope = globalThis as GlobalScopeWithAudio;
  if (globalScope.__SWAPLY_MSG_AUDIO_BUFFER__) {
    return globalScope.__SWAPLY_MSG_AUDIO_BUFFER__;
  }

  if (globalScope.__SWAPLY_MSG_AUDIO_BUFFER_PROMISE__) {
    return globalScope.__SWAPLY_MSG_AUDIO_BUFFER_PROMISE__;
  }

  const bufferPromise = (async () => {
    try {
      const response = await fetch(MESSAGE_NOTIFICATION_SOUND_SRC, {
        cache: 'force-cache',
      });
      if (!response.ok) {
        return null;
      }

      const bytes = await response.arrayBuffer();
      const decoded = await decodeAudioBuffer(audioContext, bytes);
      globalScope.__SWAPLY_MSG_AUDIO_BUFFER__ = decoded;
      return decoded;
    } catch {
      return null;
    } finally {
      globalScope.__SWAPLY_MSG_AUDIO_BUFFER_PROMISE__ = null;
    }
  })();

  globalScope.__SWAPLY_MSG_AUDIO_BUFFER_PROMISE__ = bufferPromise;
  return bufferPromise;
}

async function resumeAudioContextIfNeeded(
  audioContext: AudioContext | null,
): Promise<void> {
  if (!audioContext || audioContext.state !== 'suspended') {
    return;
  }

  try {
    await audioContext.resume();
  } catch {
    // fail-open
  }
}

async function primeNotificationAudio(): Promise<void> {
  const audioElement = getAudioElement();
  if (audioElement && typeof audioElement.load === 'function') {
    try {
      audioElement.load();
    } catch {
      // fail-open
    }
  }

  const audioContext = getAudioContext();
  await resumeAudioContextIfNeeded(audioContext);
  void getDecodedNotificationBuffer();
}

async function playViaDecodedBuffer(): Promise<boolean> {
  const audioContext = getAudioContext();
  if (!audioContext) {
    return false;
  }

  await resumeAudioContextIfNeeded(audioContext);
  if (audioContext.state === 'suspended') {
    return false;
  }

  const buffer = await getDecodedNotificationBuffer();
  if (!buffer) {
    return false;
  }

  try {
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    source.buffer = buffer;
    gainNode.gain.setValueAtTime(
      MESSAGE_NOTIFICATION_VOLUME,
      audioContext.currentTime,
    );
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
    return true;
  } catch {
    return false;
  }
}

async function playViaAudioElement(): Promise<boolean> {
  const audioElement = getAudioElement();
  if (!audioElement) {
    return false;
  }

  try {
    audioElement.currentTime = 0;
    await audioElement.play();
    return true;
  } catch {
    return false;
  }
}

export function playMessageNotificationSound(): void {
  void (async () => {
    if (await playViaDecodedBuffer()) {
      return;
    }

    void playViaAudioElement();
  })();
}

export function installMessageNotificationAudioPrimer(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const globalScope = globalThis as GlobalScopeWithAudio;
  if (globalScope.__SWAPLY_MSG_AUDIO_PRIMER_INSTALLED__) {
    return () => {};
  }

  globalScope.__SWAPLY_MSG_AUDIO_PRIMER_INSTALLED__ = true;

  const handleFirstInteraction = () => {
    cleanup();
    void primeNotificationAudio();
  };

  const cleanup = () => {
    document.removeEventListener('pointerdown', handleFirstInteraction, true);
    document.removeEventListener('touchstart', handleFirstInteraction, true);
    document.removeEventListener('keydown', handleFirstInteraction, true);
    globalScope.__SWAPLY_MSG_AUDIO_PRIMER_INSTALLED__ = false;
  };

  document.addEventListener('pointerdown', handleFirstInteraction, true);
  document.addEventListener('touchstart', handleFirstInteraction, true);
  document.addEventListener('keydown', handleFirstInteraction, true);

  return cleanup;
}
