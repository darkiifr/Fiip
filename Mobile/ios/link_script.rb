require 'xcodeproj'

project_path = './FiipMobile.xcodeproj'
project = Xcodeproj::Project.open(project_path)

app_target = project.targets.find { |t| t.name == 'FiipMobile' }
widget_target = project.targets.find { |t| t.name == 'FiipWidgetExtension' }

# Get or create groups
app_group = project.main_group.find_subpath('FiipMobile', true)
widget_group = project.main_group.find_subpath('FiipWidget', true)

# Define files
attr_path = "FiipWidget/NoteActivityAttributes.swift"
live_act_path = "FiipWidget/FiipWidgetLiveActivity.swift"
bundle_path = "FiipWidget/FiipWidgetBundle.swift"
mod_swift_path = "FiipMobile/LiveActivityModule.swift"
mod_m_path = "FiipMobile/LiveActivityModule.m"
header_path = "FiipMobile/FiipMobile-Bridging-Header.h"

# Create file references
def add_file_if_missing(group, path)
  file_ref = group.files.find { |f| f.path == File.basename(path) }
  unless file_ref
    file_ref = group.new_file(path)
  end
  file_ref
end

attr_ref = add_file_if_missing(widget_group, attr_path)
live_act_ref = add_file_if_missing(widget_group, live_act_path)
bundle_ref = add_file_if_missing(widget_group, bundle_path)
mod_swift_ref = add_file_if_missing(app_group, mod_swift_path)
mod_m_ref = add_file_if_missing(app_group, mod_m_path)
header_ref = add_file_if_missing(app_group, header_path)

# Function to add to target
def add_to_target(target, file_ref)
  unless target.source_build_phase.files_references.include?(file_ref)
    target.source_build_phase.add_file_reference(file_ref)
    puts "Added #{file_ref.path} to #{target.name}"
  end
end

add_to_target(widget_target, attr_ref)
add_to_target(widget_target, live_act_ref)
add_to_target(widget_target, bundle_ref)

add_to_target(app_target, attr_ref) # Must be in app target too
add_to_target(app_target, mod_swift_ref)
add_to_target(app_target, mod_m_ref)

# Add bridging header settings
app_target.build_configurations.each do |config|
  config.build_settings['SWIFT_OBJC_BRIDGING_HEADER'] = 'FiipMobile/FiipMobile-Bridging-Header.h'
end

project.save
puts "Linking successful"
