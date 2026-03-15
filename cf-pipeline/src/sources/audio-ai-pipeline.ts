/**
 * DETECTAI — AI Audio Pipeline Sources (New CF Account)
 * These sources are scraped by workers on the new Cloudflare account
 * and pushed to saghi776/detectai-dataset for audio AI detection training.
 *
 * All datasets are AI-generated audio — TTS, voice cloning, deepfake audio.
 */
import type { Source } from '../types'

export const AI_AUDIO_SOURCES: Source[] = [
  // ── TTS / Synthesis ────────────────────────────────────────────────────────

  // ASVspoof5 — gold standard anti-spoofing, 20+ attack types
  {
    name: 'asvspoof5-ai', id: 'jungjee/asvspoof5',
    media_type: 'audio', label: 'ai',
    audio_field: 'audio', label_field: 'label',
    label_map: { spoof: 'ai', bonafide: 'human' },
    meta_fields: ['attack_type', 'speaker_id'],
  },

  // MLAAD v9 — 51 languages, 140 TTS models (ElevenLabs-style multilingual)
  {
    name: 'mlaad-tts', id: 'mueller91/MLAAD',
    config: 'default', split: 'train',
    media_type: 'audio', label: 'ai',
    audio_field: 'audio',
    meta_fields: ['language', 'tts_model'],
  },

  // WaveFake — 7 GAN vocoders applied to LJSpeech
  {
    name: 'wavefake-gan', id: 'balt0/WaveFake',
    media_type: 'audio', label: 'ai',
    audio_field: 'audio', meta_fields: ['vocoder', 'speaker'],
  },

  // FakeAVCeleb — multimodal deepfake (audio component)
  {
    name: 'fakeavceleb-audio', id: 'OpenRL/FakeAVCeleb',
    media_type: 'audio', label: 'mixed',
    audio_field: 'audio', label_field: 'label',
    label_map: { fake: 'ai', real: 'human', RealVideo_RealAudio: 'human', FakeVideo_FakeAudio: 'ai', RealVideo_FakeAudio: 'ai' },
  },

  // In-the-wild deepfake audio
  {
    name: 'wild-deepfake', id: 'motheecreator/in-the-wild-audio-deepfake',
    media_type: 'audio', label: 'mixed',
    audio_field: 'audio', label_field: 'label',
    label_map: { spoof: 'ai', bonafide: 'human', fake: 'ai', real: 'human' },
  },

  // Deepfake audio detection benchmark
  {
    name: 'deepfake-bench', id: 'mo-thecreator/Deepfake-audio-detection',
    media_type: 'audio', label: 'mixed',
    audio_field: 'audio', label_field: 'label',
    label_map: { FAKE: 'ai', REAL: 'human' },
  },

  // TTS detection dataset (ElevenLabs, Murf, Play.ht samples)
  {
    name: 'tts-detect', id: 'the-crypt-keeper/tts-detection',
    media_type: 'audio', label: 'mixed',
    audio_field: 'audio', label_field: 'label',
    label_map: { ai: 'ai', human: 'human', '1': 'ai', '0': 'human' },
  },

  // ASVspoof 2019 LA — classic benchmark
  {
    name: 'asvspoof2019', id: 'DynamicSuperb/AudioDeepfakeDetection_ASVspoof2019LA',
    media_type: 'audio', label: 'mixed',
    audio_field: 'audio', label_field: 'label',
    label_map: { spoofed: 'ai', genuine: 'human', spoof: 'ai', bonafide: 'human' },
  },

  // UniDataPro — binary labeled real vs synthetic
  {
    name: 'unidatapro-ai', id: 'UniDataPro/real-vs-fake-human-voice-deepfake-audio',
    media_type: 'audio', label: 'mixed',
    audio_field: 'audio', label_field: 'label',
    label_map: { fake: 'ai', real: 'human', FAKE: 'ai', REAL: 'human' },
  },

  // ── Real Human Speech (for contrast) ─────────────────────────────────────

  {
    name: 'librispeech-real', id: 'openslr/librispeech_asr', config: 'clean',
    media_type: 'audio', label: 'human',
    audio_field: 'audio', meta_fields: ['text', 'speaker_id'],
  },
  {
    name: 'common-voice-real', id: 'mozilla-foundation/common_voice_11_0', config: 'en',
    media_type: 'audio', label: 'human',
    audio_field: 'audio', meta_fields: ['sentence', 'gender'],
    language: 'en',
  },
  {
    name: 'voxceleb-real', id: 'ProgramComputer/voxceleb',
    media_type: 'audio', label: 'human',
    audio_field: 'audio', meta_fields: ['speaker_id', 'nationality'],
  },
]
