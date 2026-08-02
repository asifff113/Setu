package org.setu.app.services

import android.app.*
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.*
import androidx.core.app.NotificationCompat
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import java.io.File

class CourierService : Service(), SensorEventListener {

    private val SERVICE_ID = "org.setu.app"
    private var handler: Handler? = null
    private var runnable: Runnable? = null
    private var sensorManager: SensorManager? = null
    private var stepSensor: Sensor? = null
    private var isWalking = false
    private var lastExchangeTimeMs: Long = 0

    companion object {
        const val CHANNEL_ID = "SetuCourierServiceChannel"
        const val NOTIFICATION_ID = 2002
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        stepSensor?.let {
            sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_BACKGROUND)
        }
        handler = Handler(Looper.getMainLooper())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Setu Courier Mode Active")
            .setContentText("Exchanging offline crisis news with users you pass")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        scheduleDutyCycle()
        return START_STICKY
    }

    private fun scheduleDutyCycle() {
        runnable = Runnable {
            performCourierExchange()
            val nextDelayMinutes = getAdaptiveIntervalMinutes()
            handler?.postDelayed(runnable!!, nextDelayMinutes * 60 * 1000L)
        }
        handler?.post(runnable!!)
    }

    private fun getAdaptiveIntervalMinutes(): Int {
        if (isWalking) return 3

        val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val pct = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100

        return when {
            pct > 60 -> 10
            pct in 30..60 -> 20
            pct in 15..29 -> 45
            else -> 60
        }
    }

    private fun performCourierExchange() {
        val client = Nearby.getConnectionsClient(this)
        val advertisingOptions = AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        val discoveryOptions = DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()

        val cb = object : ConnectionLifecycleCallback() {
            override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
                client.acceptConnection(endpointId, object : PayloadCallback() {
                    override fun onPayloadReceived(endpointId: String, payload: Payload) {
                        if (payload.type == Payload.Type.BYTES) {
                            payload.asBytes()?.let { saveToQueue(it) }
                        }
                    }
                    override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {}
                })
            }
            override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {}
            override fun onDisconnected(endpointId: String) {}
        }

        client.startAdvertising("Courier Node", SERVICE_ID, cb, advertisingOptions)
        client.startDiscovery(SERVICE_ID, object : EndpointDiscoveryCallback() {
            override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
                client.requestConnection("Courier Node", endpointId, cb)
            }
            override fun onEndpointLost(endpointId: String) {}
        }, discoveryOptions)

        // Stop radios after 30 second pulse
        handler?.postDelayed({
            client.stopAdvertising()
            client.stopDiscovery()
            client.stopAllEndpoints()
        }, 30_000L)
    }

    private fun saveToQueue(bytes: ByteArray) {
        lastExchangeTimeMs = System.currentTimeMillis()
        val queueDir = File(filesDir, "courier_queue")
        if (!queueDir.exists()) queueDir.mkdirs()

        val file = File(queueDir, "bundle_${System.currentTimeMillis()}.setu")
        file.writeBytes(bytes)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_STEP_DETECTOR) {
            isWalking = true
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onDestroy() {
        handler?.removeCallbacksAndMessages(null)
        sensorManager?.unregisterListener(this)
        val client = Nearby.getConnectionsClient(this)
        client.stopAdvertising()
        client.stopDiscovery()
        client.stopAllEndpoints()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Setu Courier Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
