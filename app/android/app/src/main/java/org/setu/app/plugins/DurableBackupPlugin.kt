package org.setu.app.plugins

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

@CapacitorPlugin(name = "DurableBackupPlugin")
class DurableBackupPlugin : Plugin() {

    @PluginMethod
    fun getBackupDirectoryPath(call: PluginCall) {
        val backupDir = File(context.filesDir, "backup")
        if (!backupDir.exists()) {
            backupDir.mkdirs()
        }
        val ret = JSObject()
        ret.put("path", backupDir.absolutePath)
        call.resolve(ret)
    }
}
