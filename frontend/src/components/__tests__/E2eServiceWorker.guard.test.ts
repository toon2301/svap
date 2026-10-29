/**
 * Poistka E2E špecov (nález 173): spec, ktorý stráži alebo podvrhuje sieť cez `page.route(...)` alebo `context.route(...)`,
 * musí zablokovať service worker aplikácie, teda mať `test.use({ serviceWorkers: 'block' })`.
 *
 * Prečo: `public/sw.js` preposiela volania `/api/` aj dokumenty cez vlastný `fetch`. Playwright takú požiadavku cez
 * `page.route` nevidí, takže keď worker prevezme stránku (asi 0,6 s po načítaní), strážca zápisov mlčky prestane
 * fungovať: zápis prejde na server a test sa tvári, že je všetko v poriadku. Overené v Chromiu na produkčnom builde
 * s Playwrightom 1.63 (verzia z `package.json`). `context.route(...)` má podľa dokumentácie Playwrightu rovnaké obmedzenie
 * ako `page.route(...)` a odporúča sa pri ňom blokovať workera. V Chromiu zachytí aj požiadavky workera (nález 173), no
 * vo WebKite sa na to nedá spoliehať: päť testov Google prihlásenia, ktoré podvrhujú odpoveď `/me` cez `context.route`,
 * padalo vo WebKite (desktop aj mobil), kým v Chromiu prechádzali (beh na Railway 28. 10.). Preto poistka vyžaduje blok pri
 * oboch druhoch zásahu do siete. WebKit sa lokálne neoveroval, správnosť opravy potvrdí až ďalší beh na Railway.
 *
 * E2E špecy Jest nespúšťa (bežia len proti Railway), preto poistka číta ich zdrojáky a parsuje ich kompilátorom
 * TypeScriptu: komentáre ani reťazce ju neoklamú. Zlyhá s menom špecu, ktorý blokovanie nemá.
 *
 * @jest-environment node
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import ts from 'typescript';

const E2E_DIR = path.join(process.cwd(), 'e2e');
const IGNORED_DIRECTORIES = new Set(['node_modules', '.auth']);
const ROUTE_METHODS = new Set(['route', 'routeFromHAR']);

type SourceFacts = {
  /** Súbor volá `route(...)` alebo `routeFromHAR(...)` na stránke alebo na kontexte prehliadača. */
  routesNetwork: boolean;
  /** Súbor obsahuje `test.use({ serviceWorkers: 'block' })`. */
  blocksServiceWorker: boolean;
  /** Špecifikátory relatívnych importov a re-exportov. */
  localImports: string[];
};

/** Meno vlastnosti objektového literálu (identifikátor alebo reťazec), inak `null`. */
function propertyName(name: ts.PropertyName): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : null;
}

/** Volanie `X.route(...)` / `X.routeFromHAR(...)` na stránke aj na kontexte (`context`, `this.context`, `page.context()`). */
function isRouteCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return false;
  return ROUTE_METHODS.has(node.expression.name.text);
}

/** Volanie `test.use({ ..., serviceWorkers: 'block' })`. */
function isServiceWorkerBlock(node: ts.Node): boolean {
  if (!ts.isCallExpression(node) || node.expression.getText() !== 'test.use') return false;
  return node.arguments.some(
    (argument) =>
      ts.isObjectLiteralExpression(argument) &&
      argument.properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          propertyName(property.name) === 'serviceWorkers' &&
          ts.isStringLiteralLike(property.initializer) &&
          property.initializer.text === 'block',
      ),
  );
}

/** Zistí z TypeScript zdrojáku, či zasahuje do siete cez `page.route` alebo `context.route`, či blokuje worker a čo importuje. */
function analyzeSource(fileName: string, source: string): SourceFacts {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const facts: SourceFacts = { routesNetwork: false, blocksServiceWorker: false, localImports: [] };
  const visit = (node: ts.Node): void => {
    if (isRouteCall(node)) facts.routesNetwork = true;
    if (isServiceWorkerBlock(node)) facts.blocksServiceWorker = true;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier) &&
      node.moduleSpecifier.text.startsWith('.')
    ) {
      facts.localImports.push(node.moduleSpecifier.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return facts;
}

/** Všetky `.ts` súbory v priečinku (rekurzívne), okrem `node_modules` a uloženého prihlásenia `.auth`. */
function listTypeScriptFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return IGNORED_DIRECTORIES.has(entry.name) ? [] : listTypeScriptFiles(fullPath);
    return entry.name.endsWith('.ts') ? [fullPath] : [];
  });
}

