require 'xcodeproj'
require 'cfpropertylist'

plist_path = 'FiipMobile/Info.plist'
plist = CFPropertyList::List.new(:file => plist_path)
data = CFPropertyList.native_types(plist.value)

unless data.key?('CFBundleURLTypes')
  data['CFBundleURLTypes'] = []
end

has_fiip = data['CFBundleURLTypes'].any? do |t|
  t['CFBundleURLSchemes'] && t['CFBundleURLSchemes'].include?('fiip')
end

unless has_fiip
  data['CFBundleURLTypes'] << {
    'CFBundleURLSchemes' => ['fiip'],
    'CFBundleURLName' => 'com.fiip.widget'
  }
  
  plist.value = CFPropertyList.guess(data)
  plist.save(plist_path, CFPropertyList::List::FORMAT_XML)
  puts "Added URL Scheme 'fiip' to Info.plist"
else
  puts "URL Scheme 'fiip' already exists"
end
