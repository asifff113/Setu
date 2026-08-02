package org.setu.app.services

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import fi.iki.elonen.NanoHTTPD
import java.io.ByteArrayInputStream
import java.io.InputStream

class HubService : Service() {

    private var httpPort = 8080
    private var nanoServer: HubNanoServer? = null

    companion object {
        const val CHANNEL_ID = "SetuHubServiceChannel"
        const val NOTIFICATION_ID = 1001
        var onBundleReceivedListener: ((ByteArray) -> Unit)? = null
        var currentBundleProvider: (() -> ByteArray)? = null
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Setu Hub Active")
            .setContentText("Serving local mesh network to nearby devices")
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        if (nanoServer == null) {
            try {
                nanoServer = HubNanoServer(httpPort)
                nanoServer?.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        return START_STICKY
    }

    override fun onDestroy() {
        nanoServer?.stop()
        nanoServer = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            const val channelName = "Setu Hub Service"
            val channel = NotificationChannel(
                CHANNEL_ID,
                channelName,
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private class HubNanoServer(port: Int) : NanoHTTPD(port) {
        override fun serve(session: IHTTPSession): Response {
            val uri = session.uri
            val method = session.method

            if (Method.GET == method && "/bundle.setu" == uri) {
                val bundleBytes = currentBundleProvider?.invoke() ?: ByteArray(0)
                return newFixedLengthResponse(
                    Response.Status.OK,
                    "application/octet-stream",
                    ByteArrayInputStream(bundleBytes),
                    bundleBytes.size.toLong()
                )
            }

            if (Method.POST == method && "/bundle" == uri) {
                val files = HashMap<String, String>()
                try {
                    session.parseBody(files)
                    val postData = files["postData"]
                    if (postData != null) {
                        onBundleReceivedListener?.invoke(postData.toByteArray(Charsets.ISO_8859_1))
                    }
                    return newFixedLengthResponse(Response.Status.OK, "application/json", "{\"ok\":true}")
                } catch (e: Exception) {
                    return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", e.message)
                }
            }

            if (Method.GET == method && "/sync" == uri) {
                val html = """
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="utf-8"/><title>Setu Hub Dead-Drop</title></head>
                    <body style="font-family:sans-serif;padding:20px;text-align:center;">
                      <h1>সেতু Setu Hub</h1>
                      <p>Download latest crisis events or upload your updates.</p>
                      <p><a href="/bundle.setu" style="font-size:18px;font-weight:bold;">⬇️ Download Board Bundle</a></p>
                      <form action="/bundle" method="POST" enctype="multipart/form-data">
                        <input type="file" name="file" accept=".setu"/>
                        <br/><br/>
                        <button type="submit" style="padding:10px 20px;">⬆️ Upload My Events</button>
                      </form>
                    </body>
                    </html>
                """.trimIndent()
                return newFixedLengthResponse(Response.Status.OK, "text/html", html)
            }

            const val html = "<html><body><h1>Setu Local Node Active</h1><p>Visit <a href='/sync'>/sync</a> for offline board transfer.</p></body></html>"
            return newFixedLengthResponse(Response.Status.OK, "text/html", html)
        }
    }
}
