# Fiip MCP Tools

The repo-local MCP server is configured by `.mcp.json` and implemented in `mcp/fiip/server.mjs`.

Set `FIIP_MCP_STORE` to control where the MCP note/settings JSON is stored. The repo config defaults it to `.fiip-mcp/state.json`, which is ignored by Git.

## Tools

- `fiip_list_notes({ includeDeleted?: boolean })`
- `fiip_search_notes({ query: string, includeDeleted?: boolean })`
- `fiip_get_note({ id: string })`
- `fiip_create_note({ title?: string, content?: string, tags?: string[] })`
- `fiip_update_note({ id: string, title?: string, content?: string, tags?: string[], favorite?: boolean, deleted?: boolean })`
- `fiip_delete_note({ id: string })`
- `fiip_export_note_fiin({ id: string, path?: string })`
- `fiip_get_settings({})`
- `fiip_update_settings({ cloudSync?: boolean, autoSave?: boolean })`

## Resources

- `fiip://notes`
- `fiip://settings`

## Notes

The MCP store is a local agent bridge, not Supabase. Do not treat MCP edits as synced cloud data unless an explicit bridge/import step is added by the app.
