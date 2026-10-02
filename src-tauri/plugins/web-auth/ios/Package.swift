// swift-tools-version:5.3
// Paquete Swift del plugin web-auth. El nombre del producto tiene que ser el del crate:
// tauri-plugin lo enlaza por ese nombre. ../.tauri/tauri-api lo copia build.rs al compilar.

import PackageDescription

let package = Package(
    name: "tauri-plugin-web-auth",
    platforms: [
        .macOS(.v10_13),
        .iOS(.v13),
    ],
    products: [
        .library(
            name: "tauri-plugin-web-auth",
            type: .static,
            targets: ["tauri-plugin-web-auth"])
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api")
    ],
    targets: [
        .target(
            name: "tauri-plugin-web-auth",
            dependencies: [
                .byName(name: "Tauri")
            ],
            path: "Sources")
    ]
)
