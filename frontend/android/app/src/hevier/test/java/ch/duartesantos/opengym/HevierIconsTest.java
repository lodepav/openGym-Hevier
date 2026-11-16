package ch.duartesantos.opengym;

import static org.junit.Assert.*;

import android.content.pm.PackageManager;
import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

/** Which launcher alias is on (hevier/DECISIONS.md D123). */
public class HevierIconsTest {
    private static final int DEF = PackageManager.COMPONENT_ENABLED_STATE_DEFAULT;
    private static final int ON = PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    private static final int OFF = PackageManager.COMPONENT_ENABLED_STATE_DISABLED;

    @Test
    public void eachIdHasItsAlias() {
        assertEquals("IconDefault", HevierIcons.aliasFor("green"));
        assertEquals("IconHvBlue", HevierIcons.aliasFor("blue"));
        assertEquals("IconHvTeal", HevierIcons.aliasFor("teal"));
        assertEquals("IconHvBrand", HevierIcons.aliasFor("brand"));
        assertEquals("IconHvPink", HevierIcons.aliasFor("pink"));
        assertEquals(HevierIcons.IDS.length, HevierIcons.ALIASES.length);
    }

    @Test
    public void anUnknownIdGetsTheGreen() {
        assertEquals("IconDefault", HevierIcons.aliasFor("sky"));
        assertEquals("IconDefault", HevierIcons.aliasFor(null));
        assertFalse(HevierIcons.known("sky"));
        assertFalse(HevierIcons.known(null));
        assertTrue(HevierIcons.known("pink"));
    }

    @Test
    public void aFreshInstallChangesNothing() {
        assertTrue(HevierIcons.reconcile("green", new int[] { DEF, DEF, DEF, DEF, DEF }).isEmpty());
        assertTrue(HevierIcons.reconcile(null, new int[] { DEF, DEF, DEF, DEF, DEF }).isEmpty());
    }

    @Test
    public void aPickEnablesTheNewOneBeforeTheOldGoes() {
        HevierIcons.Plan p = HevierIcons.reconcile("blue", new int[] { DEF, DEF, DEF, DEF, DEF });
        assertEquals("IconHvBlue", p.enable);
        assertEquals(Collections.singletonList("IconDefault"), p.disable);
    }

    @Test
    public void backToGreenAfterAnotherPick() {
        HevierIcons.Plan p = HevierIcons.reconcile("green", new int[] { OFF, OFF, ON, DEF, DEF });
        assertEquals("IconDefault", p.enable);
        assertEquals(Collections.singletonList("IconHvTeal"), p.disable);
    }

    // Upstream's AppIconPlugin set to "default" turns IconDefault on beside the fork's alias.
    @Test
    public void aSecondEntryIsTurnedOff() {
        HevierIcons.Plan p = HevierIcons.reconcile("blue", new int[] { ON, ON, DEF, DEF, DEF });
        assertNull(p.enable);
        assertEquals(Collections.singletonList("IconDefault"), p.disable);
        p = HevierIcons.reconcile("pink", new int[] { ON, ON, ON, OFF, OFF });
        assertEquals("IconHvPink", p.enable);
        assertEquals(Arrays.asList("IconDefault", "IconHvBlue", "IconHvTeal"), p.disable);
    }

    @Test
    public void anUnknownSavedIdReconcilesToTheGreen() {
        HevierIcons.Plan p = HevierIcons.reconcile("sky", new int[] { OFF, ON, DEF, DEF, DEF });
        assertEquals("IconDefault", p.enable);
        assertEquals(Collections.singletonList("IconHvBlue"), p.disable);
    }

    @Test
    public void onlyIconDefaultIsOnByDefault() {
        assertTrue(HevierIcons.isOn("IconDefault", DEF));
        assertFalse(HevierIcons.isOn("IconHvBlue", DEF));
        assertFalse(HevierIcons.isOn("IconDefault", OFF));
        assertFalse(HevierIcons.isOn("IconDefault", PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER));
        assertTrue(HevierIcons.isOn("IconHvBlue", ON));
    }
}
