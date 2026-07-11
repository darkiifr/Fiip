#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FiipOcrModule, NSObject)
RCT_EXTERN_METHOD(scanImageToText:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
