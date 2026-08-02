package org.setu.app.plugins

import android.content.Intent
import android.net.Uri
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.InputStream

@CapacitorPlugin(name = "SharedBundlePlugin")
class SharedBundlePlugin : Plugin() {

    private var pendingBase64: String? = null

    companion object {
        private const val MAX_COMPRESSED_BUNDLE_BYTES = 2 * 1024 * 1024 // 2 MiB (bundle.ts)
    }

    fun handleIntent(intent: Intent) {
        val action = intent.action
        val type = intent.type

        if (Intent.ACTION_SEND == action && type != null) {
            val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
            uri?.let { readUriStream(it) }
        } else if (Intent.ACTION_VIEW == action) {
            val uri = intent.data
            uri?.let { readUriStream(it) }
        }
    }

    private fun readUriStream(uri: Uri) {
        try {
            val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
            inputStream?.use { stream ->
                val buffer = ByteArray(MAX_COMPRESSED_BUNDLE_BYTES)
                var totalRead = 0
                var read = stream.read(buffer, 0, buffer.size)
                
                // Read up to limit
                val tempOutput = mutableListOf<Byte>()
                while (read != -1 && totalRead < MAX_COMPRESSED_BUNDLE_BYTES) {
                    for (i in 0 until read) {
                        tempOutput.add(buffer[i])
                    }
                    totalRead += read
                    if (totalRead >= MAX_COMPRESSED_BUNDLE_BYTES) break
                    read = stream.read(buffer, 0, buffer.size - totalRead)
                }

                if (tempOutput.isNotEmpty()) {
                    pendingBase64 = Base64.encodeToString(tempOutput.toByteArray(), Base64.NO_WRAP)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @PluginMethod
    fun consumePending(call: PluginCall) {
        val ret = JSObject()
        ret.put("data", pendingBase64)
        pendingBase64 = null
        call.resolve(ret)
    }
}
