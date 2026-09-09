package com.mitigateplus.app

import android.app.Application
import android.content.res.Configuration
import android.util.Log

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      ReactNativeHostWrapper(
          this,
          object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                  // Packages that cannot be autolinked yet can be added manually here, for example:
                  // add(MyReactNativePackage())
                }

              override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

              override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

              override val isNewArchEnabled: Boolean = false
          }
      )

  override val reactHost: ReactHost? = null

  override fun onCreate() {
    super.onCreate()
    try {
      loadReactNative(this)
    } catch (e: Throwable) {
      Log.w("MitigatePlus", "loadReactNative notice: ${e.message}")
    }
    try {
      ApplicationLifecycleDispatcher.onApplicationCreate(this)
    } catch (e: Throwable) {
      Log.w("MitigatePlus", "ApplicationLifecycleDispatcher notice: ${e.message}")
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    try {
      ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    } catch (e: Throwable) {
      Log.w("MitigatePlus", "onConfigurationChanged notice: ${e.message}")
    }
  }
}
