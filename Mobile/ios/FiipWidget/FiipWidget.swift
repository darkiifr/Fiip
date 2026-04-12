import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), recentNoteTitle: "Ma note super secrète", recentNoteContent: "Voici un petit résumé des trucs cool...", notesCount: 42)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = getEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = getEntry()
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
    
    private func getEntry() -> SimpleEntry {
        let userDefaults = UserDefaults(suiteName: "group.com.fiip.widget")
        let title = userDefaults?.string(forKey: "recentNoteTitle") ?? "Aucune note récente"
        let content = userDefaults?.string(forKey: "recentNoteContent") ?? "Créez une nouvelle note dans Fiip."
        let count = userDefaults?.integer(forKey: "notesCount") ?? 0
        
        return SimpleEntry(date: Date(), recentNoteTitle: title, recentNoteContent: content, notesCount: count)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let recentNoteTitle: String
    let recentNoteContent: String
    let notesCount: Int
}

struct FiipWidgetEntryView : View {
    var entry: Provider.Entry
    // The App's URL scheme so we can open it
    let newNoteUrl = URL(string: "fiip://newNote")!
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "note.text")
                    .foregroundColor(.blue)
                Text("Fiip (\(entry.notesCount))")
                    .font(.headline)
                    .fontWeight(.bold)
                Spacer()
            }
            
            // Recent note preview
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.recentNoteTitle)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(1)
                
                Text(entry.recentNoteContent)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.blue.opacity(0.1))
            .cornerRadius(12)
            
            Spacer()
            
            // "New Note" Button as a Link (Widget URLs)
            Link(destination: newNoteUrl) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Nouvelle note")
                        .font(.caption)
                        .fontWeight(.bold)
                }
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(16)
            }
        }
        .padding()
    }
}

struct FiipWidget: Widget {
    let kind: String = "FiipWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                FiipWidgetEntryView(entry: entry)
                    .containerBackground(Color(UIColor.systemBackground).opacity(0.8), for: .widget)
            } else {
                FiipWidgetEntryView(entry: entry)
                    .padding()
            }
        }
        .configurationDisplayName("Statistiques Fiip")
        .description("Affiche vos dernières notes et un raccourci de création.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
