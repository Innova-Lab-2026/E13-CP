package com.anonymous.frontend

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.nio.charset.StandardCharsets
import kotlin.concurrent.thread

class LocalVpnService : VpnService() {
    private var vpnInterface: ParcelFileDescriptor? = null
    @Volatile private var running = false

    companion object {
        const val PREFERENCES_NAME = "local_vpn"
        const val RUNNING_KEY = "running"
        private const val TAG = "LocalVpnService"
        private const val CHANNEL_ID = "local_vpn"
        private const val NOTIFICATION_ID = 1301
        private const val VPN_ADDRESS = "10.10.0.2"
        private const val DNS_ADDRESS = "10.10.0.1"
        private const val UPSTREAM_DNS = "1.1.1.1"
        private const val DNS_PORT = 53
        private const val MAX_PACKET_SIZE = 32767
        private const val MAX_DNS_PACKET_SIZE = 4096
        private val BLOCKED_DOMAINS = setOf(
            "bplay.bet.ar",
            "bpplay.bet.ar",
            "gambeta.ia",
            "marval.com"
        )

        fun createIntent(context: Context): Intent =
            Intent(context, LocalVpnService::class.java)

        fun isRunning(context: Context): Boolean =
            context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getBoolean(RUNNING_KEY, false)
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        if (vpnInterface != null) {
            return START_STICKY
        }

        val descriptor = Builder()
            .setSession("Parental Control")
            .setMtu(1500)
            .addAddress(VPN_ADDRESS, 32)
            .addDnsServer(DNS_ADDRESS)
            .addRoute(DNS_ADDRESS, 32)
            .establish()

        if (descriptor == null) {
            Log.e(TAG, "Android did not allow the VPN interface to be established.")
            stopSelf()
            return START_NOT_STICKY
        }

        vpnInterface = descriptor
        running = true
        setRunningPreference(true)
        thread(name = "LocalVpnDns") {
            processPackets(descriptor)
        }
        return START_STICKY
    }

    override fun onRevoke() {
        stopSelf()
        super.onRevoke()
    }

    override fun onDestroy() {
        running = false
        setRunningPreference(false)
        vpnInterface?.close()
        vpnInterface = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    private fun createNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Protección VPN",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        return builder
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentTitle("Protección VPN activa")
            .setContentText("Filtrado DNS de dominios configurados")
            .setOngoing(true)
            .build()
    }

    private fun processPackets(descriptor: ParcelFileDescriptor) {
        val input = FileInputStream(descriptor.fileDescriptor)
        val output = FileOutputStream(descriptor.fileDescriptor)
        val packet = ByteArray(MAX_PACKET_SIZE)

        try {
            while (running) {
                val length = input.read(packet)
                if (length <= 0) {
                    continue
                }

                val response = createDnsResponse(packet, length) ?: continue
                output.write(response)
            }
        } catch (error: IOException) {
            if (running) {
                Log.e(TAG, "The VPN packet loop stopped unexpectedly.", error)
                stopSelf()
            }
        } finally {
            input.close()
            output.close()
        }
    }

    private fun createDnsResponse(packet: ByteArray, packetLength: Int): ByteArray? {
        if (packetLength < 28 || (packet[0].toInt() ushr 4 and 0x0f) != 4) {
            return null
        }

        val ipHeaderLength = (packet[0].toInt() and 0x0f) * 4
        if (ipHeaderLength < 20 || packetLength < ipHeaderLength + 8) {
            return null
        }

        val flagsAndOffset = readUnsignedShort(packet, 6)
        if (packet[9].toInt() != 17 || flagsAndOffset and 0x3fff != 0) {
            return null
        }

        val udpOffset = ipHeaderLength
        val udpLength = readUnsignedShort(packet, udpOffset + 4)
        if (readUnsignedShort(packet, udpOffset + 2) != DNS_PORT ||
            udpLength < 20 ||
            udpOffset + udpLength > packetLength ||
            !isDnsDestination(packet)
        ) {
            return null
        }

        val dnsOffset = udpOffset + 8
        val dnsLength = udpLength - 8
        if (dnsLength < 12) {
            return null
        }

        val query = packet.copyOfRange(dnsOffset, dnsOffset + dnsLength)
        if (isBlockedDomain(readQueryDomain(query))) {
            return buildIpUdpPacket(
                packet,
                ipHeaderLength,
                buildBlockedResponse(query)
            )
        }

        return try {
            val upstreamResponse = queryUpstream(query)
            buildIpUdpPacket(packet, ipHeaderLength, upstreamResponse)
        } catch (error: IOException) {
            Log.w(TAG, "Could not forward a DNS query to the upstream resolver.", error)
            null
        }
    }

