import hashlib, json, pathlib, re, subprocess  # Regenerate notices from the installed dependency tree, never guessed package versions.
ROOT = pathlib.Path(__file__).resolve().parents[1]  # Run consistently from any working directory.
MODULES = ROOT / 'node_modules'  # The lockfile installation is the authoritative source for versions and notices.
result = subprocess.run(['npm','ls','--omit=dev','--all','--json'],cwd=ROOT,capture_output=True,text=True,check=True)  # Inspect the actual production dependency graph without modifying it.
tree = json.loads(result.stdout)  # Npm's resolved graph includes production peer dependencies.
packages = {}  # De-duplicate identical installed packages while retaining inclusion reasons.
def resolve(name,parent=ROOT):  # Resolve the same nested node_modules hierarchy used by Node.
    current=parent  # Search from the importing package toward the project root.
    while True:  # Nested package versions must not silently become the root version.
        candidate=current/'node_modules'/name  # Try the current package's local installation.
        if (candidate/'package.json').is_file(): return candidate.resolve()  # Use the actual installed package folder.
        if current==ROOT or current.parent==current: break  # Do not inspect unrelated parent workspaces.
        current=current.parent  # Continue with Node-style ancestor lookup.
    raise FileNotFoundError(f'Installed dependency not found: {name} from {parent}')  # Missing runtime licences must stop generation.
def add(folder,reason):  # Register a package and why its notices are included.
    metadata=json.loads((folder/'package.json').read_text())  # Use the package's own licence/version declarations.
    key=str(folder)  # Different nested versions remain distinct.
    if key not in packages: packages[key]={'folder':folder,'metadata':metadata,'reasons':set()}  # Preserve exact installed identity.
    packages[key]['reasons'].add(reason)  # A package may serve multiple runtime roles.
    return packages[key]  # Return the record for callers needing dependencies.
def walk_graph(node,parent=ROOT):  # Traverse npm's actual production graph including transitive modules.
    for name,child in node.get('dependencies',{}).items():  # Each child has an installed package identity.
        folder=resolve(name,parent); record=add(folder,'installed production graph')  # Include full notices even for conservative over-coverage.
        if record['metadata']['version']!=child.get('version'): raise ValueError(f'Version mismatch for {name}')  # Never silently audit a different installed version.
        walk_graph(child,folder)  # Follow nested resolutions rather than flattening the dependency tree.
walk_graph(tree)  # Include direct and transitive installed production dependencies.
seen_runtime=set()  # Workbox's dependency graph has shared modules.
def runtime_closure(name,parent=ROOT):  # Include transitive worker/client modules emitted by the PWA toolchain.
    folder=resolve(name,parent); key=str(folder)  # Resolve the actual module selected by the current installation.
    record=add(folder,'PWA runtime distribution / transitive dependency')  # The full Workbox runtime family is conservatively covered.
    if key in seen_runtime: return  # Avoid revisiting shared transitive dependencies.
    seen_runtime.add(key)  # Mark before descending into dependencies.
    for child in record['metadata'].get('dependencies',{}): runtime_closure(child,folder)  # All runtime dependencies need their own notices.
for folder in sorted(MODULES.glob('workbox-*')):  # Cover possible emitted worker modules, even when a particular build tree-shakes them.
    if folder.name!='workbox-build': runtime_closure(folder.name)  # The workbox-build dependency graph is build-time, not browser runtime.
for name in ['vite','vite-plugin-pwa','workbox-build','@babel/runtime']:  # Preserve runtime helper and tool-distribution notices conservatively.
    add(resolve(name),'build/runtime helper notice; not proof every tool component is shipped')  # Do not misrepresent tools as application runtime imports.
