package org.setu.app.plugins

import android.telephony.SmsManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.setu.app.sms.SmsReceiver

@CapacitorPlugin(name = "SmsGatewayPlugin")
class SmsGatewayPlugin : Plugin() {

    @PluginMethod
    fun configure(call: PluginCall) {
        val url = call.getString("url", "") ?: ""
        val key = call.getString("key", "") ?: ""

        SmsReceiver.gatewayUrl = url
        SmsReceiver.gatewayKey = key
        call.resolve()
    }

    @PluginMethod
    fun getStats(call: PluginCall) {
        val ret = JSObject()
        ret.put("forwarded", SmsReceiver.forwardedCount)
        ret.put("failed", SmsReceiver.failedCount)
        call.resolve(ret)
    }

    @PluginMethod
    fun sendSms(call: PluginCall) {
        val to = call.getString("to")
        val message = call.getString("message")

        if (to.isNullOrEmpty() || message.isNullOrEmpty()) {
            call.reject("Missing destination 'to' or 'message'")
            return
        }

        try {
            val smsManager = SmsManager.getDefault()
            smsManager.sendTextMessage(to, null, message, null, null)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to send SMS: ${e.message}")
        }
    }
}
