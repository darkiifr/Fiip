#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';

function resolveStorePath() {
  const configured = process.env.FIIP_MCP_STORE;
  if (!configured) {
    return join(homedir(), '.fiip-mcp', 'state.json');
  }
  return configured.replaceAll('${workspaceFolder}', process.cwd());
}

const STORE_PATH = resolveStorePath();
const SERVER_VERSION = '0.1.0';

const DEFAULT_STATE = {
  notes: [],
  settings: {
    theme: 'dark',
    cloudSync: true,
    autoSave: true,
  },
};

function now() {
  return Date.now();
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeNote(input = {}) {
  const timestamp = now();
  return {
    id: String(input.id || randomUUID()),
    title: String(input.title || 'Nouvelle Note'),
    content: String(input.content || ''),
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    favorite: Boolean(input.favorite),
    deleted: Boolean(input.deleted),
    createdAt: Number(input.createdAt || input.created_at || timestamp),
    updatedAt: Number(input.updatedAt || input.updated_at || timestamp),
  };
}

async function ensureStore() {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  if (!existsSync(STORE_PATH)) {
    await writeState(DEFAULT_STATE);
  }
}

async function readState() {
  await ensureStore();
  const raw = await readFile(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  return {
    notes: Array.isArray(parsed.notes) ? parsed.notes.map(normalizeNote) : [],
    settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
  };
}

async function writeState(state) {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify({
    notes: Array.isArray(state.notes) ? state.notes.map(normalizeNote) : [],
    settings: { ...DEFAULT_STATE.settings, ...(state.settings || {}) },
  }, null, 2)}\n`, 'utf8');
}

function textResult(payload) {
  return {
    content: [
      {
        type: 'text',
        text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function getRequiredString(args, key) {
  const value = args?.[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function findNote(notes, id) {
  const note = notes.find((item) => item.id === id);
  if (!note) {
    throw new Error(`Note not found: ${id}`);
  }
  return note;
}

const tools = [
  {
    name: 'fiip_list_notes',
    description: 'List Fiip notes from the local MCP store.',
    inputSchema: {
      type: 'object',
      properties: {
        includeDeleted: { type: 'boolean', default: false },
      },
    },
  },
  {
    name: 'fiip_search_notes',
    description: 'Search Fiip notes by title, plain text content, or tags.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        includeDeleted: { type: 'boolean', default: false },
      },
    },
  },
  {
    name: 'fiip_get_note',
    description: 'Read a Fiip note by id.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
      },
    },
  },
  {
    name: 'fiip_create_note',
    description: 'Create a Fiip note in the local MCP store.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'fiip_update_note',
    description: 'Update a Fiip note title, content, tags, favorite flag, or deleted flag.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        favorite: { type: 'boolean' },
        deleted: { type: 'boolean' },
      },
    },
  },
  {
    name: 'fiip_delete_note',
    description: 'Soft-delete a Fiip note by id.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
      },
    },
  },
  {
    name: 'fiip_export_note_fiin',
    description: 'Export a Fiip note as an importable .fiin JSON payload.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        path: { type: 'string', description: 'Optional output .fiin path.' },
      },
    },
  },
  {
    name: 'fiip_get_settings',
    description: 'Read Fiip MCP settings.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'fiip_update_settings',
    description: 'Update Fiip MCP settings such as cloudSync or autoSave.',
    inputSchema: {
      type: 'object',
      properties: {
        cloudSync: { type: 'boolean' },
        autoSave: { type: 'boolean' },
      },
    },
  },
];

async function callTool(name, args = {}) {
  const state = await readState();

  switch (name) {
    case 'fiip_list_notes': {
      const notes = state.notes.filter((note) => args.includeDeleted || !note.deleted);
      return textResult({ storePath: STORE_PATH, notes });
    }

    case 'fiip_search_notes': {
      const query = getRequiredString(args, 'query').toLowerCase();
      const notes = state.notes
        .filter((note) => args.includeDeleted || !note.deleted)
        .filter((note) => {
          const haystack = [note.title, stripHtml(note.content), ...(note.tags || [])].join(' ').toLowerCase();
          return haystack.includes(query);
        });
      return textResult({ query, notes });
    }

    case 'fiip_get_note': {
      return textResult(findNote(state.notes, getRequiredString(args, 'id')));
    }

    case 'fiip_create_note': {
      const note = normalizeNote({
        title: args.title,
        content: args.content,
        tags: args.tags,
      });
      state.notes = [note, ...state.notes];
      await writeState(state);
      return textResult({ created: true, note });
    }

    case 'fiip_update_note': {
      const id = getRequiredString(args, 'id');
      const note = findNote(state.notes, id);
      if (typeof args.title === 'string') note.title = args.title;
      if (typeof args.content === 'string') note.content = args.content;
      if (Array.isArray(args.tags)) note.tags = args.tags.map(String);
      if (typeof args.favorite === 'boolean') note.favorite = args.favorite;
      if (typeof args.deleted === 'boolean') note.deleted = args.deleted;
      note.updatedAt = now();
      await writeState(state);
      return textResult({ updated: true, note });
    }

    case 'fiip_delete_note': {
      const note = findNote(state.notes, getRequiredString(args, 'id'));
      note.deleted = true;
      note.updatedAt = now();
      await writeState(state);
      return textResult({ deleted: true, note });
    }

    case 'fiip_export_note_fiin': {
      const note = findNote(state.notes, getRequiredString(args, 'id'));
      const payload = {
        version: 1,
        exported_at: new Date().toISOString(),
        note,
      };
      const outputPath = args.path || join(process.cwd(), `${note.title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').slice(0, 80) || 'note'}.fiin`);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      return textResult({ exported: true, path: outputPath });
    }

    case 'fiip_get_settings': {
      return textResult({ storePath: STORE_PATH, settings: state.settings });
    }

    case 'fiip_update_settings': {
      const next = { ...state.settings };
      if (typeof args.cloudSync === 'boolean') next.cloudSync = args.cloudSync;
      if (typeof args.autoSave === 'boolean') next.autoSave = args.autoSave;
      next.theme = 'dark';
      state.settings = next;
      await writeState(state);
      return textResult({ updated: true, settings: state.settings });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleRequest(request) {
  const { id, method, params = {} } = request;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: 'fiip-mcp',
          version: SERVER_VERSION,
        },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools } };
  }

  if (method === 'tools/call') {
    const result = await callTool(params.name, params.arguments || {});
    return { jsonrpc: '2.0', id, result };
  }

  if (method === 'resources/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        resources: [
          {
            uri: 'fiip://notes',
            name: 'Fiip notes',
            mimeType: 'application/json',
          },
          {
            uri: 'fiip://settings',
            name: 'Fiip settings',
            mimeType: 'application/json',
          },
        ],
      },
    };
  }

  if (method === 'resources/read') {
    const state = await readState();
    const uri = params.uri;
    if (uri === 'fiip://notes') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(state.notes, null, 2) }],
        },
      };
    }
    if (uri === 'fiip://settings') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(state.settings, null, 2) }],
        },
      };
    }
    throw new Error(`Unknown resource: ${uri}`);
  }

  throw new Error(`Unsupported method: ${method}`);
}

const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', async (line) => {
  if (!line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
    const response = await handleRequest(request);
    if (response) {
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  } catch (error) {
    const id = request?.id ?? null;
    process.stdout.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: error.message || String(error),
      },
    })}\n`);
  }
});
