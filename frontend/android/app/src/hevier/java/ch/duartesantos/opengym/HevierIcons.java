package ch.duartesantos.opengym;

import android.content.pm.PackageManager;
import java.util.ArrayList;
import java.util.List;

/**
 * [hevier] The fork's launcher icons (hevier/DECISIONS.md D123): one activity-alias per offered
 * accent (frontend/src/hevier/lib/accent-icon.js ICON_IDS), declared in the fork's manifest overlay.
 * IconDefault, upstream's own entry, is the green one and the only one on by default. Pure, so the
 * choice is tested on the JVM (HevierIconsTest); HevierIconPlugin applies it.
 */
final class HevierIcons {
    private HevierIcons() {}

    static final String DEFAULT_ID = "green";
    static final String DEFAULT_ALIAS = "IconDefault";
    /** The icon ids, as accent-icon.js names them, and their aliases, index for index. */
    static final String[] IDS = { "green", "blue", "teal", "brand", "pink" };
    static final String[] ALIASES = { DEFAULT_ALIAS, "IconHvBlue", "IconHvTeal", "IconHvBrand", "IconHvPink" };

    static boolean known(String id) {
        for (String s : IDS) if (s.equals(id)) return true;
        return false;
    }

    /** The alias for an icon id; an unknown or missing id gets the green one. */
    static String aliasFor(String id) {
        for (int i = 0; i < IDS.length; i++) if (IDS[i].equals(id)) return ALIASES[i];
        return DEFAULT_ALIAS;
    }

    /** Whether an alias is on, from PackageManager's enabled setting (DEFAULT is the manifest's value). */
    static boolean isOn(String alias, int state) {
        if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) return true;
        if (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT) return DEFAULT_ALIAS.equals(alias);
        return false;
    }

    /** What to change so exactly the saved id's alias is on: the alias to enable (null when it is on already), then the ones to disable. */
    static final class Plan {
        final String enable;
        final List<String> disable;

        Plan(String enable, List<String> disable) {
            this.enable = enable;
            this.disable = disable;
        }

        boolean isEmpty() {
            return enable == null && disable.isEmpty();
        }
    }

    /**
     * The reconcile choice for the saved id and each of ALIASES' enabled states (index for index).
     * Run on every stop, not only after a pick: upstream's AppIconPlugin set to "default" turns
     * IconDefault on beside the fork's alias, and this turns the extra one off again.
     */
    static Plan reconcile(String savedId, int[] states) {
        String target = aliasFor(savedId);
        String enable = null;
        List<String> disable = new ArrayList<>();
        for (int i = 0; i < ALIASES.length; i++) {
            boolean on = isOn(ALIASES[i], states[i]);
            if (ALIASES[i].equals(target)) {
                if (!on) enable = target;
            } else if (on) {
                disable.add(ALIASES[i]);
            }
        }
        return new Plan(enable, disable);
    }
}
