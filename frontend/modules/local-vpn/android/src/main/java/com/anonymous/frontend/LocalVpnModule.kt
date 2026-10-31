
package com.anonymous.frontend

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.Serializable
import kotlinx.coroutines.delay

class LocalVpnModule : Module() {
    private lateinit var vpnPermissionLauncher:
        AppContextActivityResultLauncher<VpnPermissionRequest, Boolean>

    override fun definition() = ModuleDefinition {
        Name("LocalVpn")
        val startVpn: suspend () -> Boolean = startVpn@{
            val context =
                appContext.reactContext
                    ?: throw IllegalStateException("React context is unavailable.")

            if (VpnService.prepare(context) != null) {
                val permissionGranted =
                    vpnPermissionLauncher.launch(VpnPermissionRequest)
                if (!permissionGranted) {
                    return@startVpn false
                }
            }

            val intent = LocalVpnService.createIntent(context)
            context.getSharedPreferences(
                LocalVpnService.PREFERENCES_NAME,
                Context.MODE_PRIVATE
            ).edit().putBoolean(LocalVpnService.RUNNING_KEY, false).apply()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }

            repeat(50) {
                if (LocalVpnService.isRunning(context)) {
                    return@startVpn true
                }
                delay(100)
            }

            throw IllegalStateException("The local VPN service could not be started.")
        }

        RegisterActivityContracts {
            vpnPermissionLauncher =
                registerForActivityResult(VpnPermissionContract)
        }

        Function("isVpnRunning") {
            val context =
                appContext.reactContext
                    ?: throw IllegalStateException("React context is unavailable.")
            LocalVpnService.isRunning(context)
        }

        AsyncFunction("startVpn") Coroutine(startVpn)

        Function("stopVpn") {
            val context =
                appContext.reactContext
                    ?: throw IllegalStateException("React context is unavailable.")
            context.stopService(LocalVpnService.createIntent(context))
        }
    }
}

private object VpnPermissionContract :
    AppContextActivityResultContract<VpnPermissionRequest, Boolean> {
    override fun createIntent(context: Context, input: VpnPermissionRequest): Intent =
        VpnService.prepare(context)
            ?: throw IllegalStateException("VPN permission is already granted.")

    override fun parseResult(
        input: VpnPermissionRequest,
        resultCode: Int,
        intent: Intent?
    ): Boolean = resultCode == Activity.RESULT_OK
}

private object VpnPermissionRequest : Serializable
