package org.setu.app.plugins

import android.bluetooth.*
import android.content.Context
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.*

@CapacitorPlugin(name = "LoRaBridgePlugin")
class LoRaBridgePlugin : Plugin() {

    private var bluetoothGatt: BluetoothGatt? = null
    private val MESHTASTIC_SERVICE_UUID = UUID.fromString("6ba1b218-15a8-461f-9a85-b76e7d65d5a7")
    private val MESHTASTIC_FROMRADIO_UUID = UUID.fromString("2c55e69e-4993-11ed-b878-0242ac120002")
    private val MESHTASTIC_TORADIO_UUID = UUID.fromString("f75c04d2-4992-11ed-b878-0242ac120002")

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                gatt.discoverServices()
                notifyState("connected")
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                notifyState("disconnected")
            }
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            val service = gatt.getService(MESHTASTIC_SERVICE_UUID)
            val charFromRadio = service?.getCharacteristic(MESHTASTIC_FROMRADIO_UUID)
            if (charFromRadio != null) {
                gatt.setCharacteristicNotification(charFromRadio, true)
            }
        }

        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            if (characteristic.uuid == MESHTASTIC_FROMRADIO_UUID) {
                val bytes = characteristic.value
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                val data = JSObject()
                data.put("base64", base64)
                notifyListeners("loraFrameReceived", data)
            }
        }
    }

    @PluginMethod
    fun connectToNode(call: PluginCall) {
        val deviceAddress = call.getString("address")
        if (deviceAddress.isNullOrEmpty()) {
            call.reject("Device address required")
            return
        }

        try {
            val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
            val device = adapter.getRemoteDevice(deviceAddress)
            bluetoothGatt = device.connectGatt(context, false, gattCallback)
            call.resolve()
        } catch (e: Exception) {
            call.reject("BLE connection failed: ${e.message}")
        }
    }

    @PluginMethod
    fun sendFrame(call: PluginCall) {
        val base64 = call.getString("base64")
        if (base64.isNullOrEmpty()) {
            call.reject("Frame data required")
            return
        }

        try {
            val bytes = Base64.decode(base64, Base64.NO_WRAP)
            val service = bluetoothGatt?.getService(MESHTASTIC_SERVICE_UUID)
            val charToRadio = service?.getCharacteristic(MESHTASTIC_TORADIO_UUID)

            if (charToRadio != null) {
                charToRadio.value = bytes
                bluetoothGatt?.writeCharacteristic(charToRadio)
                call.resolve()
            } else {
                call.reject("Meshtastic characteristic not found")
            }
        } catch (e: Exception) {
            call.reject("Failed to send frame: ${e.message}")
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        bluetoothGatt?.disconnect()
        bluetoothGatt?.close()
        bluetoothGatt = null
        call.resolve()
    }

    private fun notifyState(state: String) {
        val data = JSObject()
        data.put("state", state)
        notifyListeners("loraStateChanged", data)
    }
}