    private fun queryUpstream(query: ByteArray): ByteArray {
        val address = InetAddress.getByName(UPSTREAM_DNS)
        DatagramSocket().use { socket ->
            if (!protect(socket)) {
                throw IOException("Could not protect the upstream DNS socket.")
            }
            socket.soTimeout = 3000
            socket.send(DatagramPacket(query, query.size, address, DNS_PORT))

            val responseBuffer = ByteArray(MAX_DNS_PACKET_SIZE)
            val response = DatagramPacket(responseBuffer, responseBuffer.size)
            socket.receive(response)
            return response.data.copyOf(response.length)
        }
    }

    private fun buildBlockedResponse(query: ByteArray): ByteArray {
        val response = query.copyOf()
        val flags = readUnsignedShort(response, 2)
        writeUnsignedShort(response, 2, (flags and 0x7910) or 0x8083)
        for (offset in 6..11) {
            response[offset] = 0
        }
        return response
    }

    private fun readQueryDomain(query: ByteArray): String? {
        if (readUnsignedShort(query, 4) == 0) {
            return null
        }

        val labels = mutableListOf<String>()
        var offset = 12
        while (offset < query.size) {
            val labelLength = query[offset++].toInt() and 0xff
            if (labelLength == 0) {
                return labels.joinToString(".").lowercase()
            }
            if (labelLength > 63 || offset + labelLength > query.size) {
                return null
            }

            labels.add(
                String(
                    query,
                    offset,
                    labelLength,
                    StandardCharsets.US_ASCII
                )
            )
            offset += labelLength
        }
        return null
    }

    private fun isBlockedDomain(domain: String?): Boolean =
        domain != null && BLOCKED_DOMAINS.any { blocked ->
            domain == blocked || domain.endsWith(".$blocked")
        }

    private fun isDnsDestination(packet: ByteArray): Boolean =
        packet[16].toInt() and 0xff == 10 &&
            packet[17].toInt() and 0xff == 10 &&
            packet[18].toInt() and 0xff == 0 &&
            packet[19].toInt() and 0xff == 1

    private fun buildIpUdpPacket(
        original: ByteArray,
        ipHeaderLength: Int,
        dnsResponse: ByteArray
    ): ByteArray {
        val totalLength = 20 + 8 + dnsResponse.size
        val response = ByteArray(totalLength)
        response[0] = 0x45
        writeUnsignedShort(response, 2, totalLength)
        writeUnsignedShort(response, 4, readUnsignedShort(original, 4))
        response[8] = 64
        response[9] = 17
        System.arraycopy(original, 16, response, 12, 4)
        System.arraycopy(original, 12, response, 16, 4)

        val originalUdpOffset = ipHeaderLength
        writeUnsignedShort(
            response,
            20,
            readUnsignedShort(original, originalUdpOffset + 2)
        )
        writeUnsignedShort(
            response,
            22,
            readUnsignedShort(original, originalUdpOffset)
        )
        writeUnsignedShort(response, 24, 8 + dnsResponse.size)
        System.arraycopy(dnsResponse, 0, response, 28, dnsResponse.size)

        writeUnsignedShort(response, 10, checksum(response, 0, 20))
        return response
    }

    private fun checksum(data: ByteArray, offset: Int, length: Int): Int {
        var sum = 0L
        var index = offset
        while (index + 1 < offset + length) {
            sum += readUnsignedShort(data, index)
            index += 2
        }
        if (index < offset + length) {
            sum += (data[index].toInt() and 0xff) shl 8
        }
        while (sum shr 16 != 0L) {
            sum = (sum and 0xffff) + (sum shr 16)
        }
        return sum.inv().toInt() and 0xffff
    }

    private fun readUnsignedShort(data: ByteArray, offset: Int): Int =
        ((data[offset].toInt() and 0xff) shl 8) or
            (data[offset + 1].toInt() and 0xff)

    private fun writeUnsignedShort(data: ByteArray, offset: Int, value: Int) {
        data[offset] = (value ushr 8).toByte()
        data[offset + 1] = value.toByte()
    }

    private fun setRunningPreference(value: Boolean) {
        getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(RUNNING_KEY, value)
            .apply()
    }
}
