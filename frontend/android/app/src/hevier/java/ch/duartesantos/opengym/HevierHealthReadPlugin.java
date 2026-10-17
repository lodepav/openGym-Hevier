package ch.duartesantos.opengym;

import android.content.Intent;
import android.os.Build;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.contract.ActivityResultContract;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.records.HeartRateRecord;
import androidx.health.connect.client.records.Record;
import androidx.health.connect.client.records.WeightRecord;
import androidx.health.connect.client.records.metadata.Metadata;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.time.TimeRangeFilter;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import kotlin.coroutines.EmptyCoroutineContext;
import kotlin.jvm.JvmClassMappingKt;
import kotlinx.coroutines.BuildersKt;
import org.json.JSONException;

/**
 * [hevier] Reads heart rate and weigh-ins back from Health Connect (hevier/DECISIONS.md D27), until
 * upstream's v1.4.3 does it in its own HealthConnectPlugin: then this file, its seam line in
 * MainActivity and hevier/lib/health-read-sync.js are deleted. The replies have upstream 1.4.3's
 * shapes, so the JS that reads them is upstream's, ported:
 *
 *   const HR = registerPlugin('HevierHealthRead');
 *   await HR.status();                          // { status, read: { heartRate, weight } }
 *   await HR.requestRead({ read: ['weight'] }); // { read: { heartRate, weight } }
 *   await HR.readHeartRate({ from, to });       // { samples: [[ms, bpm]], origins: [package] }
 *   await HR.readWeights({ since });            // { records: [{ t, kg, id, origin, clientId }] }
 *
 * Foreground only, as upstream's: no background or history read permission (Health Connect gives
 * 30 days back from the first grant). Below Android 9 it answers "unsupported" before a Health
 * Connect class is touched, as upstream's plugin does.
 */
@CapacitorPlugin(name = "HevierHealthRead")
public class HevierHealthReadPlugin extends Plugin {

