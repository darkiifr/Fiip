import SwiftUI
import WidgetKit

private let appGroupIdentifier = "group.com.fiip.widget"

private struct FiipWidgetSnapshot: Codable {
    let totalNotes: Int
    let totalFavorites: Int
    let lockedNotes: Int
    let attachmentNotes: Int
    let streakDays: Int
    let lastActive: String
    let recentNoteTitle: String
    let recentNoteContent: String
    let recentNoteUpdatedAt: String
}

private extension FiipWidgetSnapshot {
    static let empty = FiipWidgetSnapshot(
        totalNotes: 0,
        totalFavorites: 0,
        lockedNotes: 0,
        attachmentNotes: 0,
        streakDays: 0,
        lastActive: "",
        recentNoteTitle: "Aucune note recente",
        recentNoteContent: "Creez une note dans Fiip pour remplir ce widget.",
        recentNoteUpdatedAt: ""
    )

    static let preview = FiipWidgetSnapshot(
        totalNotes: 42,
        totalFavorites: 8,
        lockedNotes: 12,
        attachmentNotes: 5,
        streakDays: 6,
        lastActive: ISO8601DateFormatter().string(from: Date()),
        recentNoteTitle: "Plan lancement",
        recentNoteContent: "Verifier les quotas, les pieces jointes et les liens publics avant publication.",
        recentNoteUpdatedAt: ISO8601DateFormatter().string(from: Date())
    )
}

struct FiipWidgetEntry: TimelineEntry {
    let date: Date
    let snapshot: FiipWidgetSnapshot
}

struct FiipWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> FiipWidgetEntry {
        FiipWidgetEntry(date: Date(), snapshot: .preview)
    }

    func getSnapshot(in context: Context, completion: @escaping (FiipWidgetEntry) -> Void) {
        completion(FiipWidgetEntry(date: Date(), snapshot: context.isPreview ? .preview : loadSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FiipWidgetEntry>) -> Void) {
        let entry = FiipWidgetEntry(date: Date(), snapshot: loadSnapshot())
        let refreshDate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(refreshDate)))
    }

    private func loadSnapshot() -> FiipWidgetSnapshot {
        guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
            return .empty
        }

        if let json = defaults.string(forKey: "widgetData"),
           let data = json.data(using: .utf8),
           let snapshot = try? JSONDecoder().decode(FiipWidgetSnapshot.self, from: data) {
            return snapshot
        }

        let fallbackTitle = defaults.string(forKey: "recentNoteTitle") ?? FiipWidgetSnapshot.empty.recentNoteTitle
        let fallbackContent = defaults.string(forKey: "recentNoteContent") ?? FiipWidgetSnapshot.empty.recentNoteContent
        return FiipWidgetSnapshot(
            totalNotes: defaults.integer(forKey: "notesCount"),
            totalFavorites: defaults.integer(forKey: "favoritesCount"),
            lockedNotes: defaults.integer(forKey: "lockedNotes"),
            attachmentNotes: defaults.integer(forKey: "attachmentNotes"),
            streakDays: defaults.integer(forKey: "streakDays"),
            lastActive: defaults.string(forKey: "lastActive") ?? "",
            recentNoteTitle: fallbackTitle,
            recentNoteContent: fallbackContent,
            recentNoteUpdatedAt: defaults.string(forKey: "recentNoteUpdatedAt") ?? ""
        )
    }
}

