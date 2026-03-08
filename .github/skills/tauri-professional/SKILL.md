---
name: tauri-professional
description: 'Professional workflow and best practices for developing Tauri applications. Use for creating Tauri commands (Rust to JS IPC), managing capabilities, debugging Rust, and structuring the app.'
argument-hint: "E.g. 'Create a new IPC command for saving a file' or 'Check my Tauri capabilities'"
---

# Tauri Professional Workflow

## When to Use

- Implementing new Tauri IPC commands.
- Bridging frontend (React/Vite) with backend (Rust).
- Debugging Tauri application errors (Rust panics, IPC timeouts).
- Configuring application capabilities (`src-tauri/capabilities/`).

## Procedure & Guidelines

### 1. IPC (Inter-Process Communication) and Commands

- Write Rust commands in logically separated modules (e.g., `src/commands.rs` or specialized modules).
- Always return a `Result<T, E>` where `E` implements `serde::Serialize` (often via `thiserror`).
- Secure the frontend: never trust data directly from JS. Validate inside the Rust command.

```rust
// Example Command
#[tauri::command]
pub fn perform_action(data: String) -> Result<String, String> {
    if data.is_empty() {
        return Err("Data cannot be empty".into());
    }
    Ok(format!("Processed: {}", data))
}
```

### 2. Frontend Integration

- Use the `@tauri-apps/api.invoke` function inside React components or service layers.
- Wrap invocations in idiomatic frontend abstractions (like separate service files `src/services/tauri.js` or React custom hooks).

### 3. Capabilities & Permissions

- Since Tauri v2, capabilities define what IPC channels are accessible.
- Define needed capabilities inside `src-tauri/capabilities/`.
- Ensure least-privilege: Only add permissions that are immediately required by the frontend.

### 4. Build and Run Actions

- Ensure the frontend web environment starts appropriately before or alongside the Rust binary.
- Use `npm run tauri dev` or `cargo tauri dev` rather than running Rust directly to see accurate integrations.

## Code Quality Checks

When submitting a change for Tauri:
- Did you add the command to the `invoke_handler` in `main.rs`?
- Are the payload structs deriving `Serialize` and `Deserialize` properly?
- Have you restricted filesystem plugins to absolute necessary scopes?
