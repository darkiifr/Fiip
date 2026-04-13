//
//  FiipWidgetBundle.swift
//  FiipWidget
//

import WidgetKit
import SwiftUI

@main
struct FiipWidgetBundle: WidgetBundle {
    var body: some Widget {
        FiipWidget()
        FiipWidgetLiveActivity()
    }
}
