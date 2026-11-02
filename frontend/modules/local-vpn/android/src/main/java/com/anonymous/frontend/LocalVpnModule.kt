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

        RegisterActivityContracts {
            vpnPermissionLauncher =
                registerForActivityResult(VpnPermissionContract)
        }

        Function("isVpnRunning") {
            LocalVpnService.isRunning(requireContext())
        }

        // Recibe desde JS la lista de dominios bloqueados. Si llega vacía, el
        // servicio usa la lista de respaldo incluida en la app.
        AsyncFunction("startVpn") Coroutine { domains: List<String> ->
            startVpn(domains)
        }

        Function("stopVpn") {
            val context = requireContext()
            context.stopService(LocalVpnService.createIntent(context))
        }
    }

    private fun requireContext(): Context =
        appContext.reactContext
            ?: throw IllegalStateException("React context is unavailable.")

    private suspend fun startVpn(domains: List<String>): Boolean {
        val context = requireContext()

        if (VpnService.prepare(context) != null) {
            val permissionGranted =
                vpnPermissionLauncher.launch(VpnPermissionRequest)
            if (!permissionGranted) {
                return false
            }
        }

        // La lista queda en SharedPreferences para que el servicio la recupere
        // también cuando Android lo reinicia sin Intent (START_STICKY).
        LocalVpnService.saveBlockedDomains(context, domains)
        context.getSharedPreferences(
            LocalVpnService.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        ).edit().putBoolean(LocalVpnService.RUNNING_KEY, false).apply()

        val intent = LocalVpnService.createIntent(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }

        repeat(50) {
            if (LocalVpnService.isRunning(context)) {
                return true
            }
            delay(100)
        }

        throw IllegalStateException("The local VPN service could not be started.")
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
