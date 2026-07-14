'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const yaml = require('js-yaml');
const { extractImageTag, buildCommitMessage, applyImageUpdate } = require('./pipelineHelpers.js');

/**
 * Property 1: IMAGE_TAG is a 7-character SHA prefix
 * Validates: Requirements 4.2
 */
describe('Property 1: IMAGE_TAG is a 7-character SHA prefix', () => {
  it('extractImageTag returns exactly 7 characters that are a prefix of the input SHA', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 7 }),
        (sha) => {
          const result = extractImageTag(sha);

          assert.strictEqual(
            result.length,
            7,
            `Expected IMAGE_TAG length to be 7, got ${result.length} for sha "${sha}"`
          );
          assert.ok(
            sha.startsWith(result),
            `Expected sha "${sha}" to start with IMAGE_TAG "${result}"`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 4: Commit message contains [skip ci] as a standalone token
 * Validates: Requirements 5.4, 6.2
 */
describe('Property 4: Commit message contains [skip ci] as a standalone token', () => {
  it('buildCommitMessage matches the expected format and contains [skip ci] as a standalone token', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z]+$/),
        fc.hexaString({ minLength: 7, maxLength: 7 }),
        (service, tag) => {
          const message = buildCommitMessage(service, tag);

          // Must match the overall format: Update <service> image to <tag> [skip ci]
          assert.match(message, /^Update \S+ image to \S+ \[skip ci\]$/);

          // [skip ci] must appear as a space-delimited standalone token
          assert.ok(
            message.includes(' [skip ci]'),
            `Expected message to contain ' [skip ci]' as a standalone token, got: ${message}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 2: Top-level image values are updated correctly
 * Validates: Requirements 5.1, 5.2
 */
describe('Property 2: Top-level image values are updated correctly', () => {
  it('applyImageUpdate sets .image.repository and .image.tag to the new values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.hexaString({ minLength: 7, maxLength: 7 }),
        (newRepo, newTag) => {
          const yamlContent = [
            'image:',
            '  repository: old-repo',
            '  tag: "old-tag"',
            '  pullPolicy: Always',
          ].join('\n');

          const result = applyImageUpdate(yamlContent, newRepo, newTag);
          const parsed = yaml.load(result);

          assert.strictEqual(
            parsed.image.repository,
            newRepo,
            `Expected .image.repository to be "${newRepo}", got "${parsed.image.repository}"`
          );
          assert.strictEqual(
            String(parsed.image.tag),
            String(newTag),
            `Expected .image.tag to be "${newTag}", got "${parsed.image.tag}"`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 3: Nested infrastructure image values are preserved
 * Validates: Requirements 5.3
 */
describe('Property 3: Nested infrastructure image values are preserved', () => {
  it('applyImageUpdate leaves nested infrastructure image blocks unchanged', () => {
    fc.assert(
      fc.property(
        // Generator: one or more nested blocks with arbitrary parent key names
        // and random repo/tag values, plus the new top-level repo/tag to apply
        fc.array(
          fc.tuple(
            fc.stringMatching(/^[a-z]+$/),
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 })
          ),
          { minLength: 1 }
        ),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (nestedBlocks, newRepo, newTag) => {
          // Deduplicate parent keys to avoid YAML key collisions (last-write wins)
          // and exclude 'image' since that is the top-level key we intentionally update
          const seen = new Set(['image']);
          const uniqueBlocks = nestedBlocks.filter(([key]) => {
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // If deduplication removed everything, skip this sample
          if (uniqueBlocks.length === 0) return;

          // Build the YAML string dynamically — quote all nested values so
          // whitespace-only strings survive the yaml.load parse step.
          const lines = [
            'image:',
            '  repository: old-repo',
            '  tag: "old-tag"',
            '  pullPolicy: Always',
          ];
          for (const [parentKey, nestedRepo, nestedTag] of uniqueBlocks) {
            lines.push(`${parentKey}:`);
            lines.push('  image:');
            // Escape any double-quotes inside the value so the YAML remains valid
            lines.push(`    repository: "${nestedRepo.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
            lines.push(`    tag: "${nestedTag.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
          }
          const yamlContent = lines.join('\n');

          const updated = applyImageUpdate(yamlContent, newRepo, newTag);
          const parsed = yaml.load(updated);

          // Assert every nested block is untouched
          for (const [parentKey, nestedRepo, nestedTag] of uniqueBlocks) {
            assert.strictEqual(
              parsed[parentKey].image.repository,
              nestedRepo,
              `${parentKey}.image.repository was mutated: expected "${nestedRepo}", got "${parsed[parentKey].image.repository}"`
            );
            assert.strictEqual(
              String(parsed[parentKey].image.tag),
              nestedTag,
              `${parentKey}.image.tag was mutated: expected "${nestedTag}", got "${parsed[parentKey].image.tag}"`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
