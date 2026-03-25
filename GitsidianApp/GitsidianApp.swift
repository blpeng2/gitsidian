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
        // WindowGroup을 사용하면 macOS 26에서 SwiftUI BarAppearanceBridge 버그로
        // EXC_BAD_ACCESS 크래시 발생. AppDelegate에서 직접 NSWindow를 생성해 우회.
        Settings {
            EmptyView()
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private weak var mainWindow: NSWindow?
    private var updaterController: SPUStandardUpdaterController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        updaterController = SPUStandardUpdaterController(
            startingUpdater: true,
            updaterDelegate: nil,
            userDriverDelegate: nil
        )
        showMainWindow()
        // SwiftUI rebuilds the menu bar after applicationDidFinishLaunching.
        // Defer menu setup to ensure our items aren't overwritten.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.setupMenuCommands()
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            // weak var이므로 창이 닫히면 mainWindow는 자동으로 nil
            // showMainWindow()가 nil 확인 후 새 창 생성
            showMainWindow()
        }
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    // MARK: - Window

    private func showMainWindow() {
        if let existing = mainWindow {
            existing.makeKeyAndOrderFront(nil)
            return
        }

        // NSWindow(contentViewController:) 대신 명시적 rect로 생성.
        // 해당 convenience init은 내부에서 layoutSubtreeIfNeeded를 동기 호출하여
        // macOS 26의 BarAppearanceBridge SwiftUI 버그를 트리거함.
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

        // SwiftUI content를 다음 run loop으로 지연.
        // applicationDidFinishLaunching 중 동기 SwiftUI 레이아웃이 일어나지 않도록 함.
        DispatchQueue.main.async { [weak window] in
            guard let window else { return }
            let hostingView = DraggableHostingView(rootView: ContentView())
            window.contentView = hostingView
        }
    }

    // MARK: - Menus

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

    private func setupMenuCommands() {
        let mainMenu = NSApp.mainMenu
        let menuDebugMessage = "[Menu Debug] items: \(mainMenu?.items.map { "\($0.title.isEmpty ? "(empty)" : $0.title) sub:\($0.submenu != nil)" } ?? [])"
        print(menuDebugMessage)
        NSLog("%@", menuDebugMessage)
        guard let mainMenu else { return }

        var foundAppMenu: NSMenu?
        for item in mainMenu.items {
            if let sub = item.submenu {
                if sub.items.contains(where: { $0.action == #selector(NSApplication.terminate(_:)) }) {
                    foundAppMenu = sub
                    break
                }
            }
        }
        if foundAppMenu == nil {
            let appMenuItem = NSMenuItem()
            let newMenu = NSMenu(title: "")
            newMenu.addItem(NSMenuItem(title: "About Gitsidian",
                                       action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
                                       keyEquivalent: ""))
            newMenu.addItem(.separator())
            newMenu.addItem(NSMenuItem(title: "Quit Gitsidian",
                                       action: #selector(NSApplication.terminate(_:)),
                                       keyEquivalent: "q"))
            appMenuItem.submenu = newMenu
            mainMenu.insertItem(appMenuItem, at: 0)
            foundAppMenu = newMenu
        }

        if let appMenu = foundAppMenu {
            let updateItem = NSMenuItem(
                title: "Check for Updates\u{2026}",
                action: #selector(SPUStandardUpdaterController.checkForUpdates(_:)),
                keyEquivalent: ""
            )
            updateItem.target = updaterController
            let insertAt = min(1, appMenu.numberOfItems)
            appMenu.insertItem(updateItem, at: insertAt)
            appMenu.insertItem(.separator(), at: insertAt + 1)
        }

        // File > New Note
        if let fileMenu = mainMenu.item(withTitle: "File")?.submenu {
            let item = makeItem("New Note", key: "n", mods: .command, action: #selector(handleCreateNewNote))
            fileMenu.insertItem(item, at: 1)
        }

        // Panels menu
        let panelsMenu = NSMenu(title: "Panels")
        panelsMenu.addItem(makeItem("Toggle AI Panel", key: "\\", mods: .command, action: #selector(handleToggleAIPanel)))
        panelsMenu.addItem(.separator())
        panelsMenu.addItem(makeItem("Notes View", key: "1", mods: .command, action: #selector(handleSwitchToNotes)))
        panelsMenu.addItem(makeItem("Graph View", key: "2", mods: .command, action: #selector(handleSwitchToGraph)))
        let panelsItem = NSMenuItem(title: "Panels", action: nil, keyEquivalent: "")
        panelsItem.submenu = panelsMenu
        mainMenu.insertItem(panelsItem, at: mainMenu.numberOfItems - 1)

        // Debug menu
        let debugMenu = NSMenu(title: "Debug")
        debugMenu.addItem(makeItem("Toggle Dev Mode", key: "", mods: [], action: #selector(handleToggleDevMode)))
        debugMenu.addItem(makeItem("Reload Web App", key: "r", mods: [.command, .shift], action: #selector(handleReloadWebApp)))
        let debugItem = NSMenuItem(title: "Debug", action: nil, keyEquivalent: "")
        debugItem.submenu = debugMenu
        mainMenu.insertItem(debugItem, at: mainMenu.numberOfItems - 1)
    }

    private func makeItem(_ title: String, key: String, mods: NSEvent.ModifierFlags, action: Selector) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
        item.keyEquivalentModifierMask = mods
        item.target = self
        return item
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
    static let toggleDevMode = Notification.Name("toggleDevMode")
}
