package org.setu.app.plugins

import android.Manifest
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import android.util.Base64
import java.io.ByteArrayInputStream

@CapacitorPlugin(
    name = "NearbySyncPlugin",
    permissions = [
        Permission(strings = [Manifest.permission.ACCESS_FINE_LOCATION], alias = "location"),
        Permission(strings = [Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN], alias = "bluetooth")
    ]
)
class NearbySyncPlugin : Plugin() {

    private val SERVICE_ID = "org.setu.app"
    private var isRunning = false
    private val connectedEndpoints = mutableSetOf<String>()

    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            // Auto-accept connection — bundles are cryptographically signed
            Nearby.getConnectionsClient(context).acceptConnection(endpointId, payloadCallback)
            val data = JSObject()
            data.put("id", endpointId)
            data.put("name", info.endpointName)
            notifyListeners("connected", data)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            if (result.status.isSuccess) {
                connectedEndpoints.add(endpointId)
            } else {
                connectedEndpoints.remove(endpointId)
                val data = JSObject()
                data.put("id", endpointId)
                notifyListeners("disconnected", data)
            }
        }

        override fun onDisconnected(endpointId: String) {
            connectedEndpoints.remove(endpointId)
            val data = JSObject()
            data.put("id", endpointId)
            notifyListeners("disconnected", data)
        }
    }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type == Payload.Type.BYTES) {
                val bytes = payload.asBytes()
                if (bytes != null) {
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    val data = JSObject()
                    data.put("base64", base64)
                    notifyListeners("bundleReceived", data)
                }
            } else if (payload.type == Payload.Type.STREAM) {
                try {
                    val inputStream = payload.asStream()?.asInputStream()
                    inputStream?.let { stream ->
                        val bytes = stream.readBytes()
                        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        val data = JSObject()
                        data.put("base64", base64)
                        notifyListeners("bundleReceived", data)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            if (update.totalBytes > 0) {
                val pct = ((update.bytesTransferred.toDouble() / update.totalBytes.toDouble()) * 100).toInt()
                val data = JSObject()
                data.put("id", endpointId)
                data.put("pct", pct)
                notifyListeners("transferProgress", data)
            }
        }
    }

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            val data = JSObject()
            data.put("id", endpointId)
            data.put("name", info.endpointName)
            notifyListeners("peerFound", data)

            // Auto connect to discovered peers
            Nearby.getConnectionsClient(context).requestConnection(
                info.endpointName,
                endpointId,
                connectionLifecycleCallback
            )
        }

        override fun onEndpointLost(endpointId: String) {
            val data = JSObject()
            data.put("id", endpointId)
            notifyListeners("peerLost", data)
        }
    }

    @PluginMethod
    fun start(call: PluginCall) {
        if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS) {
            call.reject("Nearby Sync unavailable: Google Play services missing or outdated", "UNAVAILABLE")
            return
        }
        if (getPermissionState("location") != PermissionState.GRANTED ||
            getPermissionState("bluetooth") != PermissionState.GRANTED
        ) {
            requestPermissionForAliases(arrayOf("location", "bluetooth"), call, "startPermissionCallback")
            return
        }
        startAdvertisingAndDiscovery(call)
    }

    @PermissionCallback
    private fun startPermissionCallback(call: PluginCall) {
        if (getPermissionState("location") == PermissionState.GRANTED &&
            getPermissionState("bluetooth") == PermissionState.GRANTED
        ) {
            startAdvertisingAndDiscovery(call)
        } else {
            call.reject("Nearby Sync permissions denied", "PERMISSION_DENIED")
        }
    }

    private fun startAdvertisingAndDiscovery(call: PluginCall) {
        val endpointName = call.getString("endpointName", "Setu User") ?: "Setu User"
        val client = Nearby.getConnectionsClient(context)

        val advertisingOptions = AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        val discoveryOptions = DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()

        client.startAdvertising(endpointName, SERVICE_ID, connectionLifecycleCallback, advertisingOptions)
            .addOnSuccessListener {
                client.startDiscovery(SERVICE_ID, endpointDiscoveryCallback, discoveryOptions)
                    .addOnSuccessListener {
                        isRunning = true
                        call.resolve()
                    }
                    .addOnFailureListener { e ->
                        call.reject("Failed to start discovery: ${e.message}")
                    }
            }
            .addOnFailureListener { e ->
                call.reject("Failed to start advertising: ${e.message}")
            }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        try {
            val client = Nearby.getConnectionsClient(context)
            client.stopAdvertising()
            client.stopDiscovery()
            client.stopAllEndpoints()
            connectedEndpoints.clear()
            isRunning = false
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to stop Nearby Sync: ${e.message}")
        }
    }

    @PluginMethod
    fun sendBundle(call: PluginCall) {
        val base64 = call.getString("base64")
        if (base64 == null) {
            call.reject("Missing base64 payload")
            return
        }

        try {
            val bytes = Base64.decode(base64, Base64.NO_WRAP)
            // Bundles can reach MAX_COMPRESSED_BUNDLE_BYTES (2 MiB), well above the
            // ~32 KB bytes-payload limit, so this must go as a stream payload — a
            // fresh stream per endpoint since Payload.fromStream is single-use.
            for (endpointId in connectedEndpoints) {
                val payload = Payload.fromStream(ByteArrayInputStream(bytes))
                Nearby.getConnectionsClient(context).sendPayload(endpointId, payload)
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to send bundle: ${e.message}")
        }
    }
}
