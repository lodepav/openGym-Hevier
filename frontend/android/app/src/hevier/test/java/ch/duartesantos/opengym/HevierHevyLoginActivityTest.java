package ch.duartesantos.opengym;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class HevierHevyLoginActivityTest {

    private static final String TOKEN = "{%22access_token%22:%22a/1%22%2C%22refresh_token%22:%22r1%22}";

    @Test
    public void readsTheSessionCookieAmongOthers() {
        assertEquals(TOKEN, HevierHevyLoginActivity.cookieValue("_ga=GA1.1; auth2.0-token=" + TOKEN + "; theme=dark"));
        assertEquals(TOKEN, HevierHevyLoginActivity.cookieValue("auth2.0-token=" + TOKEN));
    }

    @Test
    public void ignoresAnEmptyOrOtherCookie() {
        assertNull(HevierHevyLoginActivity.cookieValue(null));
        assertNull(HevierHevyLoginActivity.cookieValue("auth2.0-token="));
        assertNull(HevierHevyLoginActivity.cookieValue("xauth2.0-token=" + TOKEN));
        assertNull(HevierHevyLoginActivity.cookieValue("_ga=GA1.1"));
    }
}
