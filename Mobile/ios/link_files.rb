require 'xcodeproj'
project_path = './FiipMobile.xcodeproj'
project = Xcodeproj::Project.open(project_path)

puts "Targets: #{project.targets.map(&:name).join(', ')}"
