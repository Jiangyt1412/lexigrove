import argparse, datetime, hashlib, json, pathlib, re  # Convert fetched open dictionary sources into a small attributed teaching dataset.
parser=argparse.ArgumentParser(description='Curate archived Kaikki sources without network access; review changed senses before shipping.')  # This command never downloads data.
parser.add_argument('--work-dir',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]/'work'/'dictionary')  # Match the downloader's portable cache location.
parser.add_argument('--output-dir',type=pathlib.Path)  # Write reviewable candidate data, not the production data directory.
parser.add_argument('--retrieved-at',help='Known source retrieval date YYYY-MM-DD; overrides fetch-manifest.json for archived sources.')  # Do not fabricate source dates.
args=parser.parse_args(); ROOT=args.work_dir.resolve()  # Explicit paths are resolved from the invoking shell.
manifest=ROOT/'fetch-manifest.json'  # Downloader provenance is separate from dictionary content.
retrieved_at=args.retrieved_at or (json.loads(manifest.read_text()).get('retrievedAt') if manifest.exists() else None)  # Prefer an explicit historical date for archived caches.
if not retrieved_at: parser.error('Use --retrieved-at YYYY-MM-DD for an archived cache without fetch-manifest.json.')  # A missing date must not silently become today.
try: datetime.date.fromisoformat(retrieved_at)  # Reject a placeholder or malformed date before touching output files.
except ValueError: parser.error('--retrieved-at must be an actual date in YYYY-MM-DD form.')  # Give actionable CLI feedback.
OUTPUT=(args.output_dir or ROOT/'generated').resolve(); OUTPUT.mkdir(parents=True,exist_ok=True)  # Keep regenerated data reviewable under work/ by default.
ROWS = '''mitigate|verb|0|The new drainage system may mitigate flood damage.|mitigate risk;mitigate damage
significant|adj|1,2|The new sensor produced a significant improvement in accuracy.|significant difference;significant effect
empirical|adj|0,1,2|The paper supports its argument with empirical evidence.|empirical evidence;empirical study
robust|adj|0,7|The team needs a robust method that works under difficult conditions.|robust method;robust evidence
infer|verb|0|We cannot infer a cause from this pattern alone.|infer meaning;infer a relationship
derive|verb|0,1|The researchers derive their estimates from field measurements.|derive an estimate;derive a formula
subsequent|adj|0|The subsequent experiment used a larger sample.|subsequent analysis;subsequent study
constraint|noun|0,3|Limited funding was the main constraint on the project.|time constraint;budget constraint
distribution|noun|9,6|The model describes the probability distribution of river flows.|probability distribution;spatial distribution
uncertainty|noun|0,2|The report explains the uncertainty in the final estimate.|measurement uncertainty;reduce uncertainty
estimate|noun|0|We need an estimate of the total cost before work begins.|rough estimate;parameter estimate
variable|noun|2|Temperature was the only variable changed during the experiment.|dependent variable;random variable
parameter|noun|1,0|We adjusted one parameter of the model at a time.|model parameter;parameter value
framework|noun|3|The paper presents a framework for comparing the two methods.|conceptual framework;analytical framework
methodology|noun|1,0|The report describes the methodology used to collect the data.|research methodology;study methodology
bias|noun|0,4|The researchers checked whether the sample introduced bias.|selection bias;measurement bias
causal|adj|0|The study investigates a possible causal relationship between the factors.|causal relationship;causal effect
confounder|noun|1|Age may be a confounder in the comparison between the groups.|potential confounder;adjust for a confounder
validate|verb|1|The team will validate the model using an independent dataset.|validate a model;validate results
simulate|verb|0|We use the model to simulate water movement through the soil.|simulate a process;simulate flow
reservoir|noun|1|The village draws its drinking water from a nearby reservoir.|water reservoir;reservoir storage
sediment|noun|0|The sample contained fine sediment from the river bed.|fine sediment;sediment transport
runoff|noun|0|The team measured runoff after the storm.|surface runoff;runoff volume
catchment|noun|0,1|The researchers mapped the catchment above the monitoring station.|river catchment;catchment area
precipitation|noun|0,1|The station records daily precipitation throughout the year.|annual precipitation;precipitation pattern
severe|adj|0|The region experienced a severe drought last summer.|severe damage;severe drought
serious|adj|1|A serious error in the calculation changed the result.|serious problem;serious concern
meticulous|adj|0|She kept meticulous records of each laboratory measurement.|meticulous records;meticulous attention
evidence|noun|0|The new measurements provide evidence for the proposed explanation.|supporting evidence;empirical evidence
maintain|verb|0,2|The technician checks the equipment to maintain reliable operation.|maintain quality;maintain equipment
improve|verb|0,1|Repeated practice can improve performance on the task.|improve accuracy;improve performance
support|verb|4|The observations support the team's interpretation of the results.|support a conclusion;support an argument
reduce|verb|0|The team changed the design to reduce measurement errors.|reduce uncertainty;reduce risk
increase|verb|1,0|The researchers plan to increase the sample size.|increase efficiency;increase the sample size
compare|verb|0|We will compare the results from the two monitoring stations.|compare results;compare methods
explain|verb|0,1|The diagram helps explain how the instrument works.|explain a process;explain a difference
observe|verb|0|The students will observe changes in the samples each day.|observe a pattern;observe changes
evaluate|verb|0|The team will evaluate the method using a new dataset.|evaluate performance;evaluate evidence
hypothesis|noun|0|The experiment was designed to test the hypothesis.|test a hypothesis;alternative hypothesis
analysis|noun|0|The analysis examines each stage of the treatment process.|data analysis;sensitivity analysis
data|noun:1|1|The team collected data from six monitoring stations.|collect data;data quality
method|noun|0|This method measures the amount of water in a soil sample.|research method;sampling method
outcome|noun|0|The outcome of the experiment was recorded in the report.|study outcome;expected outcome
process|noun|0|The diagram shows each step in the purification process.|learning process;physical process
response|noun|0,7|The team recorded the response to each interview question.|response rate;response to treatment
reliable|adj|0|The instrument provides reliable measurements when properly calibrated.|reliable evidence;reliable method
consistent|adj|0,1|The instrument produced consistent results across repeated trials.|consistent results;consistent pattern
ambiguous|adj|0|The ambiguous instruction led to two different interpretations.|ambiguous wording;ambiguous result
adapt|verb|1|We need to adapt the method for use in the field.|adapt a method;adapt to change
retain|verb|6,5|Regular practice helps learners retain new vocabulary.|retain information;retain knowledge
diverse|adj|0|The team collected samples from diverse environments.|diverse sources;diverse environments
efficient|adj|0|The new procedure makes more efficient use of laboratory time.|efficient method;efficient use
habitat|noun|1,0|The field team mapped the bird's habitat along the coast.|natural habitat;habitat loss
glacier|noun|0|The researchers measured the movement of the glacier.|glacier movement;glacier retreat
drought|noun|0|The drought reduced the amount of water available for irrigation.|prolonged drought;drought risk
ecosystem|noun|0,1|The study examines how the wetland ecosystem responds to changing water levels.|aquatic ecosystem;ecosystem function
sustainable|adj|1|The project explores sustainable ways to manage the water supply.|sustainable development;sustainable management
trend|noun|1,5|The graph shows a clear trend in the monthly measurements.|long-term trend;upward trend
correlation|noun|1|The analysis found a positive correlation between the two measurements.|positive correlation;correlation coefficient
intervention|noun|0|The team measured conditions before and after the intervention.|policy intervention;evaluate an intervention'''.splitlines()  # Examples and collocation selections are original project-authored teaching material.
POS = {'adj':'adjective', 'noun':'noun', 'verb':'verb'}  # Use readable part-of-speech labels.
entries = []  # Keep one lexical record per lemma.
audit = []  # Keep precise source selection metadata for reproducibility.
for row in ROWS:  # Select pedagogically relevant senses from the actual source responses.
    lemma, pos_spec, selected, example, collocations = row.split('|')  # All authoring fields are explicit.
    pos, _, occurrence = pos_spec.partition(':')  # Some lemmas have several entries with the same part of speech.
    raw = (ROOT / 'raw' / (lemma+'.jsonl')).read_text()  # Use only the already downloaded source.
    candidates = [json.loads(line) for line in raw.splitlines()]  # Decode the source JSON Lines.
    source = [item for item in candidates if item.get('lang_code')=='en' and item.get('pos')==pos][int(occurrence or 0)]  # Select the intended English entry.
    sense_indices = [int(index) for index in selected.split(',')]  # The chosen sense order defines the primary meaning.
    definitions = [source['senses'][index]['glosses'][-1] for index in sense_indices]  # Keep exact extracted definitions, including their wording.
    definition = definitions[0]  # Do not invent a simplified dictionary definition.
    if lemma == 'precipitation':  # Shorten only at the first complete source sentence; retain the full text below.
        definition = definition.split(' It is a major class')[0]  # This is an exact source excerpt, not a paraphrase.
    source_url = f'https://en.wiktionary.org/wiki/{lemma}#English'  # Credit the source page and its linked contributors history.
    kaikki_url = f'https://kaikki.org/dictionary/English/meaning/{lemma[0]}/{lemma[:2]}/{lemma}.jsonl'  # Record the precise extraction endpoint.
    item = {'lemma':lemma, 'partOfSpeech':POS[pos], 'definition':definition, 'fullDefinitions':definitions, 'sourceUrl':source_url, 'sourceName':'English Wiktionary contributors, via Kaikki / Wiktextract', 'sourceLicence':'CC BY-SA 4.0', 'sourceLicenceUrl':'https://creativecommons.org/licenses/by-sa/4.0/', 'sourceExtractionUrl':kaikki_url, 'sourceHistoryUrl':f'https://en.wiktionary.org/w/index.php?title={lemma}&action=history', 'example':example, 'exampleSource':'Original project-authored teaching example; not a Wiktionary quotation.', 'collocations':collocations.split(';'), 'collocationsSource':'Original project-curated usage phrases; not corpus frequency claims.', 'wordFamily':[], 'retrievedAt':retrieved_at, 'definitionNote':'Selected verbatim Wiktionary glosses extracted by Wiktextract; primary precipitation definition is an exact first-sentence excerpt.'}  # Keep data attribution separate from application licensing.
    for sound in source.get('sounds', []):  # Never infer accent labels for unlabelled IPA.
        ipa, tags = sound.get('ipa'), set(sound.get('tags', []))  # Preserve the source's actual transcription and region labels.
        if not ipa or '-' in ipa or not ipa.startswith('/'):  # Exclude abbreviated variants and phonetic bracket transcriptions.
            continue  # These can be added later with a richer pronunciation schema.
        if tags & {'US','General-American'} and 'ipaUS' not in item:  # Record only explicitly labelled American IPA.
            item['ipaUS'] = ipa  # The transcription remains verbatim.
        if tags & {'UK','Received-Pronunciation'} and 'ipaUK' not in item:  # Record only explicitly labelled British IPA.
            item['ipaUK'] = ipa  # The transcription remains verbatim.
        if not tags and 'ipa' not in item:  # Preserve a general transcription without assigning an accent.
            item['ipa'] = ipa  # The application may display this as accent-unspecified IPA.
    assert len(re.findall(r'\b'+re.escape(lemma)+r'\b',example,re.I))==1, lemma  # Each example provides exactly one unambiguous cloze target.
    entries.append(item)  # Learning history is deliberately absent from lexical data.
    audit.append({'lemma':lemma, 'sourceExtractionUrl':kaikki_url, 'sourceSha256':hashlib.sha256(raw.encode()).hexdigest(), 'pos':pos, 'entryOccurrence':int(occurrence or 0), 'senseIndices':sense_indices})  # Record exact selections and download integrity.
assert len(entries)==60 and len(set(item['lemma'] for item in entries))==60  # Enforce the requested compact nonduplicated starter size.
(OUTPUT / 'starter-vocabulary.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2)+'\n')  # This is the application-ready lexical deliverable.
(OUTPUT / 'selection-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2)+'\n')  # This is the provenance deliverable.
print(json.dumps({'entries':len(entries),'withUSIPA':sum('ipaUS' in item for item in entries),'withUKIPA':sum('ipaUK' in item for item in entries),'withUnlabelledIPA':sum('ipa' in item for item in entries),'sourceBytes':sum(len((ROOT/'raw'/(item['lemma']+'.jsonl')).read_bytes()) for item in entries)}, indent=2))  # Report coverage without claiming complete pronunciation coverage.