/** Cesta k súboru, na ktorý ukazuje relatívny import (`./x` → `x.ts` alebo `x/index.ts`), inak `undefined`. */
function resolveLocalImport(
  fromFile: string,
  specifier: string,
  known: ReadonlyMap<string, SourceFacts>,
): string | undefined {
  const base = path.resolve(path.dirname(fromFile), specifier);
  return [`${base}.ts`, path.join(base, 'index.ts'), base].find((candidate) => known.has(candidate));
}

/** Dosiahne súbor `start` (priamo alebo cez importované súbory) volanie `page.route` alebo `context.route`? */
function reachesRoute(start: string, facts: ReadonlyMap<string, SourceFacts>): boolean {
  const seen = new Set<string>();
  const pending = [start];
  while (pending.length > 0) {
    const file = pending.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const current = facts.get(file);
    if (!current) continue;
    if (current.routesNetwork) return true;
    for (const specifier of current.localImports) {
      const target = resolveLocalImport(file, specifier, facts);
      if (target) pending.push(target);
    }
  }
  return false;
}

/** Špecy (`*.spec.ts`) v priečinku `directory`: tie, čo zasahujú do siete cez `route(...)`, a z nich tie bez bloku workera. */
function analyzeE2eTree(directory: string): { routingSpecs: string[]; missingBlock: string[] } {
  const facts = new Map(
    listTypeScriptFiles(directory).map((file) => [file, analyzeSource(file, fs.readFileSync(file, 'utf8'))] as const),
  );
  const relative = (file: string) => path.relative(directory, file).split(path.sep).join('/');
  const routingSpecs = [...facts.keys()].filter((file) => file.endsWith('.spec.ts') && reachesRoute(file, facts));
  const missingBlock = routingSpecs.filter((file) => !facts.get(file)?.blocksServiceWorker);
  return { routingSpecs: routingSpecs.map(relative).sort(), missingBlock: missingBlock.map(relative).sort() };
}

describe('detekcia v zdrojáku špecu (analyzeSource)', () => {
  const cases: Array<[string, string, Partial<SourceFacts>]> = [
    ['page.route na stránke', `await page.route('**/api/**', handler);`, { routesNetwork: true }],
    ['this.page.route v pomocníkovi', `await this.page.route(matcher, handler);`, { routesNetwork: true }],
    ['route na inak pomenovanej stránke', `await tab.route(matcher, handler);`, { routesNetwork: true }],
    ['page.routeFromHAR', `await page.routeFromHAR('x.har');`, { routesNetwork: true }],
    ['context.route sa berie rovnako ako page.route', `await context.route(matcher, handler);`, { routesNetwork: true }],
    ['this.context.route sa berie rovnako ako page.route', `await this.context.route(matcher, handler);`, { routesNetwork: true }],
    ['page.context().route sa berie rovnako ako page.route', `await page.context().route(matcher, handler);`, { routesNetwork: true }],
    ['page.route len v komentári', `// await page.route(matcher, handler);\n/* page.route(x) */`, { routesNetwork: false }],
    ['page.route len v reťazci', `const text = "page.route(x)";`, { routesNetwork: false }],
    ['page.unroute nie je route', `await page.unroute(matcher);`, { routesNetwork: false }],
    ['test.use s blokom', `test.use({ trace: 'off', serviceWorkers: 'block' });`, { blocksServiceWorker: true }],
    ['test.use s blokom a úvodzovkami', `test.use({ "serviceWorkers": "block" });`, { blocksServiceWorker: true }],
    ['test.use s povoleným workerom', `test.use({ serviceWorkers: 'allow' });`, { blocksServiceWorker: false }],
    ['test.use bez workera', `test.use({ trace: 'off' });`, { blocksServiceWorker: false }],
    ['blok len v komentári', `// test.use({ serviceWorkers: 'block' });`, { blocksServiceWorker: false }],
    ['serviceWorkers mimo test.use', `const options = { serviceWorkers: 'block' };`, { blocksServiceWorker: false }],
    [
      'relatívne importy a re-exporty',
      `import { a } from './support/a';\nimport type { B } from '../b';\nexport * from './c';\nimport { expect } from '@playwright/test';`,
      { localImports: ['./support/a', '../b', './c'] },
    ],
  ];

  it.each(cases)('%s', (_name, source, expected) => {
    expect(analyzeSource('fixture.spec.ts', source)).toMatchObject(expected);
  });
});

