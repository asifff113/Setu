package org.setu.app.plugins

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pManager
import android.os.Build
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.setu.app.services.HubService

@CapacitorPlugin(
    name = "HubModePlugin",
    permissions = [Permission(strings = [Manifest.permission.ACCESS_FINE_LOCATION], alias = "location")]
)
class HubModePlugin : Plugin() {

    private var wifiP2pManager: WifiP2pManager? = null
    private var wifiP2pChannel: WifiP2pManager.Channel? = null
    private var nsdManager: NsdManager? = null
    private var registrationListener: NsdManager.RegistrationListener? = null
    private var lohsReservation: WifiManager.LocalOnlyHotspotReservation? = null
    private var currentBundleBase64: String = ""

    override fun load() {
        super.load()
        wifiP2pManager = context.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
        wifiP2pChannel = wifiP2pManager?.initialize(context, context.mainLooper, null)

        HubService.onBundleReceivedListener = { bytes ->
            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            val data = JSObject()
            data.put("base64", base64)
            notifyListeners("hubBundleReceived", data)
        }

        HubService.currentBundleProvider = {
            if (currentBundleBase64.isNotEmpty()) {
                Base64.decode(currentBundleBase64, Base64.NO_WRAP)
            } else {
                ByteArray(0)
            }
        }
    }

    @PluginMethod
    fun startHub(call: PluginCall) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "startHubPermissionCallback")
            return
        }
        startHubInternal(call)
    }

    @PermissionCallback
    private fun startHubPermissionCallback(call: PluginCall) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            startHubInternal(call)
        } else {
            call.reject("Location permission is required to start Hub mode", "PERMISSION_DENIED")
        }
    }

    private fun startHubInternal(call: PluginCall) {
        val intent = Intent(context, HubService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }

        val listener = object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                registerNsdService()
                // Read back the group's REAL credentials — createGroup(), even
                // with a WifiP2pConfig.Builder, doesn't return them directly.
                wifiP2pManager?.requestGroupInfo(wifiP2pChannel) { group ->
                    if (group != null) {
                        val ret = JSObject()
                        ret.put("mode", "wifi_direct")
                        ret.put("ssid", group.networkName)
                        ret.put("passphrase", group.passphrase)
                        ret.put("url", "http://192.168.49.1:8080")
                        call.resolve(ret)
                    } else {
                        startLocalOnlyHotspotFallback(call, "Wi-Fi Direct group created but returned no info")
                    }
                }
            }

            override fun onFailure(reason: Int) {
                startLocalOnlyHotspotFallback(call, "Wi-Fi Direct group creation failed (code $reason)")
            }
        }

        val manager = wifiP2pManager
        val channel = wifiP2pChannel
        if (manager == null || channel == null) {
            startLocalOnlyHotspotFallback(call, "Wi-Fi Direct unavailable on this device")
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val config = WifiP2pConfig.Builder()
                .setNetworkName("DIRECT-SETU-${(1000..9999).random()}")
                .setPassphrase(randomPassphrase())
                .build()
            manager.createGroup(channel, config, listener)
        } else {
            manager.createGroup(channel, listener)
        }
    }

    // Fallback per NATIVE_ANDROID_SPECS.md N9: when Wi-Fi Direct is unavailable
    // or wedged, stand up a LocalOnlyHotspot instead. Credentials here are
    // always system-generated — apps cannot set custom SSID/passphrase for LOHS.
    private fun startLocalOnlyHotspotFallback(call: PluginCall, warning: String) {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        if (wifiManager == null) {
            call.reject("$warning; WifiManager unavailable for hotspot fallback", "HUB_START_FAILED")
            return
        }

        try {
            wifiManager.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
                override fun onStarted(reservation: WifiManager.LocalOnlyHotspotReservation) {
                    lohsReservation = reservation
                    val config = reservation.wifiConfiguration
                    val ret = JSObject()
                    ret.put("mode", "local_only_hotspot")
                    ret.put("ssid", config?.SSID ?: "")
                    ret.put("passphrase", config?.preSharedKey ?: "")
                    ret.put("url", "http://192.168.49.1:8080")
                    ret.put("warning", "$warning; using Local Hotspot fallback")
                    call.resolve(ret)
                }

                override fun onFailed(reason: Int) {
                    call.reject("$warning; Local Hotspot fallback also failed (code $reason)", "HUB_START_FAILED")
                }

                override fun onStopped() {
                    lohsReservation = null
                }
            }, null)
        } catch (e: Exception) {
            call.reject("$warning; Local Hotspot fallback threw: ${e.message}", "HUB_START_FAILED")
        }
    }

    private fun randomPassphrase(): String {
        val chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return (1..10).map { chars.random() }.joinToString("")
    }

    @PluginMethod
    fun stopHub(call: PluginCall) {
        val intent = Intent(context, HubService::class.java)
        context.stopService(intent)

        wifiP2pManager?.removeGroup(wifiP2pChannel, null)
        lohsReservation?.close()
        lohsReservation = null
        unregisterNsdService()
        call.resolve()
    }

    @PluginMethod
    fun updateHubBundle(call: PluginCall) {
        val base64 = call.getString("base64", "") ?: ""
        currentBundleBase64 = base64
        call.resolve()
    }

    private fun registerNsdService() {
        nsdManager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager
        val serviceInfo = NsdServiceInfo().apply {
            serviceName = "SetuHub"
            serviceType = "_setu._tcp"
            port = 8080
        }

        registrationListener = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(NsdServiceInfo: NsdServiceInfo) {}
            override fun onRegistrationFailed(arg0: NsdServiceInfo, arg1: Int) {}
            override fun onServiceUnregistered(arg0: NsdServiceInfo) {}
            override fun onUnregistrationFailed(arg0: NsdServiceInfo, arg1: Int) {}
        }

        try {
            nsdManager?.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun unregisterNsdService() {
        registrationListener?.let { listener ->
            try {
                nsdManager?.unregisterService(listener)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        registrationListener = null
    }
}
