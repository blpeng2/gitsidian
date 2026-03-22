import SwiftUI

@main
struct GitsidianApp: App {
    @AppStorage("showAIPanel") private var showAIPanel = false
    @AppStorage("selectedProvider") private var selectedProvider = "chatgpt"
    @AppStorage("devMode") private var devMode = false
    
    var body: some Scene {
        WindowGroup {
            ContentView(
                showAIPanel: $showAIPanel,
                selectedProvider: $selectedProvider,
                devMode: $devMode
            )
            .frame(minWidth: 900, minHeight: 600)
            .onOpenURL { url in
                if url.scheme == "gitsidian" && url.host == "callback" {
                    if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                       let token = components.queryItems?.first(where: { $0.name == "access_token" })?.value {
                        NotificationCenter.default.post(
                            name: .oauthCallback,
                            object: nil,
                            userInfo: ["access_token": token]
                        )
                    }
                }
            }
        }
        .windowStyle(.titleBar)
        .commands {
            // File menu
            CommandGroup(after: .newItem) {
                Button("New Note") {
                    NotificationCenter.default.post(name: .createNewNote, object: nil)
                }
                .keyboardShortcut("n", modifiers: [.command])
            }
            
            // View menu
            CommandMenu("Panels") {
                Toggle("AI Panel", isOn: $showAIPanel)
                    .keyboardShortcut("\\", modifiers: [.command])
                
                Divider()
                
                Button("Notes View") {
                    NotificationCenter.default.post(name: .switchToNotes, object: nil)
                }
                .keyboardShortcut("1", modifiers: [.command])
                
                Button("Graph View") {
                    NotificationCenter.default.post(name: .switchToGraph, object: nil)
                }
                .keyboardShortcut("2", modifiers: [.command])
            }
            
            // Debug menu
            CommandMenu("Debug") {
                Toggle("Dev Mode (localhost)", isOn: $devMode)
                
                Button("Reload Web App") {
                    NotificationCenter.default.post(name: .reloadWebApp, object: nil)
                }
                .keyboardShortcut("r", modifiers: [.command, .shift])
            }
        }
    }
}

// Notification names for menu → view communication
extension Notification.Name {
    static let createNewNote = Notification.Name("createNewNote")
    static let switchToNotes = Notification.Name("switchToNotes")
    static let switchToGraph = Notification.Name("switchToGraph")
    static let reloadWebApp = Notification.Name("reloadWebApp")
    static let oauthCallback = Notification.Name("oauthCallback")
}
