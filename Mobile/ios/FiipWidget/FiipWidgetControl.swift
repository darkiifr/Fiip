//
//  FiipWidgetControl.swift
//  FiipWidget
//
//  Created by Vincent Sivilotto on 12/04/2026.
//

import AppIntents
import SwiftUI
import WidgetKit

@available(iOS 18.0, *)
struct FiipWidgetControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "com.fiipmobile.FiipWidgetControl",
            provider: Provider()
        ) { value in
            ControlWidgetToggle(
                "Mode focus",
                isOn: value,
                action: StartTimerIntent()
            ) { isRunning in
                Label(isRunning ? "Actif" : "Inactif", systemImage: "pencil.and.scribble")
            }
        }
        .displayName("Fiip")
        .description("Active un raccourci de concentration Fiip.")
    }
}

@available(iOS 18.0, *)
extension FiipWidgetControl {
    struct Provider: ControlValueProvider {
        var previewValue: Bool {
            false
        }

        func currentValue() async throws -> Bool {
            let isRunning = true // Check if the timer is running
            return isRunning
        }
    }
}

@available(iOS 18.0, *)
struct StartTimerIntent: SetValueIntent {
    static let title: LocalizedStringResource = "Activer Fiip"

    @Parameter(title: "Mode focus actif")
    var value: Bool

    func perform() async throws -> some IntentResult {
        // Start / stop the timer based on `value`.
        return .result()
    }
}