entries=sorted(packages.values(),key=lambda entry:(entry['metadata']['name'],entry['metadata']['version'],str(entry['folder'])))  # Produce stable readable ordering.
header='''LEXIGROVE — THIRD-PARTY SOFTWARE NOTICES
Generated from the actual installed packages by scripts/generate_notices.py.

Scope: npm's installed production graph (including transitive and type-only peer
packages), the installed Workbox runtime family and its transitive dependencies,
and notices for Vite, vite-plugin-pwa, workbox-build and Babel runtime helpers.
This is conservative notice coverage: inclusion does not mean a package's entire
contents are present in the final browser bundle. Full development-tool dependency
graphs are not represented here. Keep notices in any distributed/minified build.

The text between BEGIN and END markers is copied in full from the installed
package's licence, notice or copyright file. Package metadata is listed separately.
Vite's complete LICENSE.md also preserves its bundled third-party notices.

Fonts, dictionary data and original artwork use separate licences; see
FONT_LICENSES.md, DATA_SOURCES.md and ASSET_LICENSES.md in the project source.

'''
blocks=[header]  # Build the distributable notice file in memory before replacing it.
rows=[]  # Build the corresponding readable inventory.
for entry in entries:  # Copy every installed top-level legal notice without truncation.
    folder,meta=entry['folder'],entry['metadata']  # Keep filesystem paths separate from package labels.
    notices=sorted(file for file in folder.iterdir() if file.is_file() and re.match(r'^(licen[cs]e|copying|notice|copyright)(?:[._-].*|)$',file.name,re.I))  # Include LICENSE, NOTICE and additional bundled attribution files.
    if not notices: raise FileNotFoundError(f'No legal notice found in {meta["name"]}@{meta["version"]}')  # Do not replace full terms with an invented licence.
    relative=str(folder.relative_to(ROOT))  # Make the inspection location reproducible for maintainers.
    licence=meta.get('license','Not declared')  # Retain actual package metadata, including compound identifiers.
    repository=meta.get('repository','')  # Preserve the package's declared upstream location.
    if isinstance(repository,dict): repository=repository.get('url','')  # Repository metadata may be an object.
    blocks.append('\n'+'='*78+'\n'+f'{meta["name"]}@{meta["version"]}\nInstalled path: {relative}\nDeclared licence: {licence}\nRepository: {repository}\nIncluded because: {"; ".join(sorted(entry["reasons"]))}\n')  # Identify the exact package before its unmodified notices.
    for file in notices:  # Include Apache NOTICE files as well as the licence itself.
        content=file.read_text(encoding='utf-8')  # These installed licence files are UTF-8 text.
        blocks.append(f'\n----- BEGIN {meta["name"]}/{file.name} -----\n'+content+('' if content.endswith('\n') else '\n')+f'----- END {meta["name"]}/{file.name} -----\n')  # Preserve full notice content within clear boundaries.
    scope='type definitions only' if meta['name'].startswith('@types/') or meta['name']=='csstype' else '; '.join(sorted(entry['reasons']))  # Type-only modules are not browser execution code.
    rows.append(f'| `{meta["name"]}` | {meta["version"]} | {licence} | {scope} | {", ".join(file.name for file in notices)} |')  # Keep versions, licence identifiers and scope visible together.
embedded=[]; embedded_seen=set()  # Keep separately attributed code that a package bundles without declaring an npm runtime dependency.
for entry in entries:  # Source maps can retain attribution stripped from the compiled JavaScript.
    if entry['metadata']['name'] in {'vite','vite-plugin-pwa','workbox-build','@babel/runtime'}: continue  # Their full supplied legal files are already included; this scan targets runtime library maps.
    for file in entry['folder'].rglob('*.map'):  # Inspect actual installed source maps rather than guessed dependency metadata.
        try: mapping=json.loads(file.read_text())  # Source maps are JSON and may embed original source text.
        except (ValueError,UnicodeDecodeError): continue  # Non-JSON mapping artifacts contain no parseable source content.
        for source,content in zip(mapping.get('sources',[]),mapping.get('sourcesContent',[])):  # Preserve the map's exact upstream source path.
            if not isinstance(content,str): continue  # Some maps omit source contents.
            comments=re.findall(r'/\*[\s\S]*?\*/',content)+re.findall(r'(?:^[ \t]*//[^\n]*(?:\n|$))+',content,re.M)  # Read both block and consecutive line-comment notices.
            for comment in comments:  # Copy attribution blocks without removing their licence language.
                if not re.search(r'copyright\s*(?:\(\s*c\s*\)|©|\d{4})',comment,re.I): continue  # Exclude an icon named Copyright and unrelated prose.
                digest=hashlib.sha256(comment.encode()).hexdigest()  # Repeat ESM/CJS source maps do not need duplicate text.
                if digest in embedded_seen: continue  # Preserve one exact instance of each notice.
                embedded_seen.add(digest); embedded.append((entry['metadata']['name'],str(file.relative_to(ROOT)),source,comment))  # Retain precise evidence for each embedded notice.
