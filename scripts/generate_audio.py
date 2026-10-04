"""Build the finite starter pronunciation set; never run TTS in users' browsers."""  # Local generation only; model weights are not shipped with the website.
import argparse
import hashlib
import json
import unicodedata
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]

def phonemes(ipa):
    text = ipa.strip('/[]').replace('.', '').replace('(', '').replace(')', '')
    text = text.replace('n̩', 'ən').replace('l̩', 'əl').replace('ɝ', 'ɜɹ').replace('ɚ', 'əɹ')
    return ''.join(c for c in unicodedata.normalize('NFD', text) if not unicodedata.combining(c))  # Remove tie bars and syllabic marks without dropping consonants.

def main():
    args = argparse.ArgumentParser()
    args.add_argument('--model-dir', type=Path, required=True)
    parsed = args.parse_args()
    model = parsed.model_dir / 'kokoro-v1.0.onnx'  # Full precision avoids non-finite outputs seen in some int8 short-word variants.
    voices = parsed.model_dir / 'voices-v1.0.bin'
    hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [model, voices]}
    kokoro = Kokoro(str(model), str(voices))
    entries = []
    words = json.loads((ROOT / 'data/starter-vocabulary.json').read_text())
    for accent, voice, lang in [('UK', 'bf_emma', 'en-gb'), ('US', 'af_heart', 'en-us')]:
        destination = ROOT / 'public/assets/audio' / accent.lower()
        destination.mkdir(parents=True, exist_ok=True)
        for word in words:
            ipa = word.get('ipa' + accent) or word.get('ipa') or ''
            phones = phonemes(ipa) if ipa else kokoro.tokenizer.phonemize(word['lemma'], lang=lang)
            unsupported = sorted(set(phones) - set(kokoro.tokenizer.vocab))
            if unsupported:
                raise ValueError((word['lemma'], accent, 'unsupported phonemes', unsupported))  # Never silently omit unsupported phones from an audio test.
            try:
                samples, rate = kokoro.create(phones + '.', voice=voice, lang=lang, is_phonemes=True, speed=1.0, trim=False, sentence_pause=0, clause_pause=0)
            except Exception as error:
                raise RuntimeError((word['lemma'], accent, phones)) from error  # Report the exact failing lexical variant for repair.
            if not np.isfinite(samples).all() or not 0.2 < len(samples) / rate < 5:
                raise ValueError((word['lemma'], accent, 'invalid duration or samples'))
            peak = float(np.max(np.abs(samples)))
            if peak < 0.01:
                raise ValueError((word['lemma'], accent, 'silent audio'))
            samples = samples * min(0.85 / peak, 3)  # Bounded peak normalization retains the generated voice's pitch.
            samples = np.pad(samples, (int(rate * 0.06), int(rate * 0.10)))
            wav = parsed.model_dir / f'{accent.lower()}-{word["lemma"]}.wav'
            sf.write(wav, samples, rate, subtype='PCM_16')
            target = destination / f'{word["lemma"]}.wav'
            sf.write(target, samples, rate, subtype='PCM_16')  # Uncompressed 24 kHz mono PCM works without browser codec-specific decoding or extra generation tools.
            entries.append({
                'lemma': word['lemma'], 'partOfSpeech': word['partOfSpeech'], 'accent': accent,
                'file': f'assets/audio/{accent.lower()}/{target.name}', 'kind': 'neural-synthesis',
                'voice': voice, 'phonemes': phones, 'phonemeSource': word['sourceUrl'] if ipa else 'eSpeak-ng 1.x en-gb/en-us grapheme-to-phoneme output',
                'dictionaryIPAUsed': ipa, 'durationSeconds': round(len(samples) / rate, 3),
                'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
            })
        print(accent, len(words), 'clips generated', flush=True)
    manifest = {
        'version': 1, 'generatedOn': '2026-10-04', 'source': 'https://huggingface.co/hexgrad/Kokoro-82M',
        'voicesSource': 'https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md',
        'modelRelease': 'https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1',
        'modelLicense': 'Apache-2.0', 'outputRights': 'CC0-1.0 to the extent Lexigrove holds rights in generated output',
        'generatorVersion': 'kokoro-onnx 0.6.1', 'inputHashes': hashes, 'generationSpeed': 1.0,
        'changes': 'Explicit dictionary phones when available; bounded peak normalization; short silence padding; 24 kHz mono PCM16 WAV encoding.',
        'limitations': 'Synthesized audio, not human recordings or independently certified phonetic teaching material. Short-word synthesis and G2P can have errors.',
        'entries': entries,
    }
    (ROOT / 'public/assets/audio/manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    index = {'source': manifest['source'], 'entries': [
        {'lemma': word['lemma'], 'partOfSpeech': word['partOfSpeech'], **{
            accent: next(e['file'] for e in entries if e['lemma'] == word['lemma'] and e['accent'] == accent)
            for accent in ['UK', 'US']}}
        for word in words]}
    (ROOT / 'data/starter-audio.json').write_text(json.dumps(index, indent=2) + '\n')  # Bundle only the compact lookup; the complete attribution/checksum manifest remains publicly available.
    print('total', len(entries), 'clips', sum(e['bytes'] for e in entries), 'bytes', flush=True)

if __name__ == '__main__':
    main()
