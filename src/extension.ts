import * as vscode from 'vscode';
import { documentSelectors, fileExts, languageIdsSet } from './constants';
import { parseDefinitions, parseReferences } from './parsers';
import type { CustomMediaQueryArgs } from './types';
import { promiseAllWithConcurrency } from './utils/promiseAllWithConcurrency';

export const definitionsCache = new Map<
  CustomMediaQueryArgs['name'],
  Array<
    Omit<CustomMediaQueryArgs, 'name'> & {
      location: vscode.Location;
    }
  >
>();

export const referencesCache = new Map<
  CustomMediaQueryArgs['name'],
  vscode.Location[]
>();

let diagnosticCollection: vscode.DiagnosticCollection | null = null;

/**
 * 指定されたファイルをスキャンして、@custom-media定義をキャッシュに追加する
 */
async function scanDocumentForDefinitions(
  document: vscode.TextDocument,
): Promise<void> {
  const difinitions = parseDefinitions(document);
  for (const definition of difinitions) {
    const { name, value, location } = definition;
    definitionsCache.set(name, [
      ...(definitionsCache.get(name) ?? []),
      {
        value,
        location,
      },
    ]);
  }
}

export async function scanDocumentForReferences(
  document: vscode.TextDocument,
): Promise<void> {
  const references = parseReferences(document);
  for (const reference of references) {
    const { name, location } = reference;
    if (!definitionsCache.has(name)) {
      continue;
    }
    referencesCache.set(name, [...(referencesCache.get(name) ?? []), location]);
  }
}

async function removeDefinitionsCacheByUri(uri: vscode.Uri): Promise<void> {
  for (const [key, value] of definitionsCache) {
    const newValue = value.filter(
      (v) => v.location.uri.toString() !== uri.toString(),
    );
    if (newValue.length === 0) {
      definitionsCache.delete(key);
      continue;
    }
    definitionsCache.set(key, newValue);
  }
}

async function removeReferencesCacheByUri(uri: vscode.Uri): Promise<void> {
  for (const [key, value] of referencesCache) {
    const newValue = value.filter((v) => v.uri.toString() !== uri.toString());
    if (newValue.length === 0) {
      referencesCache.delete(key);
      continue;
    }
    referencesCache.set(key, newValue);
  }
}

async function removeCacheByUri(uri: vscode.Uri): Promise<void> {
  await Promise.all([
    removeDefinitionsCacheByUri(uri),
    removeReferencesCacheByUri(uri),
  ]);
}

async function updateDiagnostics(document: vscode.TextDocument): Promise<void> {
  const diagnostics: vscode.Diagnostic[] = [];
  const references = parseReferences(document);

  for (const { name, location } of references) {
    if (definitionsCache.has(name)) {
      continue;
    }
    if (!document.lineAt(location.range.start.line).text.includes('@media')) {
      continue;
    }
    const diagnostic = new vscode.Diagnostic(
      location.range,
      `Undifined custom media query: ${name}`,
      vscode.DiagnosticSeverity.Error,
    );
    diagnostics.push(diagnostic);
  }

  diagnosticCollection?.set(document.uri, diagnostics);
}

async function scanWorkspace(): Promise<void> {
  definitionsCache.clear();
  referencesCache.clear();

  const cssFileDocuments: vscode.TextDocument[] = await Promise.all(
    (await vscode.workspace.findFiles(`**/*.{${fileExts.join(',')}}`)).map(
      (file) => vscode.workspace.openTextDocument(file),
    ),
  );
  const untitledFileDocuments = vscode.workspace.textDocuments.filter(
    (document) =>
      document.uri.scheme === 'untitled' &&
      languageIdsSet.has(document.languageId),
  );
  const allDocuments = [...cssFileDocuments, ...untitledFileDocuments];

  await promiseAllWithConcurrency(
    allDocuments.flatMap((document) => [
      scanDocumentForDefinitions(document),
      scanDocumentForReferences(document),
    ]),
    10,
  );

  await promiseAllWithConcurrency(
    allDocuments.map((document) => updateDiagnostics(document)),
    10,
  );
}

const scanDocument = async (document: vscode.TextDocument) => {
  if (!languageIdsSet.has(document.languageId)) {
    return;
  }
  await removeDefinitionsCacheByUri(document.uri);
  await removeReferencesCacheByUri(document.uri);

  await Promise.all([
    scanDocumentForDefinitions(document),
    scanDocumentForReferences(document),
  ]);
  await updateDiagnostics(document);
};

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  diagnosticCollection =
    vscode.languages.createDiagnosticCollection('customMedia');

  await scanWorkspace();

  vscode.workspace.onDidOpenTextDocument((document) => {
    void scanDocument(document);
  });

  vscode.workspace.onDidChangeTextDocument(({ document }) => {
    void scanDocument(document);
  });

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor === undefined) {
      return;
    }
    void updateDiagnostics(editor.document);
  });

  vscode.workspace.onDidDeleteFiles((event) => {
    for (const file of event.files) {
      void removeCacheByUri(file);
    }
  });

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    documentSelectors,
    {
      provideCompletionItems(document, position) {
        const { text: lineText } = document.lineAt(position.line);
        if (
          !(
            lineText.substring(0, position.character - 1).includes('@media') &&
            lineText.charAt(position.character - 2) === '('
          )
        ) {
          return null;
        }

        const items: vscode.CompletionItem[] = [];
        for (const [key, value] of definitionsCache) {
          for (const v of value) {
            const item = new vscode.CompletionItem(
              key,
              vscode.CompletionItemKind.Variable,
            );
            item.detail = 'Custom Media Query';
            item.documentation = v.value;
            items.push(item);
          }
        }

        return items;
      },
    },
    '-',
  );

  const definitionProvider = vscode.languages.registerDefinitionProvider(
    documentSelectors,
    {
      provideDefinition(document, position) {
        const wordRange = document.getWordRangeAtPosition(
          position,
          /--[a-zA-Z0-9-_]+/,
        );
        if (wordRange === undefined) {
          return null;
        }

        const word = document.getText(wordRange);

        const def = definitionsCache.get(word);
        return def?.map((v) => v.location) ?? null;
      },
    },
  );

  const referenceProvider = vscode.languages.registerReferenceProvider(
    documentSelectors,
    {
      provideReferences(document, position) {
        const wordRange = document.getWordRangeAtPosition(
          position,
          /--[a-zA-Z0-9-_]+/,
        );
        if (wordRange === undefined) {
          return null;
        }

        const word = document.getText(wordRange);
        if (!definitionsCache.has(word)) {
          return null;
        }
        return referencesCache.get(word);
      },
    },
  );

  context.subscriptions.push(
    completionProvider,
    definitionProvider,
    referenceProvider,
  );
}
