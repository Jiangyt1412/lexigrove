import argparse, concurrent.futures, datetime, json, pathlib, urllib.request  # Fetch individual open-dictionary entries without downloading the full dump.
parser = argparse.ArgumentParser(description='Download the 60 selected Kaikki source entries into a research work directory.')  # Never write raw responses into the app bundle.
parser.add_argument('--work-dir',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]/'work'/'dictionary')  # Resolve the default independently of the shell working directory.
args=parser.parse_args()  # Parse explicit user invocation only.
ROOT=args.work_dir.resolve(); ROOT.mkdir(parents=True,exist_ok=True)  # Keep raw source and evidence under work/.
RETRIEVED_AT=datetime.datetime.now(datetime.timezone.utc).date().isoformat()  # Record the actual UTC download date rather than the original starter date.
WORDS = 'mitigate significant empirical robust infer derive subsequent constraint distribution uncertainty estimate variable parameter framework methodology bias causal confounder validate simulate reservoir sediment runoff catchment precipitation severe serious meticulous evidence maintain improve support reduce increase compare explain observe evaluate hypothesis analysis data method outcome process response reliable consistent ambiguous adapt retain diverse efficient habitat glacier drought ecosystem sustainable trend correlation intervention'.split()  # Curated starter selection; no claim of NGSL or NAWL membership.
def fetch(word):  # Download one raw Wiktextract entry from the verified Kaikki endpoint.
    url = f'https://kaikki.org/dictionary/English/meaning/{word[0]}/{word[:2]}/{word}.jsonl'  # Kaikki's documented per-word download route.
    request = urllib.request.Request(url, headers={'User-Agent': 'VocabularyGardenResearch/1.0 (local educational dataset)'})  # Identify the educational fetch.
    with urllib.request.urlopen(request, timeout=30) as response:  # Bound each request.
        raw = response.read().decode('utf-8')  # Preserve source Unicode IPA.
    (ROOT / 'raw').mkdir(exist_ok=True)  # Retain evidence locally, outside shipped data.
    (ROOT / 'raw' / (word+'.jsonl')).write_text(raw)  # Keep exact raw response for reproducibility.
    entries = [json.loads(line) for line in raw.splitlines() if line]  # The format is JSON Lines.
    return word, [(entry.get('pos'), [sense.get('glosses') for sense in entry.get('senses', [])]) for entry in entries if entry.get('lang_code') == 'en']  # Display concise sense candidates for manual selection.
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:  # Use bounded polite concurrency.
    results = list(pool.map(fetch, WORDS))  # All 60 candidates are independent requests.
(ROOT / 'sense-candidates.json').write_text(json.dumps(dict(results), ensure_ascii=False, indent=2))  # Save candidates for selection and auditing.
(ROOT/'fetch-manifest.json').write_text(json.dumps({'source':'Kaikki individual English JSONL entries','retrievedAt':RETRIEVED_AT,'words':WORDS},indent=2)+'\n')  # Preserve date provenance for the offline curator.
print('Fetched', len(results), 'words')  # Report successful count.
for word, entries in results:  # Emit sense choices for editorial review.
    print(word, json.dumps(entries, ensure_ascii=False))  # Preserve the actual definitions rather than paraphrasing their source.
