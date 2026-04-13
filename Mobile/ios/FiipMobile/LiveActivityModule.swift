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
                let attributes = NoteActivityAttributes(noteTitle: title)
                let contentState = NoteActivityAttributes.ContentState(timeElapsed: startTime)
                
                do {
                    let activity = try Activity<NoteActivityAttributes>.request(
                        attributes: attributes,
                        contentState: contentState,
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
                let updatedState = NoteActivityAttributes.ContentState(timeElapsed: timeElapsed)
                await activity.update(using: updatedState)
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
            defaults.set(title, forKey: "recentNoteTitle")
            defaults.set(content, forKey: "recentNoteContent")
            defaults.set(count, forKey: "notesCount")
            
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
}
