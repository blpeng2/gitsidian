import SwiftUI
import AppKit
import Sparkle

private final class DraggableHostingView: NSHostingView<ContentView> {
    override var mouseDownCanMoveWindow: Bool { true }
}

@main
struct GitsidianApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var mainWindow: NSWindow?
    private let updaterController = SPUStandardUpdaterController(
        startingUpdater: true,
        updaterDelegate: nil,
        userDriverDelegate: nil
    )

    func applicationDidFinishLaunching(_ notification: Notification) {
        installMainMenu()
        showMainWindow()
        // Trigger update check shortly after launch
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            self?.updaterController.updater.checkForUpdatesInBackground()
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { showMainWindow() }
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func applicationWillTerminate(_ notification: Notification) {
        // Clean up window animations before termination to prevent crashes
        if let window = mainWindow {
            window.animations = [:]
            window.contentView = nil
        }
        mainWindow = nil
    }

    // MARK: - Menu

    private func installMainMenu() {
        let mainMenu = NSMenu()

        // App menu
        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(NSMenuItem(title: "About Gitsidian", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: ""))
        appMenu.addItem(.separator())
        let updateItem = NSMenuItem(title: "Check for Updates\u{2026}", action: #selector(checkForUpdates(_:)), keyEquivalent: "")
        updateItem.target = self
        appMenu.addItem(updateItem)
        appMenu.addItem(.separator())
        let servicesItem = NSMenuItem(title: "Services", action: nil, keyEquivalent: "")
        let servicesMenu = NSMenu(title: "Services")
        servicesItem.submenu = servicesMenu
        NSApp.servicesMenu = servicesMenu
        appMenu.addItem(servicesItem)
        appMenu.addItem(.separator())
        appMenu.addItem(NSMenuItem(title: "Hide Gitsidian", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h"))
        let hideOthers = NSMenuItem(title: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(hideOthers)
        appMenu.addItem(NSMenuItem(title: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: ""))
        appMenu.addItem(.separator())
        appMenu.addItem(NSMenuItem(title: "Quit Gitsidian", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        // File menu
        let fileMenuItem = NSMenuItem(title: "File", action: nil, keyEquivalent: "")
        let fileMenu = NSMenu(title: "File")
        fileMenu.addItem(makeItem("New Note", key: "n", mods: .command, action: #selector(handleCreateNewNote)))
        fileMenuItem.submenu = fileMenu
        mainMenu.addItem(fileMenuItem)

        // Edit menu (standard)
        let editMenuItem = NSMenuItem(title: "Edit", action: nil, keyEquivalent: "")
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(NSMenuItem(title: "Undo", action: Selector(("undo:")), keyEquivalent: "z"))
        editMenu.addItem(NSMenuItem(title: "Redo", action: Selector(("redo:")), keyEquivalent: "Z"))
        editMenu.addItem(.separator())
        editMenu.addItem(NSMenuItem(title: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x"))
        editMenu.addItem(NSMenuItem(title: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c"))
        editMenu.addItem(NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"))
        editMenu.addItem(NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"))
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)

        // Panels menu
        let panelsMenuItem = NSMenuItem(title: "Panels", action: nil, keyEquivalent: "")
        let panelsMenu = NSMenu(title: "Panels")
        panelsMenu.addItem(makeItem("Toggle AI Panel", key: "\\", mods: .command, action: #selector(handleToggleAIPanel)))
        panelsMenu.addItem(.separator())
        panelsMenu.addItem(makeItem("Notes View", key: "1", mods: .command, action: #selector(handleSwitchToNotes)))
        panelsMenu.addItem(makeItem("Graph View", key: "2", mods: .command, action: #selector(handleSwitchToGraph)))
        panelsMenuItem.submenu = panelsMenu
        mainMenu.addItem(panelsMenuItem)

        // Debug menu
        let debugMenuItem = NSMenuItem(title: "Debug", action: nil, keyEquivalent: "")
        let debugMenu = NSMenu(title: "Debug")
        debugMenu.addItem(makeItem("Toggle Dev Mode", key: "", mods: [], action: #selector(handleToggleDevMode)))
        debugMenu.addItem(makeItem("Reload Web App", key: "r", mods: [.command, .shift], action: #selector(handleReloadWebApp)))
        debugMenuItem.submenu = debugMenu
        mainMenu.addItem(debugMenuItem)

        // Window menu
        let windowMenuItem = NSMenuItem(title: "Window", action: nil, keyEquivalent: "")
        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(NSMenuItem(title: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m"))
        windowMenu.addItem(NSMenuItem(title: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: ""))
        windowMenuItem.submenu = windowMenu
        NSApp.windowsMenu = windowMenu
        mainMenu.addItem(windowMenuItem)

        NSApp.mainMenu = mainMenu
    }

    @objc private func checkForUpdates(_ sender: Any?) {
        updaterController.checkForUpdates(sender)
    }

    private func makeItem(_ title: String, key: String, mods: NSEvent.ModifierFlags, action: Selector) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
        item.keyEquivalentModifierMask = mods
        item.target = self
        return item
    }

    // MARK: - Window

    func application(_ application: NSApplication, open urls: [URL]) {
        for url in urls {
            guard url.scheme == "gitsidian",
                  url.host == "callback",
                  let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let tokenItem = components.queryItems?.first(where: { $0.name == "access_token" }),
                  let token = tokenItem.value, !token.isEmpty
            else { continue }

            NotificationCenter.default.post(
                name: .oauthCallback,
                object: nil,
                userInfo: ["access_token": token]
            )
        }
    }

    private func showMainWindow() {
        if let existing = mainWindow {
            existing.makeKeyAndOrderFront(nil)
            return
        }

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1200, height: 800),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.minSize = NSSize(width: 900, height: 600)
        window.title = "Gitsidian"
        window.center()
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.isMovableByWindowBackground = true
        window.makeKeyAndOrderFront(nil)
        mainWindow = window

        DispatchQueue.main.async { [weak window] in
            guard let window else { return }
            let hostingView = DraggableHostingView(rootView: ContentView())
            window.contentView = hostingView
        }
    }

    // MARK: - Actions

    @objc private func handleCreateNewNote() {
        NotificationCenter.default.post(name: .createNewNote, object: nil)
    }
    @objc private func handleToggleAIPanel() {
        NotificationCenter.default.post(name: .toggleAIPanel, object: nil)
    }
    @objc private func handleSwitchToNotes() {
        NotificationCenter.default.post(name: .switchToNotes, object: nil)
    }
    @objc private func handleSwitchToGraph() {
        NotificationCenter.default.post(name: .switchToGraph, object: nil)
    }
    @objc private func handleToggleDevMode() {
        NotificationCenter.default.post(name: .toggleDevMode, object: nil)
    }
    @objc private func handleReloadWebApp() {
        NotificationCenter.default.post(name: .reloadWebApp, object: nil)
    }
}

extension Notification.Name {
    static let createNewNote = Notification.Name("createNewNote")
    static let switchToNotes = Notification.Name("switchToNotes")
    static let switchToGraph = Notification.Name("switchToGraph")
    static let reloadWebApp = Notification.Name("reloadWebApp")
    static let oauthCallback = Notification.Name("oauthCallback")
    static let toggleAIPanel = Notification.Name("toggleAIPanel")
    static let diaryAIPrompt = Notification.Name("diaryAIPrompt")
    static let toggleDevMode = Notification.Name("toggleDevMode")
}
