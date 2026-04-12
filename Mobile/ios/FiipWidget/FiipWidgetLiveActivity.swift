import ActivityKit
import WidgetKit
import SwiftUI

struct FiipWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NoteActivityAttributes.self) { context in
            // Lock screen / Notification Center banner
            VStack {
                Text("En train d'éditer: \(context.attributes.noteTitle)")
                    .font(.subheadline)
                Text("Temps passé: \(context.state.timeElapsed)")
                    .font(.headline)
            }
            .padding()
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI (When you long press the island)
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "pencil.and.outline")
                        .foregroundColor(.blue)
                        .padding(.top, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.timeElapsed)
                        .font(.headline)
                        .foregroundColor(.blue)
                        .padding(.top, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.noteTitle)
                        .font(.caption)
                }
            } compactLeading: {
                Image(systemName: "pencil")
                    .foregroundColor(.blue)
            } compactTrailing: {
                Text(context.state.timeElapsed) // Right side of the pill
                    .font(.caption)
                    .foregroundStyle(.white)
            } minimal: {
                Image(systemName: "pencil") // Very small island
                    .foregroundColor(.blue)
            }
            .keylineTint(.cyan)
        }
    }
}
