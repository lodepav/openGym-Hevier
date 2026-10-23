package ch.duartesantos.opengym;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

/**
 * [hevier] Saves a picture into the phone's gallery (hevier/DECISIONS.md D87): a workout's share
 * card, into Pictures/Go Hevier. Through MediaStore, which on Android 10 and later needs no
 * permission for the app's own pictures; on older phones `save` refuses and the page falls back to
 * the share sheet, so no storage permission is asked for. No dependency.
 *
 *   const G = registerPlugin('HevierGallery');
 *   await G.save({ data: base64Png, name: 'go-hevier-2026-10-23.png' });   // { uri }
 */
@CapacitorPlugin(name = "HevierGallery")
public class HevierGalleryPlugin extends Plugin {

    private static final String FOLDER = Environment.DIRECTORY_PICTURES + "/Go Hevier";

    @PluginMethod
    public void save(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("unsupported");
            return;
        }
        String data = call.getString("data");
        String name = call.getString("name", "go-hevier.png");
        if (data == null || data.isEmpty()) {
            call.reject("no data");
            return;
        }
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        values.put(MediaStore.Images.Media.RELATIVE_PATH, FOLDER);
        values.put(MediaStore.Images.Media.IS_PENDING, 1);
        Uri uri = null;
        try {
            uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("insert failed");
            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) throw new IllegalStateException("no stream");
                out.write(Base64.decode(data, Base64.DEFAULT));
            }
            ContentValues done = new ContentValues();
            done.put(MediaStore.Images.Media.IS_PENDING, 0);
            resolver.update(uri, done, null, null);
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            if (uri != null) resolver.delete(uri, null, null);
            call.reject(e.getMessage() != null ? e.getMessage() : "failed");
        }
    }
}
