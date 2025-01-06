import type * as vscode from 'vscode';

export const languageIdsSet = new Set(['css', 'postcss', 'scss']);

export const documentSelectors: vscode.DocumentSelector = [
  ...languageIdsSet,
].map((id) => ({ language: id }));

export const fileExts = ['css', 'pcss', 'scss'];
