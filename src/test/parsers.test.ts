import assert from 'node:assert';
import * as vscode from 'vscode';
import { parseDefinitions, parseReferences } from '../parsers';

const fixture = `:root {
  --primary-color: #333;
}

@custom-media --sm (max-width: 600px);
@custom-media --md (min-width: 601px) and (max-width: 1024px);

html {
  @media (--sm) {}
}

.hoge {
  color: var(--primary-color);
  .fuga {
    @media(--sm) {}
    @media (--md) and (--lg) {}
  }
  @media (--undefined-media) {}
}
`;

suite('parsers', () => {
  suite('parseDefinitions', () => {
    test('Should parse @custom-media definitions', async () => {
      const document = await vscode.workspace.openTextDocument({
        language: 'css',
        content: fixture,
      });

      const definitions = parseDefinitions(document);
      assert.strictEqual(definitions.length, 2);

      assert.strictEqual(definitions[0]?.name, '--sm');
      assert.strictEqual(definitions[0].value, '(max-width: 600px)');
      assert.strictEqual(
        definitions[0].location.uri.toString(),
        document.uri.toString(),
      );
      assert.strictEqual(definitions[0].location.range.start.line, 4);
      assert.strictEqual(definitions[0].location.range.start.character, 0);

      assert.strictEqual(definitions[1]?.name, '--md');
      assert.strictEqual(
        definitions[1].value,
        '(min-width: 601px) and (max-width: 1024px)',
      );
      assert.strictEqual(
        definitions[1].location.uri.toString(),
        document.uri.toString(),
      );
      assert.strictEqual(definitions[1].location.range.start.line, 5);
      assert.strictEqual(definitions[1].location.range.start.character, 0);
    });
  });

  suite('parseReferences', () => {
    test('Should validate undefined custom media references', async () => {
      const document = await vscode.workspace.openTextDocument({
        language: 'css',
        content: fixture,
      });

      const references = parseReferences(document);
      assert.strictEqual(references.length, 6);

      assert.strictEqual(references[0]?.name, '--sm');
      assert.strictEqual(
        references[0].location.uri.toString(),
        document.uri.toString(),
      );
      assert.strictEqual(references[0].location.range.start.line, 8);
      assert.strictEqual(references[0].location.range.start.character, 10);

      assert.strictEqual(references[1]?.name, '--primary-color');
      assert.strictEqual(
        references[1].location.uri.toString(),
        document.uri.toString(),
      );
      assert.strictEqual(references[1].location.range.start.line, 12);
      assert.strictEqual(references[1].location.range.start.character, 13);

      assert.strictEqual(references[2]?.name, '--sm');
      assert.strictEqual(
        references[2].location.uri.toString(),
        document.uri.toString(),
      );
      assert.strictEqual(references[2].location.range.start.line, 14);
      assert.strictEqual(references[2].location.range.start.character, 11);

      assert.strictEqual(references[3]?.name, '--md');
      assert.strictEqual(
        references[3].location.uri.toString(),
        document.uri.toString(),
      );
      assert.strictEqual(references[3].location.range.start.line, 15);
      assert.strictEqual(references[3].location.range.start.character, 12);

      assert.strictEqual(references[4]?.name, '--lg');
      assert.strictEqual(
        references[4].location.uri.toString(),
        document.uri.toString(),
      );
      assert.strictEqual(references[4].location.range.start.line, 15);
      assert.strictEqual(references[4].location.range.start.character, 23);

      assert.strictEqual(references[5]?.name, '--undefined-media');
      assert.strictEqual(
        references[5].location.uri.toString(),
        document.uri.toString(),
      );
      assert.strictEqual(references[5].location.range.start.line, 17);
      assert.strictEqual(references[5].location.range.start.character, 10);
    });
  });
});
