import Foundation
import ActivityKit
import WidgetKit

@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func startActivity(_ title: String, startTime: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.1, *) {
            if ActivityAuthorizationInfo().areActivitiesEnabled {
                let attributes = NoteActivityAttributes(noteTitle: sanitizedTitle(title), startedAt: Date())
                let contentState = NoteActivityAttributes.ContentState(elapsedSeconds: startTime, lastUpdatedAt: Date())
                
                do {
                    let activity = try Activity<NoteActivityAttributes>.request(
                        attributes: attributes,
                        content: .init(state: contentState, staleDate: nil),
                        pushType: nil
                    )
                    resolve(activity.id)
                } catch {
                    reject("START_ERROR", error.localizedDescription, error)
                }
            } else {
                reject("UNAVAILABLE", "Live Activities are not enabled", nil)
            }
        } else {
            reject("UNSUPPORTED", "iOS version must be >= 16.1", nil)
        }
    }
    
    @objc
    func updateActivity(_ id: String, timeElapsed: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.1, *) {
            Task {
                guard let activity = Activity<NoteActivityAttributes>.activities.first(where: { $0.id == id }) else {
                    reject("NOT_FOUND", "Live activity not found", nil)
                    return
                }
                let updatedState = NoteActivityAttributes.ContentState(elapsedSeconds: timeElapsed, lastUpdatedAt: Date())
                await activity.update(.init(state: updatedState, staleDate: nil))
                resolve("Updated")
            }
        } else {
            reject("UNSUPPORTED", "iOS version must be >= 16.1", nil)
        }
    }
    
    @objc
    func endActivity(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.1, *) {
            Task {
                guard let activity = Activity<NoteActivityAttributes>.activities.first(where: { $0.id == id }) else {
                    reject("NOT_FOUND", "Live activity not found", nil)
                    return
                }
                await activity.end(dismissalPolicy: .immediate)
                resolve("Ended")
            }
        } else {
            reject("UNSUPPORTED", "iOS version must be >= 16.1", nil)
        }
    }
    @objc
    func updateWidgetData(_ title: String, content: String, count: Int, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if let defaults = UserDefaults(suiteName: "group.com.fiip.widget") {
            defaults.set(sanitizedTitle(title), forKey: "recentNoteTitle")
            defaults.set(sanitizedContent(content), forKey: "recentNoteContent")
            defaults.set(count, forKey: "notesCount")
            defaults.set(Date().ISO8601Format(), forKey: "recentNoteUpdatedAt")
            defaults.set(Date().ISO8601Format(), forKey: "lastActive")
            
            // Reload timelines to refresh the widget automatically
            if #available(iOS 14.0, *) {
                importWidgetKitAndReload()
            }
            resolve("Widget Updated")
        } else {
            reject("WIDGET_ERROR", "Could not load App Group UserDefaults", nil)
        }
    }
    
    @available(iOS 14.0, *)
    private func importWidgetKitAndReload() {
        // Doing this so we don't need to import WidgetKit at the global scope of a non-widget module directly, 
        // though we do need to import it here.
        WidgetCenter.shared.reloadAllTimelines()
    }

    private func sanitizedTitle(_ title: String) -> String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "Note sans titre" : String(trimmed.prefix(80))
    }

    private func sanitizedContent(_ content: String) -> String {
        let collapsed = content
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return collapsed.isEmpty ? "Aucun apercu disponible." : String(collapsed.prefix(180))
    }
}
