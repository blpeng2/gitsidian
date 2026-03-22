import SwiftUI

@main
struct GitsidianApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 900, minHeight: 600)
        }
        .windowStyle(.titleBar)
        .commands {
            CommandGroup(after: .newItem) {
                Button("New Note") {
                    NotificationCenter.default.post(name: .createNewNote, object: nil)
                }
                .keyboardShortcut("n", modifiers: [.command])
            }
            
            CommandMenu("Panels") {
                Button("Toggle AI Panel") {
                    NotificationCenter.default.post(name: .toggleAIPanel, object: nil)
                }
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
            
            CommandMenu("Debug") {
                Button("Toggle Dev Mode") {
                    NotificationCenter.default.post(name: .toggleDevMode, object: nil)
                }
                
                Button("Reload Web App") {
                    NotificationCenter.default.post(name: .reloadWebApp, object: nil)
                }
                .keyboardShortcut("r", modifiers: [.command, .shift])
            }
        }
    }
}

extension Notification.Name {
    static let createNewNote = Notification.Name("createNewNote")
    static let switchToNotes = Notification.Name("switchToNotes")
    static let switchToGraph = Notification.Name("switchToGraph")
    static let reloadWebApp = Notification.Name("reloadWebApp")
    static let oauthCallback = Notification.Name("oauthCallback")
    static let toggleAIPanel = Notification.Name("toggleAIPanel")
    static let toggleDevMode = Notification.Name("toggleDevMode")
}
