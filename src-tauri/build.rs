#[cfg(target_os = "macos")]
mod build_support;

fn main() {
    #[cfg(target_os = "macos")]
    {
        use std::env;
        use std::path::PathBuf;
        use std::process::Command;

        let manifest_dir =
            PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR missing"));
        let swift_source = manifest_dir.join("src/ocr/macos_vision.swift");
        let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR missing"));
        let object_file = out_dir.join("macos_vision.o");
        let target_arch = env::var("CARGO_CFG_TARGET_ARCH").expect("CARGO_CFG_TARGET_ARCH missing");
        let swift_target = match target_arch.as_str() {
            "aarch64" => "arm64-apple-macosx11.0",
            "x86_64" => "x86_64-apple-macosx10.15",
            other => panic!("unsupported macOS Swift OCR target arch: {other}"),
        };

        let target_info = Command::new("xcrun")
            .args(["swiftc", "-print-target-info", "-target", swift_target])
            .output()
            .expect("failed to query swiftc target info");
        if !target_info.status.success() {
            panic!(
                "swiftc failed to report target info: {}",
                String::from_utf8_lossy(&target_info.stderr)
            );
        }
        let target_info =
            String::from_utf8(target_info.stdout).expect("swiftc target info was not valid UTF-8");
        let swift_runtime_paths = build_support::swift_runtime_library_paths(&target_info)
            .unwrap_or_else(|error| panic!("failed to read swiftc target info: {error}"));

        let status = Command::new("xcrun")
            .args([
                "swiftc",
                "-parse-as-library",
                "-emit-object",
                "-target",
                swift_target,
                swift_source.to_str().expect("invalid Swift source path"),
                "-o",
                object_file.to_str().expect("invalid Swift object path"),
            ])
            .status()
            .expect("failed to run xcrun swiftc for macOS Vision OCR");

        if !status.success() {
            panic!("swiftc failed while building macOS Vision OCR bridge");
        }

        println!("cargo:rerun-if-changed={}", swift_source.display());
        println!("cargo:rerun-if-env-changed=CARGO_CFG_TARGET_ARCH");
        for path in swift_runtime_paths {
            println!("cargo:rustc-link-search=native={}", path.display());
        }
        println!("cargo:rustc-link-arg={}", object_file.display());
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=ImageIO");
        println!("cargo:rustc-link-lib=framework=Vision");
        println!("cargo:rustc-link-lib=framework=CoreGraphics");
    }
    tauri_build::build()
}
