package ch.duartesantos.opengym;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * [hevier] Keeps a secret on the phone, encrypted (hevier/DECISIONS.md D34): the Hevy API key the
 * export to Hevy sends with. The value is sealed with AES-GCM under a key that lives in the
 * Android Keystore and never leaves it, and the sealed bytes go into the app's private
 * SharedPreferences. Android's backup may carry those bytes to another phone, but not the
 * Keystore key, so there they cannot be opened: `get` then forgets them and answers null. No
 * dependency: the Keystore has done this since Android 6, below upstream's minSdk.
 *
 *   const S = registerPlugin('HevierSecret');
 *   await S.put({ name, value });
 *   await S.get({ name });                     // { value: string | null }
 *   await S.remove({ name });
 */
@CapacitorPlugin(name = "HevierSecret")
public class HevierSecretPlugin extends Plugin {

    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String ALIAS = "hevier_secret";
    private static final String PREFS = "hevier_secret";
    private static final String CIPHER = "AES/GCM/NoPadding";
    private static final int TAG_BITS = 128;

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance(KEYSTORE);
        ks.load(null);
        if (ks.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry) ks.getEntry(ALIAS, null)).getSecretKey();
        KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        gen.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build());
        return gen.generateKey();
    }

    private static String nameOf(PluginCall call) {
        String name = call.getString("name");
        return name != null && name.matches("[A-Za-z0-9._-]{1,64}") ? name : null;
    }

    @PluginMethod
    public void put(PluginCall call) {
        String name = nameOf(call);
        String value = call.getString("value");
        if (name == null || value == null) { call.reject("name and value are needed"); return; }
        try {
            Cipher c = Cipher.getInstance(CIPHER);
            c.init(Cipher.ENCRYPT_MODE, key());
            byte[] sealed = c.doFinal(value.getBytes(StandardCharsets.UTF_8));
            prefs().edit()
                .putString(name + ".iv", Base64.encodeToString(c.getIV(), Base64.NO_WRAP))
                .putString(name + ".v", Base64.encodeToString(sealed, Base64.NO_WRAP))
                .apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("could not keep the secret");
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        String name = nameOf(call);
        if (name == null) { call.reject("name is needed"); return; }
        JSObject out = new JSObject();
        String iv = prefs().getString(name + ".iv", null);
        String sealed = prefs().getString(name + ".v", null);
        if (iv == null || sealed == null) { out.put("value", JSObject.NULL); call.resolve(out); return; }
        try {
            Cipher c = Cipher.getInstance(CIPHER);
            c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, Base64.decode(iv, Base64.NO_WRAP)));
            out.put("value", new String(c.doFinal(Base64.decode(sealed, Base64.NO_WRAP)), StandardCharsets.UTF_8));
        } catch (Exception e) {
            // A Keystore key lost (a restore to another phone, a reset lock screen): the secret is gone.
            prefs().edit().remove(name + ".iv").remove(name + ".v").apply();
            out.put("value", JSObject.NULL);
        }
        call.resolve(out);
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String name = nameOf(call);
        if (name == null) { call.reject("name is needed"); return; }
        prefs().edit().remove(name + ".iv").remove(name + ".v").apply();
        call.resolve();
    }
}
