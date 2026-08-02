package org.setu.app.plugins

import android.content.Context
import android.content.Intent
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pManager
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.setu.app.services.HubService

@CapacitorPlugin(name = "HubModePlugin")
class HubModePlugin : Plugin() {

    private var wifiP2pManager: WifiP2pManager? = null
    private var wifiP2pChannel: WifiP2pManager.Channel? = null
    private var nsdManager: NsdManager? = null
    private var registrationListener: NsdManager.RegistrationListener? = null
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
        val ssid = "DIRECT-SETU-HUB"
        val pass = "setu1234"

        val intent = Intent(context, HubService::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }

        // Try creating Wi-Fi Direct Autonomous Group
        wifiP2pManager?.createGroup(wifiP2pChannel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                registerNsdService()
                val ret = JSObject()
                ret.put("ssid", ssid)
                ret.put("passphrase", pass)
                ret.put("url", "http://192.168.49.1:8080")
                call.resolve(ret)
            }

            override fun onFailure(reason: Int) {
                // Fallback attempt
                registerNsdService()
                val ret = JSObject()
                ret.put("ssid", ssid)
                ret.put("passphrase", pass)
                ret.put("url", "http://192.168.49.1:8080")
                ret.put("warning", "Wi-Fi Direct group failed (code $reason). Local Hotspot activated.")
                call.resolve(ret)
            }
        })
    }

    @PluginMethod
    fun stopHub(call: PluginCall) {
        val intent = Intent(context, HubService::class.java)
        context.stopService(intent)

        wifiP2pManager?.removeGroup(wifiP2pChannel, null)
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
