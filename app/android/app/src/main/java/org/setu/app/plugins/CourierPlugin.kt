package org.setu.app.plugins

import android.content.Intent
import android.os.Build
import android.util.Base64
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.setu.app.services.CourierService
import java.io.File

@CapacitorPlugin(name = "CourierPlugin")
class CourierPlugin : Plugin() {

    @PluginMethod
    fun startCourier(call: PluginCall) {
        val intent = Intent(context, CourierService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        call.resolve()
    }

    @PluginMethod
    fun stopCourier(call: PluginCall) {
        val intent = Intent(context, CourierService::class.java)
        context.stopService(intent)
        call.resolve()
    }

    @PluginMethod
    fun consumeQueue(call: PluginCall) {
        val queueDir = File(context.filesDir, "courier_queue")
        val items = JSArray()

        if (queueDir.exists()) {
            val files = queueDir.listFiles()
            files?.forEach { file ->
                try {
                    val bytes = file.readBytes()
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    items.put(base64)
                    file.delete()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        val ret = JSObject()
        ret.put("bundles", items)
        call.resolve(ret)
    }
}
