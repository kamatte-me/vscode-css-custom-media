import * as assert from 'node:assert';
import path from 'node:path';
import * as vscode from 'vscode';
import { definitionsCache } from '../extension';

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

suite('Custom Media Query Extension Tests', function () {
  this.timeout(5000);
  this.afterEach(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  suite('Parsing and Caching', () => {
    test('Should parse @custom-media definitions', async () => {
      await vscode.workspace.openTextDocument({
        language: 'css',
        content: `@custom-media --sm (max-width: 600px);
@custom-media --md (min-width: 601px) and (max-width: 1024px);`,
      });

      assert.strictEqual(
        definitionsCache.has('--sm'),
        true,
        'Expected --sm to be defined',
      );
      assert.strictEqual(
        definitionsCache.has('--md'),
        true,
        'Expected --md to be defined',
      );
      assert.strictEqual(
        definitionsCache.get('--sm')?.[0].value,
        '(max-width: 600px)',
      );
      assert.strictEqual(
        definitionsCache.get('--md')?.[0].value,
        '(min-width: 601px) and (max-width: 1024px)',
      );
    });
  });

  test('Should validate undefined custom media references', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'css',
      content: '@media (--undefined-media) {}',
    });
    await sleep(500);

    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    assert.ok(
      diagnostics.length > 0,
      'Expected diagnostics for undefined custom media query',
    );
    assert.strictEqual(
      diagnostics[0].message,
      'Undifined custom media query: --undefined-media',
    );
  });

  test('Should provide definition for custom media', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'css',
      content: `@custom-media --lg (min-width: 1025px);
@media (--lg) {}`,
    });
    await sleep(500);

    const position = new vscode.Position(1, 10);
    const definitions = await vscode.commands.executeCommand<
      vscode.Location[] | null
    >('vscode.executeDefinitionProvider', document.uri, position);

    assert.ok(definitions, 'Expected definitions to be non-null');
    assert.strictEqual(definitions?.length, 1, 'Expected one definition');
    assert.strictEqual(
      definitions?.[0].uri.toString(),
      document.uri.toString(),
      'Expected definition URI to match',
    );
  });

  test('Should provide references for custom media', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'css',
      content: `@custom-media --lg (min-width: 1201px);
@media (--lg) {}
div {
  color: red;
}
@media (--lg) {}`,
    });
    await sleep(500);

    const position = new vscode.Position(0, 16);
    const references = await vscode.commands.executeCommand<
      vscode.Location[] | null
    >('vscode.executeReferenceProvider', document.uri, position);

    assert.ok(references);
    assert.strictEqual(references.length, 2);
    assert.strictEqual(
      references?.[0].uri.toString(),
      document.uri.toString(),
      'Expected reference URI to match',
    );
    assert.strictEqual(
      references?.[1].uri.toString(),
      document.uri.toString(),
      'Expected reference URI to match',
    );
  });

  test('Should provide @media completion for @custom-media', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'css',
      content: `@custom-media --md (min-width: 768px);
@media (-`,
    });
    await sleep(500);

    const position = new vscode.Position(1, 9);
    const completions =
      await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider',
        document.uri,
        position,
      );

    assert.ok(completions, 'Expected completions to be non-null');
    assert.ok(completions.items.length > 0, 'Expected completion items');
    const item = completions.items.find((item) => item.label === '--md');
    assert.ok(item, 'Expected --md to be in completions');
    assert.strictEqual(item.detail, 'Custom Media Query', 'Expected document');
    assert.strictEqual(
      item.documentation,
      '(min-width: 768px)',
      'Expected documentation to be --md',
    );
  });
});
