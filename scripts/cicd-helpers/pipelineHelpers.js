'use strict';

const yaml = require('js-yaml');

/**
 * Extracts the IMAGE_TAG from a commit SHA by returning the first 7 characters.
 *
 * @param {string} sha - A commit SHA string (must be at least 7 characters)
 * @returns {string} The first 7 characters of the SHA
 */
function extractImageTag(sha) {
  return sha.slice(0, 7);
}

/**
 * Updates only the top-level `.image.repository` and `.image.tag` keys in a
 * Helm values.yaml string. All other keys — including `.image.pullPolicy` and
 * any nested image blocks such as `dynamodb.image` or `mysql.image` — are left
 * completely untouched.
 *
 * @param {string} yamlContent - The full contents of a values.yaml file
 * @param {string} newRepo     - The new ECR repository URL to write into `.image.repository`
 * @param {string} newTag      - The new image tag to write into `.image.tag`
 * @returns {string} The serialized YAML string with only the two top-level image fields updated
 */
function applyImageUpdate(yamlContent, newRepo, newTag) {
  const parsed = yaml.load(yamlContent);

  if (!parsed.image || typeof parsed.image !== 'object') {
    throw new Error('values.yaml does not contain a top-level "image" mapping');
  }

  parsed.image.repository = newRepo;
  parsed.image.tag = newTag;

  // Use forceQuotes + quotingType to ensure all string scalars (including
  // whitespace-only values) are double-quoted in the output, so the YAML
  // round-trips correctly without turning bare-whitespace strings into null.
  return yaml.dump(parsed, { lineWidth: -1, forceQuotes: true, quotingType: '"' });
}

/**
 * Builds the git commit message for a Helm values.yaml image update.
 * The [skip ci] token prevents the push from re-triggering the pipeline.
 *
 * @param {string} service  - The service name (e.g. 'cart', 'catalog')
 * @param {string} imageTag - The image tag (e.g. 'a1b2c3d')
 * @returns {string} Commit message in the format: Update {service} image to {imageTag} [skip ci]
 */
function buildCommitMessage(service, imageTag) {
  return `Update ${service} image to ${imageTag} [skip ci]`;
}

module.exports = { extractImageTag, applyImageUpdate, buildCommitMessage };
