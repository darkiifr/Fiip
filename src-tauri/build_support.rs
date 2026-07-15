use std::path::PathBuf;

pub fn swift_runtime_library_paths(target_info: &str) -> Result<Vec<PathBuf>, String> {
    let target_info: serde_json::Value = serde_json::from_str(target_info)
        .map_err(|error| format!("invalid swiftc target info: {error}"))?;
    let paths = target_info
        .pointer("/paths/runtimeLibraryPaths")
        .and_then(serde_json::Value::as_array)
        .ok_or_else(|| "swiftc target info missing runtimeLibraryPaths".to_string())?;

    paths
        .iter()
        .map(|path| {
            path.as_str()
                .map(PathBuf::from)
                .ok_or_else(|| "swiftc runtimeLibraryPaths contains a non-string value".to_string())
        })
        .collect()
}