for package,mapfile,source,notice in embedded:  # Include complete original source comments as supplied by the installed distribution.
    blocks.append('\n'+'='*78+'\n'+f'Embedded runtime-source notice in {package}\nSource map: {mapfile}\nEmbedded source: {source}\n\n'+notice+'\n')  # This includes Alea/Mash attribution and Microsoft's tslib helper licence.
public=ROOT/'public'; public.mkdir(exist_ok=True)  # Vite copies this complete notice file to static builds.
(public/'THIRD_PARTY_NOTICES.txt').write_text(''.join(blocks),encoding='utf-8')  # Generate the full redistributable notices.
intro='''# Third-party software licences

This inventory is generated from the **actual installed packages**, not dependency version ranges. The full licence and attribution texts are in [`public/THIRD_PARTY_NOTICES.txt`](public/THIRD_PARTY_NOTICES.txt), which Vite copies into the static distribution. Regenerate after dependency changes with `python3 scripts/generate_notices.py`.

The inventory covers the installed production dependency graph, including transitive dependencies and optional type peers that are actually installed. It additionally covers the installed Workbox runtime family and runtime dependencies, plus the complete installed notices for Vite, the PWA plugin, Workbox's build package and Babel runtime helpers. This deliberately includes some modules that a particular production build can omit. It does **not** claim that every listed package or every component inside a build tool ships to browsers. The entire development-tool dependency graph is outside this runtime-notice inventory; its licences remain in the installed packages.

Embedded runtime-source notices are also copied from actual installed source maps. These include the Alea/Mash generator attribution (Johannes Baagøe, 2010; MIT) embedded in ts-fsrs, Microsoft’s tslib helper terms embedded in Dexie, and Workbox source copyright headers. This catches attribution that is absent from a top-level npm dependency list.

The application uses React, Dexie/IndexedDB, ts-fsrs, Papa Parse and Zod. Workbox supplies service-worker and update-client code. The installed Lucide package is covered conservatively even where project-original pixel icons replace its imports. Dexie's **Apache-2.0** licence and `NOTICE` are retained in full; do not describe every dependency as MIT. Lucide's supplied **ISC** notice includes attribution to its Feather-derived portions. Workbox and the selected FSRS implementation carry their own MIT notices.

| Installed package | Version | Declared licence | Inventory scope | Full notice files copied |
| --- | --- | --- | --- | --- |
'''
footer='''
## Separate non-code licences

- Application code: [MIT](LICENSE), Copyright 2026 Lexigrove contributors.
- Selected Wiktionary definitions and IPA, plus the adapted starter dataset: [CC BY-SA 4.0](DATA_SOURCES.md). The MIT application licence does not replace the dataset licence.
- Original project pixel artwork: [CC0-1.0 dedication and scope](ASSET_LICENSES.md).
- Pixelify Sans and GNU Unifont derivatives: [OFL-1.1 with bundled complete notices](FONT_LICENSES.md). Fonts are not MIT or CC0.
- User-added words, quotations, images, audio and imports retain their own rights and require source-specific review before redistribution. No licensed human recordings or external word images are bundled in the starter.

Full package terms and warranty disclaimers, rather than this summary table, govern redistribution. Package installation and licence inspection do not establish patent clearance or verify every upstream contribution's history. Keep the supplied attribution notices and repeat this audit after dependency changes.
'''
(ROOT/'THIRD_PARTY_LICENSES.md').write_text(intro+'\n'.join(rows)+'\n'+footer,encoding='utf-8')  # Keep the inventory and full notices synchronized.
print(json.dumps({'packages':len(entries),'embeddedNotices':len(embedded),'noticeBytes':(public/'THIRD_PARTY_NOTICES.txt').stat().st_size,'inventory':'THIRD_PARTY_LICENSES.md'},indent=2))  # Report exact completion metadata.
