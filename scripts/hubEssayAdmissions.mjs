/** Strict inert essay admission data shared by compiler and protected-main readers. */
import yaml from 'js-yaml';
export const ESSAY_ADMISSION_PATH = 'data/hub-essay-admissions.json';
export function parseEssayAdmissions(raw) {
    if (typeof raw !== 'string' || Buffer.byteLength(raw) > 65536) throw Error('invalid-essay-admission-data');
    const data = JSON.parse(raw);
    yaml.load(raw, { schema: yaml.JSON_SCHEMA }); // Reject duplicate JSON object keys.
    if (!data || Array.isArray(data) || Object.keys(data).sort().join('|') !== 'essay_slugs|schema_version' || data.schema_version !== 1 || !Array.isArray(data.essay_slugs) || data.essay_slugs.length > 1000) throw Error('invalid-essay-admission-data');
    const slugs = data.essay_slugs;
    if (slugs.some(slug => typeof slug !== 'string' || slug.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) || new Set(slugs).size !== slugs.length) throw Error('invalid-essay-admission-data');
    return Object.freeze([...slugs]);
}