describe('prechod cez pomocníkov (analyzeE2eTree) na dočasnom strome', () => {
  let directory: string;

  const write = (file: string, content: string) => {
    fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    fs.writeFileSync(path.join(directory, file), content);
  };

  beforeAll(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-sw-guard-'));
    write('support/guard.ts', `export const guard = (page: any) => page.route('**/api/**', () => undefined);`);
    write('support/context-only.ts', `export const mock = (context: any) => context.route('**/x', () => undefined);`);
    write('support/nested.ts', `export { guard } from './guard';`);
    write('direct-missing.spec.ts', `page.route('**/api/**', () => undefined);`);
    write('direct-blocked.spec.ts', `test.use({ serviceWorkers: 'block' });\npage.route('**/api/**', () => undefined);`);
    write('helper-missing.spec.ts', `import { guard } from './support/guard';\nguard(page);`);
    write('helper-blocked.spec.ts', `import { guard } from './support/guard';\ntest.use({ serviceWorkers: 'block' });`);
    write('nested-missing.spec.ts', `import { guard } from './support/nested';\nguard(page);`);
    write('context-only.spec.ts', `import { mock } from './support/context-only';\nmock(context);`);
    write('context-blocked.spec.ts', `import { mock } from './support/context-only';\ntest.use({ serviceWorkers: 'block' });\nmock(context);`);
    write('no-route.spec.ts', `test('x', async () => undefined);`);
    write('comment-only.spec.ts', `// page.route(x) sa tu len spomína\nconst text = 'page.route(x)';`);
    write('commented-block.spec.ts', `// test.use({ serviceWorkers: 'block' });\npage.route('**/api/**', () => undefined);`);
    write('allowed-worker.spec.ts', `test.use({ serviceWorkers: 'allow' });\npage.route('**/api/**', () => undefined);`);
    write('node_modules/ignored.spec.ts', `page.route('**/api/**', () => undefined);`);
  });

  afterAll(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('nájde špecy, ktoré zasahujú do siete cez page.route alebo context.route (priamo aj cez pomocníkov)', () => {
    expect(analyzeE2eTree(directory).routingSpecs).toEqual([
      'allowed-worker.spec.ts',
      'commented-block.spec.ts',
      'context-blocked.spec.ts',
      'context-only.spec.ts',
      'direct-blocked.spec.ts',
      'direct-missing.spec.ts',
      'helper-blocked.spec.ts',
      'helper-missing.spec.ts',
      'nested-missing.spec.ts',
    ]);
  });

  it('z nich označí len tie, ktoré neblokujú service worker', () => {
    expect(analyzeE2eTree(directory).missingBlock).toEqual([
      'allowed-worker.spec.ts',
      'commented-block.spec.ts',
      'context-only.spec.ts',
      'direct-missing.spec.ts',
      'helper-missing.spec.ts',
      'nested-missing.spec.ts',
    ]);
  });
});

describe('E2E špecy v repozitári', () => {
  const tree = analyzeE2eTree(E2E_DIR);

  it('poistka naozaj nachádza špecy, ktoré zasahujú do siete (inak by prešla naprázdno)', () => {
    expect(tree.routingSpecs.length).toBeGreaterThan(0);
  });

  it('každý spec, ktorý používa page.route alebo context.route, blokuje service worker', () => {
    if (tree.missingBlock.length > 0) {
      throw new Error(
        'Tieto E2E špecy používajú page.route(...) alebo context.route(...) (priamo alebo cez pomocníka), ale neblokujú service worker:\n' +
          tree.missingBlock.map((file) => `  - e2e/${file}`).join('\n') +
          "\nDoplň do každého z nich test.use({ serviceWorkers: 'block' }); dôvod je v hlavičke tohto súboru.",
      );
    }
    expect(tree.missingBlock).toEqual([]);
  });
});
