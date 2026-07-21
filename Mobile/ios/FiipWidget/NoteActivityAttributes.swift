import ActivityKit
import Foundation

struct NoteActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var elapsedSeconds: Double
        var lastUpdatedAt: Date
    }

    var noteTitle: String
    var startedAt: Date
}
