// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "GitsidianApp",
    platforms: [
        .macOS(.v14)
    ],
    targets: [
        .executableTarget(
            name: "GitsidianApp",
            path: ".",
            exclude: ["Package.swift", "Info.plist", "GitsidianApp.entitlements"],
            resources: [
                .copy("Resources")
            ]
        )
    ]
)
