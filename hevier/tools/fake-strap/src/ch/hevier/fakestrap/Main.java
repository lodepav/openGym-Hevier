package ch.hevier.fakestrap;

import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattServer;
import android.bluetooth.BluetoothGattServerCallback;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Log;
import android.widget.TextView;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * A pretend Bluetooth heart-rate strap, for testing Go Hevier's strap reading (hevier/DECISIONS.md
 * D79) on a second emulator: Android's virtual Bluetooth (netsim) links the emulators on one
 * machine. It advertises the standard Heart Rate service (0x180D) and notifies a Heart Rate
 * Measurement (0x2A37) every second, with an RR interval, as a real strap does. Not part of the app.
 *
 *   adb -s emulator-5556 shell am start -n ch.hevier.fakestrap/.Main            # 98–152 bpm, a minute's wave
 *   adb -s emulator-5556 shell am start -n ch.hevier.fakestrap/.Main --ei bpm 140 --ez u16 true
 *   adb -s emulator-5556 shell am start -n ch.hevier.fakestrap/.Main --ez secure true   # wants pairing first
 *
 * Every second it logs "fakestrap sent <ms> <bpm>" (adb logcat -s fakestrap), so a test can hold
 * what the app recorded against what was sent.
 */
public class Main extends Activity {
    static final UUID HR_SERVICE = uuid16(0x180D);
    static final UUID HR_MEASUREMENT = uuid16(0x2A37);
    static final UUID BODY_LOCATION = uuid16(0x2A38);
    static final UUID CCCD = uuid16(0x2902);

