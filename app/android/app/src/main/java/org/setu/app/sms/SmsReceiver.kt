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
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION == intent.action) {
            val messages: Array<SmsMessage> = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            for (sms in messages) {
                val sender = sms.originatingAddress ?: continue
                val body = sms.messageBody ?: continue

                forwardToRelay(sender, body)
            }
        }
    }

    private fun forwardToRelay(sender: String, body: String) {
        if (gatewayUrl.isEmpty()) return

        Thread {
            try {
                val url = URL(gatewayUrl)
                val conn = url.openConnection() as HttpURLConnection
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
        }.start()
    }
}
