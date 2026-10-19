#import "StatementFile.h"

static const NSUInteger kHeadBytes = 32;
static const NSUInteger kCopyBufferBytes = 64 * 1024;

@implementation StatementFile

RCT_EXPORT_MODULE(StatementFile)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSString *)importsDirectoryPath {
  NSArray<NSString *> *paths =
      NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES);
  NSString *dir = [paths.firstObject stringByAppendingPathComponent:@"imports"];
  NSFileManager *fm = [NSFileManager defaultManager];
  if (![fm fileExistsAtPath:dir]) {
    [fm createDirectoryAtPath:dir withIntermediateDirectories:YES attributes:nil error:nil];
  }
  NSURL *dirUrl = [NSURL fileURLWithPath:dir];
  NSError *excludeError = nil;
  [dirUrl setResourceValue:@YES forKey:NSURLIsExcludedFromBackupKey error:&excludeError];
  return dir;
}

- (void)stage:(NSString *)sourceUri
         opId:(NSString *)opId
     maxBytes:(double)maxBytes
      resolve:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject {
  NSURL *url = [NSURL URLWithString:sourceUri];
  if (url == nil) {
    reject(@"E_UNREADABLE", @"invalid source uri", nil);
    return;
  }

  BOOL isSecurityScoped = [url startAccessingSecurityScopedResource];
  void (^stopAccess)(void) = ^{
    if (isSecurityScoped) {
      [url stopAccessingSecurityScopedResource];
    }
  };

  __block BOOL coordinationFailed = NO;
  NSFileCoordinator *coordinator = [[NSFileCoordinator alloc] initWithFilePresenter:nil];
  NSError *coordinationError = nil;

  [coordinator coordinateReadingItemAtURL:url
                                   options:NSFileCoordinatorReadingWithoutChanges
                                     error:&coordinationError
                                byAccessor:^(NSURL *readUrl) {
    NSNumber *declaredSize = nil;
    NSError *sizeError = nil;
    [readUrl getResourceValue:&declaredSize forKey:NSURLFileSizeKey error:&sizeError];
    if (declaredSize != nil && [declaredSize doubleValue] > maxBytes) {
      stopAccess();
      reject(@"E_TOO_LARGE", @"declared size exceeds limit", nil);
      return;
    }

    NSError *openError = nil;
    NSFileHandle *input = [NSFileHandle fileHandleForReadingFromURL:readUrl error:&openError];
    if (input == nil) {
      stopAccess();
      reject(@"E_UNREADABLE", @"could not open input stream", nil);
      return;
    }

    NSString *importsDir = [self importsDirectoryPath];
    NSString *partPath = [importsDir stringByAppendingPathComponent:[opId stringByAppendingString:@".bin.part"]];
    NSString *finalPath = [importsDir stringByAppendingPathComponent:[opId stringByAppendingString:@".bin"]];
    NSFileManager *fm = [NSFileManager defaultManager];
    [fm createFileAtPath:partPath contents:nil attributes:nil];
    NSFileHandle *output = [NSFileHandle fileHandleForWritingAtPath:partPath];
    if (output == nil) {
      [input closeFile];
      stopAccess();
      reject(@"E_IO", @"could not create staging file", nil);
      return;
    }

    unsigned long long total = 0;
    NSMutableData *head = [NSMutableData dataWithCapacity:kHeadBytes];
    BOOL tooLarge = NO;

    while (YES) {
      NSData *chunk = [input readDataOfLength:kCopyBufferBytes];
      if (chunk.length == 0) {
        break;
      }
      total += chunk.length;
      if ((double)total > maxBytes) {
        tooLarge = YES;
        break;
      }
      if (head.length < kHeadBytes) {
        NSUInteger take = MIN(kHeadBytes - head.length, chunk.length);
        [head appendData:[chunk subdataWithRange:NSMakeRange(0, take)]];
      }
      [output writeData:chunk];
    }

    [input closeFile];
    [output closeFile];
    stopAccess();

    if (tooLarge) {
      [fm removeItemAtPath:partPath error:nil];
      reject(@"E_TOO_LARGE", @"stream exceeded limit", nil);
      return;
    }
    if (total == 0) {
      [fm removeItemAtPath:partPath error:nil];
      reject(@"E_EMPTY", @"file is empty", nil);
      return;
    }

    [fm removeItemAtPath:finalPath error:nil];
    NSError *moveError = nil;
    [fm moveItemAtPath:partPath toPath:finalPath error:&moveError];
    if (moveError != nil) {
      reject(@"E_IO", @"could not finalize staged file", nil);
      return;
    }

    NSMutableArray<NSNumber *> *headArray = [NSMutableArray arrayWithCapacity:head.length];
    const uint8_t *bytes = (const uint8_t *)head.bytes;
    for (NSUInteger i = 0; i < head.length; i++) {
      [headArray addObject:@(bytes[i])];
    }

    resolve(@{@"path" : finalPath, @"size" : @(total), @"head" : headArray});
  }];

  if (coordinationError != nil && !coordinationFailed) {
    stopAccess();
    reject(@"E_IO", @"file coordination failed", nil);
  }
}

- (void)upload:(NSString *)url
          path:(NSString *)path
       headers:(NSDictionary *)headers
     timeoutMs:(double)timeoutMs
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject {
  NSURL *endpoint = [NSURL URLWithString:url];
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:endpoint];
  request.HTTPMethod = @"POST";
  request.timeoutInterval = timeoutMs / 1000.0;
  for (NSString *key in headers) {
    id value = headers[key];
    [request setValue:[value description] forHTTPHeaderField:key];
  }

  // Ephemeral: no on-disk cache or cookie jar, and no automatic retry across a
  // dropped connection — a real lost_ack must stay lost.
  NSURLSessionConfiguration *config = [NSURLSessionConfiguration ephemeralSessionConfiguration];
  config.timeoutIntervalForRequest = timeoutMs / 1000.0;
  NSURLSession *session = [NSURLSession sessionWithConfiguration:config];
  NSURL *fileUrl = [NSURL fileURLWithPath:path];

  NSURLSessionUploadTask *task = [session
      uploadTaskWithRequest:request
                   fromFile:fileUrl
          completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
            if (error != nil) {
              if (error.code == NSURLErrorTimedOut) {
                reject(@"E_TIMEOUT", @"upload timed out", nil);
              } else {
                reject(@"E_NETWORK", @"upload failed", nil);
              }
              return;
            }
            NSHTTPURLResponse *http = (NSHTTPURLResponse *)response;
            NSString *body = data != nil ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : @"";
            resolve(@{@"status" : @(http.statusCode), @"body" : body ?: @""});
          }];
  [task resume];
}

- (void)remove:(NSString *)path resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [[NSFileManager defaultManager] removeItemAtPath:path error:nil];
  resolve(nil);
}

- (void)sweep:(NSArray *)keepPaths resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  NSString *dir = [self importsDirectoryPath];
  NSFileManager *fm = [NSFileManager defaultManager];
  NSArray<NSString *> *entries = [fm contentsOfDirectoryAtPath:dir error:nil];
  NSSet<NSString *> *keep = [NSSet setWithArray:keepPaths];
  NSInteger removed = 0;
  for (NSString *name in entries) {
    NSString *full = [dir stringByAppendingPathComponent:name];
    if (![keep containsObject:full]) {
      if ([fm removeItemAtPath:full error:nil]) {
        removed += 1;
      }
    }
  }
  resolve(@(removed));
}

- (NSString *)randomKey {
  return [[NSUUID UUID] UUIDString];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeStatementFileSpecJSI>(params);
}

@end
