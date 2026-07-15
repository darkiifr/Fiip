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
        let swift_arch = match target_arch.as_str() {
            "aarch64" => "arm64",
            "x86_64" => "x86_64",
            other => panic!("unsupported macOS Swift OCR target arch: {other}"),
        };

        let status = Command::new("xcrun")
            .args([
                "swiftc",
                "-parse-as-library",
                "-emit-object",
                "-arch",
                swift_arch,
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
        println!("cargo:rustc-link-arg={}", object_file.display());
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=ImageIO");
        println!("cargo:rustc-link-lib=framework=Vision");
        println!("cargo:rustc-link-lib=framework=CoreGraphics");
    }
    tauri_build::build()
}