struct FiipWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FiipWidgetEntry

    var body: some View {
        switch family {
        case .systemSmall:
            smallView
        case .systemLarge:
            largeView
        case .accessoryCircular:
            accessoryCircularView
        case .accessoryRectangular:
            accessoryRectangularView
        case .accessoryInline:
            accessoryInlineView
        default:
            mediumView
        }
    }

    private var smallView: some View {
        Link(destination: URL(string: "fiip://newNote")!) {
            LiquidGlassPanel {
                VStack(alignment: .leading, spacing: 10) {
                    HeaderView(totalNotes: entry.snapshot.totalNotes)
                    Spacer(minLength: 0)
                    Text(entry.snapshot.recentNoteTitle)
                        .font(.headline)
                        .lineLimit(2)
                        .foregroundStyle(.primary)
                    Text("\(entry.snapshot.totalFavorites) favoris")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    MetricStrip(snapshot: entry.snapshot)
                }
            }
        }
        .widgetURL(URL(string: "fiip://newNote"))
    }

    private var mediumView: some View {
        LiquidGlassPanel {
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 10) {
                    HeaderView(totalNotes: entry.snapshot.totalNotes)
                    RecentNoteView(snapshot: entry.snapshot, lineLimit: 3)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 10) {
                    MetricPill(title: "Favoris", value: "\(entry.snapshot.totalFavorites)", systemImage: "star.fill")
                    MetricPill(title: "Protegees", value: "\(entry.snapshot.lockedNotes)", systemImage: "lock.fill")
                    MetricPill(title: "Fichiers", value: "\(entry.snapshot.attachmentNotes)", systemImage: "paperclip")
                    Spacer(minLength: 0)
                    Link(destination: URL(string: "fiip://newNote")!) {
                        Label("Nouvelle", systemImage: "plus.circle.fill")
                            .font(.caption.weight(.semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .frame(width: 104)
            }
        }
        .widgetURL(URL(string: "fiip://search"))
    }

    private var largeView: some View {
        LiquidGlassPanel {
            VStack(alignment: .leading, spacing: 14) {
                HeaderView(totalNotes: entry.snapshot.totalNotes)

                RecentNoteView(snapshot: entry.snapshot, lineLimit: 5)
                    .padding(12)
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

                HStack(spacing: 10) {
                    MetricCard(title: "Notes", value: "\(entry.snapshot.totalNotes)", systemImage: "note.text")
                    MetricCard(title: "Favoris", value: "\(entry.snapshot.totalFavorites)", systemImage: "star.fill")
                }

                HStack(spacing: 10) {
                    MetricCard(title: "Privees", value: "\(entry.snapshot.lockedNotes)", systemImage: "lock.fill")
                    MetricCard(title: "Fichiers", value: "\(entry.snapshot.attachmentNotes)", systemImage: "paperclip")
                }

                Spacer(minLength: 0)

                HStack(spacing: 10) {
                    Link(destination: URL(string: "fiip://newNote")!) {
                        Label("Nouvelle note", systemImage: "plus.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    Link(destination: URL(string: "fiip://search")!) {
                        Label("Chercher", systemImage: "magnifyingglass")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .font(.caption.weight(.semibold))
            }
        }
        .widgetURL(URL(string: "fiip://search"))
    }

    private var accessoryCircularView: some View {
        Gauge(value: Double(entry.snapshot.totalFavorites), in: 0...Double(max(entry.snapshot.totalNotes, 1))) {
            Image(systemName: "note.text")
        } currentValueLabel: {
            Text("\(entry.snapshot.totalNotes)")
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .widgetURL(URL(string: "fiip://newNote"))
    }

    private var accessoryRectangularView: some View {
        VStack(alignment: .leading, spacing: 2) {
            Label("Fiip", systemImage: "note.text")
                .font(.caption.weight(.semibold))
            Text(entry.snapshot.recentNoteTitle)
                .font(.caption2)
                .lineLimit(1)
            Text("\(entry.snapshot.totalNotes) notes · \(entry.snapshot.totalFavorites) favoris")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .widgetURL(URL(string: "fiip://search"))
    }

    private var accessoryInlineView: some View {
        Text("Fiip · \(entry.snapshot.totalNotes) notes · \(entry.snapshot.totalFavorites) favoris")
            .widgetURL(URL(string: "fiip://search"))
    }
}

private struct LiquidGlassPanel<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(.white.opacity(0.35), lineWidth: 1)
            )
    }
}

private struct HeaderView: View {
    let totalNotes: Int

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "note.text")
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.blue)
            Text("Fiip")
                .font(.headline.weight(.bold))
            Spacer(minLength: 0)
            Text("\(totalNotes)")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 7)
                .padding(.vertical, 4)
                .background(.regularMaterial, in: Capsule())
        }
    }
}

private struct RecentNoteView: View {
    let snapshot: FiipWidgetSnapshot
    let lineLimit: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(snapshot.recentNoteTitle)
                .font(.headline)
                .lineLimit(1)
            Text(snapshot.recentNoteContent)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(lineLimit)
            if snapshot.streakDays > 0 {
                Label("\(snapshot.streakDays) jours actifs", systemImage: "flame.fill")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.orange)
            }
        }
    }
}

private struct MetricStrip: View {
    let snapshot: FiipWidgetSnapshot

    var body: some View {
        HStack(spacing: 8) {
            Label("\(snapshot.totalFavorites)", systemImage: "star.fill")
            Label("\(snapshot.lockedNotes)", systemImage: "lock.fill")
        }
        .font(.caption2.weight(.semibold))
        .foregroundStyle(.secondary)
    }
}

private struct MetricPill: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: systemImage)
                .frame(width: 14)
                .foregroundStyle(.blue)
            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.caption.weight(.bold))
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct MetricCard: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.headline)
                .foregroundStyle(.blue)
                .frame(width: 28, height: 28)
                .background(.regularMaterial, in: Circle())

            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.headline.weight(.bold))
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct FiipWidget: Widget {
    let kind = "FiipWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FiipWidgetProvider()) { entry in
            if #available(iOS 17.0, *) {
                FiipWidgetEntryView(entry: entry)
                    .containerBackground(.ultraThinMaterial, for: .widget)
            } else {
                FiipWidgetEntryView(entry: entry)
                    .background(Color(.systemBackground))
            }
        }
        .configurationDisplayName("Fiip")
        .description("Derniere note, statistiques, raccourcis et variantes ecran verrouille.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
        ])
    }
}

#Preview("Large", as: .systemLarge) {
    FiipWidget()
} timeline: {
    FiipWidgetEntry(date: .now, snapshot: .preview)
}

#Preview("Rectangular", as: .accessoryRectangular) {
    FiipWidget()
} timeline: {
    FiipWidgetEntry(date: .now, snapshot: .preview)
}
