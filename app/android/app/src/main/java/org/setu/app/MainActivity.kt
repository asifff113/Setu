package org.setu.app

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import org.setu.app.plugins.CourierPlugin
import org.setu.app.plugins.DurableBackupPlugin
import org.setu.app.plugins.HubModePlugin
import org.setu.app.plugins.LoRaBridgePlugin
import org.setu.app.plugins.NearbySyncPlugin
import org.setu.app.plugins.SharedBundlePlugin
import org.setu.app.plugins.SmsGatewayPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(SharedBundlePlugin::class.java)
        registerPlugin(NearbySyncPlugin::class.java)
        registerPlugin(HubModePlugin::class.java)
        registerPlugin(DurableBackupPlugin::class.java)
        registerPlugin(CourierPlugin::class.java)
        registerPlugin(SmsGatewayPlugin::class.java)
        registerPlugin(LoRaBridgePlugin::class.java)
        super.onCreate(savedInstanceState)
        
        handleSharedIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleSharedIntent(intent)
    }

    private fun handleSharedIntent(intent: Intent?) {
        intent?.let {
            val sharedPlugin = bridge?.getPlugin("SharedBundlePlugin")?.instance as? SharedBundlePlugin
            sharedPlugin?.handleIntent(it)
        }
    }
}
