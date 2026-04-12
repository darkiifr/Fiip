import ActivityKit
import Foundation

struct NoteActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic state (What changes: the time elapsed string)
        var timeElapsed: String
    }

    // Static data (What doesn't change: the note's title)
    var noteTitle: String
}
