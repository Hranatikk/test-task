package com.statementimport.files

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class StatementFilePackage : TurboReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == StatementFileModule.NAME) StatementFileModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
      StatementFileModule.NAME to ReactModuleInfo(
        StatementFileModule.NAME,
        StatementFileModule.NAME,
        false,
        false,
        false,
        true,
      ),
    )
  }
}
