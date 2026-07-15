#[path = "../build_support.rs"]
mod build_support;

use std::path::PathBuf;

#[test]
fn reads_swift_runtime_library_paths_from_target_info() {
    let target_info = r#"
    {
      "paths": {
        "runtimeLibraryPaths": [
          "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/macosx",
          "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift-5.5/macosx"
        ]
      }
    }
    "#;

    let paths = build_support::swift_runtime_library_paths(target_info).unwrap();

    assert_eq!(
        paths,
        vec![
            PathBuf::from(
                "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/macosx"
            ),
            PathBuf::from(
                "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift-5.5/macosx"
            ),
        ]
    );
}

#[test]
fn rejects_target_info_without_runtime_library_paths() {
    let error = build_support::swift_runtime_library_paths(r#"{"paths": {}}"#).unwrap_err();

    assert!(error.contains("runtimeLibraryPaths"));
}
