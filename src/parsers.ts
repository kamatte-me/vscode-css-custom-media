import * as vscode from 'vscode';
import type { CustomMediaQueryArgs } from './types';

export type ParseDefinitionResultItem = CustomMediaQueryArgs & {
  location: vscode.Location;
};

export const definitionRegex = /@custom-media\s+(--[a-zA-Z0-9-_]+)\s(.+);/g;

export const parseDefinitions = (
  document: vscode.TextDocument,
): ParseDefinitionResultItem[] => {
  const text = document.getText();

  const definitions: ParseDefinitionResultItem[] = [];
  let match: RegExpExecArray | null;
  // biome-ignore lint: no-constant-condition
  while ((match = definitionRegex.exec(text)) !== null) {
    if (!(match[0] && match[1] && match[2])) {
      continue;
    }
    const range = new vscode.Range(
      document.positionAt(match.index),
      document.positionAt(match.index + match[0].length),
    );
    const location = new vscode.Location(document.uri, range);
    definitions.push({
      name: match[1],
      value: match[2],
      location,
    });
  }

  return definitions;
};

type ParseReferenceResultItem = Pick<CustomMediaQueryArgs, 'name'> & {
  location: vscode.Location;
};

export const referenceRegex = /\(--([a-zA-Z0-9-_]+)\)/g;

export const parseReferences = (
  document: vscode.TextDocument,
): ParseReferenceResultItem[] => {
  const text = document.getText();

  const references: ParseReferenceResultItem[] = [];
  let match: RegExpExecArray | null;
  // biome-ignore lint: no-constant-condition
  while ((match = referenceRegex.exec(text)) !== null) {
    const range = new vscode.Range(
      document.positionAt(match.index + 1),
      document.positionAt(match.index + match[0].length - 1),
    );
    const location = new vscode.Location(document.uri, range);
    references.push({
      name: `--${match[1]}`,
      location,
    });
  }

  return references;
};
