import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

struct FiipWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NoteActivityAttributes.self) { context in
            HStack(spacing: 12) {
                Image(systemName: "pencil.and.scribble")
                    .font(.title3)
                    .foregroundStyle(.blue)
                    .frame(width: 32, height: 32)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Edition en cours")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(context.attributes.noteTitle)
                        .font(.headline)
                        .lineLimit(1)
                    Text(formattedElapsed(context.state.elapsedSeconds))
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.blue)
                }

                Spacer(minLength: 0)
            }
            .padding()
            .activityBackgroundTint(.background)
            .activitySystemActionForegroundColor(.blue)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Label("Fiip", systemImage: "note.text")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.blue)
                        Text("Edition")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    Text(formattedElapsed(context.state.elapsedSeconds))
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(.blue)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 8) {
                        Image(systemName: "pencil.line")
                            .foregroundStyle(.blue)
                        Text(context.attributes.noteTitle)
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(1)
                        Spacer(minLength: 0)
                    }
                    .padding(.top, 2)
                }
            } compactLeading: {
                Image(systemName: "pencil")
                    .foregroundStyle(.blue)
            } compactTrailing: {
                Text(shortElapsed(context.state.elapsedSeconds))
                    .font(.caption2.monospacedDigit().weight(.semibold))
                    .foregroundStyle(.primary)
            } minimal: {
                Image(systemName: "note.text")
                    .foregroundStyle(.blue)
            }
            .keylineTint(.blue)
        }
    }
}

private func formattedElapsed(_ seconds: Double) -> String {
    let value = max(0, Int(seconds))
    let hours = value / 3600
    let minutes = (value % 3600) / 60
    let remainingSeconds = value % 60

    if hours > 0 {
        return String(format: "%d:%02d:%02d", hours, minutes, remainingSeconds)
    }

    return String(format: "%02d:%02d", minutes, remainingSeconds)
}

private func shortElapsed(_ seconds: Double) -> String {
    let value = max(0, Int(seconds))
    let minutes = value / 60
    if minutes >= 100 {
        return "99m+"
    }
    return "\(minutes)m"
}
