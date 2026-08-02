package org.setu.app.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telephony.SmsMessage
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class SmsReceiver : BroadcastReceiver() {

    companion object {
        var gatewayUrl: String = ""
        var gatewayKey: String = ""
        var forwardedCount = 0
        var failedCount = 0
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != intent.action) return

        val messages: Array<SmsMessage> = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isEmpty()) return

        // onReceive() must return quickly, and the system is free to kill this
        // process the moment it does — goAsync() holds the process alive long
        // enough for the network call below to finish (or time out) instead of
        // silently dropping the forward.
        val pendingResult = goAsync()
        Thread {
            try {
                for (sms in messages) {
                    val sender = sms.originatingAddress ?: continue
                    val body = sms.messageBody ?: continue
                    forwardToRelay(sender, body)
                }
            } finally {
                pendingResult.finish()
            }
        }.start()
    }

    private fun forwardToRelay(sender: String, body: String) {
        if (gatewayUrl.isEmpty()) return

        try {
            val url = URL(gatewayUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 15_000
            conn.readTimeout = 15_000
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            if (gatewayKey.isNotEmpty()) {
                conn.setRequestProperty("x-setu-key", gatewayKey)
            }
            conn.doOutput = true

            val payload = JSONObject()
            payload.put("from", sender)
            payload.put("text", body)

            val os = conn.outputStream
            os.write(payload.toString().toByteArray(Charsets.UTF_8))
            os.flush()
            os.close()

            if (conn.responseCode in 200..299) {
                forwardedCount++
            } else {
                failedCount++
            }
            conn.disconnect()
        } catch (e: Exception) {
            failedCount++
            e.printStackTrace()
        }
    }
}
