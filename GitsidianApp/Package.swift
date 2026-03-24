// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "GitsidianApp",
    platforms: [
        .macOS(.v14)
    ],
    dependencies: [
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.0.0")
    ],
    targets: [
        .executableTarget(
            name: "GitsidianApp",
            dependencies: [
                .product(name: "Sparkle", package: "Sparkle")
            ],
            path: ".",
            exclude: ["Package.swift", "Info.plist", "GitsidianApp.entitlements", "build.sh", "bundle.sh"],
            resources: [
                .copy("Resources")
            ]
        )
    ]
)
