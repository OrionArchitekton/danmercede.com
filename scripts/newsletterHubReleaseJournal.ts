/** Append-only private hub records. No leases, resets or stale-lock stealing. */
import { constants, type Stats } from 'node:fs';
import { open, lstat, link, unlink, readdir, type FileHandle } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import yaml from 'js-yaml';
export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export function insist(ok: unknown, code = 'unsupported-data'): asserts ok {
    if (!ok)
        throw new Error(code);
}
async function readStablePrivateJson(path: string, links: number) {
    insist(isAbsolute(path), 'absolute-private-path-required');
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
        const before = await handle.stat();
        insist(before.isFile() && before.nlink === links && before.uid === process.getuid?.() && (before.mode & 0o077) === 0 && before.size <= 2 * 1024 * 1024, 'private-file-unusable');
        const bytes = Buffer.alloc(before.size + 1), read = await handle.read(bytes, 0, bytes.length, 0), after = await handle.stat();
        insist(read.bytesRead === before.size && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs && after.nlink === links && after.uid === before.uid && after.mode === before.mode, 'private-file-changed');
        const raw = bytes.subarray(0, read.bytesRead), text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
        const value = JSON.parse(text);
        yaml.load(text, { schema: yaml.JSON_SCHEMA });
        const pending: Array<[unknown, number]> = [[value, 0]];
        let count = 0;
        while (pending.length) {
            const [v, depth] = pending.pop()!;
            insist(depth <= 20 && ++count <= 30000, 'private-json-unbounded');
            if (v && typeof v === 'object')
                for (const child of Object.values(v))
                    pending.push([child, depth + 1]);
        }
        return { value, bytes: raw, stat: after };
    }
    finally {
        await handle.close();
    }
}
export async function readPrivateJson(path: string) {
    const { value, bytes } = await readStablePrivateJson(path, 1);
    return { value, bytes };
}
/** Retain every no-follow ancestor, then verify the same descriptor chain. */
async function directoryChain(path: string) {
    insist(isAbsolute(path) && path === resolve(path) && path !== '/', 'private-root-symlink');
    const handles: FileHandle[] = [];
    const entries: Array<{ parent: string; name: string; stat: Stats }> = [];
    try {
        handles.push(await open('/', constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW));
        const components = path.slice(1).split('/');
        for (const [index, component] of components.entries()) {
            const parent = `/proc/self/fd/${handles.at(-1)!.fd}`;
            const handle = await open(`${parent}/${component}`, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
            handles.push(handle);
            const stat = await handle.stat();
            const leaf = index === components.length - 1;
            const trustedAncestor = (stat.uid === 0 || stat.uid === process.getuid?.()) && ((stat.mode & 0o022) === 0 || (stat.uid === 0 && (stat.mode & 0o1000) !== 0));
            insist(stat.isDirectory() && (leaf ? stat.uid === process.getuid?.() && (stat.mode & 0o077) === 0 : trustedAncestor), 'private-root-not-owned');
            entries.push({ parent, name: component, stat });
        }
        return { handles, entries };
    } catch (error) {
        for (const handle of handles.reverse()) await handle.close();
        throw error;
    }
}
export async function privateRoot(path: string, options: { recoverCrashLinks?: boolean } = {}) {
    const chain = await directoryChain(path);
    const handle = chain.handles.at(-1)!;
    const bound = `/proc/self/fd/${handle.fd}`;
    async function check() {
        for (const entry of chain.entries) {
            const current = await lstat(`${entry.parent}/${entry.name}`);
            insist(current.isDirectory() && current.dev === entry.stat.dev && current.ino === entry.stat.ino && current.uid === entry.stat.uid && current.mode === entry.stat.mode, 'private-root-changed');
        }
    }
    async function recoverCrashLink(name: string) {
        insist(/^hub-[a-z0-9.-]+\.json$/.test(name), 'private-file-unusable');
        const dest = `${bound}/${name}`, stat = await lstat(dest);
        insist(stat.isFile() && stat.nlink === 2, 'private-file-unusable');
        const names = await readdir(bound);
        insist(names.length <= 1000, 'private-journal-unbounded');
        const matching: string[] = [];
        for (const candidate of names.filter(n => /^\.hub-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(n))) {
            const temp = await lstat(`${bound}/${candidate}`);
            if (temp.isFile() && temp.dev === stat.dev && temp.ino === stat.ino && temp.nlink === 2) matching.push(candidate);
        }
        insist(matching.length === 1, 'private-file-unusable');
        const verified = await readStablePrivateJson(dest, 2);
        const kinds = ['hub-operation', 'hub-admission-action', 'hub-native-intent', 'hub-native-response', 'hub-native-readback', 'hub-sync-intent', 'hub-sync-transport-returned', 'newsletter-hub-stage', 'newsletter-hub-generation-proof', 'newsletter-hub-original-plan', 'newsletter-hub-transition'];
        insist(verified.value.schema_version === 1 && kinds.includes(verified.value.kind) && /^[a-f0-9]{64}$/.test(verified.value.input_sha256), 'private-file-unusable');
        if (name.startsWith('hub-plan-')) insist(name === `hub-plan-${digest(verified.bytes)}.json`, 'artifact-digest-mismatch');
        if (name.startsWith('hub-generation-')) insist(name === `hub-generation-${digest(verified.bytes)}.json`, 'artifact-digest-mismatch');
        await check();
        const temp = `${bound}/${matching[0]}`, before = await lstat(temp), current = await lstat(dest);
        insist(before.isFile() && before.dev === verified.stat.dev && before.ino === verified.stat.ino && before.nlink === 2 && current.dev === before.dev && current.ino === before.ino && current.nlink === 2, 'private-file-changed');
        // Remove only the verified second link; never touch another inode or journal payload.
        await unlink(temp);
        await handle.sync();
    }
    async function get(name: string) {
        insist(/^[a-z0-9][a-z0-9.-]{0,230}\.json$/.test(name), 'private-record-name');
        await check();
        try {
            return await readPrivateJson(`${bound}/${name}`);
        }
        catch (e: any) {
            if (e.code === 'ENOENT')
                return null;
            if (e.message === 'private-file-unusable' && options.recoverCrashLinks === true) {
                await recoverCrashLink(name);
                return await readPrivateJson(`${bound}/${name}`);
            }
            throw e;
        }
    }
    async function put(name: string, value: unknown) {
        insist(/^[a-z0-9][a-z0-9.-]{0,230}\.json$/.test(name), 'private-record-name');
        await check();
        const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
        insist(bytes.length <= 2 * 1024 * 1024, 'private-record-unbounded');
        const temp = `${bound}/.hub-${randomUUID()}`, dest = `${bound}/${name}`;
        const file = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
        let created = false;
        try {
            await file.writeFile(bytes);
            await file.sync();
            await check();
            try {
                await link(temp, dest);
                created = true;
            }
            catch (e: any) {
                if (e.code !== 'EEXIST')
                    throw e;
            }
            await handle.sync();
        }
        finally {
            await file.close();
            try { await unlink(temp); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
        }
        const stored = await get(name);
        insist(stored, 'private-record-missing');
        await check();
        return { created, ...stored, ref: `${resolve(path)}/${name}`, sha256: digest(stored.bytes) };
    }
    async function list() {
        await check();
        const names = await readdir(bound);
        insist(names.length <= 1000, 'private-journal-unbounded');
        return names.filter(name => /^hub-plan-[a-f0-9]{64}\.json$/.test(name));
    }
    async function generationProofs() {
        await check();
        const names = await readdir(bound);
        insist(names.length <= 1000, 'private-journal-unbounded');
        return names.filter(name => /^hub-generation-[a-f0-9]{64}\.json$/.test(name));
    }
    async function order(name: string) {
        insist(/^hub-plan-[a-f0-9]{64}\.json$/.test(name), 'private-record-name');
        await check();
        return (await lstat(`${bound}/${name}`, { bigint: true })).ctimeNs;
    }
    return { get, put, list, generationProofs, order, check, close: async () => { for (const h of [...chain.handles].reverse()) await h.close(); } };
}