    private static final String PROVIDER = "com.google.android.apps.healthdata";
    private static final String READ_HEART_RATE = "android.permission.health.READ_HEART_RATE";
    private static final String READ_WEIGHT = "android.permission.health.READ_WEIGHT";
    // Upstream's bounds: beyond these no reading is plausible, and a few hours of heart rate fit.
    private static final long BPM_MIN = 25;
    private static final long BPM_MAX = 250;
    private static final int MAX_SAMPLES = 50000;
    private static final int PAGE = 1000;
    private static final int MAX_PAGES = 50;

    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    private static boolean supported() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P;
    }

    private String sdkStatus() {
        if (!supported()) return "unsupported";
        int s = HealthConnectClient.Companion.getSdkStatus(getContext(), PROVIDER);
        if (s == HealthConnectClient.SDK_AVAILABLE) return "available";
        if (s == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "update";
        return Build.VERSION.SDK_INT >= 34 ? "unsupported" : "missing";
    }

    private HealthConnectClient client() {
        return HealthConnectClient.Companion.getOrCreate(getContext(), PROVIDER);
    }

    @SuppressWarnings("unchecked")
    private Set<String> granted() throws InterruptedException {
        PermissionController pc = client().getPermissionController();
        return (Set<String>) BuildersKt.runBlocking(EmptyCoroutineContext.INSTANCE, (scope, cont) -> pc.getGrantedPermissions(cont));
    }

    private static JSObject readState(Set<String> granted) {
        JSObject r = new JSObject();
        r.put("heartRate", granted.contains(READ_HEART_RATE));
        r.put("weight", granted.contains(READ_WEIGHT));
        return r;
    }

    @PluginMethod
    public void status(PluginCall call) {
        String status = sdkStatus();
        if (!"available".equals(status)) {
            JSObject r = new JSObject();
            r.put("status", status);
            r.put("read", readState(Collections.emptySet()));
            call.resolve(r);
            return;
        }
        worker.execute(() -> {
            try {
                JSObject r = new JSObject();
                r.put("status", status);
                r.put("read", readState(granted()));
                call.resolve(r);
            } catch (Exception e) {
                call.reject(e.getMessage(), "failed");
            }
        });
    }

    /** Asks for the read permissions named in `read` ('heartRate', 'weight'), only those. */
    @PluginMethod
    public void requestRead(PluginCall call) {
        if (!"available".equals(sdkStatus())) {
            call.reject("Health Connect is not available", "unavailable");
            return;
        }
        Set<String> asked = new HashSet<>();
        JSArray read = call.getArray("read", new JSArray());
        try {
            for (int i = 0; i < read.length(); i++) {
                String name = read.getString(i);
                if ("heartRate".equals(name)) asked.add(READ_HEART_RATE);
                else if ("weight".equals(name)) asked.add(READ_WEIGHT);
            }
        } catch (JSONException e) {
            call.reject(e.getMessage(), "failed");
            return;
        }
        ActivityResultContract<Set<String>, Set<String>> contract = PermissionController.createRequestPermissionResultContract(PROVIDER);
        startActivityForResult(call, contract.createIntent(getContext(), asked), "readResult");
    }

    @ActivityCallback
    private void readResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        ActivityResultContract<Set<String>, Set<String>> contract = PermissionController.createRequestPermissionResultContract(PROVIDER);
        Set<String> got = contract.parseResult(result.getResultCode(), result.getData());
        worker.execute(() -> {
            try {
                Set<String> now = new HashSet<>(granted());
                if (got != null) now.addAll(got);
                JSObject r = new JSObject();
                r.put("read", readState(now));
                call.resolve(r);
            } catch (Exception e) {
                call.reject(e.getMessage(), "failed");
            }
        });
    }

    @PluginMethod
    public void readHeartRate(PluginCall call) {
        if (!"available".equals(sdkStatus())) {
            call.reject("Health Connect is not available", "unavailable");
            return;
        }
        Long from = millis(call, "from"), to = millis(call, "to");
        if (from == null || to == null || to <= from) {
            call.reject("from and to are needed", "failed");
            return;
        }
        worker.execute(() -> {
            try {
                List<HeartRateRecord> recs = read(HeartRateRecord.class,
                        TimeRangeFilter.between(Instant.ofEpochMilli(from), Instant.ofEpochMilli(to)));
                List<long[]> picked = new ArrayList<>();
                Set<String> origins = new HashSet<>();
                for (HeartRateRecord r : recs) {
                    origins.add(r.getMetadata().getDataOrigin().getPackageName());
                    for (HeartRateRecord.Sample s : r.getSamples()) {
                        long t = s.getTime().toEpochMilli(), bpm = s.getBeatsPerMinute();
                        if (t < from || t > to || bpm < BPM_MIN || bpm > BPM_MAX) continue;
                        if (picked.size() < MAX_SAMPLES) picked.add(new long[] { t, bpm });
                    }
                }
                picked.sort((a, b) -> Long.compare(a[0], b[0]));
                JSArray samples = new JSArray();
                for (long[] s : picked) samples.put(new JSArray().put(s[0]).put(s[1]));
                JSObject out = new JSObject();
                out.put("samples", samples);
                out.put("origins", new JSArray(origins));
                call.resolve(out);
            } catch (SecurityException e) {
                call.reject(e.getMessage(), "permission");
            } catch (Exception e) {
                call.reject(e.getMessage(), "failed");
            }
        });
    }

    @PluginMethod
    public void readWeights(PluginCall call) {
        if (!"available".equals(sdkStatus())) {
            call.reject("Health Connect is not available", "unavailable");
            return;
        }
        Long since = millis(call, "since");
        if (since == null) {
            call.reject("since is needed", "failed");
            return;
        }
        worker.execute(() -> {
            try {
                JSArray records = new JSArray();
                for (WeightRecord r : read(WeightRecord.class, TimeRangeFilter.after(Instant.ofEpochMilli(since)))) {
                    double kg = r.getWeight().getKilograms();
                    if (!(kg > 0)) continue;
                    Metadata m = r.getMetadata();
                    JSObject o = new JSObject();
                    o.put("t", r.getTime().toEpochMilli());
                    o.put("kg", kg);
                    o.put("id", m.getId());
                    o.put("origin", m.getDataOrigin().getPackageName());
                    o.put("clientId", m.getClientRecordId());
                    records.put(o);
                }
                JSObject out = new JSObject();
                out.put("records", records);
                call.resolve(out);
            } catch (SecurityException e) {
                call.reject(e.getMessage(), "permission");
            } catch (Exception e) {
                call.reject(e.getMessage(), "failed");
            }
        });
    }

    // Every page of one record type in the window, oldest first.
    @SuppressWarnings("unchecked")
    private <T extends Record> List<T> read(Class<T> type, TimeRangeFilter range) throws InterruptedException {
        List<T> out = new ArrayList<>();
        String token = null;
        for (int page = 0; page < MAX_PAGES; page++) {
            ReadRecordsRequest<T> req = new ReadRecordsRequest<>(JvmClassMappingKt.getKotlinClass(type), range,
                    Collections.emptySet(), true, PAGE, token);
            ReadRecordsResponse<T> res = (ReadRecordsResponse<T>) BuildersKt.runBlocking(EmptyCoroutineContext.INSTANCE,
                    (scope, cont) -> client().readRecords(req, cont));
            out.addAll(res.getRecords());
            token = res.getPageToken();
            if (token == null || token.isEmpty()) break;
        }
        return out;
    }

    // A time from JS: a number that may arrive as an Integer, Long or Double.
    private static Long millis(PluginCall call, String name) {
        Object v = call.getData().opt(name);
        return v instanceof Number ? ((Number) v).longValue() : null;
    }
}