    static UUID uuid16(int n) {
        return UUID.fromString(String.format("0000%04x-0000-1000-8000-00805f9b34fb", n));
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    private final Set<BluetoothDevice> subscribed = new HashSet<>();
    private BluetoothGattServer server;
    private BluetoothLeAdvertiser advertiser;
    private BluetoothGattCharacteristic measurement;
    private TextView view;
    private int fixed;
    private boolean u16;
    private final long t0 = System.currentTimeMillis();

    private final AdvertiseCallback advertised = new AdvertiseCallback() {
        @Override public void onStartSuccess(AdvertiseSettings s) { show("advertising"); }
        @Override public void onStartFailure(int code) { show("advertising failed " + code); }
    };

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        view = new TextView(this);
        view.setTextSize(28);
        view.setPadding(48, 160, 48, 48);
        setContentView(view);
        fixed = getIntent().getIntExtra("bpm", 0);
        u16 = getIntent().getBooleanExtra("u16", false);
        BluetoothManager bm = (BluetoothManager) getSystemService(BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = bm.getAdapter();
        if (adapter == null || !adapter.isEnabled()) { show("Bluetooth is off"); return; }
        adapter.setName("Fake HR");
        server = bm.openGattServer(this, new BluetoothGattServerCallback() {
            @Override
            public void onConnectionStateChange(BluetoothDevice d, int status, int state) {
                if (state != BluetoothProfile.STATE_CONNECTED) subscribed.remove(d);
                show(state == BluetoothProfile.STATE_CONNECTED ? "connected " + d.getAddress() : "disconnected");
                // Android stops a connectable advertisement once a central connects; a real strap
                // advertises again as soon as it is free, so the phone can come back.
                if (state != BluetoothProfile.STATE_CONNECTED) main.post(Main.this::advertise);
            }
            @Override
            public void onDescriptorWriteRequest(BluetoothDevice d, int id, BluetoothGattDescriptor desc, boolean prepared, boolean needsReply, int offset, byte[] v) {
                if (CCCD.equals(desc.getUuid())) {
                    if (v != null && v.length > 0 && (v[0] & 1) == 1) subscribed.add(d); else subscribed.remove(d);
                    show("subscribed " + subscribed.size());
                }
                if (needsReply) server.sendResponse(d, id, BluetoothGatt.GATT_SUCCESS, 0, v);
            }
            @Override
            public void onDescriptorReadRequest(BluetoothDevice d, int id, int offset, BluetoothGattDescriptor desc) {
                byte[] v = subscribed.contains(d) ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE : BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE;
                server.sendResponse(d, id, BluetoothGatt.GATT_SUCCESS, 0, v);
            }
            @Override
            public void onCharacteristicReadRequest(BluetoothDevice d, int id, int offset, BluetoothGattCharacteristic c) {
                server.sendResponse(d, id, BluetoothGatt.GATT_SUCCESS, 0, BODY_LOCATION.equals(c.getUuid()) ? new byte[] { 1 } : new byte[0]);
            }
        });
        BluetoothGattService svc = new BluetoothGattService(HR_SERVICE, BluetoothGattService.SERVICE_TYPE_PRIMARY);
        measurement = new BluetoothGattCharacteristic(HR_MEASUREMENT, BluetoothGattCharacteristic.PROPERTY_NOTIFY, 0);
        // `--ez secure true`: subscribing needs a paired, encrypted link, as some watches want; the
        // stack refuses the write with "insufficient encryption" until the phone pairs.
        int write = getIntent().getBooleanExtra("secure", false) ? BluetoothGattDescriptor.PERMISSION_WRITE_ENCRYPTED : BluetoothGattDescriptor.PERMISSION_WRITE;
        measurement.addDescriptor(new BluetoothGattDescriptor(CCCD, BluetoothGattDescriptor.PERMISSION_READ | write));
        svc.addCharacteristic(measurement);
        svc.addCharacteristic(new BluetoothGattCharacteristic(BODY_LOCATION, BluetoothGattCharacteristic.PROPERTY_READ, BluetoothGattCharacteristic.PERMISSION_READ));
        server.addService(svc);
        advertiser = adapter.getBluetoothLeAdvertiser();
        advertise();
        main.postDelayed(this::tick, 1000);
    }

    private void advertise() {
        if (advertiser == null) return;
        advertiser.stopAdvertising(advertised);
        advertiser.startAdvertising(
            new AdvertiseSettings.Builder().setConnectable(true).setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY).build(),
            new AdvertiseData.Builder().addServiceUuid(new ParcelUuid(HR_SERVICE)).build(),
            new AdvertiseData.Builder().setIncludeDeviceName(true).build(),
            advertised);
    }

    private int bpm() {
        if (fixed > 0) return fixed;
        double s = (System.currentTimeMillis() - t0) / 1000.0;
        return (int) Math.round(125 + 27 * Math.sin(2 * Math.PI * s / 60));
    }

    private void tick() {
        int bpm = bpm();
        int rr = Math.round(60000f / bpm * 1024 / 1000);   // 1/1024 s, as the standard has it
        // flags: sensor contact supported and detected (bits 1–2), RR present (bit 4), uint16 (bit 0)
        byte[] v = u16
            ? new byte[] { 0x17, (byte) bpm, (byte) (bpm >> 8), (byte) rr, (byte) (rr >> 8) }
            : new byte[] { 0x16, (byte) bpm, (byte) rr, (byte) (rr >> 8) };
        measurement.setValue(v);
        for (BluetoothDevice d : subscribed) server.notifyCharacteristicChanged(d, measurement, false);
        Log.i("fakestrap", "sent " + System.currentTimeMillis() + " " + bpm);
        view.setText("Fake HR strap\n" + bpm + " bpm\n" + subscribed.size() + " listening\n\n" + status);
        main.postDelayed(this::tick, 1000);
    }

    private String status = "";
    private void show(String s) {
        status = s;
        Log.i("fakestrap", s);
    }

    @Override
    protected void onDestroy() {
        main.removeCallbacksAndMessages(null);
        if (advertiser != null) advertiser.stopAdvertising(advertised);
        if (server != null) server.close();
        super.onDestroy();
    }
}
